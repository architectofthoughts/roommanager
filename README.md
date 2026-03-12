# 방 매니저 (RoomManager)

인터랙티브 캔버스 기반의 방/공간 관리 및 물품 인벤토리 웹 애플리케이션입니다.
가구를 배치하고, 각 가구에 보관된 물품을 체계적으로 관리할 수 있습니다.

## 주요 기능

- **시각적 방 레이아웃** — Konva.js 기반 드래그 & 리사이즈 캔버스로 가구 배치
- **가구 관리** — 사각형/원형 가구 추가, 카테고리별 색상, 회전, 메모
- **물품 인벤토리** — 가구별 물품 등록/수정/삭제, 카테고리 분류
- **AI 사진 분석** — Google Gemini API로 사진 속 물품을 자동 인식하여 등록
- **물품 통계** — 카테고리별 분포, 가구별 보관 현황 대시보드
- **검색** — 물품명/카테고리/메모 통합 검색
- **자동 저장** — 모든 데이터는 브라우저 localStorage에 자동 저장

## 기술 스택

| 영역 | 기술 |
|------|------|
| UI | React 19, TypeScript, Tailwind CSS v4 |
| 캔버스 | Konva.js + react-konva |
| 상태관리 | Zustand |
| 빌드 | Vite 7 |
| AI | Google Gemini 3 Flash Preview |
| 배포 | Cloudflare Pages + GitHub Actions |

## 시작하기

### 사전 요구사항

- Node.js 20+
- npm

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/architectofthoughts/roommanager.git
cd roommanager

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 Gemini API 키 입력

# 개발 서버 실행
npm run dev
```

`http://localhost:5173`에서 앱이 실행됩니다.

### 환경 변수

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `VITE_GEMINI_API_KEY` | 선택 | Google Gemini API 키. 없으면 AI 분석이 데모 모드로 동작 |

> Gemini API 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급받을 수 있습니다.

## 빌드

```bash
npm run build    # dist/ 디렉토리에 프로덕션 빌드 생성
npm run preview  # 빌드 결과를 로컬에서 미리보기
```

## 배포 (Cloudflare Pages)

이 프로젝트는 GitHub Actions를 통해 Cloudflare Pages에 자동 배포됩니다.

### 자동 배포 설정

1. GitHub 저장소의 **Settings > Secrets and variables > Actions**에 다음 시크릿을 등록:

   | 시크릿 | 설명 |
   |--------|------|
   | `CLOUDFLARE_API_TOKEN` | Cloudflare API 토큰 ([대시보드](https://dash.cloudflare.com/profile/api-tokens)에서 생성) |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 계정 ID (대시보드 URL에서 확인) |
   | `VITE_GEMINI_API_KEY` | Google Gemini API 키 |

2. `main` 브랜치에 push하면 자동으로 빌드 및 배포됩니다.

### 수동 배포

```bash
# 빌드
npm run build

# Wrangler CLI로 배포
npx wrangler pages deploy dist --project-name=roommanager
```

## 프로젝트 구조

```
src/
├── main.tsx                          # 엔트리 포인트
├── App.tsx                           # 루트 컴포넌트 (레이아웃 + lazy loading)
├── index.css                         # 글로벌 스타일 + Tailwind 테마
├── types/index.ts                    # TypeScript 타입 정의
├── store/useStore.ts                 # Zustand 상태 관리
├── utils/gemini.ts                   # Gemini API 유틸리티
└── components/
    ├── common/Modal.tsx              # 재사용 모달
    ├── gemini/GeminiModal.tsx        # AI 사진 분석 모달
    ├── stats/StatsModal.tsx          # 물품 통계 대시보드
    └── layout/
        ├── TopBar.tsx                # 상단 헤더
        ├── LeftSidebar.tsx           # 가구 추가/목록
        ├── RoomCanvas.tsx            # 인터랙티브 캔버스
        └── RightSidebar.tsx          # 가구 상세/물품 관리
```

## 라이선스

MIT
