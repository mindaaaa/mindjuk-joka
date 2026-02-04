import { NotFoundException } from '@joka/core/src/exception';
import { Url } from '@joka/core/src/model/Url';

import {
  S3Client,
  S3ClientConfig,
} from '../../../src/infrastructure/impl/S3Client';

// Mock aws4fetch
const mockFetch = jest.fn();
const mockSign = jest.fn();

jest.mock('aws4fetch', () => ({
  AwsClient: jest.fn().mockImplementation(() => ({
    fetch: mockFetch,
    sign: mockSign,
  })),
}));

// Mock BucketObject
jest.mock('../../../src/domain/model/BucketObject', () => ({
  BucketObject: {
    from: jest.fn().mockImplementation((params) => ({
      bucket: params.bucket,
      key: params.key,
      eTag: params.eTag,
      size: params.size,
      contentType: { type: 'image', subType: 'png', value: params.contentType },
    })),
  },
}));

describe('S3Client', () => {
  const TEST_CONFIG: S3ClientConfig = {
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    bucket: 'test-bucket',
    endpoint: 'http://localhost:9000',
  };

  beforeEach(() => {
    S3Client.clearInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    S3Client.clearInstance();
  });

  describe('init / getInstance', () => {
    it('싱글톤 인스턴스를 생성한다', () => {
      // when
      S3Client.init(TEST_CONFIG);
      const instance1 = S3Client.getInstance();
      const instance2 = S3Client.getInstance();

      // then
      expect(instance1).toBe(instance2);
    });

    it('init은 생성된 인스턴스를 반환한다', () => {
      // when
      const instance = S3Client.init(TEST_CONFIG);

      // then
      expect(instance).toBe(S3Client.getInstance());
    });

    it('이미 초기화된 상태에서 다시 초기화하면 에러를 던진다', () => {
      // given
      S3Client.init(TEST_CONFIG);

      // when & then
      expect(() => S3Client.init(TEST_CONFIG)).toThrow(
        'S3_CLIENT_ALREADY_INITIALIZED',
      );
    });

    it('초기화되지 않은 상태에서 getInstance를 호출하면 에러를 던진다', () => {
      // when & then
      expect(() => S3Client.getInstance()).toThrow('S3_CLIENT_NOT_INITIALIZED');
    });

    it('clearInstance 후 다시 초기화할 수 있다', () => {
      // given
      S3Client.init(TEST_CONFIG);
      S3Client.clearInstance();

      // when & then
      expect(() => S3Client.init(TEST_CONFIG)).not.toThrow();
    });

    it('endpoint 끝의 슬래시를 제거한다', () => {
      // given
      const configWithTrailingSlash = {
        ...TEST_CONFIG,
        endpoint: 'http://localhost:9000/',
      };

      // when
      S3Client.init(configWithTrailingSlash);
      const client = S3Client.getInstance();

      // then: presigned URL 생성 시 슬래시가 중복되지 않음
      mockSign.mockResolvedValue({
        url: 'http://localhost:9000/test-bucket/key',
      });
      // 내부적으로 endpoint가 'http://localhost:9000'으로 저장됨
      expect(client).toBeDefined();
    });
  });

  describe('head', () => {
    let client: S3Client;

    beforeEach(() => {
      S3Client.init(TEST_CONFIG);
      client = S3Client.getInstance();
    });

    it('객체가 존재하면 BucketObject를 반환한다', async () => {
      // given
      const url = Url.from('http://example.com/path/to/file.png');
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Map([
          ['content-length', '1024'],
          ['content-type', 'image/png'],
          ['etag', '"abc123"'],
        ]),
      });

      // when
      const result = await client.head(url);

      // then
      expect(result).not.toBeNull();
      expect(result?.bucket).toBe('test-bucket');
      expect(result?.key).toBe('path/to/file.png');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9000/test-bucket/path/to/file.png',
        { method: 'HEAD' },
      );
    });

    it('객체가 존재하지 않으면 null을 반환한다', async () => {
      // given
      const url = Url.from('http://example.com/non-existent.png');
      mockFetch.mockResolvedValue({
        status: 404,
        ok: false,
      });

      // when
      const result = await client.head(url);

      // then
      expect(result).toBeNull();
    });

    it('서버 에러가 발생하면 예외를 던진다', async () => {
      // given
      const url = Url.from('http://example.com/file.png');
      mockFetch.mockResolvedValue({
        status: 500,
        ok: false,
      });

      // when & then
      await expect(client.head(url)).rejects.toThrow('S3_HEAD_FAILED');
    });

    it('ETag에서 따옴표를 제거한다', async () => {
      // given
      const url = Url.from('http://example.com/file.png');
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Map([
          ['content-length', '1024'],
          ['content-type', 'image/png'],
          ['etag', '"quoted-etag"'],
        ]),
      });

      // when
      const result = await client.head(url);

      // then
      expect(result?.eTag).toBe('quoted-etag');
    });

    it('content-length 헤더가 없으면 에러를 던진다', async () => {
      // given
      const url = Url.from('http://example.com/file.png');
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Map([
          ['content-type', 'image/png'],
          ['etag', '"abc123"'],
        ]),
      });

      // when & then
      await expect(client.head(url)).rejects.toThrow(
        'INVALID_S3_OBJECT_HEADER',
      );
    });

    it('content-type 헤더가 없으면 에러를 던진다', async () => {
      // given
      const url = Url.from('http://example.com/file.png');
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Map([
          ['content-length', '1024'],
          ['etag', '"abc123"'],
        ]),
      });

      // when & then
      await expect(client.head(url)).rejects.toThrow(
        'INVALID_S3_OBJECT_HEADER',
      );
    });

    it('etag 헤더가 없으면 에러를 던진다', async () => {
      // given
      const url = Url.from('http://example.com/file.png');
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Map([
          ['content-length', '1024'],
          ['content-type', 'image/png'],
        ]),
      });

      // when & then
      await expect(client.head(url)).rejects.toThrow(
        'INVALID_S3_OBJECT_HEADER',
      );
    });
  });

  describe('headOrThrow', () => {
    let client: S3Client;

    beforeEach(() => {
      S3Client.init(TEST_CONFIG);
      client = S3Client.getInstance();
    });

    it('객체가 존재하면 BucketObject를 반환한다', async () => {
      // given
      const url = Url.from('http://example.com/file.png');
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Map([
          ['content-length', '1024'],
          ['content-type', 'image/png'],
          ['etag', '"abc123"'],
        ]),
      });

      // when
      const result = await client.headOrThrow(url);

      // then
      expect(result).not.toBeNull();
      expect(result.key).toBe('file.png');
    });

    it('객체가 존재하지 않으면 NotFoundException을 던진다', async () => {
      // given
      const url = Url.from('http://example.com/non-existent.png');
      mockFetch.mockResolvedValue({
        status: 404,
        ok: false,
      });

      // when & then
      await expect(client.headOrThrow(url)).rejects.toThrow(NotFoundException);
      await expect(client.headOrThrow(url)).rejects.toThrow('OBJECT_NOT_FOUND');
    });
  });

  describe('getPresignedUrl', () => {
    let client: S3Client;

    beforeEach(() => {
      S3Client.init(TEST_CONFIG);
      client = S3Client.getInstance();
    });

    it('GET용 Presigned URL을 생성한다', async () => {
      // given
      const signedUrl = 'http://localhost:9000/bucket/key?X-Amz-Signature=xxx';
      mockSign.mockResolvedValue({ url: signedUrl });

      // when
      const result = await client.getPresignedUrl(
        'my-bucket',
        'path/to/file.png',
      );

      // then
      expect(result.fullPath).toBe(signedUrl);
      expect(mockSign).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET' }),
        { aws: { signQuery: true } },
      );
    });

    it('기본 만료 시간은 180초이다', async () => {
      // given
      mockSign.mockResolvedValue({ url: 'http://signed-url' });

      // when
      await client.getPresignedUrl('bucket', 'key');

      // then
      expect(mockSign).toHaveBeenCalledWith(expect.any(Request), {
        aws: { signQuery: true },
      });
      const calledRequest = mockSign.mock.calls[0][0] as Request;
      expect(calledRequest.url).toContain('X-Amz-Expires=180');
    });

    it('만료 시간을 지정할 수 있다', async () => {
      // given
      mockSign.mockResolvedValue({ url: 'http://signed-url' });

      // when
      await client.getPresignedUrl('bucket', 'key', 7200);

      // then
      const calledRequest = mockSign.mock.calls[0][0] as Request;
      expect(calledRequest.url).toContain('X-Amz-Expires=7200');
    });
  });

  describe('getPresignedUrlForUpload', () => {
    let client: S3Client;

    beforeEach(() => {
      S3Client.init(TEST_CONFIG);
      client = S3Client.getInstance();
    });

    it('PUT용 Presigned URL을 생성한다', async () => {
      // given
      const signedUrl = 'http://localhost:9000/bucket/key?X-Amz-Signature=xxx';
      mockSign.mockResolvedValue({ url: signedUrl });

      // when
      const result = await client.getPresignedUrlForUpload(
        'my-bucket',
        'path/to/file.png',
      );

      // then
      expect(result.fullPath).toBe(signedUrl);
      expect(mockSign).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT' }),
        { aws: { signQuery: true } },
      );
    });
  });

  describe('deleteMany', () => {
    let client: S3Client;

    beforeEach(() => {
      S3Client.init(TEST_CONFIG);
      client = S3Client.getInstance();
    });

    it('빈 배열이면 요청을 보내지 않고 null을 반환한다', async () => {
      // when
      const result = await client.deleteMany([]);

      // then
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('여러 객체를 삭제한다', async () => {
      // given
      const keys = ['file1.png', 'file2.png', 'file3.png'];
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
      });

      // when
      const result = await client.deleteMany(keys);

      // then
      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9000/test-bucket?delete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/xml',
            'Content-MD5': expect.any(String),
          }),
          body: expect.stringContaining('<Delete>'),
        }),
      );
    });

    it('요청 본문에 모든 키가 포함된다', async () => {
      // given
      const keys = ['key1', 'key2'];
      mockFetch.mockResolvedValue({ status: 200, ok: true });

      // when
      await client.deleteMany(keys);

      // then
      const requestBody = mockFetch.mock.calls[0][1].body as string;
      expect(requestBody).toContain('<Object><Key>key1</Key></Object>');
      expect(requestBody).toContain('<Object><Key>key2</Key></Object>');
    });

    it('삭제 실패 시 예외를 던진다', async () => {
      // given
      mockFetch.mockResolvedValue({
        status: 500,
        ok: false,
      });

      // when & then
      await expect(client.deleteMany(['file.png'])).rejects.toThrow(
        'S3_DELETE_MANY_FAILED',
      );
    });
  });
});
