import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL!

export const maxDuration = 60

async function uploadSingleImage(base64Data: string, fileName: string): Promise<string> {
  // Step 1: POST → 302 리다이렉트 받기 (자동 follow 하지 않음)
  const postResponse = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images: [{ base64: base64Data, mimeType: 'image/jpeg', fileName }],
    }),
    redirect: 'manual',
  })

  // Step 2: 302 리다이렉트 URL로 GET 요청
  let text: string
  if (postResponse.status >= 300 && postResponse.status < 400) {
    const location = postResponse.headers.get('location')
    if (!location) {
      throw new Error('리다이렉트 URL을 찾을 수 없습니다')
    }
    const getResponse = await fetch(location, { redirect: 'follow' })
    text = await getResponse.text()
  } else {
    text = await postResponse.text()
  }

  let result
  try {
    result = JSON.parse(text)
  } catch {
    throw new Error(`Apps Script 응답 파싱 실패: ${text.substring(0, 200)}`)
  }

  if (!result.success || !result.links?.length) {
    throw new Error(result.error || 'Drive 업로드 실패')
  }

  return result.links[0]
}

export async function POST(request: NextRequest) {
  try {
    const { fuelImages, tollImages, name, tripDate, lectureName } = await request.json()

    // 날짜 형식 변환: 2026-02-02 → 20260202
    const dateStr = tripDate.replace(/-/g, '')

    // 이미지별 개별 업로드 (병렬 처리)
    const uploadTasks: Promise<{ type: 'fuel' | 'toll'; index: number; link: string }>[] = []

    if (fuelImages?.length) {
      fuelImages.forEach((img: string, i: number) => {
        const base64Data = img.split(',')[1]
        const suffix = fuelImages.length > 1 ? `_${i + 1}` : ''
        const fileName = `${dateStr}_${name}_${lectureName}_유류비증빙${suffix}.jpg`
        uploadTasks.push(
          uploadSingleImage(base64Data, fileName).then(link => ({ type: 'fuel', index: i, link }))
        )
      })
    }

    if (tollImages?.length) {
      tollImages.forEach((img: string, i: number) => {
        const base64Data = img.split(',')[1]
        const suffix = tollImages.length > 1 ? `_${i + 1}` : ''
        const fileName = `${dateStr}_${name}_${lectureName}_통행료증빙${suffix}.jpg`
        uploadTasks.push(
          uploadSingleImage(base64Data, fileName).then(link => ({ type: 'toll', index: i, link }))
        )
      })
    }

    if (uploadTasks.length === 0) {
      return NextResponse.json({ fuelLinks: [], tollLinks: [] })
    }

    const results = await Promise.all(uploadTasks)

    // 결과를 타입별로 분리하고 원래 순서대로 정렬
    const fuelLinks = results
      .filter(r => r.type === 'fuel')
      .sort((a, b) => a.index - b.index)
      .map(r => r.link)
    const tollLinks = results
      .filter(r => r.type === 'toll')
      .sort((a, b) => a.index - b.index)
      .map(r => r.link)

    return NextResponse.json({ fuelLinks, tollLinks })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Upload error:', message)
    return NextResponse.json(
      { error: `이미지 업로드에 실패했습니다: ${message}` },
      { status: 500 }
    )
  }
}
