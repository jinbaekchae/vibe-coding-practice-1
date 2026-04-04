'use client'

import { useRouter } from 'next/navigation'

export default function CompletePage() {
  const router = useRouter()

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
      {/* 성공 아이콘 */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full">
          <svg
            className="w-10 h-10 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        신청이 완료되었습니다
      </h2>

      <p className="text-gray-500 mb-8">
        출장 경비 정산 신청이 성공적으로 접수되었습니다.
        <br />
        담당자 확인 후 처리될 예정입니다.
      </p>

      <button
        onClick={() => router.push('/')}
        className="w-full bg-orange-500 text-white py-4 px-6 rounded-lg font-semibold hover:bg-orange-600 transition-all"
      >
        처음으로 돌아가기
      </button>
    </div>
  )
}
