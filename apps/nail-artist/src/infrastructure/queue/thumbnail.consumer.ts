import type { ThumbnailJob } from '../../application/model';
import { ExtractThumbnail } from '../../application/use-case';

// Queue consumer 어댑터: 메시지를 use-case로 매핑한다.
// 절대 throw하지 않고, 메시지마다 성공·실패 모두 ack(drop)한다.
// (한 건 실패가 배치 전체를 재전달시키지 않도록.)
export async function consumeThumbnailBatch(
  batch: MessageBatch<ThumbnailJob>,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await ExtractThumbnail.invoke(message.body);
      message.ack();
    } catch (error) {
      console.error('[thumbnail] failed, drop', message.id, error);
      message.ack();
    }
  }
}
