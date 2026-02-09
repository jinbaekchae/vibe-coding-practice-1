export const runtime = 'edge'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { analyzeFuelImage, analyzeTollImage } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const { fuelImages, tollImages } = await request.json()

    // 유류비와 통행료 이미지를 병렬로 분석
    const [fuelResult, tollResult] = await Promise.all([
      analyzeFuelImage(fuelImages || []),
      analyzeTollImage(tollImages || []),
    ])

    return NextResponse.json({
      fuelCost: fuelResult.amount,
      tollCost: tollResult.amount,
      fuelDetails: fuelResult.details,
      tollDetails: tollResult.details,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Analysis error:', message)
    return NextResponse.json(
      { error: `이미지 분석에 실패했습니다: ${message}` },
      { status: 500 }
    )
  }
}
