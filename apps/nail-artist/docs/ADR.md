# ADR-001: 썸네일 추출 및 blurhash 파이프라인

- 상태: 확정(Accepted)
- 작성일: 2026-07-06
- 관련 앱/패키지: `apps/joka-api`, `apps/nail-artist`, `apps/ffmpeg-wrapper`(추후), `packages/domain-media`, `packages/infra-object-storage`, `packages/infra-thumbnail`
- 전제: Cloudflare Paid plan(Workers Paid, Queues, Images, Containers) 구독

---

## 0. 제약 및 목표(Constraints)

우선순위가 높은 순서.

1. **비용(제1 목표).** 기본 과금 $5에 더해 **추가 과금은 월 $5를 넘지 않는다.** 모든 설계 결정은 이 상한을 최우선으로 고려한다.
   - Queue는 **재시도 없이** 실패 시 **로그만 남기고 항상 drop(ack)** 한다(현재 DLQ 미도입, 추후 삽입 대비 — §4 D3).
   - **Cloudflare Containers가 비용 최대 리스크**다. Container **최대 실행 시간을 20초로 강제**한다(§3.6, 추후 작업).
2. **이번 스프린트 범위 = producer 배선 + nail-artist.**
   - `ffmpeg-wrapper`(영상)는 **추후 작업**으로 미룬다.
   - nail-artist는 이미지/영상 썸네일 추출을 **각각 전략(Strategy)으로 캡슐화**한다.
   - **영상 전략은 이번 스프린트에서 `NotImplemented` 예외를 던져도 무방**하다(인터페이스와 배선만 갖춘다).
3. **예상 사용량(월 최대).** 이미지 1,000장 / 영상 100개 업로드. 4K급 초고화질이 아닌 **일반적인 아이폰 사진·영상 화질**. 영상 duration은 **3분 이내**로 가정.
4. **구조 일관성.** nail-artist의 패키지 구조는 joka-api의 클린 아키텍처를 **철저히 따른다.** 완성 후 제3자가 보았을 때 nail-artist와 joka-api가 **같은 사람이 개발한 것처럼** 보여야 한다(§3.1).

---

## 1. 배경 / 문제

Media 도메인 라이프사이클은 `DRAFT → PREPARING → COMPLETE` 3단계다.

- `DRAFT`: 초안 생성(`CreateMediaImpl`), `content = null`
- `PREPARING`: 물리 파일 업로드 후 Content 연결(`CreateContentImpl`) — **이때 `thumbnail: null`로 하드코딩**(`CreateContentImpl.ts:66`)
- `COMPLETE`: 원본 존재 재확인 후 확정(`ConfirmMediaImpl`)

현재 **썸네일 추출과 blurhash 계산 로직이 없다.** 도메인(`Thumbnail`, `Content.thumbnail`), DB 테이블(`thumbnails`), API 스키마, 전용 패키지 골격(`packages/infra-thumbnail`)까지 "받아둘 자리"는 모두 있으나 실제 계산/추출 구현체가 비어 있다(`infra-thumbnail/src/index.ts`는 `add()` 플레이스홀더뿐). 이는 `Content.ts:62`의 `// TODO: Content가 Thumbnail을 만들 수 있도록 하기`, `apps/web/.../photo/model/types.ts:12`의 "현재 썸네일/blurhash를 생성하지 않으므로 content.thumbnail === null" 주석으로도 확인된다.

### 목표

Media 확정(`COMPLETE`) 이후 **비동기로** 썸네일과 blurhash를 생성하여 `thumbnails` 테이블에 영속화한다. 확정 API 응답 지연과 결합하지 않는다(썸네일 생성 실패가 확정을 롤백하지 않는다).

---

## 2. 결정 개요(아키텍처)

```
[joka-api]                          [Cloudflare Queue]          [nail-artist Worker]
confirm 컨트롤러                                                 queue() consumer (실패해도 항상 ack)
  ConfirmMedia.invoke() → COMPLETE (commit)                      1. getByCid (시스템 조회)
  c.executionCtx.waitUntil        ──enqueue {mediaCid}──▶        2. Content 존재 확인
    (THUMBNAIL_QUEUE.send)                                       3. 원본 HEAD (S3Client · R2를 S3 API로)
                                                                 4. mimeType로 Strategy 선택
                                                                    ├─ image ─▶ ImageThumbnailStrategy
                                                                    │            blurhash(Images rgba) → Images 300x300
                                                                    │            → R2 PUT → Thumbnail 반환
                                                                    └─ video ─▶ VideoThumbnailStrategy
                                                                                 ★ 이번 스프린트: NotImplemented
                                                                                 (추후) ffmpeg-wrapper 위임
                                                                 5. setContent(attachThumbnail) → repo.update
```

- **이벤트 소스**: confirm **컨트롤러**가 `ConfirmMedia.invoke()` 성공 후 `c.executionCtx.waitUntil`로 Cloudflare Queue에 `{mediaCid}` enqueue(best-effort·non-blocking). use-case는 순수 유지(§4 D1, §3.2).
- **소비자**: 신규 Worker `nail-artist`가 Queue consumer로 dequeue. 실패해도 재시도 없이 로그 후 ack(§4 D3).
- **Strategy 캡슐화**: `mimeType`으로 이미지/영상 전략을 선택. 이미지 전략은 완성, **영상 전략은 `NotImplemented` stub**.
- **이미지 분기**: blurhash 계산(성공) → Cloudflare Images 300×300 → R2 저장 → `Thumbnail` 반환(§3.5).
- **영상 분기(추후)**: `ffmpeg-wrapper`(Go, Cloudflare Containers, **최대 20초**)가 초기 10초에서 3~5장을 이어붙인 300×300 gif + 첫 프레임 blurhash 생성/반환.
- **영속화**: 시스템 서비스 경로(`getByCid` + `attachThumbnail`)로 기존 `repository.update`의 `thumbnails` upsert를 재사용(신규 리포지토리 불필요).

### 영속화가 이미 가능한 이유(중요)

`media.repository.ts:292-313`은 `Content`에 `Thumbnail`이 달려 있으면(`!target.hasNoThumbnail`) `thumbnails` 테이블에 `onConflictDoUpdate`로 upsert한다. 따라서 nail-artist는 **`Thumbnail`을 붙인 `Content`로 `repository.update()`를 호출**(시스템 서비스 경유)하면 그대로 저장된다. 쓰기 경로를 새로 만들 필요가 없다.

---

## 3. 상세 설계

### 3.1 nail-artist 패키지 구조 — joka-api 미러링

joka-api의 레이어 관용구를 그대로 옮긴다. 어댑터가 HTTP(Hono controller) 대신 **Queue consumer**라는 점만 다르다.

| 레이어 | joka-api | nail-artist(신규) | 역할 |
|---|---|---|---|
| Entry | `src/index.ts` (Hono app) | `src/index.ts` (`export default { queue }`) | Cloudflare 진입점 |
| Adapter(inbound) | `infrastructure/web/v1/*.controller.ts` | `infrastructure/queue/thumbnail.consumer.ts` | 메시지 → use-case 매핑, 성공·실패 모두 ack(drop) |
| Use-case 추상 | `domain/use-case/*.ts` + `UseCase.ts` | `domain/use-case/ExtractThumbnail.ts` + `UseCase.ts` | Request/Response 계약 |
| Use-case 구현 | `application/use-case/command·query/*Impl.ts` | `application/use-case/command/ExtractThumbnailImpl.ts` | 오케스트레이션 |
| Strategy 포트 | (해당 없음) | `domain/strategy/ThumbnailStrategy.ts` | `supports(mimeType)` / `extract(content)` 계약 |
| Strategy 구현 | (해당 없음) | `infrastructure/strategy/{Image,Video}ThumbnailStrategy.ts` | Images/WASM(이미지), 컨테이너 위임(영상) |
| 배선 | `application/config/index.ts` (`Config` 싱글턴) | `application/config/index.ts` (`Config` 싱글턴) | 서비스·전략 조립 + `Config.images` setter(§4 D8) |
| 환경 모델 | `application/model/cloudflare.model.ts` | `application/model/cloudflare.model.ts` | `Bindings` 타입(`HYPERDRIVE`/`IMAGES`/`THUMBNAIL_QUEUE` 바인딩 + `OBJECT_STORAGE_*` env — **R2 네이티브 바인딩 아님**, §3.4) |

관용구도 동일하게 따른다.
- `UseCase<Request, Response>` 인터페이스(`name` + `invoke`), 추상 use-case에 `UseCaseName` 상수 + `Request`/`Response` 타입.
- 구현체는 `export default new XxxImpl()`, `Config` 싱글턴 getter로 의존성 취득.
- 예외는 `@joka/core/src/exception`의 예외 계층 재사용(신규 `NotImplementedException` 등 필요 시 core에 추가).
- `domain-media`의 `MediaService`/`MediaRepository`/`Thumbnail`/`Content`를 그대로 재사용(도메인 중복 정의 금지).

### 3.2 Producer — joka-api

큐 발행은 도메인 로직이 아니라 다운스트림 통합(infra) 관심사이므로 **confirm 컨트롤러**에 둔다(use-case는 순수 유지). `ConfirmMediaImpl`은 `PREPARING`이 아니면 예외를 던지므로 `invoke()` 성공 = `PREPARING→COMPLETE` 신규 전이 1회 → 중복 enqueue가 없다.

```ts
// infrastructure/web/v1/media.controller.ts — confirm 핸들러
const result = await ConfirmMedia.invoke({ actor, mediaCid });
c.executionCtx.waitUntil(
  c.env.THUMBNAIL_QUEUE.send({ mediaCid }),   // best-effort·non-blocking, 실패해도 confirm은 성공
);
return c.json(await toMediaResponse(result), 200);
```

- `waitUntil`은 `executionCtx`에 있으므로 컨트롤러가 유일하게 non-blocking 발행이 가능한 지점이다.
- `wrangler.toml`에 producer 바인딩 추가:
  ```toml
  [[queues.producers]]
  queue = "thumbnail-jobs"
  binding = "THUMBNAIL_QUEUE"
  ```
- 메시지 스키마(§4 D1): `type ThumbnailJob = { mediaCid: string };`

### 3.3 Queue — 저비용·재시도 없음·로그온리

- 큐 이름: `thumbnail-jobs`
- consumer 설정(nail-artist `wrangler.toml`):
  ```toml
  [[queues.consumers]]
  queue = "thumbnail-jobs"
  max_batch_size = 10        # 기본값. 이 규모에선 비용 무관(아래 참고). DB 커넥션 피크가 보이면 5로 낮춘다.
  max_batch_timeout = 10     # 기본 5→10초. 산발적 트래픽을 조금 더 모아 invocation 절감. 썸네일은 비동기라 지연 허용.
  max_concurrency = 2        # 병렬 invocation 상한 → Images 동시 호출·DB 커넥션 피크 방어("동시성 억제" 완성).
  max_retries = 0            # 재시도 금지(§4 D3). 재시도발 Images 재변환(§6 dedup 부재)을 원천 차단.
  # dead_letter_queue 없음(§4 D3). 필요해지면 그때 DLQ + 재처리 로직만 추가.
  ```
- **비용 관점(이 규모에선 배치 크기가 비용을 안 바꾼다)**: Queue op은 **메시지당** 과금이라 배칭해도 read op 수가 줄지 않고(월 ~3,300 ops ≪ 100만 → $0), Worker invocation도 무료 구간(월 1,000만) 안이라 $0. 따라서 배치 크기·타임아웃은 **비용이 아니라 지연·리소스 피크**를 조율하는 손잡이다. 실질 비용 방어는 `max_retries=0`(§4 D3)과 `max_concurrency` 상한 두 개.
- **실패 처리 정책**: 재시도에 연연하지 않는다. 처리 중 어떤 오류든 **로그만 남기고 항상 `message.ack()`(drop)**. 일시 장애로 실패한 미디어는 `thumbnail=null`로 남고(프런트가 이미 처리), 복구는 추후 백필 수단으로(§6).

### 3.4 Consumer — nail-artist (신규 Worker)

`export default { async queue(batch, env, ctx) { ... } }`.

필요한 바인딩/설정:
- `HYPERDRIVE` — Postgres 접근(`lib-drizzle` + `media.repository` 재사용)
- **오브젝트 스토리지 — R2 네이티브 바인딩이 아니라** joka-api와 동일하게 `OBJECT_STORAGE_*` env(endpoint·accessKeyId·secretAccessKey·bucketName 등)로 초기화하는 aws4fetch 기반 `S3Client`. 원본 GET·HEAD 및 썸네일 PUT (§4 D4). `wrangler.toml` `[vars]`/secret에 joka-api와 동일한 키를 선언한다.
- `IMAGES` — Cloudflare Images 바인딩

핸들러는 **절대 throw하지 않고**(한 건 실패가 배치 전체를 재전달시키지 않도록) 메시지마다 `try/catch`로 감싸 **성공·실패 모두 `ack`** 한다:

```js
async queue(batch, env, ctx) {
  ClientFactory.configure(env.HYPERDRIVE.connectionString);   // 배치당 1회 배선
  try { S3Client.getInstance(); }                             // joka-api object-storage.middleware와 동일 패턴
  catch { S3Client.init({ /* env.OBJECT_STORAGE_* */ }); }    // 미초기화일 때만 init(중복 init은 throw)
  Config.mediaBucketName = env.OBJECT_STORAGE_BUCKET_NAME;    // 썸네일 PUT 경로용
  Config.images = env.IMAGES;                                 // 요청 스코프 IMAGES 바인딩을 전역에 주입(§4 D8)

  for (const message of batch.messages) {                      // 순차 처리(동시성 억제)
    try {
      await Config.extractThumbnail.invoke(message.body);      // { mediaCid }
      message.ack();
    } catch (err) {
      console.error('[thumbnail] failed, drop', message.id, err);
      message.ack();                                           // 실패도 항상 drop
    }
  }
}
```

메시지당 처리 흐름(`ExtractThumbnailImpl.invoke({ mediaCid })`):
1. `mediaService.getByCid(mediaCid)` — 시스템 조회(§4 D2). 없으면 `NotFoundException` → 상위 catch에서 로그·drop.
2. `media.hasNoContent`면 예외 → 로그·drop.
3. `S3Client.headOrThrow(media.content!.url)` — 원본 확인. 없으면 예외 → 로그·drop.
4. `mimeType`로 전략 선택(`ThumbnailStrategy.supports`) → `const thumbnail = await strategy.extract(media.content!)`.
5. `mediaService.attachThumbnail(media, thumbnail)` — `setContent` + `repository.update`(§4 D2, §3.7). **`MEDIA_VERSION_MISMATCHED` 시 `getByCid` 재로드 후 재부착을 2~3회 재시도**(§3.7). 썸네일 바이트는 이미 계산·R2 저장 완료라 이 재시도는 **step2~4(Images 변환) 밖**이므로 Images를 재호출하지 않는다. 재시도 소진 시 상위 catch에서 로그·drop.

### 3.5 이미지 전략 — ImageThumbnailStrategy (이번 스프린트 완성)

저장 경로: 원본 `media/{mediaCid}/original` → 썸네일 `media/{mediaCid}/thumbnail.jpg`(썸네일 URL은 `content.url`에서 파생).

변환 파라미터는 **모듈 상수로 고정**한다(가변 파라미터는 unique-transformation 과금을 늘림 — §5 감시 #1):
```ts
const THUMBNAIL_TRANSFORM = { width: 300, height: 300, fit: 'cover' } as const;
const BLURHASH_TRANSFORM  = { width: 32,  height: 32,  fit: 'cover' } as const;
```

**실행 순서 — 모든 변환·계산을 끝낸 뒤에 R2에 쓴다**(부분 실패 시 R2 고아 방지):
1. `const original = await S3Client.getInstance().get(content.url)` — 원본을 **`ArrayBuffer`(버퍼)로 반환**(§4 D4). ⚠️ **스트림을 그대로 반환하지 말 것.** Images 바인딩 `input()`은 `ReadableStream`을 받으면 **1회만 소비**하므로, 같은 스트림을 step2·step3 두 변환에 재사용하면 두 번째 변환이 "이미 소비됨"으로 깨진다(Cloudflare 공식 확인). 버퍼(`ArrayBuffer`/`Uint8Array`)는 소비되지 않으므로 아래 두 변환에 **동일 버퍼를 그대로 재전달**할 수 있다. **타입 주의**: `input()`의 공식 타입 시그니처는 `input(stream: ReadableStream<Uint8Array>)`로 `ArrayBuffer`를 명시하지 않으나, 런타임은 `ArrayBuffer` 입력을 수용한다(Cloudflare 공식 블로그가 `input(await file.arrayBuffer())`를 예제로 제시). 구현 시 타입 단언이 필요할 수 있으므로 스파이크로 확인한다.
2. **blurhash 먼저**: `Config.images.input(original).transform(BLURHASH_TRANSFORM).output({ format:'rgba' }).response().arrayBuffer()` → 32×32 **RGBA 원시 픽셀**(Images 바인딩이 `format:'rgba'`로 직접 반환 — 공식 타입 `ImageOutputOptions`의 `format` 유니온에 `'rgb'|'rgba'` 존재) → `new Uint8ClampedArray(buf)` → `blurhash.encode(rgba, 32, 32, 4, 3)`. **별도 JPEG 디코더(`@jsquash/jpeg`) 불필요.** 여기서 실패하면 R2에 아무것도 안 쓴 채 throw. (`Config.images`는 배치 진입 시 주입된 IMAGES 바인딩 — §4 D8.)
3. `Config.images.input(original).transform(THUMBNAIL_TRANSFORM).output({ format:'image/jpeg' }).response().arrayBuffer()` → 300×300 JPEG **바이트**. `.output()`은 `ImageTransformationResult`를 반환하므로 바이트는 `.response().arrayBuffer()`(또는 `.image()`)로 취득해야 한다 — output 자체는 바이트가 아니다. (`input(original)`에 **step2와 동일 버퍼를 다시 전달** — 버퍼라 재사용 안전.)
4. `const stored = await S3Client.getInstance().put(thumbUrl, thumbBytes, 'image/jpeg')` — 계산이 다 성공한 뒤에만 저장. `put`이 `eTag`·`size` 반환(§4 D4).
5. `return Thumbnail.from({ url: thumbUrl, size: stored.size, eTag: stored.eTag, mimeType: 'image/jpeg', blurhash })`.

- Cloudflare Images 바인딩은 **인코딩 포맷(JPEG/WebP/AVIF/PNG) 또는 `rgb`/`rgba` 원시 픽셀을 출력하며(공식 타입 `ImageOutputOptions`), 저장은 하지 않는다**(결과를 Worker로 반환 → Worker가 R2에 PUT). 그래서 축소·RGBA 추출은 Images가(`format:'rgba'`), 저장은 `S3Client.put`이 담당. **별도 WASM 디코더가 필요 없다.**
- **각 `input()` 호출은 1 transformation으로 과금되며 dedup되지 않는다**(§5·§6). 원본당 정확히 2회(blurhash용 rgba + 썸네일용 jpeg)를 유지한다.
- **IMAGES 취득은 `Config.images`(전역 주입, §4 D8)를 경유**하되, `infra-thumbnail`가 Workers 타입에 직접 의존하지 않도록 **좁은 `ImagesPort`(`input(bytes).transform(...).output(...)`)로 한 번 감싼다.** 전역 취득 방식은 joka-api 관용구와 동일하게 유지하면서, 단위 테스트에서는 포트를 mock한다.
- `sharp`는 네이티브 바이너리라 **Workers 런타임 실행 불가** → `infra-thumbnail`의 sharp 의존성 제거/대체(§4 D5).

### 3.6 영상 전략 — VideoThumbnailStrategy (이번 스프린트: NotImplemented)

- 이번 스프린트: `extract()`가 `NotImplemented`(또는 그에 준하는 예외)를 던진다. 인터페이스·전략 선택·배선만 완성.
- **추후**: `ffmpeg-wrapper`(Go, Cloudflare Containers)에 위임.
  - 저장 경로: `media/{mediaCid}/thumbnail.gif`
  - 초기 10초에서 3~5 프레임 → 300×300 gif, 첫 프레임 blurhash
  - **Container 최대 실행 시간 20초 강제**(비용 상한 방어). 3분 이내·아이폰 화질 영상이라 20초 내 처리 가능하다고 가정하되, 초과 시 실패 처리 후 로그.
  - R2 접근: nail-artist가 presigned GET URL 전달(읽기), 결과 바이트/blurhash 반환 → PUT은 nail-artist(§4 D6)

### 3.7 영속화 — 시스템 경로(MediaService 우회)

사용자용 `MediaService.update`는 `context.album.id`·`context.user`·owner 검사를 요구하고 내부에서 `updateBy`(전진 전이 가드)를 타므로, **`COMPLETE` 미디어에 content만 바꾸는 시스템 작업엔 맞지 않는다**(동일 상태 전이 `COMPLETE→COMPLETE`는 `INVALID_STATE_TRANSITION`으로 막힘). 따라서 전용 시스템 경로를 쓴다:

- **`MediaRepository.findByCid(cid)`**(신규): `media.cid`가 `uuid().unique()`로 전역 유일하므로 album 무관 조회. 기존 `findOneOrNull`에서 albumId 조건만 제거.
- **`MediaService.getByCid(mediaCid)`**(신규): `findByCid` 래핑. 권한 검사 없음(시스템 전용).
- **`MediaService.attachThumbnail(media, thumbnail)`**(신규): 이미 로드된 media를 받아 `media.setContent(media.content!.attachThumbnail(thumbnail))` → `repository.update(...)`. 단일 로드.
- **`Content.attachThumbnail(thumbnail): Content`**(신규, `Content.ts:62` TODO 실현): `setContent`/`setUpdated`와 동일한 불변 스타일로 thumbnail만 채운 새 `Content` 반환.

`setContent`는 상태전이 가드를 타지 않고 원 소유자의 `created`/`updated`를 보존하므로 Media 불변식(`created.by.id === updated.by.id`)도 자연히 만족한다. album/owner 검사를 생략해도 안전한 이유: `mediaCid`는 외부 입력이 아니라 우리 confirm 플로우가 발행한 신뢰 경계 내 값이다.

> ⚠️ **낙관적 락 충돌 → 영속화 한정 재시도.** `repository.update`는 `version`을 올리고 `eq(media.version, target.version)` 불일치 시 `MEDIA_VERSION_MISMATCHED`를 던진다(`media.repository.ts:222-234`). 썸네일 write는 confirm 직후 워커가 로드한 version으로 수행되는데, **그 사이 사용자가 `PATCH /v1/media/:mediaId`로 설명을 수정하면 version이 올라 write가 실패**한다(코드 확인 완료 — 유일한 경로). `UpdateMedia`는 요청에 `state`가 없어 `updateBy`의 전이 가드가 `request.state && ...`로 **스킵**되므로 COMPLETE에서도 통과하고, `confirm`·`content 부착`은 각자 state 전제조건으로 막히며, 즐겨찾기 토글 경로는 코드에 **존재하지 않는다**(`isFavorite`는 `false` 하드코딩·update 미기록). **대응**: `MEDIA_VERSION_MISMATCHED`를 catch해 `getByCid`로 재로드 후 재부착을 2~3회 재시도한다. 이 재시도는 이미 계산·R2 저장된 썸네일 바이트만 다시 write하므로 **Images 변환을 재호출하지 않는다** → D3의 큐 재시도 금지(=Images 재과금 벡터)와 무관하며 비용 상한을 위협하지 않는다. 재시도 소진 시에만 drop하고 복구는 백필(§6)로 위임. 또한 `attachThumbnail`은 `media.content`가 `null`이면 NPE이므로 §3.4 step2의 `hasNoContent` 가드 순서를 보장한다.

---

## 4. 주요 결정 사항(Decisions)

### D1. 메시지 스키마 — `{ mediaCid }`
`media.cid`는 `uuid().unique()`로 전역 유일(schema:77-79)이라 `findByCid(mediaCid)` 하나로 미디어를 특정하고 `media.albumId`도 로드값에서 얻는다. 따라서 **`albumCid`는 불필요** → 메시지 = **`{ mediaCid: string }`**. (문자열이 아닌 객체로 두어 향후 필드 확장 여지 유지.) 발행은 confirm 컨트롤러의 `executionCtx.waitUntil`(§3.2).

### D2. 시스템 컨텍스트 조회/저장 경로(MediaService 우회)
Queue consumer엔 사용자 세션이 없고, `MediaService.update`는 owner/album 검사 + `updateBy` 전이 가드를 타 `COMPLETE` 미디어의 content-only 변경에 부적합하다. 그래서 **`MediaRepository.findByCid` + `MediaService.getByCid`(읽기) + `MediaService.attachThumbnail(media, thumbnail)`(쓰기) + `Content.attachThumbnail`(도메인) + `Media.setContent`** 로 구성되는 시스템 경로를 신설한다(§3.7). 사용자용 `update`는 불변. `setContent`가 전이 가드를 우회하고 불변식(`created.by.id === updated.by.id`)을 보존하는 것이 핵심.

> 대안으로 검토했던 **System Actor**(Actor 정적 getter)는 이 경로를 풀지 못한다: Actor가 구체 album·user를 강제하는데 미디어를 로드하기 전엔 album.id를 모르고(순환), MediaService.update를 타면 `updateBy` 가드가 되살아나며, 불변식상 시스템을 수정자로 기록할 수도 없다. → 채택하지 않음(YAGNI).

### D3. Queue 실패 처리 — 재시도 없이 항상 로그·drop (`max_retries=0` + always-ack)
재시도에 연연하지 않는다. 핸들러는 throw하지 않고 메시지마다 `try/catch`로 **성공·실패 모두 `ack`**, 실패 시 로그만 남긴다(§3.3, §3.4). always-ack만으로도 재시도는 안 일어나지만, **`max_retries=0`을 명시적으로 설정**한다 — always-ack를 뚫고 핸들러가 throw하는 경우에도 재시도를 막는 **능동적 비용 방어**다. 이유: 재시도는 read op 하나로 끝나지 않고 이 파이프라인 **전체를 재실행**하므로, **dedup되지 않는 Cloudflare Images 변환 2회가 매 재시도마다 새로 과금**된다(§6). 즉 재시도 = Images 비용 증폭 벡터이므로 원천 차단한다. `dead_letter_queue`는 두지 않는다(놓친 썸네일은 `thumbnail=null`로 남고 복구는 추후 백필로 — §6). 추후 재시도·DLQ가 필요하면 그때 설정 + 재처리 로직만 추가한다. 병렬 invocation 상한(`max_concurrency=2`)도 Images 버스트·DB 커넥션 피크 방어를 위해 함께 설정(§3.3). 단, **큐 레벨 재시도(파이프라인 전체 재실행 → Images 재과금)** 금지와 **영속화 한정 재시도(§3.7 — DB write만 재시도, Images 미호출)** 는 별개다. 후자는 비용 벡터가 아니므로 허용한다.

### D4. R2 바이트 I/O — S3Client에 get·put 추가
`S3Client`는 head/presigned/deleteMany만 있어 **바이트 읽기(`get`)도 쓰기(`put`)도 없다.** 원본을 Images에 넘기려면 `get`, 썸네일을 저장하려면 `put`이 필요하다. `head` 스타일(`this.client.fetch(url.fullPath, {method})`)로 둘을 대칭 추가하고 `ObjectStorageClient` 인터페이스에도 반영. **`get`은 스트림이 아니라 `ArrayBuffer`(버퍼)를 반환**한다(Images `input()`의 2회 재사용을 위해 — §3.5 step1). 404 시 예외(`get`은 원본이 반드시 있어야 하는 경로이므로 `head`의 null 반환과 달리 throw). **`put`은 업로드 후 `eTag`·`size`(=body.byteLength)를 담은 `BucketObject`를 반환**해 `Thumbnail.from`의 메타를 별도 HEAD 없이 확보. native R2 바인딩은 인터페이스가 갈라져 보류(코드 공유·일관성 유지).

### D5. blurhash 연산 — Cloudflare Images `rgba` 직접 출력(WASM 디코더 불필요)
§3.5 참고. Images `output({ format:'rgba' })`가 32×32 **RGBA 원시 픽셀을 직접 반환**한다(공식 타입 `ImageOutputOptions`의 `format` 유니온에 `'rgb'|'rgba'` 포함 — Cloudflare 산문 문서엔 미열거이나 workerd 타입 정의·공식 블로그 예제로 확인). 따라서 별도 JPEG 디코더(`@jsquash/jpeg`)가 필요 없다. `sharp`(네이티브)는 Workers 불가 → **제거**하고, `infra-thumbnail`은 이미 의존 중인 `blurhash`(순수 JS)로 `encodeBlurhash(rgba, w, h)`만 구현한다.

### D6. ffmpeg-wrapper의 R2 접근(추후) — presigned URL 전달 + 결과 반환
컨테이너에 장기 자격증명을 심지 않도록 nail-artist가 presigned GET URL 전달(읽기), 결과 바이트+blurhash 반환 → PUT은 nail-artist가 수행(자격증명 단일화).

### D7. 썸네일 추출 = Strategy 패턴
`ThumbnailStrategy` 포트(`supports(mimeType)`, `extract(content): Promise<Thumbnail>`)를 두고 `Image`/`Video` 구현으로 캡슐화. 전략 선택은 `mimeType` 기반 팩토리/`Config` 배선. 영상 전략 교체(추후 ffmpeg-wrapper 연결)가 다른 레이어에 영향을 주지 않게 한다.

### D8. `env.IMAGES` 주입 — 배치당 전역 configure(joka-api 관용구 답습)
**문제**: Workers의 `env`(따라서 `IMAGES` 바인딩)는 invocation 안에서만 존재하는데, DI는 import 시점에 생성되는 `Config` 싱글턴이라 시점이 어긋난다. 이미지 전략은 `env.IMAGES`가 필요하지만 큐 consumer엔 joka-api의 바인딩 주입용 Hono 미들웨어가 없다.

**결정**: joka-api가 이미 세 번 쓰는 방식(`ClientFactory.configure(connectionString)`, `Config.mediaBucketName = ...`, `S3Client.init(...)`)과 **동형으로**, `queue()` 진입 시 `Config.images = env.IMAGES`로 전역에 주입하고 전략은 `Config.images`로 취득한다(§3.4/§3.5). use-case 시그니처(`invoke(request)`)와 Strategy 포트 계약(`extract(content)`, D7)은 그대로 유지 → §0.4 일관성 목표 충족.

**안전성**: `IMAGES`는 배포 내 불변 객체이고 consumer는 배치를 단일 isolate에서 순차 처리하며 배치당 1회만 set하므로, 전역 가변에서 우려되는 "다른 값 덮어쓰기 경쟁"이 실질적으로 없다(HYPERDRIVE·S3도 동일 리스크를 이미 감수 중).

**포트 경계**: 전역 취득은 유지하되 `infra-thumbnail`가 Workers 타입에 직접 의존하지 않도록 좁은 `ImagesPort`로 감싸 단위 테스트 가능성을 확보(§3.5).

> 대안 검토: **A(invoke/extract 인자로 좁은 포트 전달)**는 전역 가변을 피하고 테스트가 깔끔하나 use-case 시그니처를 `invoke(request, deps)`로 넓혀 joka-api 관용구에서 오히려 멀어짐. **C(`createConfig(env)` 팩토리)**는 DI가 가장 깨끗하나 `export default new Config()` 싱글턴 관용구를 정면으로 깨 §0.4 위배가 커 채택하지 않음(YAGNI/일관성).

---

## 5. 비용 모델(검증 완료)

단가 출처: Cloudflare 공식 요금 문서(Images/Queues/Containers/R2 pricing, 2026-07 확인). 기준: **Workers Paid $5/월**(플랫폼 기본, 아래 포함량 제공).

**Workers Paid에 포함되는 무료 구간 / 초과 단가**

| 항목 | 포함량(월) | 초과 단가 |
|---|---|---|
| Queues | 1,000,000 ops | $0.40 / 1M ops (op = 64KB 단위 write·read·delete) |
| Images 변환 | 5,000 unique transformations | $0.50 / 1,000 |
| R2 | 저장 10GB, Class A(쓰기) 1M, Class B(읽기) 10M | A $4.50/1M, B $0.36/1M, 저장 $0.015/GB, egress 무료 |
| Containers | CPU 375 vCPU-분, 메모리 25 GiB-시, 디스크 200 GB-시 | CPU $0.000020/vCPU-초, 메모리 $0.0000025/GiB-초, 디스크 $0.00000007/GB-초 |

**이번 스프린트(이미지만, 컨테이너 stub)** — 월 이미지 1,000
- Queues: 1,100 메시지 × ~3 ops ≈ 3,300 ≪ 1M → **$0**
- Images: 1,000 × 변환 2회(300²+32²) = 2,000 ≪ 5,000 → **$0** (단 바인딩은 dedup 안 함 — 재배달·백필 재처리분이 그대로 더해짐, §6·감시 #1)
- R2: 썸네일 PUT 1,000(Class A) ≪ 1M, HEAD/GET(Class B) ≪ 10M, 저장 수십 MB ≪ 10GB → **$0**
- → **추가 과금 ≈ $0**, 상한 $5 크게 밑돎

**정상 운영(영상 포함, 추후)** — 월 영상 100 × 최대 20초
- Containers: CPU 2,000 vCPU-초 ≪ 22,500(=375분), 메모리(2GiB 가정) 4,000 GiB-초 ≪ 90,000(=25 GiB-시), 디스크도 여유 → 실행 시간 기준 **$0**
- **주의**: 요금은 "요청 도착~sleep"까지 과금이며 메모리·디스크는 **실행 중 provisioned 기준**이다. 따라서 **20초 실행 상한만으로는 idle 비용을 못 막는다** → 요청 사이 warm 유지가 길면 메모리 GiB-초가 포함량을 잠식. **빠른 scale-to-zero(짧은 sleep) 설정 필수.** Containers는 Durable Objects 위에서 동작해 DO 요금도 별도 계상되나 100건 규모는 무시 가능.

**감시 지표(상한 방어선)**
1. **Images 변환 ≤ 5,000/월** — 정상 처리 시 1,000장×2회=2,000, ~2,500장까지 여유. 단 **Images 바인딩은 dedup하지 않으므로**(§6) 큐 재배달(at-least-once)·백필 재처리분이 그대로 더해진다. 따라서 "장 수"가 아니라 **실제 `input()` 호출 수**를 지표로 감시하고, 재배달률이 높으면 여유가 잠식됨을 유의. 초과 시 $0.50/1,000. 변환 파라미터를 상수로 고정해(§3.5) 원본당 정상 2회를 유지하는 것이 전제.
2. **컨테이너 idle/warm 시간** — 메모리 GiB-초 잠식. scale-to-zero 확인.

**결론**: 검증된 단가 기준 이번 스프린트는 사실상 **$0**, 영상 포함 정상 운영도 100건/월 규모에선 포함량 내 → **월 $5 추가 상한을 안전하게 만족**. 위 감시 지표 2개만 지키면 된다.

---

## 6. 열린 질문 / 리스크

- **Cloudflare Images 입력 소스**: R2 오브젝트를 Images `input`에 넘기는 방식(바인딩 스트림 vs fetch(presigned)) — 스파이크 필요.
- **~~blurhash WASM 번들 크기/cold start~~**: 해소됨 — Images `output({ format:'rgba' })` 직접 출력으로 WASM 디코더(`@jsquash/jpeg`) 자체가 불필요(§3.5·D5).
- **enqueue 유실**: `ctx.waitUntil` enqueue 실패 시 썸네일이 안 생김 → (DLQ 없는 정책상) 백필 수단(관리자 재큐 API/배치)을 추후 검토.
- **낙관적 락 충돌(설명 수정)**: confirm 직후 사용자가 `PATCH /v1/media`로 설명을 수정하면 `version`이 올라 썸네일 write가 `MEDIA_VERSION_MISMATCHED`로 실패(코드 확인 완료 — COMPLETE에서 version을 올리는 유일한 사용자 경로). **영속화 한정 재시도(§3.7, Images 미호출)로 방어**하고, 재시도 소진 시에만 백필로 복구.
- **멱등성(결과는 멱등, 비용은 비멱등)**: 같은 mediaCid 중복 배달 시 R2 PUT·thumbnails upsert는 멱등(경로 고정 + onConflict)하므로 **결과**는 안전. ⚠️ 그러나 **Cloudflare Images 바인딩은 dedup하지 않는다** — URL 방식 변환은 "동일 원본+파라미터"를 월 1회로 집계하지만, **바인딩(`env.IMAGES.input`)은 동일 원본·파라미터라도 모든 호출을 각각 1 transformation으로 과금**한다(공식 문서). 따라서 중복 배달·백필 재처리마다 이미지당 2 transformation이 새로 계상 → **비용은 멱등이 아니다**. at-least-once 큐 특성상 소량의 재배달은 상시 가능하므로 감시 지표(§5 #1)로 관리.
- **배치 DB 연결 압박(감시 대상)**: `MediaRepository.connection`이 접근마다 새 postgres 클라이언트를 생성(`.end()` 없음)한다. 순차 처리로 동시성은 억제되나, 배포 후 부하 관찰에서 압박이 보이면 invocation당 연결 재사용으로 완화(선제 리팩터링은 안 함 — surgical/YAGNI).
- **~~Images 무료 변환 구간~~**: 해소됨 — 5,000/월 포함, 초과 $0.50/1,000(§5 확정).

---

## 7. 구현 단계 분할

### 이번 스프린트
1. **Producer**: confirm 컨트롤러 `executionCtx.waitUntil` enqueue(D1, §3.2) + joka-api `wrangler.toml` Queue producer 바인딩 + `{ mediaCid }` 스키마.
2. **도메인/영속화 확장**(D2, §3.7, `domain-media` 공유): `MediaRepository.findByCid` + `MediaService.getByCid`/`attachThumbnail(media, thumbnail)` + `Content.attachThumbnail`(Content.ts:62 TODO 실현) + `S3Client.get`/`put`(D4, `infra-object-storage`).
3. **nail-artist 골격**(§3.1 구조): Worker 진입 + `queue()` consumer(항상 ack, §3.3/§3.4) + 배치당 배선(`ClientFactory.configure` / `S3Client` getInstance-or-init / `Config.mediaBucketName` / `Config.images = env.IMAGES`, D8) + `cloudflare.model` `Bindings`에 `IMAGES` 선언 + `OBJECT_STORAGE_*` env(secret) 선언 + `HYPERDRIVE`/repo 재사용 + `S3Client.head`로 원본 확인 + `ThumbnailStrategy` 포트(D7).
4. **이미지 전략**: 변환 파라미터 고정 + blurhash 우선 순서(§3.5, `format:'rgba'` 직접 출력) + `Config.images`(D8) 경유 Cloudflare Images 300×300 + `Thumbnail` 반환 → `attachThumbnail` 영속화 + `infra-thumbnail` 실제 구현(`sharp` 제거, `blurhash`로 `encodeBlurhash`, `ImagesPort` 포함, D5).
5. **영상 전략 stub**: `VideoThumbnailStrategy`가 `NotImplemented` throw + 배선.

### 추후 작업
5. **ffmpeg-wrapper**: Go/Cloudflare Containers(**20초 상한**) + presigned 전달(D6) + gif/blurhash + 영상 전략 교체.
6. **운영**: DLQ 삽입(필요 시) + enqueue 실패 백필 + Images/Container 실사용 비용 재측정.
