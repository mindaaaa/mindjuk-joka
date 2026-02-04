import { Url } from '@joka/core/src/model/Url';

import { S3Client } from '../../../src/infrastructure/impl/S3Client';

const TEST_BUCKET = process.env.MINIO_BUCKET_NAME!;
console.log(TEST_BUCKET);
const TEST_ENDPOINT = process.env.MINIO_ENDPOINT!;
const TEST_ACCESS_KEY = process.env.MINIO_ACCESS_KEY!;
const TEST_SECRET_KEY = process.env.MINIO_SECRET_KEY!;

/**
 * S3Client 통합 테스트
 *
 * 이 테스트는 로컬 MinIO가 실행 중일 때만 동작합니다.
 * MinIO 실행: docker compose -f infra/local/docker-compose.yaml up -d
 */
describe('S3Client Integration', () => {
  beforeEach(() => {
    S3Client.clearInstances();
  });

  afterEach(() => {
    S3Client.clearInstances();
  });

  describe('init / getInstance', () => {
    it('버킷별로 싱글톤 인스턴스를 생성한다', () => {
      // given
      const config = {
        accessKeyId: TEST_ACCESS_KEY,
        secretAccessKey: TEST_SECRET_KEY,
        bucket: TEST_BUCKET,
        endpoint: TEST_ENDPOINT,
      };

      // when
      S3Client.init(config);
      const instance1 = S3Client.getInstance(TEST_BUCKET);
      const instance2 = S3Client.getInstance(TEST_BUCKET);

      // then
      expect(instance1).toBe(instance2);
    });

    it('이미 초기화된 버킷으로 다시 초기화하면 에러를 던진다', () => {
      // given
      const config = {
        accessKeyId: TEST_ACCESS_KEY,
        secretAccessKey: TEST_SECRET_KEY,
        bucket: TEST_BUCKET,
        endpoint: TEST_ENDPOINT,
      };
      S3Client.init(config);

      // when & then
      expect(() => S3Client.init(config)).toThrow(
        'S3_CLIENT_ALREADY_INITIALIZED',
      );
    });

    it('초기화되지 않은 버킷의 인스턴스를 요청하면 에러를 던진다', () => {
      // when & then
      expect(() => S3Client.getInstance('non-existent-bucket')).toThrow(
        'S3_CLIENT_NOT_INITIALIZED',
      );
    });
  });

  describe('MinIO 통합 테스트', () => {
    let client: S3Client;

    beforeEach(() => {
      S3Client.init({
        accessKeyId: TEST_ACCESS_KEY,
        secretAccessKey: TEST_SECRET_KEY,
        bucket: TEST_BUCKET,
        endpoint: TEST_ENDPOINT,
      });
      client = S3Client.getInstance(TEST_BUCKET);
    });

    it('Presigned URL로 파일을 업로드하고 head로 조회한다', async () => {
      // given
      const testKey = `test-${Date.now()}.txt`;
      const testContent = 'Hello, MinIO!';

      // when: Presigned URL 발급
      const uploadUrl = await client.getPresignedUrlForUpload(
        TEST_BUCKET,
        testKey,
      );

      // then: Presigned URL이 발급되었는지 확인
      expect(uploadUrl.fullPath).toContain(TEST_BUCKET);
      expect(uploadUrl.fullPath).toContain(testKey);
      expect(uploadUrl.fullPath).toContain('X-Amz-Signature');

      // when: Presigned URL로 파일 업로드
      const uploadResponse = await fetch(uploadUrl.fullPath, {
        method: 'PUT',
        body: testContent,
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      // then: 업로드 성공
      expect(uploadResponse.ok).toBe(true);

      // when: head로 객체 조회
      const objectUrl = Url.from(`${TEST_ENDPOINT}/${testKey}`);
      const bucketObject = await client.head(objectUrl);

      // then: 객체 메타데이터 확인
      expect(bucketObject).not.toBeNull();
      expect(bucketObject?.key).toBe(testKey);
      expect(bucketObject?.size).toBe(testContent.length);
      expect(bucketObject?.bucket).toBe(TEST_BUCKET);
    });

    it('Presigned URL로 파일을 다운로드한다', async () => {
      // given
      const testKey = `test-download-${Date.now()}.txt`;
      const testContent = 'Download test content';

      // 먼저 파일 업로드
      const uploadUrl = await client.getPresignedUrlForUpload(
        TEST_BUCKET,
        testKey,
      );
      await fetch(uploadUrl.fullPath, {
        method: 'PUT',
        body: testContent,
        headers: { 'Content-Type': 'text/plain' },
      });

      // when: 다운로드용 Presigned URL 발급
      const downloadUrl = await client.getPresignedUrl(TEST_BUCKET, testKey);

      // then: Presigned URL이 발급되었는지 확인
      expect(downloadUrl.fullPath).toContain('X-Amz-Signature');

      // when: Presigned URL로 파일 다운로드
      const downloadResponse = await fetch(downloadUrl.fullPath);
      const downloadedContent = await downloadResponse.text();

      // then: 다운로드 성공 및 내용 확인
      expect(downloadResponse.ok).toBe(true);
      expect(downloadedContent).toBe(testContent);
    });

    it('존재하지 않는 객체를 head로 조회하면 null을 반환한다', async () => {
      // given
      const nonExistentUrl = Url.from(`${TEST_ENDPOINT}/non-existent-file.txt`);

      // when
      const result = await client.head(nonExistentUrl);

      // then
      expect(result).toBeNull();
    });

    it('존재하지 않는 객체를 headOrThrow로 조회하면 에러를 던진다', async () => {
      // given
      const nonExistentUrl = Url.from(`${TEST_ENDPOINT}/non-existent-file.txt`);

      // when & then
      await expect(client.headOrThrow(nonExistentUrl)).rejects.toThrow(
        'OBJECT_NOT_FOUND',
      );
    });

    it('deleteMany로 여러 객체를 삭제한다', async () => {
      // given: 테스트용 파일 3개 업로드
      const testKeys = [
        `test-delete-${Date.now()}-1.txt`,
        `test-delete-${Date.now()}-2.txt`,
        `test-delete-${Date.now()}-3.txt`,
      ];

      for (const key of testKeys) {
        const uploadUrl = await client.getPresignedUrlForUpload(
          TEST_BUCKET,
          key,
        );
        await fetch(uploadUrl.fullPath, {
          method: 'PUT',
          body: 'test content',
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      // 업로드 확인
      for (const key of testKeys) {
        const objectUrl = Url.from(`${TEST_ENDPOINT}/${key}`);
        const object = await client.head(objectUrl);
        expect(object).not.toBeNull();
      }

      // when: 여러 객체 삭제
      const result = await client.deleteMany(testKeys);

      // then: 삭제 성공
      expect(result).toBeNull();

      // then: 삭제된 객체들이 더 이상 존재하지 않음
      for (const key of testKeys) {
        const objectUrl = Url.from(`${TEST_ENDPOINT}/${key}`);
        const object = await client.head(objectUrl);
        expect(object).toBeNull();
      }
    });

    it('deleteMany에 빈 배열을 전달하면 아무 작업도 하지 않는다', async () => {
      // when
      const result = await client.deleteMany([]);

      // then
      expect(result).toBeNull();
    });
  });
});
