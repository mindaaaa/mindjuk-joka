import { Url } from '@joka/core/src/model/Url';
import { Content } from '@joka/domain-media/src/domain/Content';
import { Thumbnail } from '@joka/domain-media/src/domain/Thumbnail';
import { S3Client } from '@joka/infra-object-storage/src/infrastructure/impl/S3Client';
import { extractImageThumbnail } from '@joka/infra-thumbnail/src';

import { ThumbnailStrategy } from '../../domain/strategy/ThumbnailStrategy';
import Config from '../../application/config';

export class ImageThumbnailStrategy implements ThumbnailStrategy {
  supports(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  async extract(content: Content): Promise<Thumbnail> {
    const client = S3Client.getInstance();

    // 1. 원본을 버퍼로 읽는다(같은 버퍼를 두 변환에 재사용).
    const original = await client.get(content.url);

    // 2. 모든 변환·계산을 끝낸 뒤에 R2에 쓴다(부분 실패 시 고아 방지).
    const { bytes, blurhash, mimeType } = await extractImageThumbnail(
      Config.images,
      original,
    );

    // 3. 썸네일 URL은 원본 URL의 마지막 경로 세그먼트를 thumbnail.jpg로 치환한다.
    const thumbnailUrl = Url.from(
      content.url.fullPath.replace(/\/[^/]*$/, '/thumbnail.jpg'),
    );

    // 4. 계산이 모두 성공한 뒤에만 저장한다.
    const stored = await client.put(thumbnailUrl, bytes, mimeType);

    return Thumbnail.from({
      url: thumbnailUrl.fullPath,
      size: stored.size,
      eTag: stored.eTag,
      mimeType,
      blurhash,
    });
  }
}
