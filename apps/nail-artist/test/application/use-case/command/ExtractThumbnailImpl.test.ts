import {
  ConflictException,
  NotImplementedException,
} from '@joka/core/src/exception';

const mockMediaService = {
  getByCid: jest.fn(),
  attachThumbnail: jest.fn(),
};
const mockStrategy = {
  supports: jest.fn(),
  extract: jest.fn(),
};
const mockHeadOrThrow = jest.fn();

jest.mock('../../../../src/application/config', () => ({
  __esModule: true,
  default: {
    get mediaService() {
      return mockMediaService;
    },
    get thumbnailStrategies() {
      return [mockStrategy];
    },
  },
}));

jest.mock(
  '@joka/infra-object-storage/src/infrastructure/impl/S3Client',
  () => ({
    S3Client: {
      getInstance: () => ({ headOrThrow: mockHeadOrThrow }),
    },
  }),
);

import ExtractThumbnailImpl from '../../../../src/application/use-case/command/ExtractThumbnailImpl';

const createMedia = (overrides: Record<string, any> = {}) => ({
  hasNoContent: false,
  content: {
    url: { fullPath: 'https://s3/bucket/media/abc/original' },
    mimeType: { value: 'image/jpeg' },
  },
  ...overrides,
});

describe('ExtractThumbnailImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStrategy.supports.mockReturnValue(true);
  });

  it('getByCid → 원본 확인 → 전략 추출 → attachThumbnail 순으로 처리한다', async () => {
    // given
    const media = createMedia();
    const thumbnail = { blurhash: 'L123' };
    const updated = { state: 'COMPLETE' };
    mockMediaService.getByCid.mockResolvedValue(media);
    mockStrategy.extract.mockResolvedValue(thumbnail);
    mockMediaService.attachThumbnail.mockResolvedValue(updated);

    // when
    const result = await ExtractThumbnailImpl.invoke({ mediaCid: 'abc' });

    // then
    expect(mockMediaService.getByCid).toHaveBeenCalledWith('abc');
    expect(mockHeadOrThrow).toHaveBeenCalledWith(media.content.url);
    expect(mockStrategy.supports).toHaveBeenCalledWith('image/jpeg');
    expect(mockStrategy.extract).toHaveBeenCalledWith(media.content);
    expect(mockMediaService.attachThumbnail).toHaveBeenCalledWith(
      media,
      thumbnail,
    );
    expect(result).toBe(updated);
  });

  it('content가 없으면 ConflictException을 던지고 전략을 호출하지 않는다', async () => {
    // given
    mockMediaService.getByCid.mockResolvedValue(
      createMedia({ hasNoContent: true }),
    );

    // when & then
    await expect(
      ExtractThumbnailImpl.invoke({ mediaCid: 'abc' }),
    ).rejects.toThrow(ConflictException);
    expect(mockStrategy.extract).not.toHaveBeenCalled();
    expect(mockHeadOrThrow).not.toHaveBeenCalled();
  });

  it('지원하는 전략이 없으면 NotImplementedException을 던진다', async () => {
    // given
    mockMediaService.getByCid.mockResolvedValue(createMedia());
    mockStrategy.supports.mockReturnValue(false);

    // when & then
    await expect(
      ExtractThumbnailImpl.invoke({ mediaCid: 'abc' }),
    ).rejects.toThrow(NotImplementedException);
    expect(mockStrategy.extract).not.toHaveBeenCalled();
  });

  it('버전 충돌 시 재로드 후 재부착하며, 전략(Images)은 재호출하지 않는다', async () => {
    // given
    const media = createMedia();
    const reloaded = createMedia();
    const thumbnail = { blurhash: 'L123' };
    const updated = { state: 'COMPLETE' };
    mockMediaService.getByCid
      .mockResolvedValueOnce(media)
      .mockResolvedValueOnce(reloaded);
    mockStrategy.extract.mockResolvedValue(thumbnail);
    mockMediaService.attachThumbnail
      .mockRejectedValueOnce(
        new ConflictException('MEDIA_VERSION_MISMATCHED', ['충돌']),
      )
      .mockResolvedValueOnce(updated);

    // when
    const result = await ExtractThumbnailImpl.invoke({ mediaCid: 'abc' });

    // then
    expect(result).toBe(updated);
    expect(mockStrategy.extract).toHaveBeenCalledTimes(1); // Images 재호출 없음
    expect(mockMediaService.getByCid).toHaveBeenCalledTimes(2); // 최초 + 재로드
    expect(mockMediaService.attachThumbnail).toHaveBeenCalledTimes(2);
    expect(mockMediaService.attachThumbnail).toHaveBeenNthCalledWith(
      2,
      reloaded,
      thumbnail,
    );
  });

  it('버전 충돌이 재시도 한도(3회)를 넘으면 예외를 던진다', async () => {
    // given
    mockMediaService.getByCid.mockResolvedValue(createMedia());
    mockStrategy.extract.mockResolvedValue({ blurhash: 'L123' });
    mockMediaService.attachThumbnail.mockRejectedValue(
      new ConflictException('MEDIA_VERSION_MISMATCHED', ['충돌']),
    );

    // when & then
    await expect(
      ExtractThumbnailImpl.invoke({ mediaCid: 'abc' }),
    ).rejects.toThrow(ConflictException);
    expect(mockMediaService.attachThumbnail).toHaveBeenCalledTimes(3);
  });
});
