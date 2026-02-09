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
            text: `이 이미지들은 네이버지도 등에서 캡처한 경로 안내 결과 이미지입니다.
이미지에서 반드시 '연료비' 항목의 금액만 찾아주세요.
'톨게이트비', '통행료', '택시비', '총 비용' 등 다른 항목은 절대 포함하지 마세요.
오직 '연료비'라고 표시된 금액만 추출해야 합니다.

다음 형식으로만 응답해주세요:
- 각 이미지에서 찾은 연료비를 "금액: X원" 형식으로 나열
- 마지막에 "총합: X원" 형식으로 총합 표시

예시:
금액: 15,000원
금액: 12,500원
총합: 27,500원

숫자만 추출하고, 연료비를 찾을 수 없으면 "금액을 찾을 수 없습니다"라고 답변하세요.`,
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
