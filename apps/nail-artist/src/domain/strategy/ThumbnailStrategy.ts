import { Content } from '@joka/domain-media/src/domain/Content';
import { Thumbnail } from '@joka/domain-media/src/domain/Thumbnail';

// 썸네일 추출 전략 포트.
// mimeType으로 전략을 선택하고, 선택된 전략이 Content에서 Thumbnail을 추출한다.
// 영상 전략 교체(추후 ffmpeg-wrapper 연결)가 다른 레이어에 영향을 주지 않게 한다.
export interface ThumbnailStrategy {
  supports(mimeType: string): boolean;
  extract(content: Content): Promise<Thumbnail>;
}
