# Product Requirements Document (PRD)

## Woka 출장 경비 정산 시스템

---

### 1. 제품 개요

Woka 출장 경비 정산 시스템은 AI 이미지 인식을 활용하여 유류비와 통행료를 자동 추출하고, Google Sheets에 정산 데이터를 기록하는 웹 애플리케이션이다.

### 2. 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14.2 (App Router) |
| 언어 | TypeScript 5.0 |
| 스타일링 | Tailwind CSS 3.4 |
| AI/Vision | Anthropic Claude API (claude-sonnet-4-20250514) |
| 데이터 저장 | Google Forms → Google Sheets |
| 호스팅 | Vercel (Edge Runtime) |
| 패키지 관리 | npm |

### 3. 시스템 아키텍처

```
┌─────────────────────────────────────────────────┐
│                    Client (Browser)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Home (/) │→ │ Confirm  │→ │ Complete     │  │
│  │ 입력/업로드│  │ 확인/수정 │  │ 완료         │  │
│  └────┬─────┘  └────┬─────┘  └──────────────┘  │
│       │              │                           │
│  sessionStorage (데이터 전달)                     │
└───────┼──────────────┼───────────────────────────┘
        │              │
        ▼              ▼
┌──────────────┐ ┌──────────────┐
│ /api/analyze │ │ /api/submit  │
│ (Edge)       │ │ (Edge)       │
└──────┬───────┘ └──────┬───────┘
       │                │
       ▼                ▼
┌──────────────┐ ┌──────────────┐
│ Claude API   │ │ Google Forms │
│ (Vision OCR) │ │ → Sheets     │
└──────────────┘ └──────────────┘
```

### 4. 사용자 플로우

#### 4.1 정산 신청 (홈 페이지 `/`)

1. 사용자가 이름, 강의명, 출장일을 입력한다.
2. 유류비 영수증 이미지를 업로드한다 (드래그앤드롭 또는 클릭).
   - "예시 이미지" 버튼으로 올바른 이미지 형식을 확인할 수 있다.
3. 통행료 결제내역 이미지를 업로드한다.
4. "다음" 버튼을 클릭한다.
5. 이미지가 클라이언트에서 리사이즈(1280px, JPEG 85%)된 후 `/api/analyze`로 전송된다.
6. AI 분석 결과가 sessionStorage에 저장되고 확인 페이지로 이동한다.

#### 4.2 확인/수정 (확인 페이지 `/confirm`)

1. AI가 추출한 유류비, 통행료, 합계가 표시된다.
2. 금액이 부정확하면 사용자가 직접 수정한다.
3. "신청 완료" 버튼을 클릭하면 `/api/submit`으로 최종 데이터가 전송된다.
4. Google Sheets에 기록 완료 후 완료 페이지로 이동한다.

#### 4.3 완료 (완료 페이지 `/complete`)

1. 정산 완료 메시지가 표시된다.
2. "처음으로 돌아가기" 버튼으로 홈으로 돌아갈 수 있다.

### 5. 기능 명세

#### 5.1 이미지 업로드 (`ImageUpload.tsx`)

| 기능 | 설명 |
|------|------|
| 드래그앤드롭 | 이미지 파일을 드래그하여 업로드 영역에 놓기 |
| 클릭 선택 | 업로드 영역 클릭 시 파일 선택 다이얼로그 |
| 복수 파일 | 여러 장의 이미지 동시 업로드 지원 |
| 미리보기 | 업로드된 이미지의 썸네일을 2열 그리드로 표시 |
| 개별 삭제 | 각 이미지의 X 버튼으로 개별 제거 |
| 예시 이미지 | "예시 이미지" 버튼 → 모달로 올바른 이미지 형식 안내 |

#### 5.2 이미지 리사이즈 (클라이언트)

| 파라미터 | 값 | 이유 |
|----------|-----|------|
| 최대 크기 | 1280px | 텍스트 가독성 보존 |
| 포맷 | JPEG | 범용 호환성 |
| 품질 | 85% | OCR 정확도와 파일 크기 균형 |

#### 5.3 AI 유류비 분석 (`analyzeFuelImage`)

| 항목 | 내용 |
|------|------|
| 모델 | claude-sonnet-4-20250514 |
| 입력 | Base64 인코딩된 지도 앱 캡처 이미지 |
| 출력 | 연료비 금액 (원 단위) |
| 지원 형식 | 네이버지도, 카카오맵 (라이트/다크모드) |
| 핵심 로직 | "연료비"만 추출, "택시비"/"통행료" 제외 |
| 파싱 | 정규식 `금액:\s*([\d,]+)\s*원`, 폴백 `연료비\s*:?\s*([\d,]+)\s*원` |

#### 5.4 AI 통행료 분석 (`analyzeTollImage`)

| 항목 | 내용 |
|------|------|
| 모델 | claude-sonnet-4-20250514 |
| 입력 | Base64 인코딩된 카드사 앱 결제내역 캡처 |
| 출력 | 통행료 금액 (5,000원 단위 올림) |
| 올림 규칙 | `Math.ceil(totalAmount / 5000) * 5000` |

#### 5.5 Google Sheets 저장 (`saveToGoogleSheets`)

| 필드 | Google Form Entry ID |
|------|---------------------|
| 이름 | entry.254732787 |
| 강의명 | entry.647625590 |
| 출장일 | entry.207476044 |
| 유류비 | entry.180956906 |
| 통행료 | entry.710460679 |

### 6. 파일 구조

```
drive-settle-expense-app/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts      # Claude AI 이미지 분석 API
│   │   └── submit/route.ts       # Google Forms 제출 API
│   ├── confirm/page.tsx          # 확인/수정 페이지
│   ├── complete/page.tsx         # 완료 페이지
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 홈(입력) 페이지
│   └── globals.css               # 전역 스타일
├── components/
│   ├── ExampleImageModal.tsx     # 예시 이미지 모달
│   ├── FormInput.tsx             # 텍스트/날짜 입력 컴포넌트
│   ├── Header.tsx                # 상단 헤더
│   └── ImageUpload.tsx           # 이미지 업로드 컴포넌트
├── lib/
│   ├── claude.ts                 # Claude API 연동
│   └── sheets.ts                 # Google Forms 연동
├── public/
│   ├── Woka_logo.jpg             # 로고
│   └── examples/                 # 예시 이미지 4장
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

### 7. API 명세

#### POST `/api/analyze`

**Request:**
```json
{
  "fuelImages": ["data:image/jpeg;base64,..."],
  "tollImages": ["data:image/jpeg;base64,..."]
}
```

**Response (200):**
```json
{
  "fuelCost": 7072,
  "tollCost": 5000,
  "fuelDetails": ["금액: 7,072원"],
  "tollDetails": ["금액: 2,100원"]
}
```

**Error (500):**
```json
{
  "error": "이미지 분석에 실패했습니다: ..."
}
```

#### POST `/api/submit`

**Request:**
```json
{
  "name": "홍길동",
  "lectureName": "리더십 교육",
  "tripDate": "2026-02-10",
  "fuelCost": 7072,
  "tollCost": 5000
}
```

**Response (200):**
```json
{ "success": true }
```

### 8. UI/UX 디자인

#### 디자인 시스템

| 요소 | 값 |
|------|-----|
| Primary Color | Orange-500 (`#f97316`) |
| 배경 | White (`#ffffff`) |
| 테두리 | Gray-200 ~ Gray-300 |
| 텍스트 | Gray-800 (본문), Gray-500 (보조) |
| 카드 radius | 2xl (16px) |
| 입력 radius | lg (8px) |
| 포커스 링 | Orange-500, 2px |

#### 반응형 브레이크포인트

| 뷰포트 | 카드 패딩 |
|---------|-----------|
| 모바일 (< 640px) | px-5 py-6 (20px/24px) |
| 데스크톱 (>= 640px) | p-8 (32px) |

### 9. 환경 변수

```env
ANTHROPIC_API_KEY=sk-ant-...    # Claude API 키 (필수)
```

### 10. 배포 설정

| 항목 | 값 |
|------|-----|
| 플랫폼 | Vercel |
| 런타임 | Edge Runtime |
| API 타임아웃 | 30초 |
| Body 크기 제한 | 10MB (next.config.js) |
| 자동 배포 | GitHub main 브랜치 push 시 (수동 `vercel --prod` 사용 가능) |

### 11. 알려진 제한사항

1. **인증 없음**: 내부 사용 전제로 로그인/인증 미구현
2. **이미지 미저장**: 분석 후 이미지는 저장되지 않음 (증빙 보관 불가)
3. **오프라인 미지원**: AI 분석을 위해 네트워크 연결 필수
4. **동시 편집**: 여러 사용자가 동시에 제출 시 Google Sheets 충돌 가능성 낮음 (Form 기반)
