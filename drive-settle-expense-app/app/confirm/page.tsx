'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ExpenseData {
  name: string
  lectureName: string
  tripDate: string
  fuelCost: number
  tollCost: number
  fuelDetails: string[]
  tollDetails: string[]
  fuelLinks: string[]
  tollLinks: string[]
}

export default function ConfirmPage() {
  const router = useRouter()
  const [data, setData] = useState<ExpenseData | null>(null)
  const [editedFuelCost, setEditedFuelCost] = useState(0)
  const [editedTollCost, setEditedTollCost] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('expenseData')
    if (stored) {
      const parsed = JSON.parse(stored)
      setData(parsed)
      setEditedFuelCost(parsed.fuelCost)
      setEditedTollCost(parsed.tollCost)
    } else {
      router.push('/')
    }
  }, [router])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount)
  }

  const handleSubmit = async () => {
    if (!data) return

    setIsSubmitting(true)
    try {
      const submitData = {
        name: data.name,
        lectureName: data.lectureName,
        tripDate: data.tripDate,
        fuelCost: editedFuelCost,
        tollCost: editedTollCost,
        fuelLinks: data.fuelLinks || [],
        tollLinks: data.tollLinks || [],
      }

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        throw new Error('제출에 실패했습니다.')
      }

      // 세션 스토리지 클리어
      sessionStorage.removeItem('expenseData')
      router.push('/complete')
    } catch (error) {
      console.error('Submit error:', error)
      alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  const totalCost = editedFuelCost + editedTollCost

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        정산 금액 확인
      </h2>

      {/* 기본 정보 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">이름:</span>
            <span className="ml-2 font-medium text-gray-800">{data.name}</span>
          </div>
          <div>
            <span className="text-gray-500">출장일:</span>
            <span className="ml-2 font-medium text-gray-800">{data.tripDate}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">강의명:</span>
            <span className="ml-2 font-medium text-gray-800">{data.lectureName}</span>
          </div>
        </div>
      </div>

      {/* 유류비 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="text-2xl">⛽</span> 유류비
        </h3>
        {data.fuelDetails.length > 0 && (
          <div className="mb-2 text-sm text-gray-500">
            {data.fuelDetails.map((detail, i) => (
              <p key={i}>{detail}</p>
            ))}
          </div>
        )}
        {data.fuelLinks?.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {data.fuelLinks.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 underline"
              >
                증빙 이미지{data.fuelLinks.length > 1 ? ` ${i + 1}` : ''} 보기
              </a>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={editedFuelCost}
            onChange={(e) => setEditedFuelCost(Number(e.target.value))}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-right text-lg font-semibold text-gray-800"
          />
          <span className="text-gray-600">원</span>
        </div>
      </div>

      {/* 통행료 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="text-2xl">🛣️</span> 통행료
        </h3>
        {data.tollDetails.length > 0 && (
          <div className="mb-2 text-sm text-gray-500">
            {data.tollDetails.map((detail, i) => (
              <p key={i}>{detail}</p>
            ))}
          </div>
        )}
        {data.tollLinks?.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {data.tollLinks.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 underline"
              >
                증빙 이미지{data.tollLinks.length > 1 ? ` ${i + 1}` : ''} 보기
              </a>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={editedTollCost}
            onChange={(e) => setEditedTollCost(Number(e.target.value))}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-right text-lg font-semibold text-gray-800"
          />
          <span className="text-gray-600">원</span>
        </div>
      </div>

      {/* 합계 */}
      <div className="mb-8 p-4 bg-orange-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-700">총 정산 금액</span>
          <span className="text-2xl font-bold text-orange-600">
            {formatCurrency(totalCost)}원
          </span>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-4">
        <button
          onClick={() => router.push('/')}
          className="flex-1 py-4 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
        >
          이전
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 bg-orange-500 text-white py-4 px-6 rounded-lg font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '제출 중...' : '신청 완료'}
        </button>
      </div>
    </div>
  )
}
