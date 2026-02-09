'use client'

import { useRef, useState, useCallback } from 'react'
import ExampleImageModal from './ExampleImageModal'

interface ImageUploadProps {
  label: string
  name: string
  description: string
  images: File[]
  onImagesChange: (files: File[]) => void
  exampleImages?: string[]
}

export default function ImageUpload({
  label,
  name,
  description,
  images,
  onImagesChange,
  exampleImages,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showExamples, setShowExamples] = useState(false)

  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    const newImages = [...images, ...imageFiles]
    onImagesChange(newImages)

    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }, [images, onImagesChange])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addFiles(files)
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = ''
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    onImagesChange(newImages)
    setPreviews(newPreviews)
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">{description}</p>
        {exampleImages && exampleImages.length > 0 && (
          <button
            type="button"
            onClick={() => setShowExamples(true)}
            className="text-xs text-orange-500 hover:text-orange-600 font-medium whitespace-nowrap ml-2"
          >
            예시 이미지
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-orange-500 bg-orange-50'
            : 'border-gray-300 hover:border-orange-500'
        }`}
      >
        <div className="text-gray-500 pointer-events-none">
          <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">클릭 또는 드래그하여 이미지 업로드</p>
          <p className="text-xs mt-1">여러 장 선택 가능</p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {previews.map((preview, index) => (
            <div key={index} className="relative">
              <img
                src={preview}
                alt={`미리보기 ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeImage(index)
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {exampleImages && (
        <ExampleImageModal
          isOpen={showExamples}
          onClose={() => setShowExamples(false)}
          title={`${label} 예시`}
          images={exampleImages}
        />
      )}
    </div>
  )
}
