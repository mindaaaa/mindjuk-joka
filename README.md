<div align="center">

<img width="1280" height="480" alt="banner_A_grad" src="https://github.com/user-attachments/assets/25dc1c27-6961-4e69-80dd-077e4acc38fb" />

</div>

<div align="center">

<h3>
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Serif+KR&weight=600&size=20&color=06C2E1&center=true&vCenter=true&width=720&height=60&duration=3200&pause=900&lines=%EA%B0%80%EC%A1%B1%EB%A7%8C%EC%9D%84%20%EC%9C%84%ED%95%9C%20%EC%9E%91%EC%9D%80%20%EC%82%AC%EC%A7%84%20%EC%95%A8%EB%B2%94%20%EC%9B%B9%EC%95%B1;%ED%95%84%EC%9A%94%ED%95%9C%20%EC%88%9C%EA%B0%84%EC%97%94%2C%20%EC%9B%90%EB%B3%B8%20%EA%B7%B8%EB%8C%80%EB%A1%9C" alt="가족만을 위한 작은 사진 앨범 웹앱" />
</h3>

<p>
  <sub>메신저에 흩어지고 클라우드에 쌓여만 가던 아이 사진을 한 곳에 모으고,<br />
  필요한 순간엔 원본 그대로 다시 꺼내봅니다.</sub>
</p>

<sub>※ 아래 시연 영상은 <b>정식 배포 전 로컬 환경</b>에서 촬영되었습니다. JOKA는 PWA로 설치형 사용을 지원하지만, 시연은 시크릿 모드 브라우저 기준입니다.</sub>

<br />

<p>
  <a href="https://www.figma.com/design/CMmFH7bo58ly7bQ0mnidNw/Joka---Full-App?node-id=12-10&p=f&t=dAfd9nBVgZmOAeCh-0"><img src="https://img.shields.io/badge/Figma_디자인-F24E1E?style=for-the-badge&logo=figma&logoColor=white" alt="Figma" /></a>
  <a href="https://github.com/mindjuk/joka/wiki"><img src="https://img.shields.io/badge/프로젝트_위키-6B5B95?style=for-the-badge&logoColor=white" alt="Wiki" /></a>
</p>

</div>

---

## 📸 What is JOKA?

**JOKA**(Just Our Kid's Album)는 초대받은 가족만 들어올 수 있는 **사적인 사진 앨범 웹앱**입니다.

<br />

아이 사진은 늘 흩어집니다.  
단체 채팅방에 올렸다가 며칠 뒤면 스크롤에 묻히고, 클라우드에는 정리되지 않은 채 쌓이기만 합니다.  
정작 그 한 장이 필요한 순간엔, 어디에 있는지부터 찾아야 하죠.

_JOKA는 **공유는 간단하게, 관리 부담은 최소로**를 목표로 만들었습니다._  
가족만의 공간에 사진을 모아두면, 필요할 때 언제든 **원본 화질 그대로** 다시 꺼내볼 수 있습니다.

---

## 주요 기능

`로그인 → 목록 → 상세 → 다운로드` 흐름으로 이어집니다. 권한에 따라 보이는 화면이 다릅니다.

- 👑 **EDITOR** — 업로드 · 편집 · 삭제
- 👀 **VIEWER** — 열람 · 다운로드

<div align="center">
  
<img width="600" alt="joka-arch-4-user-flow (1)" src="https://github.com/user-attachments/assets/2f4e697b-2ecf-41e3-a136-229ae0d89117" />

</div>

### 1. 가족 로그인 & 권한

**카카오 OAuth**로 간단히 로그인하고, 초대받은 구성원만 앨범에 들어옵니다.  
구성원은 **EDITOR**(올리고·고치고·지우기)와 **VIEWER**(보고·내려받기)로 나뉘어, 권한에 따라 화면이 달라집니다.

> 우리 가족만 들어오는 문을 엽니다.

<!-- 📎 로그인 화면 (EDITOR / VIEWER) -->

<div align="center">

|                                                                EDITOR                                                                |                                                                   VIEWER                                                                    |
| :----------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------------------------: |
| <img width="280" alt="01-demo" src="https://github.com/user-attachments/assets/e83c9293-28ff-441e-a160-128e30f56d68" /> | <img width="280" alt="01-demo-viewer" src="https://github.com/user-attachments/assets/83c9e6d3-7ffc-4f33-ae5f-02b1852807d2" /> |

</div>

### 2. 사진 업로드

드래그&드롭 또는 파일 선택으로 사진을 올리면, **presigned URL 기반 다단계 업로드**로 원본이 안전하게 저장됩니다.  
업로드는 **진행률**과 **상태(대기·업로드·완료·실패)** 로 표시되고, 중간에 실패해도 **재시도**할 수 있습니다.

> 오늘의 한 장을 가족 앨범에 더합니다.

<!-- 📎 업로드 화면 + presigned 시퀀스 -->
<div align="center">

|                                                          데모                                                          |                                                    presigned 업로드 시퀀스                                                     |
| :-------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------: |
| <img width="260" alt="2-demo" src="https://github.com/user-attachments/assets/2c544073-ed0d-47d8-ae60-b6b04ecfeab7" /> | <img width="460" alt="joka-arch-2-upload-sequence" src="https://github.com/user-attachments/assets/a0fce77e-6228-4110-b532-c8f918e42b7d" /> |

<sub>원본은 서버를 거치지 않고 브라우저에서 스토리지로 직접 PUT됩니다.</sub>

</div>

### 3. 사진 목록 & 정렬·선택

업로드된 사진을 **무한 스크롤** 그리드로 훑어보고, **정렬**(최신순 등)으로 원하는 순서로 봅니다.  
여러 장을 **다중 선택**해 한 번에 다운로드하거나 작업할 수 있습니다.

> 지난 날들을 한눈에 다시 만납니다.

<!-- 📎 목록 화면 -->

<div align="center">

<img width="300" alt="3-demo" src="https://github.com/user-attachments/assets/4db053e2-e3af-4bff-acaf-301730004e81" />

</div>

### 4. 원본 다운로드

필요한 사진은 **원본 화질 그대로** 내려받습니다. 한 장은 바로, 여러 장은 선택해서 한 번에.

> 그 순간이 필요할 때, 원본으로 꺼냅니다.

<!-- 📎 다운로드 인터랙션 (선택 → 다운로드) -->

<div align="center">

<img width="300" alt="4-demo" src="https://github.com/user-attachments/assets/d2999608-3179-4756-8cd9-634acaa7f8ab" />

</div>

### 5. 상세 · 편집 · 삭제

사진을 열면 **원본 뷰어**와 함께 정보를 보고, 목록을 떠나지 않고 **이전·다음**으로 넘겨봅니다.  
EDITOR는 메타 정보를 **편집**하거나 사진을 **삭제**할 수 있고, VIEWER에게는 읽기 화면만 보입니다.

> 한 장에 담긴 이야기를 들여다봅니다.

<!-- 📎 상세·편집 화면 (EDITOR / VIEWER) -->
<div align="center">

|                                                                EDITOR                                                                |                                                                   VIEWER                                                                    |
| :----------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------------------------: |
| <img width="280" alt="05-demo" src="https://github.com/user-attachments/assets/0454520c-d6d4-4634-9311-be4be478d0bc" /> | <img width="280" alt="05-demo-viewer" src="https://github.com/user-attachments/assets/89f9d866-1703-4b03-b20c-5736cf78ba5d" /> |

</div>

---

## 기술 스택

<div align="center">

### 🧩 Common

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E63DD?style=for-the-badge&logo=zod&logoColor=white)

### 💻 Frontend

![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Radix UI](https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![Storybook](https://img.shields.io/badge/Storybook-FF4785?style=for-the-badge&logo=storybook&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-362D59?style=for-the-badge&logo=sentry&logoColor=white)

### ⚙️ Backend

![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)

### 🗄️ Storage

![MinIO](https://img.shields.io/badge/MinIO-C72E49?style=for-the-badge&logo=minio&logoColor=white)
![S3 Compatible](https://img.shields.io/badge/S3_Compatible-569A31?style=for-the-badge&logo=amazons3&logoColor=white)

### 🚀 Infra & Tools

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![Husky](https://img.shields.io/badge/Husky-444444?style=for-the-badge&logo=git&logoColor=white)

</div>

---

## 🛰️ 아키텍처

- **모노레포** — pnpm + Turborepo
- **DDD 지향** — 도메인 로직을 패키지로 분리
- **계층 분리** — FE는 FSD, BE는 도메인 / 인프라 / 라이브러리

### 시스템 구성

> `Client → API → Storage` 3계층.  
> 사진 **원본은 서버를 거치지 않고** 브라우저 ↔ 스토리지로 직접 오갑니다.

<div align="center">
  <img width="600" alt="joka-arch-1-layered" src="https://github.com/user-attachments/assets/1727268f-7a2e-48c0-b2c0-2907eb8d5f10" />
</div>

### 패키지 의존 구조

> `apps → domain → infra → lib/core` **단방향** 의존.  
> 역방향이 없어 도메인 로직을 독립 테스트할 수 있습니다.  

<div align="center">
  
  <img width="600" alt="joka-arch-3-monorepo-deps" src="https://github.com/user-attachments/assets/7dc6e115-f6b6-4236-a8da-b6515a946f0b" />
  
  <sub> `thumbnail` Sharp는 구현 예정인 기능입니다. </sub>
  
</div>




---

## 🚀 Quick Start

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경변수 설정
cp apps/web/.env.example apps/web/.env
cp apps/joka-api/.env.example apps/joka-api/.env

# 3. 로컬 인프라 기동 (PostgreSQL, MinIO)
docker compose -f infra/local/docker-compose.yaml up -d

# 4. 개발 서버 실행
pnpm dev
```

| 명령어                              | 설명                            |
| :---------------------------------- | :------------------------------ |
| `pnpm dev`                          | 전체 개발 서버 실행 (Turborepo) |
| `pnpm test`                         | 전체 테스트 (Vitest / Jest)     |
| `pnpm --filter @joka/web storybook` | 스토리북 실행                   |
| `pnpm --filter @joka/web build`     | 프론트엔드 빌드                 |

<!-- 📎 [첨부/확인] .env.example 경로·키 이름은 실제 파일 기준으로 한 번 확인하기. -->

---

## 🔖 더 알아보기

> 아래 문서들은 현재 정리 중이며, 문서화가 끝나는 대로 링크를 연결할 예정입니다.

- 🔜 **Product Overview** — 서비스 개요, 문제 정의, 핵심 기능 설계
- 🔜 **Frontend 문서** — FSD 구조, 상태 관리, 업로드 상태 머신, 관측성(Sentry)
- 🔜 **Backend 문서** — 도메인 모델링, presigned 업로드 플로우, 스토리지 설계
- 🔜 **Development Guide** — 로컬 실행, 환경변수, 테스트/빌드

---

## 🖥️ 개발팀

### 팀원 소개

<table>
  <tbody>
    <tr>
      <td align="center"><b>Injuk</b></td>
      <td align="center"><b>Minda</b></td>
    </tr>
    <tr>
      <td align="center">
        <div style="width: 150px; height: 150px; background: linear-gradient(135deg, #6EABC7 0%, #4A90A4 100%); display: flex; align-items: center; justify-content: center; margin: 0 auto; overflow: hidden;">
          <span>
            <img src="https://ca.slack-edge.com/T02MLGUDB0T-U02MNPLLJRJ-8f61ff48e03d-512" alt="Injuk" width=150 />
          </span>
        </div>
      </td>
      <td align="center">
        <div style="width: 150px; height: 150px; background: linear-gradient(135deg, #FFDE74 0%, #FFD700 100%); display: flex; align-items: center; justify-content: center; margin: 0 auto; overflow: hidden;">
          <span>
            <img src="https://ca.slack-edge.com/T02MLGUDB0T-U02MLGLH7HQ-e505c6b03401-512" alt="Minda" width=150 />
          </span>
        </div>
      </td>
    </tr>
    <tr>
      <td align="center"><a href="https://github.com/injuk">@injuk</a></td>
      <td align="center"><a href="https://github.com/mindaaaa">@mindaaaa</a></td>
    </tr>
    <tr>
      <td align="center"><b>Backend Lead</b><br/>도메인 설계 & API</td>
      <td align="center"><b>Frontend Lead</b><br/>UX & 인터랙션</td>
    </tr>
    <tr>
      <td align="center">
        ((🍾) => 🍾.length &gt; 3<br />
        ? throw new Error()<br />
        : "ok")();
      </td>
      <td align="center">귀여움 담당😘</td>
    </tr>
  </tbody>
</table>

Made with 👶 by **Team Mindjuk**

---

> \_by you, for family, memories, and precious moments.\_
