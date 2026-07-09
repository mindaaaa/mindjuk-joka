const mockGetPresignedUrl = jest.fn();
const mockPut = jest.fn();
const mockContainerFetch = jest.fn();
const mockGetContainer = jest.fn(() => ({ fetch: mockContainerFetch }));
const mockThumbnailFrom = jest.fn((params) => ({ ...params, __thumbnail: true }));

jest.mock('@cloudflare/containers', () => ({
  getContainer: (...args: unknown[]) => mockGetContainer(...args),
}));

jest.mock('@joka/core/src/model/Url', () => ({
  Url: {
    from: (value: string) => ({ fullPath: value }),
  },
}));

jest.mock('@joka/domain-media/src/domain/Thumbnail', () => ({
  Thumbnail: { from: mockThumbnailFrom },
}));

jest.mock(
  '@joka/infra-object-storage/src/infrastructure/impl/S3Client',
  () => ({
    S3Client: {
      getInstance: () => ({
        getPresignedUrl: mockGetPresignedUrl,
        put: mockPut,
      }),
    },
  }),
);

jest.mock('../../../src/application/config', () => ({
  __esModule: true,
  default: {
    get mediaBucketName() {
      return 'bucket';
    },
    get nailClipper() {
      return { __nailClipper: true };
    },
  },
}));

import { VideoThumbnailStrategy } from '../../../src/infrastructure/strategy/VideoThumbnailStrategy';

// content.url 은 Url 값객체 — 파생에 쓰는 fullPath/getPath 만 mock 한다.
const createContent = () => ({
  url: {
    fullPath: 'https://s3/bucket/media/abc/original',
    getPath: () => 'bucket/media/abc/original',
  },
  mimeType: { value: 'video/mp4' },
});

const gifResponse = (bytes: ArrayBuffer, blurhash: string) =>
  ({
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(bytes),
    headers: { get: (name: string) => (name === 'X-Blurhash' ? blurhash : null) },
  }) as unknown as Response;

describe('VideoThumbnailStrategy', () => {
  let strategy: VideoThumbnailStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new VideoThumbnailStrategy();
  });

  describe('supports', () => {
    it('video/* 는 지원하고 image/* 는 지원하지 않는다', () => {
      expect(strategy.supports('video/mp4')).toBe(true);
      expect(strategy.supports('image/jpeg')).toBe(false);
    });
  });

  describe('extract', () => {
    it('presigned 발급 → 컨테이너 위임 → thumbnail.gif PUT → Thumbnail 반환', async () => {
      // given
      const content = createContent();
      const bytes = new Uint8Array([7, 7, 7]).buffer;
      mockGetPresignedUrl.mockResolvedValue({ fullPath: 'https://signed/url' });
      mockContainerFetch.mockResolvedValue(gifResponse(bytes, 'LGIFHASH'));
      mockPut.mockResolvedValue({ size: 3, eTag: 'gif-etag' });

      // when
      const result = await strategy.extract(content as any);

      // then: 버킷 상대 key + 600초 만료로 presign
      expect(mockGetPresignedUrl).toHaveBeenCalledWith(
        'bucket',
        'media/abc/original',
        600,
      );
      // mediaCid 로 컨테이너 라우팅
      expect(mockGetContainer).toHaveBeenCalledWith({ __nailClipper: true }, 'abc');
      // 컨테이너엔 presigned URL 을 body 로 전달
      const sentRequest = mockContainerFetch.mock.calls[0][0] as Request;
      expect(await sentRequest.json()).toEqual({ sourceUrl: 'https://signed/url' });
      // 썸네일 URL 은 원본 마지막 세그먼트를 thumbnail.gif 로 치환
      expect(mockPut).toHaveBeenCalledWith(
        { fullPath: 'https://s3/bucket/media/abc/thumbnail.gif' },
        bytes,
        'image/gif',
      );
      expect(mockThumbnailFrom).toHaveBeenCalledWith({
        url: 'https://s3/bucket/media/abc/thumbnail.gif',
        size: 3,
        eTag: 'gif-etag',
        mimeType: 'image/gif',
        blurhash: 'LGIFHASH',
      });
      expect(result).toEqual(
        expect.objectContaining({ blurhash: 'LGIFHASH', __thumbnail: true }),
      );
    });

    it('컨테이너가 실패 응답이면 R2에 아무것도 쓰지 않는다', async () => {
      // given
      const content = createContent();
      mockGetPresignedUrl.mockResolvedValue({ fullPath: 'https://signed/url' });
      mockContainerFetch.mockResolvedValue({ ok: false, status: 422 } as Response);

      // when & then
      await expect(strategy.extract(content as any)).rejects.toThrow(
        'VIDEO_THUMBNAIL_CONTAINER_FAILED',
      );
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('X-Blurhash 헤더가 없으면 R2에 아무것도 쓰지 않는다', async () => {
      // given
      const content = createContent();
      const bytes = new Uint8Array([1]).buffer;
      mockGetPresignedUrl.mockResolvedValue({ fullPath: 'https://signed/url' });
      mockContainerFetch.mockResolvedValue(gifResponse(bytes, ''));

      // when & then
      await expect(strategy.extract(content as any)).rejects.toThrow(
        'VIDEO_THUMBNAIL_MISSING_BLURHASH',
      );
      expect(mockPut).not.toHaveBeenCalled();
    });
  });
});
