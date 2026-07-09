import { createHash } from 'node:crypto';

import { NotFoundException, UncaughtException } from '@joka/core/src/exception';
import { Url } from '@joka/core/src/model/Url';
import { Nullable } from '@joka/core/src/type';
import { AwsClient } from 'aws4fetch';

import { DefaultExpiry } from '../../domain/constant';
import { BucketObject } from '../../domain/model/BucketObject';
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
    const response = await this.client.fetch(url.fullPath, {
      method: 'HEAD',
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new UncaughtException('S3_HEAD_FAILED', [
        `오브젝트(${objectKey}) 조회에 실패했습니다.`,
        `상태 코드: ${response.status}`,
        '관리자에게 문의하세요.',
      ]);
    }

    const contentLength = Number(response.headers.get('content-length'));
    const contentType = response.headers.get('content-type');
    const eTag = response.headers.get('etag');
    if (!contentLength || !contentType || !eTag) {
      throw new UncaughtException('INVALID_S3_OBJECT_HEADER', [
        `오브젝트(${objectKey})에 필수 헤더가 누락되었습니다.`,
        '관리자에게 문의하세요.',
      ]);
    }

    return BucketObject.from({
      bucket: this.bucket,
      key: objectKey,
      size: contentLength,
      eTag: eTag.replace(/"/g, ''),
      contentType: contentType,
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

  // 원본 바이트를 ArrayBuffer로 반환한다
  // 스트림이 아니라 버퍼인 이유는, 동일 버퍼를 여러 변환에 재사용해야 하는 소비자를 위함이다
  async get(url: Url): Promise<ArrayBuffer> {
    const objectKey = url.getPath({ withoutBeginningSlash: true });
    const response = await this.client.fetch(url.fullPath, {
      method: 'GET',
    });

    if (response.status === 404) {
      throw new NotFoundException('OBJECT_NOT_FOUND', [
        `오브젝트(${objectKey})가 존재하지 않습니다.`,
      ]);
    }

    if (!response.ok) {
      throw new UncaughtException('S3_GET_FAILED', [
        `오브젝트(${objectKey}) 조회에 실패했습니다.`,
        `상태 코드: ${response.status}`,
        '관리자에게 문의하세요.',
      ]);
    }

    return response.arrayBuffer();
  }

  // 바이트를 업로드하고 eTag·size를 담은 BucketObject를 반환한다
  async put(
    url: Url,
    body: ArrayBuffer,
    contentType: string,
  ): Promise<BucketObject> {
    const objectKey = url.getPath({ withoutBeginningSlash: true });
    const response = await this.client.fetch(url.fullPath, {
      method: 'PUT',
      body: body,
      headers: {
        'Content-Type': contentType,
      },
    });

    if (!response.ok) {
      throw new UncaughtException('S3_PUT_FAILED', [
        `오브젝트(${objectKey}) 저장에 실패했습니다.`,
        `상태 코드: ${response.status}`,
        '관리자에게 문의하세요.',
      ]);
    }

    const eTag = response.headers.get('etag');
    if (!eTag) {
      throw new UncaughtException('INVALID_S3_OBJECT_HEADER', [
        `오브젝트(${objectKey}) 저장 응답에 eTag가 없습니다.`,
        '관리자에게 문의하세요.',
      ]);
    }

    return BucketObject.from({
      bucket: this.bucket,
      key: objectKey,
      size: body.byteLength,
      eTag: eTag.replace(/"/g, ''),
      contentType: contentType,
    });
  }

  async getPresignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = DefaultExpiry,
  ): Promise<Url> {
    const signedRequest = await this.client.sign(
      new Request(
        `${this.endpoint}/${bucket}/${key}?X-Amz-Expires=${expiresIn}`,
        { method: 'GET' },
      ),
      { aws: { signQuery: true } },
    );

    return Url.from(signedRequest.url);
  }

  async getPresignedUrlForUpload(
    bucket: string,
    key: string,
    expiresIn: number = DefaultExpiry,
  ): Promise<Url> {
    const signedRequest = await this.client.sign(
      new Request(
        `${this.endpoint}/${bucket}/${key}?X-Amz-Expires=${expiresIn}`,
        { method: 'PUT' },
      ),
      { aws: { signQuery: true } },
    );

    return Url.from(signedRequest.url);
  }

  async deleteMany(keys: string[]): Promise<null> {
    if (!keys.length) {
      return null;
    }

    const objectsXml = keys
      .map((key) => `<Object><Key>${key}</Key></Object>`)
      .join('');
    const requestBody = `<?xml version="1.0" encoding="UTF-8"?><Delete>${objectsXml}</Delete>`;

    // S3 Delete Multiple Objects API requires Content-MD5 header
    const contentMd5 = createHash('md5').update(requestBody).digest('base64');

    const response = await this.client.fetch(
      `${this.endpoint}/${this.bucket}?delete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Content-MD5': contentMd5,
        },
        body: requestBody,
      },
    );

    if (!response.ok) {
      throw new UncaughtException('S3_DELETE_MANY_FAILED', [
        `오브젝트 삭제에 실패했습니다.`,
        `상태 코드: ${response.status}`,
        '관리자에게 문의하세요.',
      ]);
    }

    return null;
  }
}
