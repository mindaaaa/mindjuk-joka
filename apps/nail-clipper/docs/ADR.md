# ADR-001: 영상 썸네일 컨테이너 — nail-clipper

- 상태: 초안(Draft) — 구현 착수 전
- 작성일: 2026-07-07
- 관련 앱/패키지: `apps/nail-clipper`(신규, Go · Cloudflare Containers), `apps/nail-artist`(소비자 Worker), `packages/domain-media`, `packages/infra-object-storage`
- 전제: Cloudflare **Workers Paid + Containers 활성화**. 본 ADR은 nail-artist ADR-001 §3.6/§7의 **"추후 작업(ffmpeg-wrapper)"을 실현**한다.
- 참고: 이름은 개발자스러운 `ffmpeg-wrapper` 대신 도메인 은유를 따라 **`nail-clipper`**로 확정(nail-artist와 짝).

---

## 0. 제약 및 목표(Constraints)

우선순위가 높은 순서.

1. **비용(제1 목표).** nail-artist ADR-001과 동일하게 **추가 과금 월 $5 상한**을 최우선으로 지킨다. **Cloudflare Containers가 최대 비용 리스크**다(§5, nail-artist ADR §0·§6). 두 축으로 방어한다:
   - **실행 시간 20초 강제**(§3.3 D5) — 요청당 처리 시간 상한.
   - **빠른 scale-to-zero**(§3.7 D7) — idle 메모리 GiB-초 잠식 차단. 20초 상한만으로는 idle 비용을 못 막는다(nail-artist ADR §5 경고).
2. **D6 계약을 그대로 구현**(nail-artist ADR-001 D6). 컨테이너에 장기 자격증명을 심지 않는다: nail-artist가 **presigned GET URL을 전달(읽기)** → 컨테이너는 **gif 바이트 + blurhash만 반환** → **R2 PUT은 nail-artist**가 수행(자격증명 단일화).
3. **예상 사용량.** 영상 **100개/월**, **3분 이내**, 4K가 아닌 **일반 아이폰 영상 화질**(nail-artist ADR §0.3).
4. **구조 일관성.** nail-artist/joka-api의 클린 아키텍처 관용구를 유지한다. 변경은 **`ThumbnailStrategy` 포트 뒤에 캡슐화**(nail-artist ADR D7)되어 다른 레이어에 파급되지 않는다.
5. **결과물.** nail-artist `VideoThumbnailStrategy`의 `NotImplemented` stub을 **컨테이너 위임 구현으로 교체**한다.

---

## 1. 배경 / 문제

nail-artist ADR-001은 썸네일 파이프라인을 이미지/영상 **전략(Strategy)**으로 캡슐화했고, 이번 스프린트에서 **이미지 전략만 완성**(Cloudflare Images 바인딩), **영상 전략은 `NotImplemented` stub**으로 남겨 두었다(`VideoThumbnailStrategy.ts`).

영상 썸네일은 이미지와 달리 **프레임 추출·gif 인코딩이 필요**하고, 이를 담당하는 `ffmpeg`/`sharp`는 **네이티브 바이너리라 Workers 런타임에서 실행 불가**다(nail-artist ADR D5). 따라서 영상 처리는 **Cloudflare Containers(Go + ffmpeg)**에 위임한다. 이것이 nail-artist ADR §7 "추후 작업"으로 미뤄 둔 부분이며, 본 ADR이 그 컨테이너(`nail-clipper`)의 설계다.

### 목표

영상 원본으로부터 **초기 10초에서 3~5 프레임을 이어붙인 300×300 gif**와 **첫 프레임 blurhash**를 생성해 nail-artist에 반환한다. nail-artist는 이를 `media/{mediaCid}/thumbnail.gif`로 저장하고 `Thumbnail`을 부착한다(nail-artist ADR §3.6).

---

## 2. 결정 개요(아키텍처)

```
[nail-artist Worker]                              [nail-clipper Container (Go + ffmpeg)]
queue() consumer                                  HTTP 서버 :8080 (SIGTERM graceful)
 ExtractThumbnailImpl
  → mimeType가 video/* → VideoThumbnailStrategy
      1. presigned GET URL 생성                    POST /thumbnail { sourceUrl }
         (S3Client.getPresignedUrl)     ─────────▶  ├─ ctx = WithTimeout(20s)  ★실행 상한
      2. getContainer(NAIL_CLIPPER, mediaCid)       ├─ ffmpeg -t 10 -i <sourceUrl>
         .containerFetch(POST, 8080)                │     → 300×300 cover gif (적응형 ~4 frame)
                                                     ├─ gif 첫 프레임 디코드 → blurhash(4,3)
      3. gif 바이트 + X-Blurhash 헤더    ◀─────────  └─ 200: body=gif, header X-Blurhash
      4. S3Client.put(media/{cid}/thumbnail.gif)    (실패 시 non-2xx → nail-artist 로그·drop)
      5. Thumbnail.from(...) 반환 → attachThumbnail
```

- **소유 구조(§3.1 D1)**: 컨테이너는 **nail-artist Worker가 소유**한다. `nail-clipper`는 **컨테이너 소스(Go `src/` + `Dockerfile`)**이고, `Container` DO 클래스·`wrangler` 컨테이너 설정·바인딩은 **nail-artist**에 둔다(Cloudflare 컨테이너는 자신을 바인딩한 Worker에 종속되므로).
- **입력(§3.2 D2·D3)**: nail-artist가 `{ sourceUrl }`(presigned GET) POST → 컨테이너가 **직접 스트리밍 입력**. 컨테이너는 R2 자격증명을 갖지 않는다(D6).
- **출력(§3.2 D2·D4)**: **gif 바이트 = 응답 body**, **blurhash = `X-Blurhash` 헤더**(base64 JSON 대비 부풀림 회피).
- **비용 방어(§3.3·§3.7)**: 20초 실행 상한 + 짧은 `sleepAfter`로 scale-to-zero.
- **영속화**: nail-artist가 gif를 R2에 PUT하고 `Thumbnail`을 부착(nail-artist ADR §3.7 시스템 경로 재사용). 본 컨테이너는 **상태를 갖지 않는다.**

---

## 3. 상세 설계

### 3.1 앱 구조 및 배치 — 컨테이너 소유는 nail-artist(D1)

Cloudflare 컨테이너는 **독립 주소를 갖지 않고** 이를 바인딩한 Worker의 Durable Object로만 구동된다. 따라서 별도의 "nail-clipper Worker"를 만들지 않는다(§4 D1).

```
apps/nail-clipper/
  src/
    main.go          # HTTP 서버(:8080) + 오케스트레이션 + graceful shutdown
    thumbnail.go     # ffmpeg 호출 + gif 첫 프레임 blurhash
    go.mod / go.sum
  Dockerfile         # 멀티스테이지: golang 빌드 → ffmpeg 포함 런타임
  docs/ADR.md        # (본 문서)

apps/nail-artist/    # 컨테이너를 "소유"하는 Worker
  src/infrastructure/container/NailClipperContainer.ts   # class extends Container
  src/infrastructure/strategy/VideoThumbnailStrategy.ts  # stub → 실제 구현
  wrangler.toml      # [[containers]] + DO 바인딩 + migration (image=../nail-clipper/Dockerfile)
```

관용구는 nail-artist를 그대로 따른다. 컨테이너 바인딩(`env.NAIL_CLIPPER`)은 **배치당 1회 `Config`에 전역 주입**(nail-artist ADR D8 — `Config.images = env.IMAGES`와 동형).

### 3.2 Worker ↔ Container 계약(D2)

단일 엔드포인트. 컨테이너는 stateless HTTP.

| 항목 | 값 |
|---|---|
| 메서드/경로 | `POST /thumbnail` |
| 요청 헤더 | `Content-Type: application/json` |
| 요청 바디 | `{ "sourceUrl": "<presigned GET URL>" }` |
| 성공 응답 | `200`, `Content-Type: image/gif`, body = **gif 바이트**, `X-Blurhash: <hash>` |
| 실패 응답 | `4xx/5xx` + 짧은 텍스트 사유(로그용). nail-artist는 **로그 후 drop**(nail-artist ADR D3) |
| 헬스체크 | `GET /health` → `200`(컨테이너 기동 대기 확인용) |

`.containerFetch(request, 8080)`는 요청(메서드·헤더·바디)을 **그대로 컨테이너에 전달**하고 응답을 **그대로 반환**하므로, 위 계약이 추가 직렬화 없이 성립한다(예제 확인).

### 3.3 nail-clipper 컨테이너(Go)

- **서버**: 표준 `net/http`, `:8080` 하드코딩(예제 관용구). `GET /health`, `POST /thumbnail`.
- **graceful shutdown**: 플랫폼이 종료 시 `SIGTERM`을 보낸다 → `signal.Notify(SIGINT, SIGTERM)` 수신 후 `server.Shutdown(ctx)`.
- **실행 상한(D5)**: 요청 처리 시작 시 `ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)`. 아래 모든 외부 작업을 이 `ctx`로 묶는다(`exec.CommandContext(ctx, ...)`) → 초과 시 ffmpeg 프로세스 kill → 실패 응답.
- **입력 취득(D3)**: presigned URL을 **ffmpeg의 입력으로 직접 전달**한다(전체 다운로드/디스크 적재 회피). `exec.Command`의 **인자 슬라이스**로 넘겨 셸 주입 여지를 없앤다(URL은 우리가 서명한 신뢰 값).
- **gif 생성**: 이미지 전략의 `fit: cover`(300×300 크롭)와 시각적 일관성을 맞춘다. 프레임 샘플링은 **영상 길이를 먼저 재서 적응형 fps**로 정한다(고정 fps는 짧은 영상에서 깨짐 — 아래 주의).
  1. **길이 측정**: `ffprobe -show_entries format=duration` 로 duration `d`(초)를 얻는다.
  2. **적응형 fps 계산**: `window = min(d, 10)`, **`fps = 4 / window`** → 영상 길이와 무관하게 항상 ~4프레임.
  3. **gif 인코딩**(cover 300×300, stdout으로):
     ```
     ffmpeg -t 10 -i <sourceUrl> \
       -vf "fps=<fps>,scale=300:300:force_original_aspect_ratio=increase,crop=300:300,setpts=N/(2*TB)" \
       -loop 0 -f gif pipe:1
     ```
     - `-t 10`: 입력 앞 10초만 처리(조기 종료 → 대용량 영상도 20초 예산 방어).
     - `fps=4/window`: 예) 0.5초 영상 → fps 8, 8초 → fps 0.5, 30초 → fps 0.4. 전부 4프레임.
     - `crop=300:300` + `force_original_aspect_ratio=increase`: 비율 유지 확대 후 중앙 크롭(cover).
     - **`setpts=N/(2*TB)` — 재생 타이밍을 샘플링과 분리(프레임당 0.5초, 2초 루프).** GIF의 프레임 delay는 PTS 간격에서 나오므로, 이게 없으면 샘플링 간격(최대 2.5초)이 그대로 재생 속도가 되어 10초짜리 느린 슬라이드쇼가 된다 — 그리드 체류 시간(1~2초) 안에서는 정지 이미지와 구별되지 않는다. `N`(프레임 인덱스) 기준 재배치라 **적응형 fps가 얼마로 계산되든 재생은 항상 2초 루프로 균일**하다(영상 길이별 재생 속도 편차도 함께 제거). 프레임 수·내용·첫 프레임(blurhash 소스)은 그대로라 크기·비용 영향 없음. (아래 "실측 검증"은 이 재타이밍 추가 전 수행 — step 1 검증 기준에 2초 루프 확인을 포함한다.)
     - `pipe:1`로 stdout의 gif를 **버퍼에 담는다**(스트리밍 아님 — 아래 "응답 순서" 참고).
  4. **폴백**: `ffprobe`가 duration을 못 얻는(스트리밍/degenerate 입력) 경우 **`-frames:v 1` 단일 프레임 gif**로 폴백한다. blurhash는 첫 프레임만 있으면 성립하므로 썸네일은 항상 생성된다.
  > ⚠️ **짧은 영상 주의(실측 검증 완료)**: 고정 `fps=1/2.5`(2.5초당 1프레임)는 **~2초 미만 영상에서 프레임이 0개가 되어 gif 인코딩이 실패**(썸네일 null)하고, 2.5~5초는 정지 1프레임이 된다. 위 적응형 fps는 0.5~30초 전 구간에서 4프레임 gif(≈30–34KB)를 안정적으로 생성함을 로컬 ffmpeg 7.0.1로 확인했다. `ffprobe` 호출 1회가 추가되나 20초 예산 내 미미하다(단, moov-atom seek과 동일 성질 — §6).
- **blurhash(D4)**: **별도 ffmpeg/디코더 없이** 생성한 gif의 **첫 프레임**을 Go `image/gif`로 디코드 → `github.com/buckket/go-blurhash`의 `Encode(4, 3, frame0)`. nail-artist 이미지 전략의 `encode(rgba, w, h, 4, 3)`와 **동일 컴포넌트(x=4, y=3)**를 사용해 스타일을 맞춘다.
- **응답 순서(구현 함정)**: `X-Blurhash` 헤더는 body보다 **먼저** 전송되므로, gif를 **스트리밍하지 말고** 버퍼에 모은 뒤 → 첫 프레임 디코드로 blurhash 계산 → **헤더 set → body write** 순서로 응답한다. (즉 blurhash 소스와 응답 body가 같은 gif 버퍼다. gif는 sub-MB라 버퍼링 무해 — §6.)
- **빈 결과 방어**: gif 바이트가 0이거나 blurhash 계산이 실패하면 `Thumbnail.from`의 `size.positive()`가 nail-artist에서 throw되므로, 컨테이너는 **빈/실패 결과를 200이 아닌 non-2xx로 응답**한다(nail-artist가 로그·drop → 백필).
- **Go 의존성**: 표준 라이브러리 + `buckket/go-blurhash` 하나. `CGO_ENABLED=0` 정적 빌드.

### 3.4 Dockerfile — 멀티스테이지 최소 이미지

3-스테이지로 최종 이미지를 최소화한다: (1) **정적** ffmpeg/ffprobe 바이너리 확보, (2) Go 서버 정적 빌드, (3) distroless 런타임에 바이너리만 복사.

```dockerfile
# 1) 정적 ffmpeg + ffprobe: 유지보수되는 static 빌드 이미지에서 바이너리만 가져온다
FROM mwader/static-ffmpeg:7.1 AS ffmpeg

# 2) Go 서버 정적 빌드
FROM golang:1.23-alpine AS build
WORKDIR /app
COPY src/go.mod src/go.sum ./
RUN go mod download
COPY src/*.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server

# 3) 최소 런타임: distroless static (CA 인증서 내장, 셸/패키지매니저 없음, ~2MB)
FROM gcr.io/distroless/static-debian12
COPY --from=ffmpeg /ffmpeg /ffprobe /usr/local/bin/
COPY --from=build /server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

설계 근거:
- **정적 ffmpeg/ffprobe** → 공유 라이브러리 불필요 → 런타임 없는 베이스(distroless/`scratch`)에 그대로 올릴 수 있다(예제의 "ffmpeg 때문에 `scratch` 불가" 제약을 **정적 바이너리로 우회**). `apt install ffmpeg`(코덱·공유lib 대량으로 수백 MB)를 피한다.
- **distroless static-debian12**: **CA 인증서 내장**(presigned HTTPS를 ffmpeg가 읽는 데 필요) + 셸/패키지매니저 없음(크기·공격면 최소). 우리는 `os/exec`로 ffmpeg를 직접 실행하므로 셸이 불필요. 단 **PATH·셸이 없으니 Go는 ffmpeg/ffprobe를 절대경로(`/usr/local/bin/ffmpeg`, `/usr/local/bin/ffprobe`)로 exec**한다.
- **`-ldflags="-s -w"`**: Go 디버그 심볼 제거 → 서버 바이너리 축소.
- **예상 크기 ≈ 150MB대**(대부분 정적 ffmpeg+ffprobe ~140MB) — `debian-slim + apt ffmpeg`(~400–500MB) 대비 대략 1/3. per-mediaCid 라우팅이라 **매 잡 cold start**가 발생하므로 이 축소는 **cold start 지연 완화에 실질적**(§6).
- **임시파일 주의**: distroless엔 쓰기 가능한 `/tmp`가 없을 수 있다. 우리는 **URL 입력 + `pipe:1` 출력**이라 임시파일이 없어 무방(D3). 폴백/디코드에서 임시 경로가 필요해지면 빈 `/tmp` 디렉토리를 추가한다.
- **더 줄이려면**: 필요한 디먹서(mov/mp4)·디코더(h264/hevc)·gif 인코더·scale/crop/fps 필터만 넣은 **커스텀 ffmpeg 빌드**(~15–25MB)도 가능하나, 빌드 복잡도 대비 이득이 작아(100/월·cold start 허용) 기본은 static-ffmpeg 이미지 방식을 택한다.
- `mwader/static-ffmpeg` 태그는 **실제 존재하는 버전으로 핀**한다(예: `7.1`). `image_build_context`는 `apps/nail-clipper`, nail-artist wrangler의 `image`가 이 Dockerfile을 가리킨다.

### 3.5 nail-artist 배선

**Container DO 클래스**(`apps/nail-artist/src/infrastructure/container/NailClipperContainer.ts`):
```ts
import { Container } from '@cloudflare/containers';

export class NailClipperContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '5s';                 // 최소 idle → scale-to-zero. mediaCid 라우팅상 warm 재사용 이득이 없어 짧게(§3.7 D7)
  override onError(error: unknown) { console.error('[nail-clipper] container error', error); }
}
```

**wrangler.toml — 3블록이 `class_name`으로 연결(전부 필수)**:
```toml
[[containers]]
class_name = "NailClipperContainer"
image = "../nail-clipper/Dockerfile"
image_build_context = "../nail-clipper"
instance_type = "basic"            # 1/4 vCPU · 1 GiB · 4GB disk (§5)
max_instances = 6                  # ★ 3이면 부족: 활성 최대 2(큐 max_concurrency) + 직전 잡 인스턴스들이
                                   #   sleepAfter=5s 동안 idle로 생존(창이 짧아 겹침은 30s 때보다 적다).
                                   #   6은 넉넉한 상한이고 상향은 무료라 그대로 유지.
                                   #   초과 시 신규 기동 실패 → 재시도 없음(D3)이라 썸네일이 조용히 유실된다.
                                   #   비용은 사용량(실행 시간) 기준이지 이 상한 값 기준이 아니므로 상향은 무료.
name = "nail-clipper"

[[durable_objects.bindings]]
class_name = "NailClipperContainer"
name = "NAIL_CLIPPER"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["NailClipperContainer"]   # ★ 컨테이너 DO는 sqlite-backed 강제
```

**바인딩 타입**(`cloudflare.model.ts`)에 추가:
```ts
NAIL_CLIPPER: DurableObjectNamespace<NailClipperContainer>;
```

**배치당 주입**(`src/index.ts`, nail-artist ADR D8 관용구):
```ts
Config.nailClipper = env.NAIL_CLIPPER;   // Config.images = env.IMAGES 와 동형
```

**entry point export**(`src/index.ts`) — **필수.** wrangler는 DO 클래스가 Worker의 main 모듈에서 export되어야 배포한다. 누락 시 deploy가 "class not exported"로 실패한다:
```ts
export { NailClipperContainer } from './infrastructure/container/NailClipperContainer';
```

> **주의(§6)**: 컨테이너는 최신 wrangler(예제 `^4.102`)와 상향된 `compatibility_date`(예제 `2026-05-12`)를 요구할 수 있다. 현재 nail-artist는 wrangler 4.62 / compat_date 2024-09-23이므로 **버전·날짜 상향이 필요할 수 있고, 큐 소비자 동작 회귀를 검증**해야 한다. 상향 시 기존 `compatibility_flags = ["nodejs_compat"]`는 **반드시 유지**한다(drizzle/postgres 의존).

### 3.6 VideoThumbnailStrategy 구현(stub 교체)

```ts
async extract(content: Content): Promise<Thumbnail> {
  // 버킷 상대 key 파생 — 기존 media.mapper.ts:38-46과 동일 패턴.
  // content.url = https://<endpoint>/<bucket>/media/{cid}/original (풀 URL)
  const path = content.url.getPath({ withoutBeginningSlash: true }); // "<bucket>/media/{cid}/original"
  const prefix = Config.mediaBucketName + '/';
  const key = path.startsWith(prefix) ? path.slice(prefix.length) : path; // "media/{cid}/original"
  const mediaCid = key.match(/^media\/([^/]+)\/original$/)?.[1];
  if (!mediaCid) throw /* 예상 밖 경로 → 상위 catch에서 로그·drop */;

  // 1. presigned GET (컨테이너에 자격증명 대신 서명 URL 전달 — D6).
  //    ⚠️ key는 fullPath가 아니라 버킷 상대 key여야 한다(getPresignedUrl이
  //       `${endpoint}/${bucket}/${key}`를 스스로 조립하므로 fullPath면 중복).
  //    ⚠️ 기본 만료 180s는 컨테이너 cold start + ffprobe + ffmpeg에 빠듯 → explicit 600s.
  //       ffprobe·ffmpeg 두 번의 fetch가 모두 만료 전이어야 한다.
  const sourceUrl = await S3Client.getInstance()
    .getPresignedUrl(Config.mediaBucketName, key, 600);

  // 2. mediaCid로 컨테이너 라우팅 → 잡 전달(D6 라우팅)
  const container = getContainer(Config.nailClipper, mediaCid);
  const res = await container.containerFetch(
    new Request('http://nail-clipper/thumbnail', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceUrl: sourceUrl.fullPath }),
    }),
    8080,
  );
  if (!res.ok) throw /* 실패 → 상위 catch에서 로그·drop */;

  // 3. gif 바이트 + blurhash 수신
  const bytes = await res.arrayBuffer();
  const blurhash = res.headers.get('X-Blurhash')!;

  // 4. 계산 완료 후에만 R2에 PUT (이미지 전략과 대칭 — 고아 방지)
  const thumbnailUrl = Url.from(content.url.fullPath.replace(/\/[^/]*$/, '/thumbnail.gif'));
  const stored = await S3Client.getInstance().put(thumbnailUrl, bytes, 'image/gif');

  // 5. Thumbnail 반환 → attachThumbnail(nail-artist ADR §3.7)
  return Thumbnail.from({
    url: thumbnailUrl.fullPath, size: stored.size, eTag: stored.eTag,
    mimeType: 'image/gif', blurhash,
  });
}
```

- `supports(mimeType)`는 기존대로 `mimeType.startsWith('video/')` 유지.
- **PUT은 nail-artist가 수행**(D6). 컨테이너는 gif 바이트만 반환.
- Worker 측에도 **AbortSignal 타임아웃(60초)**을 걸어 컨테이너 지연 시 Worker가 무한 대기하지 않게 한다. ⚠️ **"컨테이너 20초 + 여유"로 좁게 잡으면 안 된다(예: 25초는 논리 오류)**: 컨테이너의 20초 ctx(D5)는 **요청이 컨테이너에 도착한 뒤** 시작하는데, mediaCid 라우팅 + 짧은 sleepAfter라 **사실상 매 잡 cold start**(150MB 이미지 부팅, 수 초~십수 초)가 선행된다(§3.7·§6). 즉 Worker 체감 시간 = cold start + 최대 20초 처리 + 응답 전송이므로, 25초면 20초 예산을 정직하게 쓰는 정상 잡이 Worker 타임아웃으로 죽고 재시도가 없어(D3) 영구 유실된다. D7의 "두 개의 시계는 별개다"와 같은 논리로 **이 타임아웃은 세 번째 시계**(Worker가 기다리는 총 시간)다. 60초 초과는 컨테이너가 어차피 20초 ctx로 자체 종료하므로 비용 벡터가 아니다 — 순수 hang 방어선이다.

### 3.7 인스턴스 라우팅 & scale-to-zero(D6·D7)

- **라우팅**: `getContainer(env.NAIL_CLIPPER, mediaCid)`로 **mediaCid별 인스턴스**에 보낸다.
  - 큐 `max_concurrency=2`면 최대 2건이 동시에 처리될 수 있는데, **싱글턴**이면 두 ffmpeg가 한 0.25 vCPU 인스턴스에서 경합해 **20초 예산을 위협**한다. mediaCid별 라우팅은 잡마다 별도 인스턴스라 **CPU 경합이 없다**.
  - 재시도가 없으므로(nail-artist ADR D3) "warm 인스턴스 재사용" 이득은 크지 않고, **경합 회피가 20초 상한 방어에 더 중요**하다.
- **scale-to-zero**: `sleepAfter = '5s'`. mediaCid별 라우팅 + 재시도 부재(nail-artist D3)라 **warm 인스턴스 재사용 이득이 사실상 없으므로**, sleepAfter는 "cold start 완화" 명목이 아니라 **잡 종료 후 idle을 최소로 줄이는** 값이다. 즉 매 잡마다 cold start가 발생하지만, 썸네일은 비동기라 허용된다(§6). 라우팅을 싱글턴/소풀로 바꿔 warm 재사용을 노린다면 이 값을 몇 분으로 키우는 게 정합적이나, 20초 예산의 CPU 경합 위험 때문에 라우팅을 유지하고 sleepAfter를 짧게 두는 쪽을 택한다.

---

## 4. 주요 결정 사항(Decisions)

### D1. 컨테이너 소유 = nail-artist Worker(별도 Worker 지양)
Cloudflare 컨테이너는 이를 바인딩한 Worker의 DO로만 구동되므로, **컨테이너를 소유하는 Worker는 nail-artist**로 한다. `nail-clipper`는 **컨테이너 소스(Go + Dockerfile)**일 뿐 독립 Worker가 아니다. 대안(**nail-clipper를 별도 Worker로 만들고 service binding으로 호출**)은 Worker 인보케이션·지연·복잡도를 늘려 비용/단순성 목표에 반한다 → **YAGNI로 기각.** DO 클래스·wrangler 컨테이너 설정·바인딩은 nail-artist에 둔다.

> **추후 재검토(2026-07-08) — 경로 A(service binding)로 분리 예정.** 위 D1은 현 스프린트에선 유지하되, **추후 nail-clipper를 컨테이너 소유 독립 Worker로 분리**하기로 한다. 이유: (1) nail-clipper는 언어·런타임·수명주기가 다른 Go 컨테이너인데, 현재 모델은 **매 nail-artist 배포마다 150MB 이미지가 결합 재빌드**된다 — 분리하면 라이프사이클이 끊긴다. (2) 경계가 명확해지고 모노레포의 "앱마다 자체 배포" 일관성에 맞는다. **D1이 든 비용·지연 반대 논거는 100건/월 규모에선 사실상 무력**하다(추가 Worker 인보케이션도 무료 구간, 홉 +수 ms는 비동기 썸네일에 무의미). 참고로 컨테이너는 "순수 단독" 배포가 불가하므로(항상 어떤 Worker의 DO), "nail-clipper 자체 배포"는 **얇은 전용 Worker를 주는 것**을 뜻한다.
>
> **분리 방식(경로 A)**: nail-clipper에 전용 Worker(`wrangler.toml` + `src/index.ts` DO export + `[[containers]]` + migration)를 신설해 컨테이너를 이관 → nail-artist는 **service binding**(`[[services]] service = "nail-clipper"`)으로 `env.NAIL_CLIPPER.fetch(request)` 호출(현 `getContainer(...).fetch()` 로직은 nail-clipper Worker 내부로 이동).
>
> **분리 시 뒤집히는 것(현 결정과의 충돌 — 전환 시 함께 수정)**: ① **배포 순서 반전** — nail-artist가 nail-clipper(service)를 참조하므로 **nail-clipper를 먼저** 배포해야 정합적(현재 상정한 "nail-artist 먼저"의 반대). ② **워크스페이스 의존성 반전** — 현재 `@joka/nail-clipper → @joka/nail-artist`를 **`@joka/nail-artist → @joka/nail-clipper`로 뒤집는다**(현 모델에선 nail-clipper 독립 배포가 없어 그 의존성은 상징적이었다).
>
> **유보(경로 B 배제 사유)**: cross-script DO 바인딩(`script_name`)은 홉 없이 직접 DO 접근이 가능하나, **컨테이너-backed DO의 cross-script 지원 안정성이 미확인**이라 검증 전엔 경로 A(service binding)를 택한다.

### D2. Wire 계약 — `POST /thumbnail { sourceUrl }` → gif body + `X-Blurhash`
`.containerFetch`가 Request/Response를 그대로 통과시키므로 별도 프로토콜이 불필요. **gif는 바이너리 body**, **blurhash는 헤더**로 실어 base64 JSON의 ~33% 부풀림을 피한다. 실패는 non-2xx로 알리고 nail-artist가 로그·drop(nail-artist ADR D3).

### D3. 입력 취득 — presigned URL을 ffmpeg 입력으로 직접(전체 다운로드 회피)
컨테이너가 자격증명을 갖지 않도록 nail-artist가 presigned GET을 전달(D6). 컨테이너는 이 URL을 **ffmpeg `-i`에 직접** 넘겨 `-t 10`로 앞 10초만 읽는다 → 대용량 영상도 전체를 디스크에 적재하지 않아 20초 예산·디스크를 아낀다. 인자 슬라이스로 전달해 셸 주입을 원천 차단. **대안**(temp 파일로 전체 다운로드 후 처리)은 moov-atom-at-end MOV 대응이 단순하지만 대용량에서 느려 보류(필요 시 폴백, §6).

### D4. blurhash — gif 첫 프레임을 Go에서 디코드(별도 ffmpeg/디코더 불필요)
생성한 gif의 첫 프레임이 곧 "영상 첫 프레임의 300×300 cover"이므로, 이를 `image/gif`로 디코드해 `go-blurhash.Encode(4,3, frame0)`로 인코딩한다. **두 번째 ffmpeg 호출도, 별도 32×32 추출도 불필요.** 컴포넌트(4,3)는 nail-artist 이미지 전략과 동일.

### D5. 실행 시간 20초 강제 — handler context + `exec.CommandContext`
요청 진입에서 `context.WithTimeout(20s)`를 만들고 모든 ffmpeg 실행을 이 컨텍스트로 묶어 초과 시 프로세스를 kill한다. nail-artist ADR §0/§3.6의 **컨테이너 최대 실행 시간 20초** 강제를 컨테이너 내부에서 구현.

### D6. 인스턴스 라우팅 — mediaCid별(`getContainer(binding, mediaCid)`)
싱글턴은 큐 동시성(2)에서 CPU 경합 → 20초 예산 위협. mediaCid별 라우팅으로 **잡당 전용 인스턴스**를 써 경합을 없앤다. 재시도 부재로 warm 재사용 이득이 작아 경합 회피를 우선(§3.7).

### D7. `instance_type = basic` + `sleepAfter` 최소화(scale-to-zero)
`basic`(1 GiB / 0.25 vCPU / 4GB disk)은 첫 10초·300px ffmpeg에 충분하고 100/월 규모에선 비용 무료 구간(§5).

**두 개의 시계는 별개다.** `20초 실행 상한`(D5)은 한 잡의 *능동 처리 시간*을, `sleepAfter`는 마지막 요청 이후 *idle하게 켜져 있는 시간*을 잰다. 따라서 `sleepAfter`가 20초보다 커도 모순이 아니다(측정 대상이 다름).

idle 비용의 유일한 실질 레버인 `sleepAfter`를 **`5s`로 최소화**한다. 통상 `sleepAfter`는 "다음 요청을 위한 warm keep-alive"지만, 우리는 **D6에서 mediaCid별 라우팅**을 택해 서로 다른 영상이 서로 다른 인스턴스로 가고 **재시도도 없어(nail-artist D3) warm 재사용 이득이 사실상 0**이다. 그러므로 sleepAfter는 재사용을 노리는 값이 아니라 **잡 종료 후 idle을 최소로 줄이는** 값으로 둔다(nail-artist ADR §5 "20초 상한만으로는 idle 비용을 못 막는다"). 비용상으로는 5s든 몇 분이든 100건/월에선 모두 $0라 실무 차이는 없으나(§5), **라우팅 결정과의 정합성**과 잡당 idle 과금 최소화를 위해 최대한 짧게 둔다. 처리 중 요청은 `inflightRequests > 0`인 동안 sleep이 유예되므로(@cloudflare/containers `isActivityExpired`), 20초 잡이 5s로 인해 잘릴 위험은 없다.

### D8. 컨테이너 바인딩 주입 — 배치당 전역 configure(nail-artist D8 답습)
`env.NAIL_CLIPPER`(DO 네임스페이스)를 `queue()` 진입 시 `Config.nailClipper = env.NAIL_CLIPPER`로 주입한다. `Config.images = env.IMAGES`·`S3Client.init(...)`와 **동형** → nail-artist 관용구 일관성 유지(nail-artist ADR §0.4).

---

## 5. 비용 모델

단가·포함량은 nail-artist ADR §5(Cloudflare 공식 요금, 2026-07)를 그대로 인용. 기준 **Workers Paid $5/월**.

**Containers 포함량(월)**: CPU 375 vCPU-분(=22,500 vCPU-초), 메모리 25 GiB-시(=90,000 GiB-초), 디스크 200 GB-시. 초과 단가 CPU $0.000020/vCPU-초, 메모리 $0.0000025/GiB-초.

**영상 100개/월 × 최대 20초, `basic`(0.25 vCPU · 1 GiB)** 가정:
- CPU: 100 × 20s × 0.25 = **500 vCPU-초** ≪ 22,500 → **$0**
- 메모리(실행분): 100 × 20s × 1 GiB = **2,000 GiB-초** ≪ 90,000 → **$0**
- **idle 메모리(핵심 감시)**: `sleepAfter=5s`이면 잡당 최대 5초 idle × 1 GiB = 100 × 5 × 1 = **500 GiB-초** ≪ 90,000 → **$0**. (참고로 `5m`로 늘려도 30,000 GiB-초로 아직 여유지만, mediaCid 라우팅상 재사용 이득이 없어 짧게 유지 — D7.)
- cold start(부팅) 시간도 provisioned로 계상되나 100건 규모에선 위 여유 안.
- R2: 썸네일 gif PUT 100(Class A) ≪ 1M, 저장 수십 MB ≪ 10GB → **$0**.
- **Cloudflare Images: 미사용**(영상 blurhash는 컨테이너가 계산). 즉 영상 경로는 Images 변환 과금 벡터가 아니다.
- Queue·DO 요금: 100건 규모 무시 가능.

**결론**: `basic` + 짧은 `sleepAfter`로 영상 100건/월은 **사실상 $0**, 월 $5 추가 상한을 안전하게 만족.

**감시 지표(상한 방어선)**
1. **컨테이너 warm/idle 시간** — 메모리 GiB-초 잠식. `sleepAfter`로 관리, scale-to-zero 실제 동작 확인.
2. **잡당 실행 시간 ≤ 20초** — 초과분(타임아웃) 비율. 높으면 프레임 수/해상도/입력 방식(D3) 재검토.

---

## 6. 열린 질문 / 리스크

- **wrangler/compat_date 상향**: 컨테이너 지원 위해 nail-artist의 wrangler(현재 ^4.61.1→최신)·`compatibility_date`(2024-09-23→상향) 조정이 필요할 수 있다. **큐 소비자 동작 회귀**를 반드시 검증. (단 Containers는 wrangler 4.2x부터 지원되므로 현 버전으로 이미 가능할 공산이 크다 — `@cloudflare/containers` 패키지 추가는 별개로 필수.)
- **`containerFetch` 호출 방식(스파이크)**: §3.6은 stub에 대해 `getContainer(...).containerFetch(request, 8080)`을 호출하는데, 문서화된 기본 패턴은 `getContainer(...).fetch(request)`(Container 클래스가 `defaultPort`로 프록시)다. stub RPC 경유 `containerFetch(request, port)`는 Request 직렬화 제약과 얽혀 있으므로 `wrangler dev`에서 동작을 확인하고, 안 되면 `fetch()`로 대체한다(defaultPort=8080이라 계약 변경 없음).
- **static-ffmpeg의 HTTPS/CA(스파이크 — 전면 블로커 가능)**: §3.4는 "CA 인증서 내장"을 이유로 distroless를 골랐지만, 관건은 **정적 ffmpeg/ffprobe 빌드가 `https` 프로토콜을 포함하고 distroless의 `/etc/ssl/certs` 경로를 실제로 참조하는가**다. 실패하면 presigned 입력 자체가 불가능하다. 따라서 §7 step 1의 로컬 검증은 **로컬 파일이 아니라 반드시 R2 presigned HTTPS URL을 입력으로** 수행한다(로컬 파일로 테스트하면 이 리스크를 그대로 통과시킨다).
- **아이폰 코덱/컨테이너 포맷(HEVC·`.mov` moov-atom-at-end)**: ffmpeg가 presigned URL을 HTTP로 읽을 때 moov atom이 파일 끝에 있으면 seek(range) 요청이 필요하다. R2 presigned가 range를 지원하므로 가능하나, `-t 10` 조기 종료의 신뢰성과 HEVC 디코드 지원은 **스파이크로 확인**(안 되면 D3 폴백=전체 다운로드).
- **~~짧은 영상(<2초) 실패~~(검증 완료, §3.3에 반영)**: 고정 `fps=1/2.5`는 ~2초 미만 영상에서 프레임 0개 → gif 실패(썸네일 null), 2.5~5초는 정지 1프레임. **ffprobe 선측정 + 적응형 `fps=4/min(d,10)` + 단일 프레임 폴백**으로 해소 — 0.5~30초 전 구간 4프레임 gif 생성을 로컬 ffmpeg 7.0.1로 확인. (적응형 fps가 의존하는 ffprobe의 duration 취득 신뢰성은 위 moov-atom 스파이크와 함께 검증.)
- **cold start 지연**: mediaCid별 라우팅 + 짧은 sleepAfter라 사실상 매번 cold start. 썸네일은 비동기라 허용되나, 이미지 크기가 지연을 키우면 정적 ffmpeg로 이미지 축소 검토.
- **gif 화질(단일 패스 팔레트)**: `palettegen`/`paletteuse` 2-pass 없이 단일 패스로 뽑는다. 색 밴딩이 눈에 띄면 2-pass 도입(시간 예산 내에서).
- **20초 내 다운로드+인코드 여유**: 대형/고비트레이트 영상 스파이크로 실측 필요. 초과 시 프레임 수·해상도 하향.
- **로컬 개발**: 컨테이너는 Docker 필요, `max_instances`는 프로덕션에서만 강제(`wrangler dev` 미강제). Workers Paid + Containers 활성 계정 필요.
- **DO 인스턴스 누적**(비이슈, 참고): mediaCid별 라우팅은 `idFromName(mediaCid)`로 영상마다 고유 DO를 만든다(월 100 → 연 ~1,200개). 다만 이 DO는 **SQL 상태를 쓰지 않고** 컨테이너는 scale-to-zero되므로, 유휴 빈 DO의 상시 비용은 사실상 없다(요금은 존재가 아니라 요청 기준). 정리 로직 불필요.
- **presigned 만료 vs cold start**(§3.6 반영): 기본 만료 180s는 컨테이너 cold start + ffprobe + ffmpeg 순차 실행에 빠듯할 수 있어 **explicit `expiresIn=600s`**로 발급한다. 두 번의 fetch(ffprobe·ffmpeg)가 모두 만료 전이어야 한다.
- **~~응답 페이로드 크기~~(검증 완료, 비이슈)**: Worker↔Container(`containerFetch`, DO 터널) 경로엔 공식 body 크기 제한이 없고, 실질 천장은 **Worker isolate 메모리 128MB**(`arrayBuffer()` 버퍼링이 여기 계상)다. gif는 `-t 10`·300×300·~4프레임이라 **구조적으로 sub-MB**(비압축 최악도 ≈360KB)라 128MB 대비 0.8%로 무시 가능 → **버퍼링 후 PUT 안전**. 스트리밍은 수십 MB급에서만 의미(Cloudflare best-practice). [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/)

---

## 7. 구현 단계 분할

1. **nail-clipper 컨테이너**(Go): `src`(HTTP :8080, `POST /thumbnail`, 20초 ctx, ffprobe 선측정 + 적응형 fps ffmpeg gif, gif 첫 프레임 blurhash, 버퍼링 후 응답, SIGTERM shutdown) + `Dockerfile`(distroless + static ffmpeg, §3.4). → **로컬 빌드 + 샘플 영상으로 gif/blurhash 검증**(docker run + curl). **입력은 반드시 R2 presigned HTTPS URL로**(§6 HTTPS/CA 스파이크 — 로컬 파일 입력으로는 검증되지 않는다). 검증 기준에 **재생 타이밍(프레임당 0.5초, 2초 루프 — §3.3 `setpts`) 확인** 포함(길이가 다른 샘플 2개 이상으로).
2. **nail-artist 배선**: `NailClipperContainer` DO 클래스 + **`src/index.ts`에서 DO 클래스 export(§3.5 — 누락 시 deploy 실패)** + wrangler 3블록(`[[containers]]`/DO 바인딩/`new_sqlite_classes` migration) + `Bindings`에 `NAIL_CLIPPER` + `Config.nailClipper` 주입 + `@cloudflare/containers` 의존성 + **wrangler/compat_date 상향 및 큐 회귀 검증**.
3. **VideoThumbnailStrategy 구현**: stub → presigned 생성 → `containerFetch`(호출 방식은 §6 스파이크) → gif+blurhash 수신 → `thumbnail.gif` PUT → `Thumbnail.from`. Worker측 AbortSignal 타임아웃 60초(§3.6). → **테스트 갱신**(컨테이너 fetch를 mock).
4. **통합 검증**: `wrangler dev`(로컬 컨테이너) 또는 배포 후 실제 영상 확정 플로우로 e2e 확인 + 비용 감시 지표(§5) 관측.
