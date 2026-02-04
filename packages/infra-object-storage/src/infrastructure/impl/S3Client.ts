import { createHash } from 'node:crypto';

import { NotFoundException, UncaughtException } from '@joka/core/src/exception';
import { Url } from '@joka/core/src/model/Url';
import { Nullable } from '@joka/core/src/type';
import { AwsClient } from 'aws4fetch';

import { BucketObject } from '../../domain/BucketObject';
import { ObjectStorageClient } from '../ObjectStorageClient';

export interface S3ClientConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
}

export class S3Client implements ObjectStorageClient {
  private static instance: Nullable<S3Client> = null;

  private readonly client: AwsClient;
  private readonly bucket: string;
  private readonly endpoint: string;

  static init(config: S3ClientConfig): S3Client {
    if (S3Client.instance) {
      throw new UncaughtException('S3_CLIENT_ALREADY_INITIALIZED', [
        `오브젝트 스토리지 클라이언트가 이미 초기화되어 있습니다.`,
        '관리자에게 문의하세요.',
      ]);
    }

    S3Client.instance = new S3Client(config);

    return S3Client.instance;
  }

  static getInstance(): S3Client {
    if (!S3Client.instance) {
      throw new UncaughtException('S3_CLIENT_NOT_INITIALIZED', [
        `오브젝트 스토리지 클라이언트가 초기화되지 않았습니다.`,
        '관리자에게 문의하세요.',
      ]);
    }

    return S3Client.instance;
  }

  static clearInstance(): void {
    S3Client.instance = null;
  }

  private constructor(config: S3ClientConfig) {
    this.client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: 's3',
      region: 'auto',
    });
    this.bucket = config.bucket;
    this.endpoint = config.endpoint.replace(/\/$/, '');
  }

  async head(url: Url): Promise<BucketObject | null> {
    const objectKey = url.getPath({ withoutBeginningSlash: true });
    const requestUrl = `${this.endpoint}/${this.bucket}/${objectKey}`;

    const response = await this.client.fetch(requestUrl, {
      method: 'HEAD',
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new UncaughtException('S3_HEAD_FAILED', [
        `오브젝트(${objectKey}) 조회에 실패했습니다.`,
        `상태 코드: ${response.status}`,
      ]);
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    const eTag = response.headers.get('etag');

    return BucketObject.from({
      bucket: this.bucket,
      key: objectKey,
      size: contentLength ? parseInt(contentLength, 10) : 0,
      eTag: eTag?.replace(/"/g, '') ?? '',
      contentType: contentType ?? 'application/octet-stream',
    });
  }

  async headOrThrow(url: Url): Promise<BucketObject> {
    const object = await this.head(url);

    if (!object) {
      throw new NotFoundException('OBJECT_NOT_FOUND', [
        `오브젝트(${url.getPath({ withoutBeginningSlash: true })})가 존재하지 않습니다.`,
      ]);
    }

    return object;
  }

  async getPresignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600,
  ): Promise<Url> {
    const requestUrl = `${this.endpoint}/${bucket}/${key}?X-Amz-Expires=${expiresIn}`;

    const signedRequest = await this.client.sign(
      new Request(requestUrl, { method: 'GET' }),
      { aws: { signQuery: true } },
    );

    return Url.from(signedRequest.url);
  }

  async getPresignedUrlForUpload(
    bucket: string,
    key: string,
    expiresIn: number = 3600,
  ): Promise<Url> {
    const requestUrl = `${this.endpoint}/${bucket}/${key}?X-Amz-Expires=${expiresIn}`;

    const signedRequest = await this.client.sign(
      new Request(requestUrl, { method: 'PUT' }),
      { aws: { signQuery: true } },
    );

    return Url.from(signedRequest.url);
  }

  async deleteMany(keys: string[]): Promise<null> {
    if (keys.length === 0) {
      return null;
    }

    const objectsXml = keys
      .map((key) => `<Object><Key>${key}</Key></Object>`)
      .join('');
    const requestBody = `<?xml version="1.0" encoding="UTF-8"?><Delete>${objectsXml}</Delete>`;

    const requestUrl = `${this.endpoint}/${this.bucket}?delete`;

    // S3 Delete Multiple Objects API requires Content-MD5 header
    const contentMd5 = createHash('md5').update(requestBody).digest('base64');

    const response = await this.client.fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-MD5': contentMd5,
      },
      body: requestBody,
    });

    if (!response.ok) {
      throw new UncaughtException('S3_DELETE_MANY_FAILED', [
        `오브젝트 삭제에 실패했습니다.`,
        `상태 코드: ${response.status}`,
      ]);
    }

    return null;
  }
}
