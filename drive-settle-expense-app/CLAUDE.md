# CLAUDE.md

## 프로젝트 개요

Woka 출장 경비 정산 시스템 - AI 이미지 인식으로 유류비/통행료를 자동 추출하고, 증빙 이미지를 Google Drive에 저장하며, Google Sheets에 기록하는 Next.js 웹앱.

- **배포**: https://woka-settle.vercel.app
- **GitHub**: https://github.com/jinbaekchae/vibe-coding-practice-1

## 기술 스택

- Next.js 14.2 (App Router, Edge Runtime)
- TypeScript, Tailwind CSS
- Google Gemini API (gemini-2.0-flash, Vision)
- Google Apps Script → Google Drive (이미지 업로드)
- Google Forms → Google Sheets 연동
- Vercel 호스팅

## 핵심 디렉토리

```
app/page.tsx              # 홈 - 입력 폼 + 이미지 업로드
app/confirm/page.tsx      # 확인 - AI 추출 결과 확인/수정 + 증빙 링크
app/complete/page.tsx     # 완료 - 신청 완료 메시지
app/api/analyze/route.ts  # Gemini Vision 이미지 분석 API
app/api/upload/route.ts   # Google Drive 이미지 업로드 API (Apps Script 프록시)
app/api/submit/route.ts   # Google Forms 제출 API
lib/claude.ts             # Gemini API 연동 (유류비/통행료 분석)
lib/sheets.ts             # Google Forms 제출 로직
components/ImageUpload.tsx       # 드래그앤드롭 이미지 업로드
components/ExampleImageModal.tsx # 예시 이미지 모달
components/FormInput.tsx         # 입력 필드 컴포넌트
components/Header.tsx            # 상단 헤더
```

## 빌드 & 실행

```bash
cd drive-settle-expense-app
npm install
npm run dev     # 개발 서버 (localhost:3000)
npm run build   # 프로덕션 빌드
```

## 배포

```bash
cd drive-settle-expense-app
vercel --prod   # Vercel 프로덕션 배포
```

> GitHub push 시 Vercel 자동 배포가 트리거되지 않을 수 있음. `vercel --prod`로 수동 배포 권장.

## 환경 변수

```
GEMINI_API_KEY  # Google Gemini API 키 (필수, https://aistudio.google.com/apikey 에서 발급)
```

## 주요 비즈니스 로직

### 유류비 추출 (`lib/claude.ts: analyzeFuelImage`)
- 네이버지도/카카오맵 캡처에서 "연료비" 금액만 추출
- "택시비", "통행료" 등 다른 항목과 반드시 구분
- 다크모드/라이트모드 모두 지원
- 파싱: `금액: X원` → 폴백 `연료비 X원`

### 통행료 추출 (`lib/claude.ts: analyzeTollImage`)
- 카드사 앱 결제내역에서 통행료 금액 추출
- 올림 없이 원본 금액 그대로 반환

### 이미지 Google Drive 업로드 (`app/api/upload/route.ts`)
- Google Apps Script 웹앱을 프록시로 사용하여 Google Drive에 이미지 저장
- Apps Script URL: 개인 Gmail 계정으로 배포 (Workspace 계정은 외부 접근 차단됨)
- **리다이렉트 처리**: POST → 302 응답 시 `redirect: 'manual'`로 Location 헤더 추출 후 GET 요청
- 이미지별 개별 업로드 (병렬 처리, `Promise.all`)
- 파일명 규칙: `{YYYYMMDD}_{이름}_{강의명}_{유류비증빙|통행료증빙}[_{번호}].jpg`
  - 단일 이미지: `20260204_홍길동_AI입문_유류비증빙.jpg`
  - 복수 이미지: `20260204_홍길동_AI입문_유류비증빙_1.jpg`, `_2.jpg`
- 업로드된 파일은 "링크가 있는 모든 사용자" 뷰어 권한 자동 설정
- Drive 폴더 ID: `1g0hgbpdWWCDTxCYiFlhhdFCznIjbxOyT`

### 이미지 리사이즈 (`app/page.tsx`)
- 최대 1280px, JPEG 품질 85%
- Vercel 4.5MB body 제한 대응

### 데이터 저장 (`lib/sheets.ts`)
- Google Forms API로 제출 (POST with URLSearchParams)
- entry ID 매핑:
  - 이름(254732787), 강의명(647625590), 출장일(207476044)
  - 유류비(180956906), 통행료(710460679)
  - 유류비 증빙 링크(869282948), 통행료 증빙 링크(867110150)

## 처리 흐름

```
1. 홈 페이지: 정보 입력 + 이미지 업로드
2. "다음" 클릭 시 병렬 처리:
   a. /api/analyze → Gemini Vision 이미지 분석 → 금액 추출
   b. /api/upload → Apps Script → Google Drive 이미지 저장 → 링크 반환
3. 확인 페이지: 금액 확인/수정 + 증빙 이미지 링크 표시
4. "신청 완료" → /api/submit → Google Forms → Google Sheets (금액 + 이미지 링크)
```

## 코딩 컨벤션

- 언어: TypeScript (strict mode)
- 스타일: Tailwind CSS, 인라인 클래스
- Primary 컬러: orange-500
- 컴포넌트: 함수형 (React hooks), 'use client' 지시어
- API 라우트: Edge Runtime (analyze), Node.js Runtime (upload, submit)
- 커밋 메시지: 한국어, `feat:` / `fix:` 프리픽스

## 주의사항

- `/api/analyze`는 Edge Runtime 사용 (`export const runtime = 'edge'`)
- `/api/upload`는 Node.js Runtime 사용 (`maxDuration = 60`)
- Google Apps Script POST 호출 시 반드시 `redirect: 'manual'` 사용 후 Location URL로 GET 요청 (302 리다이렉트에서 POST→GET 전환 문제 방지)
- Apps Script는 **개인 Gmail 계정**으로 배포해야 함 (Google Workspace 계정은 외부 접근 차단)
- 이미지 리사이즈 파라미터 변경 시 OCR 정확도와 파일 크기 균형 고려
- Gemini 프롬프트 수정 시 유류비/통행료 혼동 방지 예시 유지
- iOS Chrome의 `input[type="date"]`에 `appearance: none` 필수 (globals.css)
- sessionStorage로 페이지 간 데이터 전달 (서버 상태 없음)
