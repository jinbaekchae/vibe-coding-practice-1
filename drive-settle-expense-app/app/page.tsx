'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FormInput from '@/components/FormInput'
import ImageUpload from '@/components/ImageUpload'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    lectureName: '',
    tripDate: '',
  })
  const [fuelImages, setFuelImages] = useState<File[]>([])
  const [tollImages, setTollImages] = useState<File[]>([])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 이미지를 리사이즈 후 Base64로 변환 (Vercel 4.5MB body 제한 대응)
      const resizeAndConvert = (file: File, maxSize = 800): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onerror = reject
          reader.onload = () => {
            const img = new window.Image()
            img.onerror = reject
            img.onload = () => {
              const canvas = document.createElement('canvas')
              let { width, height } = img
              if (width > maxSize || height > maxSize) {
                if (width > height) {
                  height = Math.round((height * maxSize) / width)
                  width = maxSize
                } else {
                  width = Math.round((width * maxSize) / height)
                  height = maxSize
                }
              }
              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d')!
              ctx.drawImage(img, 0, 0, width, height)
              resolve(canvas.toDataURL('image/jpeg', 0.7))
            }
            img.src = reader.result as string
          }
          reader.readAsDataURL(file)
        })
      }

      const fuelBase64 = await Promise.all(fuelImages.map(f => resizeAndConvert(f)))
      const tollBase64 = await Promise.all(tollImages.map(f => resizeAndConvert(f)))

      // API 호출하여 이미지 분석
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuelImages: fuelBase64,
          tollImages: tollBase64,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '분석에 실패했습니다.')
      }

      // 결과를 세션 스토리지에 저장하고 확인 페이지로 이동
      sessionStorage.setItem('expenseData', JSON.stringify({
        ...formData,
        fuelCost: result.fuelCost,
        tollCost: result.tollCost,
        fuelDetails: result.fuelDetails,
        tollDetails: result.tollDetails,
      }))

      router.push('/confirm')
    } catch (error) {
      console.error('Error:', error)
      alert('처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        출장 경비 정산 신청
      </h2>

      <form onSubmit={handleSubmit}>
        <FormInput
          label="이름"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
          placeholder="홍길동"
        />

        <FormInput
          label="강의명"
          name="lectureName"
          value={formData.lectureName}
          onChange={handleInputChange}
          required
          placeholder="2024년 상반기 리더십 교육"
        />

        <FormInput
          label="출장일"
          name="tripDate"
          type="date"
          value={formData.tripDate}
          onChange={handleInputChange}
          required
        />

        <ImageUpload
          label="유류비 영수증"
          name="fuelImages"
          description="네이버지도에서 캡처한 거리/유류비 이미지를 업로드하세요"
          images={fuelImages}
          onImagesChange={setFuelImages}
          exampleImages={['/examples/fuel-example-1.png', '/examples/fuel-example-2.png']}
        />

        <ImageUpload
          label="통행료 결제내역"
          name="tollImages"
          description="카드사 앱에서 캡처한 고속도로 통행료 결제내역을 업로드하세요"
          images={tollImages}
          onImagesChange={setTollImages}
          exampleImages={['/examples/toll-example-1.jpg', '/examples/toll-example-2.png']}
        />

        <button
          type="submit"
          disabled={isLoading || (!fuelImages.length && !tollImages.length)}
          className="w-full mt-6 bg-orange-500 text-white py-4 px-6 rounded-lg font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              이미지 분석 중...
            </span>
          ) : (
            '다음'
          )}
        </button>
      </form>
    </div>
  )
}
