import {
  ConflictException,
  NotImplementedException,
  UncaughtException,
} from '@joka/core/src/exception';
import { Media } from '@joka/domain-media/src/domain/Media';
import { Thumbnail } from '@joka/domain-media/src/domain/Thumbnail';
import { S3Client } from '@joka/infra-object-storage/src/infrastructure/impl/S3Client';

import {
  ExtractThumbnail,
  Request,
  Response,
} from '../../../domain/use-case/ExtractThumbnail';
import Config from '../../config';

const MAX_ATTACH_ATTEMPTS = 3;

export class ExtractThumbnailImpl extends ExtractThumbnail {
  private readonly mediaService = Config.mediaService;

  override async invoke(request: Request): Promise<Response> {
    const { mediaCid } = request;

    const media = await this.mediaService.getByCid(mediaCid);

    // content가 없으면 attachThumbnail이 NPE이므로 먼저 가드한다.
    if (media.hasNoContent) {
      throw new ConflictException('MEDIA_HAS_NO_CONTENT', [
        `Media(${mediaCid})에 Content가 존재하지 않습니다.`,
      ]);
    }

    // 원본이 실제로 존재하는지 재확인한다.
    await S3Client.getInstance().headOrThrow(media.content!.url);

    const mimeType = media.content!.mimeType.value;
    const strategy = Config.thumbnailStrategies.find((it) =>
      it.supports(mimeType),
    );
    if (!strategy) {
      throw new NotImplementedException('UNSUPPORTED_MIME_TYPE', [
        `지원하지 않는 형식입니다: ${mimeType}`,
      ]);
    }

    const thumbnail = await strategy.extract(media.content!);

    return this.attachWithRetry(mediaCid, media, thumbnail);
  }

  // 낙관적 락 충돌(MEDIA_VERSION_MISMATCHED) 시 재로드 후 재부착을 재시도한다.
  // 썸네일 바이트는 이미 R2에 저장되어 있으므로 이 재시도는 DB write만 반복하며,
  // Images 변환을 재호출하지 않는다(비용 벡터가 아니다).
  private async attachWithRetry(
    mediaCid: string,
    media: Media,
    thumbnail: Thumbnail,
  ): Promise<Media> {
    let current = media;
    for (let attempt = 1; attempt <= MAX_ATTACH_ATTEMPTS; attempt++) {
      try {
        return await this.mediaService.attachThumbnail(current, thumbnail);
      } catch (error) {
        const isVersionConflict =
          error instanceof ConflictException &&
          error.code === 'MEDIA_VERSION_MISMATCHED';
        if (isVersionConflict && attempt < MAX_ATTACH_ATTEMPTS) {
          current = await this.mediaService.getByCid(mediaCid);
          continue;
        }
        throw error;
      }
    }

    throw new UncaughtException('THUMBNAIL_ATTACH_EXHAUSTED', [
      `Media(${mediaCid}) 썸네일 부착 재시도가 소진되었습니다.`,
    ]);
  }
}

export default new ExtractThumbnailImpl();
