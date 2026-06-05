import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type Mock,
} from 'vitest';

import { putToS3, S3UploadError } from './s3-uploader';

interface FakeXhr {
  upload: { onprogress: ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  status: number;
  open: Mock;
  setRequestHeader: Mock;
  send: Mock;
  abort: Mock;
}

function createFakeXhr(): FakeXhr {
  const xhr: FakeXhr = {
    upload: { onprogress: null },
    onload: null,
    onerror: null,
    onabort: null,
    status: 0,
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    send: vi.fn(),
    abort: vi.fn(),
  };
  xhr.abort.mockImplementation(() => {
    xhr.onabort?.();
  });
  return xhr;
}

function makeFile(type = 'image/jpeg', name = 'a.jpg', size = 100): File {
  return new File([new Uint8Array(size)], name, { type });
}

function completeWith(xhr: FakeXhr, status: number): void {
  xhr.status = status;
  xhr.onload?.();
}

function emitProgress(
  xhr: FakeXhr,
  loaded: number,
  total: number,
  lengthComputable = true,
): void {
  xhr.upload.onprogress?.({
    lengthComputable,
    loaded,
    total,
  } as ProgressEvent);
}

describe('putToS3', () => {
  let instances: FakeXhr[] = [];

  beforeEach(() => {
    instances = [];
    vi.stubGlobal(
      'XMLHttpRequest',
      // new XMLHttpRequest()로 호출되므로 화살표 함수 불가 (일반 함수로 mock)
      vi.fn(function () {
        const xhr = createFakeXhr();
        instances.push(xhr);
        return xhr;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('200 응답이면 resolve하고 진행률을 전달한다', async () => {
    // given: jpeg 파일 + 진행률 콜백
    const file = makeFile('image/jpeg');
    const onProgress = vi.fn();

    // when: 업로드 시작 → 50% 진행 → 200 완료
    const promise = putToS3('http://s3/url', file, { onProgress });
    const xhr = instances[0];
    emitProgress(xhr, 50, 100);
    completeWith(xhr, 200);

    // then: resolve + 요청 설정 + 진행률(50 → 100)
    await expect(promise).resolves.toBeUndefined();
    expect(xhr.open).toHaveBeenCalledWith('PUT', 'http://s3/url', true);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith(
      'Content-Type',
      'image/jpeg',
    );
    expect(xhr.send).toHaveBeenCalledWith(file);
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  test('빈 type이면 Content-Type을 application/octet-stream으로 보낸다', async () => {
    // given: type이 빈 파일
    const file = makeFile('', 'a.bin', 1);

    // when: 업로드 시작 → 200 완료
    const promise = putToS3('http://s3', file);
    const xhr = instances[0];
    completeWith(xhr, 200);

    // then: octet-stream 폴백
    await promise;
    expect(xhr.setRequestHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/octet-stream',
    );
  });

  test('성공 경계: 200 응답은 resolve한다', async () => {
    const promise = putToS3('http://s3', makeFile());
    completeWith(instances[0], 200);

    await expect(promise).resolves.toBeUndefined();
  });

  test('성공 경계: 299 응답도 resolve한다', async () => {
    const promise = putToS3('http://s3', makeFile());
    completeWith(instances[0], 299);

    await expect(promise).resolves.toBeUndefined();
  });

  test('실패 경계: 300 응답은 reject한다 (2xx 벗어남)', async () => {
    const promise = putToS3('http://s3', makeFile());
    completeWith(instances[0], 300);

    await expect(promise).rejects.toBeInstanceOf(S3UploadError);
    await expect(promise).rejects.toMatchObject({ status: 300 });
  });

  test('5xx 응답이면 status를 담은 S3UploadError로 reject한다', async () => {
    const promise = putToS3('http://s3', makeFile());
    completeWith(instances[0], 500);

    await expect(promise).rejects.toBeInstanceOf(S3UploadError);
    await expect(promise).rejects.toMatchObject({ status: 500 });
  });

  test('진행률은 loaded/total 비율을 반올림해 전달한다', async () => {
    // given
    const onProgress = vi.fn();

    // when: 1/3 진행 (33.33...) → 2/3 진행 (66.66...)
    const promise = putToS3('http://s3', makeFile(), { onProgress });
    const xhr = instances[0];
    emitProgress(xhr, 1, 3);
    emitProgress(xhr, 2, 3);

    // then
    expect(onProgress).toHaveBeenCalledWith(33);
    expect(onProgress).toHaveBeenCalledWith(67);

    completeWith(xhr, 200);
    await promise;
  });

  test('lengthComputable이 false면 진행률을 전달하지 않는다', async () => {
    // given
    const onProgress = vi.fn();

    // when: 크기를 알 수 없는 진행 이벤트
    const promise = putToS3('http://s3', makeFile(), { onProgress });
    const xhr = instances[0];
    emitProgress(xhr, 50, 100, false);

    // then: onProgress 미호출 (완료 전까지)
    expect(onProgress).not.toHaveBeenCalled();

    completeWith(xhr, 200);
    await promise;
  });

  test('onProgress를 넘기지 않아도 진행률 이벤트에서 터지지 않는다', async () => {
    // given: 콜백 없이 업로드
    const promise = putToS3('http://s3', makeFile());
    const xhr = instances[0];

    // when: 진행 이벤트 발생 (콜백 없음)
    emitProgress(xhr, 50, 100);

    // then: 에러 없이 정상 완료
    completeWith(xhr, 200);
    await expect(promise).resolves.toBeUndefined();
  });

  test('네트워크 에러면 status 0의 S3UploadError로 reject한다', async () => {
    const promise = putToS3('http://s3', makeFile());

    instances[0].onerror?.();

    await expect(promise).rejects.toMatchObject({ status: 0 });
  });

  test('signal이 abort되면 xhr.abort를 호출하고 AbortError로 reject한다', async () => {
    // given: 취소 컨트롤러와 함께 업로드 시작
    const controller = new AbortController();
    const promise = putToS3('http://s3', makeFile(), {
      signal: controller.signal,
    });

    // when: 취소
    controller.abort();

    // then: xhr 중단 + AbortError
    expect(instances[0].abort).toHaveBeenCalled();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  test('이미 abort된 signal이면 xhr을 만들지 않고 즉시 reject한다', async () => {
    // given: 미리 취소된 컨트롤러
    const controller = new AbortController();
    controller.abort();

    // when & then: 즉시 AbortError + xhr 생성 안 됨
    await expect(
      putToS3('http://s3', makeFile(), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(instances).toHaveLength(0);
  });
});
