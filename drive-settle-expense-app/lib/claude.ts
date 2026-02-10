import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 25000, // 25초 타임아웃
})

interface AnalysisResult {
  amount: number
  details: string[]
}

export async function analyzeFuelImage(base64Images: string[]): Promise<AnalysisResult> {
  if (base64Images.length === 0) {
    return { amount: 0, details: [] }
  }

  const imageContents = base64Images.map(img => {
    const base64Data = img.split(',')[1]
    const mediaType = img.match(/data:([^;]+);/)?.[1] || 'image/jpeg'
    return {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: base64Data,
      },
    }
  })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text',
            text: `이 이미지들은 네이버지도, 카카오맵 등 지도 앱에서 캡처한 경로 안내 결과입니다.
라이트모드/다크모드 모두 가능합니다.

## 중요 규칙
이미지에 "택시비", "통행료", "연료비" 등 여러 항목이 함께 표시됩니다.
반드시 "연료비"라고 쓰인 금액만 추출하세요.

예를 들어 이미지에 아래처럼 표시된 경우:
"택시비 68,060원 | 통행료 2,100원 | 연료비 7,072원"
→ 정답: 7,072원 (연료비)
→ 오답: 68,060원 (택시비), 2,100원 (통행료)

## 응답 형식
금액: [연료비 금액]원
총합: [연료비 합계]원

이미지가 1장이면:
금액: 7,072원
총합: 7,072원

이미지가 2장이면:
금액: 7,072원
금액: 1,717원
총합: 8,789원

연료비를 찾을 수 없으면 "금액을 찾을 수 없습니다"라고만 답변하세요.
설명 없이 위 형식으로만 답변하세요.`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // 금액 파싱 - "금액: X원" 형식
  const amountMatches = text.match(/금액:\s*([\d,]+)\s*원/g)
  const totalMatch = text.match(/총합:\s*([\d,]+)\s*원/)

  const details: string[] = []
  let totalAmount = 0

  if (amountMatches) {
    amountMatches.forEach(match => {
      details.push(match.trim())
    })
  }

  if (totalMatch) {
    totalAmount = parseInt(totalMatch[1].replace(/,/g, ''))
  } else if (amountMatches) {
    amountMatches.forEach(match => {
      const num = match.match(/([\d,]+)\s*원/)
      if (num) {
        totalAmount += parseInt(num[1].replace(/,/g, ''))
      }
    })
  }

  // 폴백: "금액:" 패턴이 없으면 "연료비 X원" 패턴으로 시도
  if (totalAmount === 0 && !amountMatches) {
    const fuelMatches = text.match(/연료비\s*:?\s*([\d,]+)\s*원/g)
    if (fuelMatches) {
      fuelMatches.forEach(match => {
        const num = match.match(/([\d,]+)\s*원/)
        if (num) {
          const amount = parseInt(num[1].replace(/,/g, ''))
          totalAmount += amount
          details.push(`금액: ${num[1]}원`)
        }
      })
    }
  }


  return { amount: totalAmount, details }
}

export async function analyzeTollImage(base64Images: string[]): Promise<AnalysisResult> {
  if (base64Images.length === 0) {
    return { amount: 0, details: [] }
  }

  const imageContents = base64Images.map(img => {
    const base64Data = img.split(',')[1]
    const mediaType = img.match(/data:([^;]+);/)?.[1] || 'image/jpeg'
    return {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: base64Data,
      },
    }
  })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text',
            text: `이 이미지들은 카드사 앱에서 캡처한 고속도로 통행료 결제내역입니다.
이미지에서 통행료 결제 금액을 찾아주세요.

다음 형식으로만 응답해주세요:
- 각 결제 건의 금액을 "금액: X원" 형식으로 나열
- 마지막에 "총합: X원" 형식으로 총합 표시

예시:
금액: 4,800원
금액: 3,200원
총합: 8,000원

숫자만 추출하고, 금액을 찾을 수 없으면 "금액을 찾을 수 없습니다"라고 답변하세요.`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // 금액 파싱
  const amountMatches = text.match(/금액:\s*([\d,]+)원/g)
  const totalMatch = text.match(/총합:\s*([\d,]+)원/)

  const details: string[] = []
  if (amountMatches) {
    amountMatches.forEach(match => {
      details.push(match)
    })
  }

  let totalAmount = 0
  if (totalMatch) {
    totalAmount = parseInt(totalMatch[1].replace(/,/g, ''))
  } else if (amountMatches) {
    // 총합이 없으면 개별 금액들을 더함
    amountMatches.forEach(match => {
      const num = match.match(/([\d,]+)원/)
      if (num) {
        totalAmount += parseInt(num[1].replace(/,/g, ''))
      }
    })
  }

  // 5000원 단위로 올림
  const roundedAmount = Math.ceil(totalAmount / 5000) * 5000

  return { amount: roundedAmount, details }
}
