---
name: woka-pptx
description: 워카(Woka) 디자인 시스템을 적용하여 PPTX 슬라이드를 추가하거나 새 제안서를 생성합니다. "슬라이드 추가", "pptx 만들어줘", "제안서 슬라이드" 관련 요청 시 호출됩니다.
argument-hint: "[add <슬라이드번호> <제목> <대상파일>] 또는 [new <출력파일명>]"
allowed-tools: Read, Write, Edit, Bash, Glob
---

## 워카(Woka) PPTX 스킬

워카의 공식 디자인 시스템을 사용하여 PPTX를 생성·수정합니다.
`$ARGUMENTS`가 없거나 불명확하면 사용자에게 목적(슬라이드 추가 / 새 파일 생성)을 먼저 확인합니다.

---

## 1. 워카 디자인 시스템

### 색상 팔레트
```python
DARK = RGBColor(0x1E, 0x1E, 0x1E)  # 제목·본문 텍스트
WH   = RGBColor(0xFF, 0xFF, 0xFF)  # 흰색 배경
GRAY = RGBColor(0x66, 0x66, 0x66)  # 섹션 번호·부제·보조 텍스트
CARD = RGBColor(0xFC, 0xFC, 0xFC)  # 카드 배경
HEAD = RGBColor(0xE9, 0xE9, 0xE9)  # 표 헤더·구분선
DATA = RGBColor(0xF5, 0xF5, 0xF5)  # 표 데이터 셀·바 차트 배경
OR   = RGBColor(0xFF, 0x6C, 0x00)  # 오렌지 accent (강조·볼드 수치·배지)
```

### 타이포그래피
- **폰트**: `"Noto Sans KR"` 고정
- **제목**: 22pt Bold DARK
- **섹션 번호**: 11pt GRAY
- **부제**: 10pt GRAY
- **카드 제목**: 11~13pt Bold DARK
- **본문**: 9~10pt DARK
- **강조 수치/성과**: 10pt Bold OR
- **보조 설명 (하단 푸터)**: 9pt GRAY

### 슬라이드 규격
- **크기**: 10.00in × 5.62in
- **좌측 여백**: 0.56in (콘텐츠 시작 X)
- **콘텐츠 폭**: 8.89in
- **콘텐츠 시작 Y**: 1.19in (헤더 아래)

### 디자인 원칙
- 그림자 없음 (`no_shadow()` 모든 도형에 적용)
- 상단 컬러 바 없음
- 언더라인 없음
- 오렌지 채운 박스 없음 (오렌지는 텍스트·배지만 사용)
- 카드는 CARD(#FCFCFC) 배경, 테두리 없음

---

## 2. 표준 헬퍼 함수 (모든 PPTX 파일 공통)

새 파일을 만들 때 반드시 아래 헬퍼를 파일 상단에 포함합니다.

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from lxml import etree

DARK = RGBColor(0x1E, 0x1E, 0x1E)
WH   = RGBColor(0xFF, 0xFF, 0xFF)
GRAY = RGBColor(0x66, 0x66, 0x66)
CARD = RGBColor(0xFC, 0xFC, 0xFC)
HEAD = RGBColor(0xE9, 0xE9, 0xE9)
DATA = RGBColor(0xF5, 0xF5, 0xF5)
OR   = RGBColor(0xFF, 0x6C, 0x00)
FONT = "Noto Sans KR"
W = Inches(10.00)
H = Inches(5.62)

def no_shadow(shape):
    sp_pr = shape._element.spPr
    for ef in sp_pr.findall(qn('a:effectLst')):
        sp_pr.remove(ef)
    etree.SubElement(sp_pr, qn('a:effectLst'))

def prs_new():
    p = Presentation()
    p.slide_width  = W
    p.slide_height = H
    return p

def blank(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])

def tb(slide, text, x, y, w, h,
       size=10, bold=False, color=DARK,
       align=PP_ALIGN.LEFT, italic=False):
    s = slide.shapes.add_textbox(x, y, w, h)
    tf = s.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    r = p.add_run()
    r.text = text
    r.font.name   = FONT
    r.font.size   = Pt(size)
    r.font.bold   = bold
    r.font.italic = italic
    r.font.color.rgb = color
    if '\n' in text:
        for para in tf.paragraphs:
            para.line_spacing = 2.0
    no_shadow(s)
    return s

def tb_lines(slide, lines, x, y, w, h,
             size=10, bold=False, color=DARK,
             align=PP_ALIGN.LEFT):
    """여러 줄 텍스트를 하나의 텍스트박스에 담는다.
    2줄 이상이면 줄간격 2.0, 1줄이면 1.0."""
    s = slide.shapes.add_textbox(x, y, w, h)
    tf = s.text_frame
    tf.word_wrap = True
    multi = len(lines) > 1
    for i, text in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if multi:
            p.line_spacing = 2.0
        r = p.add_run()
        r.text = text
        r.font.name = FONT
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = color
    no_shadow(s)
    return s

def rect(slide, x, y, w, h, fill=None, line=None, lw=Pt(1)):
    s = slide.shapes.add_shape(1, x, y, w, h)
    if fill:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    else:
        s.fill.background()
    if line:
        s.line.color.rgb = line
        s.line.width     = lw
    else:
        s.line.fill.background()
    no_shadow(s)
    return s

def content_page(slide, section_num, title, subtitle=""):
    rect(slide, 0, 0, W, H, fill=WH)
    tb(slide, section_num,
       Inches(0.58), Inches(0.18), Inches(5.0), Inches(0.3),
       size=11, color=GRAY)
    tb(slide, title,
       Inches(0.56), Inches(0.42), Inches(8.89), Inches(0.63),
       size=22, bold=True, color=DARK)
    if subtitle:
        tb(slide, subtitle,
           Inches(0.56), Inches(0.87), Inches(8.89), Inches(0.3),
           size=10, color=GRAY)
```

---

## 3. 레이아웃 패턴

### 패턴 A: 표지 (Cover)
- 배경: DARK 전체
- 메인 타이틀: 30pt Bold WH, Y=0.85in
- 부제·날짜: 11pt GRAY, Y=1.9in
- 하단 메타 정보 (4행 테이블 형태): key=GRAY, value=WH Bold
- 우하단 "WOKA" 로고: 14pt Bold OR, align=RIGHT

### 패턴 B: 가로 카드 3행 (Horizontal Cards)
S06, S17, S18 스타일 — 유사 사례, 교육 니즈, 성과 사례 등에 사용

```
card_h = Inches(1.2)
gap    = Inches(0.15)
card_w = Inches(8.89)
lx     = Inches(0.56)
left_w = Inches(2.4)   # 좌측 식별 영역 (기업명·배지·제목)
div_x  = lx + left_w  # 세로 구분선 X
body_x = div_x + Inches(0.18)
body_w = card_w - left_w - Inches(0.28)

for i, item in enumerate(items):
    y = Inches(1.19) + i * (card_h + gap)
    rect(sl, lx, y, card_w, card_h, fill=CARD)
    # 좌측: 제목 (13pt Bold DARK) + 부제 (9pt GRAY)
    # 세로 구분선: rect(sl, div_x, y+0.15in, 0.005in, card_h-0.3in, fill=HEAD)
    # 우측: 본문 (9pt DARK) + 성과 하이라이트 (10pt Bold OR, 별도 tb)
```

**성과 하이라이트(오렌지 볼드)가 필요한 경우** 우측에 tb를 2개 사용:
- 상단 tb: 상세 내용 (9pt DARK, y+0.17in)
- 하단 tb: 성과 텍스트 (10pt Bold OR, y+0.70in)

### 패턴 C: 통계 박스 4열 (Stats Row)
S03, S16 스타일 — 핵심 수치 강조

```
cw = Inches(2.02)
gap = Inches(0.27)
for i, (val, label) in enumerate(stats):
    x = Inches(0.56) + i * (cw + gap)
    y = Inches(1.19)
    rect(sl, x, y, cw, Inches(0.96), fill=CARD)
    tb(sl, val, x, y+Inches(0.06), cw, Inches(0.52),
       size=20~26, bold=True, color=OR, align=CENTER)
    tb(sl, label, x, y+Inches(0.6), cw, Inches(0.32),
       size=9, color=DARK, align=CENTER)
```

### 패턴 D: 표 (Table)
헤더 행: HEAD 배경, 9pt Bold DARK
데이터 행: DATA 배경, 9pt DARK
행 높이: 0.28~0.42in (내용 밀도에 따라)

### 패턴 E: 2컬럼 분할
좌측(half_w=4.17in, x=0.56in) / 우측(half_w=4.17in, x=5.07in)
중앙 세로 구분선: x=4.95in, 너비=0.005in, fill=HEAD

### 패턴 F: 2×2 카드 그리드 (Phase/로드맵)
```
cw=4.3in, ch=2.0in, gap_x=0.29in, gap_y=0.2in
positions = [(0.56, 1.19), (0.56+cw+gap_x, 1.19),
             (0.56, 1.19+ch+gap_y), (0.56+cw+gap_x, 1.19+ch+gap_y)]
```

### 패턴 G: 가로 바 차트
```
rect(sl, x, y, bmax, Inches(0.17), fill=DATA)          # 배경 바
rect(sl, x, y, bmax * val/100, Inches(0.17), fill=OR)  # 채운 바
```

---

## 4. 슬라이드 추가 워크플로우

`$ARGUMENTS`에서 "슬라이드 추가" 또는 "add" 의도 감지 시:

### 4-1. 대상 파일 파악
- 인자에 파일 경로가 있으면 그 파일 사용
- 없으면 `Glob`으로 현재 디렉토리의 `**/generate_*.py` 또는 `**/*pptx*.py` 탐색
- 여러 개면 사용자에게 선택 요청

### 4-2. 기존 파일 분석
`Read`로 대상 파일을 읽어 다음을 파악:
- 현재 슬라이드 함수 목록 (s01~sN)
- main()의 funcs 리스트
- 삽입 위치 (어느 함수 뒤에 넣을지)
- 총 슬라이드 수 (N)

### 4-3. 함수 이름 충돌 처리
삽입 위치 이후 함수들의 이름을 sN → s(N+1)로 변경:
- `Edit`으로 함수 정의 `def sX(prs):` 변경
- main() funcs 리스트의 참조도 함께 변경

### 4-4. 새 슬라이드 함수 생성
사용자가 제공한 내용을 분석하여 적절한 패턴(A~G) 선택:
- 사례/레퍼런스 나열 → 패턴 B (가로 카드)
- 핵심 수치 강조 → 패턴 C (통계 박스)
- 비교 데이터 → 패턴 D (표)
- 두 개 섹션 병렬 → 패턴 E (2컬럼)
- 단계/페이즈 → 패턴 F (2×2 그리드)

**강조 텍스트(오렌지 볼드)가 필요한 경우**: tb()를 별도로 추가하여 OR 색상 적용

### 4-5. main() 업데이트
- funcs 리스트에 `(새함수명, "슬라이드 레이블")` 추가
- 카운트 N → N+1 변경
- 파일 상단 주석의 "총 N장" 변경

### 4-6. 검증 실행
```bash
python <대상파일>
```
실행 후 출력에서 확인:
- 슬라이드 수 = 기존 + 1
- 새 슬라이드 레이블이 출력에 포함
- 오류 없이 완료

---

## 5. 새 PPTX 파일 생성 워크플로우

`$ARGUMENTS`에서 "새 파일" 또는 "new" 의도 감지 시:

### 5-1. 요구사항 파악
사용자에게 다음 확인:
- 파일 저장 경로
- 슬라이드 구성 (목차 또는 슬라이드별 제목+내용)
- 수신사·날짜·담당자 정보 (표지용)

### 5-2. 파일 생성
새 Python 스크립트를 `Write`로 생성:
- 파일명: `generate_<문서명>_pptx.py`
- 헬퍼 함수 블록 (섹션 2 전체) 포함
- 요청된 슬라이드 함수들 구현
- main() 함수 포함

### 5-3. 실행 및 결과 전달
```bash
python <생성된파일>
```
결과 PPTX 경로와 슬라이드 수를 사용자에게 안내

---

## 6. 품질 체크리스트

슬라이드 추가·생성 완료 후 반드시 확인:
- [ ] 슬라이드 크기 10.00×5.62in 유지
- [ ] 모든 도형에 `no_shadow()` 적용
- [ ] 색상은 6개 팔레트(+OR) 이외 사용 안 함
- [ ] 폰트 "Noto Sans KR" 고정
- [ ] content_page() 헤더: 섹션 번호·제목·부제 포함
- [ ] 콘텐츠 좌측 여백 0.56in 준수
- [ ] 오렌지는 텍스트/배지만 사용 (배경 채우기 금지)
- [ ] PPTX 정상 생성 및 슬라이드 수 검증 완료
