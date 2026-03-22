# joka-api

Cloudflare Workers 기반의 Hono 웹 애플리케이션으로, 가족 사진 앨범 서비스 **JOKA**(Just Our Kid's Album)의 REST API를 제공합니다.

## 기술 스택

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: PostgreSQL 17 + Drizzle ORM
- **Object Storage**: MinIO (로컬) / Cloudflare R2 (프로덕션)
- **Monorepo**: pnpm workspace + Turborepo

## 사전 요구 사항

- [Node.js](https://nodejs.org/) (v18 이상)
- [pnpm](https://pnpm.io/) 10.28.0
- [Docker](https://www.docker.com/) 및 Docker Compose

## 로컬 환경 설정

### 1. 의존성 설치

프로젝트 루트에서 실행합니다.

```bash
pnpm install
```

### 2. 로컬 인프라 실행 (PostgreSQL + MinIO)

`infra/local/` 디렉토리에 Docker Compose 파일과 환경 변수 파일이 준비되어 있습니다.

#### `infra/local/.env`

```dotenv
# MinIO
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=my-very-secure-pw

# PostgreSQL
POSTGRES_USER=admin
POSTGRES_PASSWORD=my-very-secure-pw
POSTGRES_DB=mindjuk
```

#### 컨테이너 실행

```bash
cd infra/local
docker compose up -d
```

실행 후 다음 서비스가 기동됩니다:

| 서비스 | 포트 | 용도 |
|--------|------|------|
| PostgreSQL | `5432` | 데이터베이스 |
| MinIO API | `9000` | 오브젝트 스토리지 API |
| MinIO Console | `9001` | 오브젝트 스토리지 웹 콘솔 |

### 3. MinIO 버킷 생성

MinIO 콘솔(`http://localhost:9001`)에 접속하여 로그인합니다.

- **Username**: `admin`
- **Password**: `my-very-secure-pw`

로그인 후 **Buckets > Create Bucket**에서 `joka-media-contents-prod` 버킷을 생성합니다.

이어서 **Access Keys > Create Access Key**에서 Access Key를 발급받고, 해당 값을 다음 단계의 `.dev.vars` 파일에 기입합니다.

### 4. 데이터베이스 마이그레이션

Drizzle ORM을 사용하여 스키마를 PostgreSQL에 적용합니다.

#### `packages/lib-drizzle/.local.env`

```dotenv
DB_ENDPOINT="postgres://admin:my-very-secure-pw@localhost:5432/mindjuk"
```

#### 마이그레이션 실행

```bash
cd packages/lib-drizzle
pnpm dotenv -e .local.env -- pnpm drizzle:push
```

> `drizzle:push`는 현재 스키마 정의를 기반으로 DB에 직접 반영합니다.
> 마이그레이션 SQL 파일을 생성하려면 `drizzle:generate`를 사용하세요.

### 5. 환경 변수 설정 (`.dev.vars`)

Wrangler 로컬 개발 시 사용하는 시크릿 변수 파일입니다.

#### `apps/joka-api/.dev.vars`

```dotenv
OBJECT_STORAGE_ACCESS_KEY_ID=<MinIO에서 발급받은 Access Key>
OBJECT_STORAGE_SECRET_ACCESS_KEY=<MinIO에서 발급받은 Secret Key>
OBJECT_STORAGE_ENDPOINT=http://localhost:9000
OBJECT_STORAGE_BUCKET_NAME=joka-media-contents-prod
```

> `.dev.vars`에 작성한 값은 Wrangler가 자동으로 Workers 바인딩에 주입합니다.

### 6. 애플리케이션 실행

```bash
cd apps/joka-api
pnpm wrangler:local
```

서버가 `http://localhost:54861`에서 실행됩니다. API base path는 `/api`입니다.

```
http://localhost:54861/api/v1/media
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/v1/media` | 미디어 생성 (DRAFT) |
| `GET` | `/api/v1/media` | 미디어 목록 조회 |
| `GET` | `/api/v1/media/:mediaId` | 미디어 상세 조회 |
| `PATCH` | `/api/v1/media/:mediaId` | 미디어 수정 |
| `POST` | `/api/v1/media/:mediaId/upload-urls` | 업로드 URL 발급 (Pre-signed URL) |
| `POST` | `/api/v1/media/:mediaId/contents` | 업로드 완료 후 Content 등록 |
| `POST` | `/api/v1/media/:mediaId/confirm` | 미디어 확정 (COMPLETE) |
| `DELETE` | `/api/v1/media/:mediaId` | 미디어 삭제 |
| `GET` | `/api/v1/me` | 현재 사용자 정보 |

## Media 생성 흐름

Media는 다음과 같은 상태 전이를 거쳐 완성됩니다:

```
DRAFT ──(Content 생성)──▶ PREPARING ──(확정)──▶ COMPLETE
```

아래는 `curl`을 사용한 전체 흐름 예시입니다. (`BASE_URL=http://localhost:54861/api`)

### Step 1. Media 생성 (DRAFT)

```bash
curl -X POST "$BASE_URL/v1/media" \
  -H "Content-Type: application/json" \
  -d '{"description": "아이 첫 걸음마"}'
```

```json
// 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "description": "아이 첫 걸음마",
  "state": "DRAFT",
  "isFavorite": false,
  "created": {
    "at": "2026-03-22T12:00:00.000Z",
    "by": { "id": "...", "name": "홍길동", "email": "hong@example.com" }
  }
}
```

응답의 `id`를 이후 단계에서 `{mediaId}`로 사용합니다.

### Step 2. 업로드 URL 발급 (Pre-signed URL)

```bash
curl -X POST "$BASE_URL/v1/media/{mediaId}/upload-urls" \
  -H "Content-Type: application/json"
```

```json
// 201 Created
{
  "url": "http://localhost:9000/joka-media-contents-prod/media/{mediaId}/original?X-Amz-Algorithm=..."
}
```

MinIO(또는 S3)에 직접 업로드할 수 있는 Pre-signed URL이 반환됩니다.

### Step 3. 파일 업로드 (PUT)

발급받은 Pre-signed URL에 `PUT` 요청으로 파일을 직접 업로드합니다.

```bash
curl -X PUT "<발급받은 Pre-signed URL>" \
  -H "Content-Type: image/jpeg" \
  --data-binary @./photo.jpg
```

이 요청은 joka-api가 아닌 MinIO(S3)로 직접 전송됩니다.

### Step 4. Content 생성

업로드가 완료되면, 업로드된 파일의 URL을 전달하여 Content를 등록합니다. 이 단계에서 Media 상태가 `PREPARING`으로 전이됩니다.

```bash
curl -X POST "$BASE_URL/v1/media/{mediaId}/contents" \
  -H "Content-Type: application/json" \
  -d '{"url": "media/{mediaId}/original"}'
```

```json
// 201 Created
{
  "location": {
    "url": "media/{mediaId}/original",
    "accessUrl": "http://localhost:9000/joka-media-contents-prod/media/{mediaId}/original?X-Amz-Algorithm=..."
  },
  "size": 2048576,
  "eTag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
  "mimeType": "image/jpeg"
}
```

### Step 5. Media 확정 (COMPLETE)

Content가 등록된 Media를 확정하면 상태가 `COMPLETE`로 전이되어 완전한 Media가 됩니다.

```bash
curl -X POST "$BASE_URL/v1/media/{mediaId}/confirm" \
  -H "Content-Type: application/json"
```

```json
// 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "description": "아이 첫 걸음마",
  "state": "COMPLETE",
  "isFavorite": false,
  "created": {
    "at": "2026-03-22T12:00:00.000Z",
    "by": { "id": "...", "name": "홍길동", "email": "hong@example.com" }
  },
  "content": {
    "location": {
      "url": "media/{mediaId}/original",
      "accessUrl": "http://localhost:9000/..."
    },
    "size": 2048576,
    "eTag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
    "mimeType": "image/jpeg"
  }
}
```

## 프로젝트 구조

```
apps/joka-api/
├── src/
│   ├── index.ts                            # Hono 앱 엔트리포인트
│   ├── domain/                             # 도메인 레이어 (유즈케이스 인터페이스)
│   ├── application/                        # 애플리케이션 레이어
│   │   ├── middleware/                     # Hono 미들웨어
│   │   ├── use-case/                       # 유즈케이스 구현체
│   │   │   ├── command/                    # 쓰기 유즈케이스
│   │   │   └── query/                      # 읽기 유즈케이스
│   │   └── config/                         # 서비스 설정
│   └── infrastructure/web/v1/              # 컨트롤러 (라우트 핸들러)
├── wrangler.toml                           # Cloudflare Workers 설정
└── .dev.vars                               # 로컬 환경 변수 (시크릿)
```

### 주요 워크스페이스 패키지

| 패키지 | 역할 |
|--------|------|
| `@joka/core` | 공통 모델 및 예외 |
| `@joka/domain-media` | 미디어 도메인 서비스 및 영속성 |
| `@joka/lib-drizzle` | DB 스키마 및 Drizzle 클라이언트 |
| `@joka/infra-object-storage` | S3/MinIO 클라이언트 |
| `@joka/lib-openapi` | OpenAPI 스펙 및 타입 생성 |
| `@joka/lib-mime` | MIME 타입 유틸리티 |

## 테스트

```bash
# 전체 테스트
pnpm test

# joka-api 테스트만 실행
cd apps/joka-api
pnpm test

# Watch 모드
pnpm test:watch
```

## Wrangler 설정 참고 (`wrangler.toml`)

로컬 개발 시 Wrangler가 Cloudflare 서비스를 에뮬레이션합니다:

- **R2 Bucket** (`MEDIA_BUCKET`) — 로컬 파일 시스템으로 에뮬레이션
- **KV Namespace** (`MEDIA_CACHE`) — 로컬 SQLite로 에뮬레이션
- **Hyperdrive** (`HYPERDRIVE`) — `localConnectionString`으로 로컬 PostgreSQL에 직접 연결

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<hyperdrive-config-id>"
localConnectionString = "postgres://admin:my-very-secure-pw@localhost:5432/mindjuk"
```
