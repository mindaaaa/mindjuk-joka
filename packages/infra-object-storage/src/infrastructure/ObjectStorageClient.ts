import { Url } from '@joka/core/src/model/Url';

import { BucketObject } from '../domain/model/BucketObject';

export interface ObjectStorageClient {
  head(url: Url): Promise<BucketObject | null>;
  headOrThrow(url: Url): Promise<BucketObject>;
  getPresignedUrl(
    bucket: string,
    key: string,
    expiresIn?: number,
  ): Promise<Url>;
  getPresignedUrlForUpload(
    bucket: string,
    key: string,
    expiresIn?: number,
  ): Promise<Url>;
  deleteMany(keys: string[]): Promise<null>;
}
