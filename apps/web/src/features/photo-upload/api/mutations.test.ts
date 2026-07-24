import { beforeEach, describe, expect, test, vi } from 'vitest';

import { uploadSinglePhoto } from './mutations';
import type { UploadQueueItem } from '../model/types';

import { MediaSchema, UploadUrlSchema } from '@/shared/api/schemas';

const mocks = vi.hoisted(() => ({
  httpPost: vi.fn(),
  putToS3: vi.fn(),
  onConfirmDone: vi.fn(),
  onUploadUrlsRequest: vi.fn(),
  destroy: vi.fn(),
  createFlow: vi.fn(),
}));

vi.mock('@/shared/api', () => ({
  http: {
    post: mocks.httpPost,
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

vi.mock('../lib/s3-uploader', () => ({
  putToS3: mocks.putToS3,
}));

vi.mock('@/shared/lib/media-upload-logging', () => ({
  createMediaUploadFlow: mocks.createFlow,
}));

function makeItem(overrides: Partial<UploadQueueItem> = {}): UploadQueueItem {
  return {
    id: 'q-1',
    file: new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' }),
    description: '설명',
    status: 'pending',
    progress: 0,
    retryCount: 0,
    ...overrides,
  };
}

function mockHappyResponses() {
  mocks.httpPost
    .mockResolvedValueOnce({ id: 'media-1', state: 'DRAFT' })
    .mockResolvedValueOnce({ url: 'https://s3/url' })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({});
  mocks.putToS3.mockResolvedValueOnce(undefined);
}

describe('uploadSinglePhoto', () => {
  beforeEach(() => {
    mocks.httpPost.mockReset();
    mocks.putToS3.mockReset();
    mocks.onConfirmDone.mockReset();
    mocks.onUploadUrlsRequest.mockReset();
    mocks.destroy.mockReset();
    mocks.createFlow.mockReset();
    mocks.createFlow.mockReturnValue({
      onUploadUrlsRequest: mocks.onUploadUrlsRequest,
      onConfirmDone: mocks.onConfirmDone,
      destroy: mocks.destroy,
    });
  });

  test('올리면 mediaId를 반환하고 단계가 순서대로 진행된다', async () => {
    mockHappyResponses();

    const onStep = vi.fn();
    const onProgress = vi.fn();

    const mediaId = await uploadSinglePhoto(makeItem(), { onStep, onProgress });

    expect(mediaId).toBe('media-1'); // 결과
    expect(onStep.mock.calls.map((c) => c[0])).toEqual([
      'create',
      'urls',
      'put',
      'contents',
      'confirm',
    ]);
    expect(mocks.onConfirmDone).toHaveBeenCalledWith(true); // 성공 기록
    expect(mocks.destroy).toHaveBeenCalled(); // 정리 보장
  });

  test('create로 받은 id가 이후 단계 URL에 일관되게 쓰인다', async () => {
    mocks.httpPost
      .mockResolvedValueOnce({ id: 'XYZ', state: 'DRAFT' })
      .mockResolvedValueOnce({ url: 'u' })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    mocks.putToS3.mockResolvedValueOnce(undefined);

    await uploadSinglePhoto(makeItem(), {
      onStep: vi.fn(),
      onProgress: vi.fn(),
    });

    const urls = mocks.httpPost.mock.calls.map((c) => c[0] as string);
    expect(urls[1]).toContain('XYZ'); // upload-urls
    expect(urls[2]).toContain('XYZ'); // contents
    expect(urls[3]).toContain('XYZ'); // confirm
  });

  test('putToS3의 진행률이 onProgress로 전달된다', async () => {
    mocks.httpPost
      .mockResolvedValueOnce({ id: 'm', state: 'DRAFT' })
      .mockResolvedValueOnce({ url: 'u' })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    mocks.putToS3.mockImplementationOnce(
      (
        _url: string,
        _file: File,
        opts: { onProgress?: (p: number) => void },
      ) => {
        opts.onProgress?.(50);
        return Promise.resolve();
      },
    );

    const onProgress = vi.fn();
    await uploadSinglePhoto(makeItem(), { onStep: vi.fn(), onProgress });

    expect(onProgress).toHaveBeenCalledWith(50);
  });

  test('description 이 공백이면 파일명으로 대체된다', async () => {
    mocks.httpPost
      .mockResolvedValueOnce({ id: 'm', state: 'DRAFT' })
      .mockResolvedValueOnce({ url: 'u' })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    mocks.putToS3.mockResolvedValueOnce(undefined);

    await uploadSinglePhoto(makeItem({ description: '   ' }), {
      onStep: vi.fn(),
      onProgress: vi.fn(),
    });

    expect(mocks.httpPost).toHaveBeenNthCalledWith(
      1,
      '/v1/media',
      { description: 'a.jpg' },
      { schema: MediaSchema },
    );
  });

  test('S3 PUT 실패 시 confirm 호출 없이 throw + destroy', async () => {
    mocks.httpPost
      .mockResolvedValueOnce({ id: 'm', state: 'DRAFT' })
      .mockResolvedValueOnce({ url: 'u' });
    mocks.putToS3.mockRejectedValueOnce(new Error('S3 down'));

    await expect(
      uploadSinglePhoto(makeItem(), { onStep: vi.fn(), onProgress: vi.fn() }),
    ).rejects.toThrow('S3 down');

    expect(mocks.httpPost).toHaveBeenCalledTimes(2);
    expect(mocks.onConfirmDone).not.toHaveBeenCalled();
    expect(mocks.destroy).toHaveBeenCalled();
  });

  test('/contents 실패 시 confirm 미호출 + destroy', async () => {
    mocks.httpPost
      .mockResolvedValueOnce({ id: 'm', state: 'DRAFT' })
      .mockResolvedValueOnce({ url: 'u' })
      .mockRejectedValueOnce(new Error('contents 422'));
    mocks.putToS3.mockResolvedValueOnce(undefined);

    await expect(
      uploadSinglePhoto(makeItem(), { onStep: vi.fn(), onProgress: vi.fn() }),
    ).rejects.toThrow('contents 422');

    expect(mocks.onConfirmDone).not.toHaveBeenCalled();
    expect(mocks.destroy).toHaveBeenCalled();
  });

  test('/confirm 실패 시 flow.onConfirmDone(false) 호출 후 throw', async () => {
    mocks.httpPost
      .mockResolvedValueOnce({ id: 'm', state: 'DRAFT' })
      .mockResolvedValueOnce({ url: 'u' })
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('confirm 500'));
    mocks.putToS3.mockResolvedValueOnce(undefined);

    await expect(
      uploadSinglePhoto(makeItem(), { onStep: vi.fn(), onProgress: vi.fn() }),
    ).rejects.toThrow('confirm 500');

    expect(mocks.onConfirmDone).toHaveBeenCalledWith(false);
    expect(mocks.destroy).toHaveBeenCalled();
  });

  test('각 단계를 정확한 URL·body로 순서대로 호출한다', async () => {
    mockHappyResponses();

    await uploadSinglePhoto(makeItem(), {
      onStep: vi.fn(),
      onProgress: vi.fn(),
    });

    expect(mocks.httpPost).toHaveBeenNthCalledWith(
      1,
      '/v1/media',
      { description: '설명' },
      { schema: MediaSchema },
    );
    expect(mocks.httpPost).toHaveBeenNthCalledWith(
      2,
      '/v1/media/media-1/upload-urls',
      {},
      { schema: UploadUrlSchema },
    );
    expect(mocks.httpPost).toHaveBeenNthCalledWith(
      3,
      '/v1/media/media-1/contents',
      { url: 'https://s3/url' },
      undefined,
    );
    expect(mocks.httpPost).toHaveBeenNthCalledWith(
      4,
      '/v1/media/media-1/confirm',
      {},
      undefined,
    );
    expect(mocks.putToS3).toHaveBeenCalledWith(
      'https://s3/url',
      expect.any(File),
      expect.objectContaining({ onProgress: expect.any(Function) }),
    );
    expect(mocks.onUploadUrlsRequest).toHaveBeenCalledWith('DRAFT');
  });

  test('contents에는 presigned URL의 쿼리스트링을 제거한 객체 URL을 보낸다', async () => {
    mocks.httpPost
      .mockResolvedValueOnce({ id: 'media-1', state: 'DRAFT' })
      .mockResolvedValueOnce({
        url: 'https://s3/bucket/media/media-1/original?X-Amz-Signature=abc&X-Amz-Expires=180',
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    mocks.putToS3.mockResolvedValueOnce(undefined);

    await uploadSinglePhoto(makeItem(), {
      onStep: vi.fn(),
      onProgress: vi.fn(),
    });

    // PUT은 쿼리 포함 presigned URL로, contents는 쿼리 제거한 객체 URL로
    expect(mocks.putToS3).toHaveBeenCalledWith(
      'https://s3/bucket/media/media-1/original?X-Amz-Signature=abc&X-Amz-Expires=180',
      expect.any(File),
      expect.anything(),
    );
    expect(mocks.httpPost).toHaveBeenNthCalledWith(
      3,
      '/v1/media/media-1/contents',
      { url: 'https://s3/bucket/media/media-1/original' },
      undefined,
    );
  });

  test('signal 전달 시 각 http.post 와 putToS3 에 그대로 전파', async () => {
    mockHappyResponses();

    const controller = new AbortController();
    await uploadSinglePhoto(makeItem(), {
      onStep: vi.fn(),
      onProgress: vi.fn(),
      signal: controller.signal,
    });

    // create·upload-urls는 schema도 함께 실리므로 signal 포함 여부만 검증
    for (const call of mocks.httpPost.mock.calls) {
      expect(call[2]).toMatchObject({ signal: controller.signal });
    }
    expect(mocks.putToS3).toHaveBeenCalledWith(
      'https://s3/url',
      expect.any(File),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
