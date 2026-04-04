import { NextRequest, NextResponse } from 'next/server'
import { saveToGoogleSheets } from '@/lib/sheets'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Google Sheets에 저장
    const success = await saveToGoogleSheets(data)

    if (!success) {
      throw new Error('저장에 실패했습니다.')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json(
      { error: '제출에 실패했습니다.' },
      { status: 500 }
    )
  }
}
