import { Container } from '@cloudflare/containers';

// nail-clipper(Go + ffmpeg) 컨테이너를 구동하는 Durable Object.
// 컨테이너 소유는 nail-artist Worker다(ADR D1). 소스는 apps/nail-clipper.
export class NailClipperContainer extends Container {
  override defaultPort = 8080;
  // 최소 idle → scale-to-zero. mediaCid 라우팅상 warm 재사용 이득이 없어 짧게(ADR §3.7 D7).
  override sleepAfter = '5s';

  override onError(error: unknown) {
    console.error('[nail-clipper] container error', error);
  }
}
