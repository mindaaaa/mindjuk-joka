import { z } from 'zod';

import { BucketObject } from '../../src/domain/model/BucketObject';

jest.mock('@joka/lib-mime/src/domain/MimeType', () => ({
  MimeType: {
    from: jest.fn().mockReturnValue({
      type: 'image',
      subType: 'png',
      value: 'image/png',
    }),
    Schema: z.string(),
  },
}));

describe('BucketObject', () => {
  describe('from', () => {
    it('유효한 파라미터로 BucketObject를 생성한다', () => {
      // given
      const params = {
        bucket: 'test-bucket',
        key: 'path/to/file.png',
        eTag: 'abc123',
        size: 1024,
        contentType: 'image/png',
      };

      // when
      const bucketObject = BucketObject.from(params);

      // then
      expect(bucketObject).toBeInstanceOf(BucketObject);
      expect(bucketObject.bucket).toBe('test-bucket');
      expect(bucketObject.key).toBe('path/to/file.png');
      expect(bucketObject.eTag).toBe('abc123');
      expect(bucketObject.size).toBe(1024);
      expect(bucketObject.contentType).toEqual({
        type: 'image',
        subType: 'png',
        value: 'image/png',
      });
    });

    it('bucket이 빈 문자열이면 에러를 던진다', () => {
      // given
      const params = {
        bucket: '',
        key: 'path/to/file.png',
        eTag: 'abc123',
        size: 1024,
        contentType: 'image/png',
      };

      // when & then
      expect(() => BucketObject.from(params)).toThrow();
    });

    it('key가 빈 문자열이면 에러를 던진다', () => {
      // given
      const params = {
        bucket: 'test-bucket',
        key: '',
        eTag: 'abc123',
        size: 1024,
        contentType: 'image/png',
      };

      // when & then
      expect(() => BucketObject.from(params)).toThrow();
    });

    it('eTag가 빈 문자열이면 에러를 던진다', () => {
      // given
      const params = {
        bucket: 'test-bucket',
        key: 'path/to/file.png',
        eTag: '',
        size: 1024,
        contentType: 'image/png',
      };

      // when & then
      expect(() => BucketObject.from(params)).toThrow();
    });

    it('size가 0 이하이면 에러를 던진다', () => {
      // given
      const invalidSizes = [0, -1, -100];

      // when & then
      invalidSizes.forEach((size) => {
        const params = {
          bucket: 'test-bucket',
          key: 'path/to/file.png',
          eTag: 'abc123',
          size,
          contentType: 'image/png',
        };

        expect(() => BucketObject.from(params)).toThrow();
      });
    });
  });

  describe('data', () => {
    it('모든 속성을 포함한 객체를 반환한다', () => {
      // given
      const params = {
        bucket: 'test-bucket',
        key: 'path/to/file.png',
        eTag: 'abc123',
        size: 1024,
        contentType: 'image/png',
      };
      const bucketObject = BucketObject.from(params);

      // when
      const data = bucketObject.data;

      // then
      expect(data).toEqual({
        bucket: 'test-bucket',
        key: 'path/to/file.png',
        eTag: 'abc123',
        size: 1024,
        contentType: {
          type: 'image',
          subType: 'png',
          value: 'image/png',
        },
      });
    });
  });
});
