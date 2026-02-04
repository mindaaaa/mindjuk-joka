import { R2Bucket } from '@cloudflare/workers-types';
import {
  NotFoundException,
  NotImplementedException,
  UncaughtException,
} from '@joka/core/src/exception';
import { Url } from '@joka/core/src/model/Url';
import { Nullable } from '@joka/core/src/type';

import { BucketObject } from '../../domain/BucketObject';
import { ObjectStorageClient } from '../ObjectStorageClient';

export class R2Client implements ObjectStorageClient {
  private static instance: Nullable<R2Client> = null;

  static init(binding: R2Bucket) {
    if (R2Client.instance) {
      throw new UncaughtException(`R2_CLIENT_ALREADY_INITIALIZED`, [
        `오브젝트 스토리지 클라이언트가 이미 초기화되어 있습니다.`,
        `관리자에게 문의하세요.`,
      ]);
    }

    R2Client.instance = new R2Client(binding);
  }

  static getInstance(): R2Client {
    if (!R2Client.instance) {
      throw new UncaughtException(`R2_CLIENT_IS_NOT_INITIALIZED`, [
        `오브젝트 스토리지 클라이언트가 이미 초기화되지 않았습니다.`,
        `관리자에게 문의하세요.`,
      ]);
    }

    return R2Client.instance;
  }

  private constructor(private readonly binding: R2Bucket) {}

  async head(url: Url): Promise<BucketObject | null> {
    const objectKey = url.getPath({ withoutBeginningSlash: true });
    const object = await this.binding.head(objectKey);

    if (object) {
      return BucketObject.from({
        bucket: 'TBD',
        key: object.key,
        size: object.size,
        eTag: object.etag,
        contentType: object.httpMetadata?.contentType as string,
      });
    }

    return null;
  }

  async headOrThrow(url: Url): Promise<BucketObject> {
    const object = await this.head(url);
    if (!object) {
      throw new NotFoundException(`OBJECT_NOT_FOUND`, [
        `오브젝트(${url.getPath({ withoutBeginningSlash: true })})가 존재하지 않습니다.`,
      ]);
    }

    return object;
  }

  async getPresignedUrl(_bucket: string, _key: string): Promise<Url> {
    throw new NotImplementedException();
  }

  async getPresignedUrlForUpload(_bucket: string, _key: string): Promise<Url> {
    throw new NotImplementedException();
  }
}
