import { NotImplementedException } from '@joka/core/src/exception';
import { Content } from '@joka/domain-media/src/domain/Content';
import { Thumbnail } from '@joka/domain-media/src/domain/Thumbnail';

import { ThumbnailStrategy } from '../../domain/strategy/ThumbnailStrategy';

// 영상 썸네일 전략(이번 스프린트: NotImplemented).
// 추후 ffmpeg-wrapper(Go, Cloudflare Containers)에 위임한다.
export class VideoThumbnailStrategy implements ThumbnailStrategy {
  supports(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  extract(_content: Content): Promise<Thumbnail> {
    throw new NotImplementedException('VIDEO_THUMBNAIL_NOT_IMPLEMENTED', [
      '영상 썸네일 추출은 아직 구현되지 않았습니다.',
    ]);
  }
}
