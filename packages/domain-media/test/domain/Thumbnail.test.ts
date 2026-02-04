import { z } from 'zod';

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

describe('Thumbnail', () => {
  describe('from', () => {
    it('유효한 파라미터로 Thumbnail 객체를 생성한다', () => {
      // given
      const params = {
        url: 'http://example.com/thumbnail.png',
        size: 1024,
        eTag: 'etag-123',
        mimeType: 'image/png',
        blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      };

      // when
      const thumbnail = Thumbnail.from(params);

      // then
      expect(thumbnail).toBeInstanceOf(Thumbnail);
      expect(thumbnail.url.fullPath).toBe(params.url);
      expect(thumbnail.size).toBe(params.size);
      expect(thumbnail.eTag).toBe(params.eTag);
      expect(thumbnail.mimeType.value).toBe(params.mimeType);
      expect(thumbnail.blurhash).toBe(params.blurhash);
    });
  });

  describe('data', () => {
    it('객체 데이터를 반환한다', () => {
      // given
      const params = {
        url: 'http://example.com/thumbnail.png',
        size: 2048,
        eTag: 'etag-456',
        mimeType: 'image/jpeg',
        blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
      };
      const thumbnail = Thumbnail.from(params);

      // when
      const data = thumbnail.data;

      // then
      expect(data.url).toBe(params.url);
      expect(data.size).toBe(params.size);
      expect(data.eTag).toBe(params.eTag);
      expect(data.mimeType).toBe(params.mimeType);
      expect(data.blurhash).toBe(params.blurhash);
    });
  });
});
