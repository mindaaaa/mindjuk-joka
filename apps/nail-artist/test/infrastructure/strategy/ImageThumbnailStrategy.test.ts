const mockGet = jest.fn();
const mockPut = jest.fn();
const mockExtractImageThumbnail = jest.fn();
const mockThumbnailFrom = jest.fn((params) => ({ ...params, __thumbnail: true }));
const mockImagesPort = { __images: true };

jest.mock('@joka/core/src/model/Url', () => ({
  Url: {
    from: (value: string) => ({ fullPath: value }),
  },
}));

jest.mock('@joka/domain-media/src/domain/Thumbnail', () => ({
  Thumbnail: { from: mockThumbnailFrom },
}));

jest.mock('@joka/infra-thumbnail/src', () => ({
  extractImageThumbnail: mockExtractImageThumbnail,
}));

jest.mock(
  '@joka/infra-object-storage/src/infrastructure/impl/S3Client',
  () => ({
    S3Client: {
      getInstance: () => ({ get: mockGet, put: mockPut }),
    },
  }),
);

jest.mock('../../../src/application/config', () => ({
  __esModule: true,
  default: {
    get images() {
      return mockImagesPort;
    },
  },
}));

import { ImageThumbnailStrategy } from '../../../src/infrastructure/strategy/ImageThumbnailStrategy';

const createContent = () => ({
  url: { fullPath: 'https://s3/bucket/media/abc/original' },
  mimeType: { value: 'image/jpeg' },
});

describe('ImageThumbnailStrategy', () => {
  let strategy: ImageThumbnailStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new ImageThumbnailStrategy();
  });

  describe('supports', () => {
    it('image/* 는 지원하고 video/* 는 지원하지 않는다', () => {
      expect(strategy.supports('image/png')).toBe(true);
      expect(strategy.supports('image/jpeg')).toBe(true);
      expect(strategy.supports('video/mp4')).toBe(false);
    });
  });

  describe('extract', () => {
    it('원본 get → Images 변환 → thumbnail.jpg PUT → Thumbnail 반환', async () => {
      // given
      const content = createContent();
      const original = new Uint8Array([1, 2, 3]).buffer;
      const bytes = new Uint8Array([9, 9]).buffer;
      mockGet.mockResolvedValue(original);
      mockExtractImageThumbnail.mockResolvedValue({
        bytes,
        blurhash: 'LBLURHASH',
        mimeType: 'image/jpeg',
      });
      mockPut.mockResolvedValue({ size: 2, eTag: 'put-etag' });

      // when
      const result = await strategy.extract(content as any);

      // then
      expect(mockGet).toHaveBeenCalledWith(content.url);
      expect(mockExtractImageThumbnail).toHaveBeenCalledWith(
        mockImagesPort,
        original,
      );
      // 썸네일 URL은 원본의 마지막 세그먼트를 thumbnail.jpg로 치환
      expect(mockPut).toHaveBeenCalledWith(
        { fullPath: 'https://s3/bucket/media/abc/thumbnail.jpg' },
        bytes,
        'image/jpeg',
      );
      expect(mockThumbnailFrom).toHaveBeenCalledWith({
        url: 'https://s3/bucket/media/abc/thumbnail.jpg',
        size: 2,
        eTag: 'put-etag',
        mimeType: 'image/jpeg',
        blurhash: 'LBLURHASH',
      });
      expect(result).toEqual(
        expect.objectContaining({ blurhash: 'LBLURHASH', __thumbnail: true }),
      );
    });

    it('Images 변환이 실패하면 R2에 아무것도 쓰지 않는다(write-after-compute)', async () => {
      // given
      const content = createContent();
      mockGet.mockResolvedValue(new Uint8Array([1]).buffer);
      mockExtractImageThumbnail.mockRejectedValue(new Error('images failed'));

      // when & then
      await expect(strategy.extract(content as any)).rejects.toThrow(
        'images failed',
      );
      expect(mockPut).not.toHaveBeenCalled();
    });
  });
});
