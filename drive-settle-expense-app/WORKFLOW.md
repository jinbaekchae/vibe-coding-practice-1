# Woka 출장 경비 정산 시스템 - 워크플로우 문서

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | Woka 출장 경비 정산 시스템 |
| 배포 URL | https://woka-settle.vercel.app |
| 기술 스택 | Next.js 14.2, Claude API, Google Drive/Forms |
| 버전 | 1.0.0 |

AI 이미지 인식을 활용하여 출장 유류비·통행료 영수증을 자동 분석하고, 증빙 이미지를 Google Drive에 저장하며, 정산 데이터를 Google Sheets에 자동 기록하는 웹 애플리케이션이다.

---

## 2. 사용자 워크플로우

### 전체 흐름 (3단계)

```
[홈 - 입력] → [확인 - 수정] → [완료]
```

### 단계별 상세

#### Step 1. 입력 (홈 페이지 `/`)

1. 사용자가 기본 정보를 입력한다
   - 이름
   - 강의명
   - 출장일 (날짜 선택)
2. 유류비 영수증 이미지를 업로드한다 (선택)
   - 네이버지도 또는 카카오맵 화면 캡처
   - 드래그앤드롭 또는 파일 선택
3. 통행료 영수증 이미지를 업로드한다 (선택)
   - 카드사 앱 결제내역 캡처
4. **"다음"** 버튼을 클릭한다

#### Step 2. 확인 (확인 페이지 `/confirm`)

1. 시스템이 병렬로 처리한다
   - AI가 업로드된 이미지를 분석하여 금액을 추출한다
   - 이미지를 Google Drive에 업로드하여 증빙 링크를 생성한다
2. 사용자가 추출된 금액을 확인한다
   - 유류비 (연료비 항목 자동 추출)
   - 통행료 (5,000원 단위 올림 적용)
3. AI 추출 결과가 부정확할 경우 직접 수정한다
4. 증빙 이미지 링크를 확인한다
5. **"신청 완료"** 버튼을 클릭한다

#### Step 3. 완료 (완료 페이지 `/complete`)

1. 시스템이 Google Forms을 통해 정산 데이터를 Google Sheets에 기록한다
2. 완료 메시지가 표시된다
3. 정산 신청이 종료된다

---

## 3. 시스템 내부 처리 흐름

### 3-1. 이미지 업로드 & 리사이즈

```
사용자 업로드
    ↓
Canvas API로 리사이즈 (최대 1280px, JPEG 품질 85%)
    → Vercel 4.5MB body 제한 대응
    ↓
Base64 인코딩
    ↓
sessionStorage 저장 (페이지 간 데이터 전달)
```

### 3-2. "다음" 클릭 시 병렬 처리

```
병렬 실행 (Promise.all)
├── /api/analyze (Edge Runtime)
│   ├── Claude Vision API 호출
│   ├── 유류비: "연료비" 금액 추출 (택시비·통행료 제외)
│   └── 통행료: 결제 금액 추출
│
└── /api/upload (Node.js Runtime)
    ├── Google Apps Script 웹앱 호출 (POST)
    ├── 302 리다이렉트 처리 (Location 헤더 → GET 요청)
    ├── Google Drive에 이미지 저장
    │   └── 파일명: {YYYYMMDD}_{이름}_{강의명}_{유류비증빙|통행료증빙}.jpg
    └── 공유 링크 반환 (뷰어 권한)
```

### 3-3. 정산 제출

```
사용자 "신청 완료" 클릭
    ↓
/api/submit (Node.js Runtime)
    ↓
Google Forms POST (URLSearchParams)
    ↓
Google Sheets 자동 기록
    - 이름, 강의명, 출장일
    - 유류비, 통행료
    - 유류비 증빙 링크, 통행료 증빙 링크
```

---

## 4. 데이터 흐름도

### sessionStorage 활용 (서버 상태 없음)

```
홈 페이지 (입력)
├── 저장: 이름, 강의명, 출장일
├── 저장: 유류비 이미지 (Base64)
└── 저장: 통행료 이미지 (Base64)
         ↓
확인 페이지 (읽기 + 추가 저장)
├── 읽기: 기본 정보 + 이미지
├── API 호출: 금액 추출, Drive 링크 생성
└── 저장: 유류비 금액, 통행료 금액, 증빙 링크
         ↓
완료 페이지 (읽기 + 제출)
├── 읽기: 모든 정산 데이터
└── API 호출: Google Forms 제출
```

### 외부 서비스 연동

```
브라우저
 ├─→ Vercel (Next.js API Routes)
 │    ├─→ Anthropic Claude API (이미지 분석)
 │    └─→ Google Apps Script (Drive 프록시)
 │              └─→ Google Drive (이미지 저장)
 └─→ Google Forms
          └─→ Google Sheets (데이터 기록)
```

---

## 5. AI 분석 상세 로직

### 유류비 추출 (`lib/claude.ts: analyzeFuelImage`)

- 모델: `claude-sonnet-4-20250514` (Vision)
- 대상: 네이버지도/카카오맵 경로 안내 화면
- 추출 규칙:
  - **"연료비"** 항목의 금액만 추출
  - "택시비", "통행료" 등 다른 항목은 무시
  - 다크모드/라이트모드 모두 지원
- 파싱: `금액: X원` → 폴백 `연료비 X원`

### 통행료 추출 (`lib/claude.ts: analyzeTollImage`)

- 대상: 카드사 앱 고속도로 통행료 결제내역
- 추출 규칙: 통행료 결제 금액 그대로 반환
- 사내 정산 규정: **5,000원 단위 올림** (클라이언트 측 적용)
  - 예: 3,800원 → 5,000원, 6,200원 → 10,000원

---

## 6. API 엔드포인트

| 엔드포인트 | 런타임 | 역할 |
|-----------|--------|------|
| `POST /api/analyze` | Edge Runtime | Claude Vision으로 이미지 분석, 금액 추출 |
| `POST /api/upload` | Node.js Runtime | Google Drive에 이미지 업로드, 링크 반환 |
| `POST /api/submit` | Node.js Runtime | Google Forms 제출, Sheets 기록 |

### 제약사항

| 항목 | 제한 |
|------|------|
| Vercel Body | 최대 4.5MB (이미지 리사이즈로 대응) |
| Edge Runtime 타임아웃 | 30초 |
| Node.js Runtime 타임아웃 | 60초 (upload) |

---

## 7. 배포 워크플로우

```
로컬 개발 완료
    ↓
git commit (feat:/fix: 프리픽스 + 한국어 메시지)
    ↓
git push origin main
    ↓
vercel --prod (수동 배포 권장)
    → https://woka-settle.vercel.app 업데이트
```

> GitHub push 시 Vercel 자동 배포가 트리거되지 않을 수 있어 `vercel --prod` 수동 배포를 권장한다.

### 환경 변수 설정 (Vercel 대시보드)

```
ANTHROPIC_API_KEY  # Claude API 키 (필수)
```

---

## 8. 개발 워크플로우

### 로컬 실행

```bash
cd drive-settle-expense-app
npm install
npm run dev     # http://localhost:3000
```

### 프로덕션 빌드 확인

```bash
npm run build
npm run start
```

### 디렉토리 구조

```
drive-settle-expense-app/
├── app/
│   ├── page.tsx              # 홈 - 입력 폼 + 이미지 업로드
│   ├── confirm/page.tsx      # 확인 - AI 결과 확인/수정
│   ├── complete/page.tsx     # 완료 - 신청 완료 메시지
│   └── api/
│       ├── analyze/route.ts  # Claude Vision 분석
│       ├── upload/route.ts   # Google Drive 업로드
│       └── submit/route.ts   # Google Forms 제출
├── components/
│   ├── ImageUpload.tsx       # 드래그앤드롭 업로드
│   ├── ExampleImageModal.tsx # 예시 이미지 모달
│   ├── FormInput.tsx         # 입력 필드
│   └── Header.tsx            # 상단 헤더
└── lib/
    ├── claude.ts             # Claude API 연동
    └── sheets.ts             # Google Forms 제출
```

---

## 9. 코딩 컨벤션

| 항목 | 규칙 |
|------|------|
| 언어 | TypeScript (strict mode) |
| 스타일 | Tailwind CSS, 인라인 클래스 |
| Primary 컬러 | orange-500 |
| 컴포넌트 | 함수형 (React hooks), `'use client'` 지시어 |
| 커밋 메시지 | 한국어, `feat:` / `fix:` 프리픽스 |

---

## 10. 주요 주의사항

- **Apps Script 계정**: 반드시 개인 Gmail 계정으로 배포 (Google Workspace 계정은 외부 접근 차단)
- **리다이렉트 처리**: Google Apps Script POST 호출 시 `redirect: 'manual'`로 302 응답의 Location 헤더 추출 후 GET 재요청
- **iOS Chrome 날짜 입력**: `input[type="date"]`에 `appearance: none` 필수 (`globals.css`)
- **이미지 리사이즈**: 최대 1280px, JPEG 85% (OCR 정확도 ↔ 파일 크기 균형)
- **Claude 프롬프트**: 유류비/통행료 혼동 방지 예시를 유지할 것
