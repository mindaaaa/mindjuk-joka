import { Url } from '@joka/core/src/model/Url';

import { BucketObject } from '../domain/BucketObject';

export interface ObjectStorageClient {
  head(url: Url): Promise<BucketObject | null>;
  headOrThrow(url: Url): Promise<BucketObject>;
  getPresignedUrl(bucket: string, key: string): Promise<Url>;
  getPresignedUrlForUpload(bucket: string, key: string): Promise<Url>;
}
