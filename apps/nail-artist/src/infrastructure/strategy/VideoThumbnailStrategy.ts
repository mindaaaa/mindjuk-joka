import { getContainer } from '@cloudflare/containers';
import { IllegalStateException } from '@joka/core/src/exception';
import { Url } from '@joka/core/src/model/Url';
import { Content } from '@joka/domain-media/src/domain/Content';
import { Thumbnail } from '@joka/domain-media/src/domain/Thumbnail';
import { S3Client } from '@joka/infra-object-storage/src/infrastructure/impl/S3Client';

import { ThumbnailStrategy } from '../../domain/strategy/ThumbnailStrategy';
import Config from '../../application/config';

// presigned 만료 — cold start + ffprobe + ffmpeg 두 fetch가 모두 만료 전이어야 한다(ADR §3.6).
const PRESIGNED_EXPIRY_SECONDS = 600;
// Worker가 컨테이너 지연에 무한 대기하지 않도록 하는 hang 방어선.
// 컨테이너 20초 ctx 앞에 cold start(150MB 부팅)가 선행하므로 좁게 잡으면 정상 잡이 죽는다(ADR §3.6).
const CONTAINER_TIMEOUT_MS = 60_000;

// 영상 썸네일 전략: nail-clipper 컨테이너(Go + ffmpeg)에 위임한다(ADR §3.6).
// 컨테이너엔 자격증명을 심지 않는다 — presigned GET을 넘기고 gif+blurhash만 받는다(D6).
export class VideoThumbnailStrategy implements ThumbnailStrategy {
  supports(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  async extract(content: Content): Promise<Thumbnail> {
    const client = S3Client.getInstance();

    // 1. 버킷 상대 key 파생 → mediaCid 추출(media.mapper.ts 패턴과 동일).
    const path = content.url.getPath({ withoutBeginningSlash: true });
    const prefix = Config.mediaBucketName + '/';
    const key = path.startsWith(prefix) ? path.slice(prefix.length) : path;
    const mediaCid = key.match(/^media\/([^/]+)\/original$/)?.[1];
    if (!mediaCid) {
      throw new IllegalStateException('UNEXPECTED_MEDIA_PATH', [
        `예상 밖의 원본 경로입니다: ${key}`,
      ]);
    }

    // 2. presigned GET을 발급한다(컨테이너에 자격증명 대신 서명 URL 전달 — D6).
    const sourceUrl = await client.getPresignedUrl(
      Config.mediaBucketName,
      key,
      PRESIGNED_EXPIRY_SECONDS,
    );

    // 3. mediaCid로 컨테이너를 라우팅해 잡을 전달한다(D6). defaultPort=8080으로 프록시.
    const container = getContainer(Config.nailClipper, mediaCid);
    const res = await container.fetch(
      new Request('http://nail-clipper/thumbnail', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceUrl: sourceUrl.fullPath }),
        signal: AbortSignal.timeout(CONTAINER_TIMEOUT_MS),
      }),
    );
    if (!res.ok) {
      throw new IllegalStateException('VIDEO_THUMBNAIL_CONTAINER_FAILED', [
        `nail-clipper가 실패 응답을 반환했습니다: ${res.status}`,
      ]);
    }

    // 4. gif 바이트 + blurhash 수신.
    const bytes = await res.arrayBuffer();
    const blurhash = res.headers.get('X-Blurhash');
    if (!blurhash) {
      throw new IllegalStateException('VIDEO_THUMBNAIL_MISSING_BLURHASH', [
        'nail-clipper 응답에 X-Blurhash 헤더가 없습니다.',
      ]);
    }

    // 5. 계산이 모두 성공한 뒤에만 R2에 쓴다(이미지 전략과 대칭 — 고아 방지).
    const thumbnailUrl = Url.from(
      content.url.fullPath.replace(/\/[^/]*$/, '/thumbnail.gif'),
    );
    const stored = await client.put(thumbnailUrl, bytes, 'image/gif');

    return Thumbnail.from({
      url: thumbnailUrl.fullPath,
      size: stored.size,
      eTag: stored.eTag,
      mimeType: 'image/gif',
      blurhash,
    });
  }
}
