import { z } from 'zod';

import { Content } from '../../src/domain/Content';
import { Thumbnail } from '../../src/domain/Thumbnail';

jest.mock('@joka/core/src/model/Url', () => ({
  Url: {
    from: jest.fn((value: string) => ({
      fullPath: value,
    })),
    Schema: z.string(),
  },
}));

jest.mock('../../../lib-mime/src/domain/MimeType', () => ({
  MimeType: {
    from: jest.fn((value: string) => ({
      value,
    })),
    Schema: z.string(),
  },
}));

jest.mock('../../src/domain/Thumbnail', () => ({
  Thumbnail: {
    from: jest.fn((params) => ({
      ...params,
      url: { path: params.url },
      mimeType: { value: params.mimeType },
      data: {
        url: params.url,
        size: params.size,
        eTag: params.eTag,
        mimeType: params.mimeType,
        blurhash: params.blurhash,
      },
    })),
    Schema: z.object({
      url: z.string(),
      size: z.number(),
      eTag: z.string(),
      mimeType: z.string(),
      blurhash: z.string(),
    }),
  },
}));

describe('Content', () => {
  describe('from', () => {
    it('썸네일이 있는 Content 객체를 생성한다', () => {
      // given
      const thumbnailParams = {
        url: 'http://example.com/thumbnail.png',
        size: 512,
        eTag: 'thumb-etag',
        mimeType: 'image/png',
        blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      };
      const thumbnail = Thumbnail.from(thumbnailParams);

      const params = {
        url: 'http://example.com/content.mp4',
        size: 10240,
        eTag: 'content-etag',
        mimeType: 'video/mp4',
        thumbnail,
      };

      // when
      const content = Content.from(params);

      // then
      expect(content).toBeInstanceOf(Content);
      expect(content.url.fullPath).toBe(params.url);
      expect(content.size).toBe(params.size);
      expect(content.eTag).toBe(params.eTag);
      expect(content.mimeType.value).toBe(params.mimeType);
      expect(content.thumbnail).toBe(thumbnail);
    });

    it('썸네일이 없는 Content 객체를 생성한다', () => {
      // given
      const params = {
        url: 'http://example.com/content.mp4',
        size: 10240,
        eTag: 'content-etag',
        mimeType: 'video/mp4',
        thumbnail: null,
      };

      // when
      const content = Content.from(params);

      // then
      expect(content).toBeInstanceOf(Content);
      expect(content.thumbnail).toBeNull();
    });
  });

  describe('attachThumbnail', () => {
    it('thumbnail만 채운 새 Content를 반환한다(불변)', () => {
      // given
      const content = Content.from({
        url: 'http://example.com/content.jpg',
        size: 10240,
        eTag: 'content-etag',
        mimeType: 'image/jpeg',
        thumbnail: null,
      });
      const thumbnail = Thumbnail.from({
        url: 'http://example.com/thumbnail.jpg',
        size: 512,
        eTag: 'thumb-etag',
        mimeType: 'image/jpeg',
        blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      });

      // when
      const attached = content.attachThumbnail(thumbnail);

      // then
      expect(attached).toBeInstanceOf(Content);
      expect(attached).not.toBe(content); // 새 인스턴스
      expect(content.thumbnail).toBeNull(); // 원본 불변
      expect(attached.thumbnail).toBe(thumbnail);
      expect(attached.url).toBe(content.url);
      expect(attached.size).toBe(content.size);
      expect(attached.eTag).toBe(content.eTag);
      expect(attached.mimeType).toBe(content.mimeType);
    });
  });

  describe('data', () => {
    it('썸네일이 있을 때 객체 데이터를 반환한다', () => {
      // given
      const thumbnailParams = {
        url: 'http://example.com/thumbnail.png',
        size: 512,
        eTag: 'thumb-etag',
        mimeType: 'image/png',
        blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      };
      const thumbnail = Thumbnail.from(thumbnailParams);

      const params = {
        url: 'http://example.com/content.mp4',
        size: 10240,
        eTag: 'content-etag',
        mimeType: 'video/mp4',
        thumbnail,
      };
      const content = Content.from(params);

      // when
      const data = content.data;

      // then
      expect(data.url).toBe(params.url);
      expect(data.size).toBe(params.size);
      expect(data.eTag).toBe(params.eTag);
      expect(data.mimeType).toBe(params.mimeType);
      expect(data.thumbnail).toEqual(thumbnail.data);
    });

    it('썸네일이 없을 때 thumbnail을 null로 반환한다', () => {
      // given
      const params = {
        url: 'http://example.com/content.mp4',
        size: 10240,
        eTag: 'content-etag',
        mimeType: 'video/mp4',
        thumbnail: null,
      };
      const content = Content.from(params);

      // when
      const data = content.data;

      // then
      expect(data.thumbnail).toBeNull();
    });
  });
});
