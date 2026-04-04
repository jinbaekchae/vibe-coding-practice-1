'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/Woka_logo.jpg"
            alt="Woka 로고"
            width={50}
            height={50}
            className="rounded-lg"
          />
          <h1 className="text-xl font-bold text-gray-800">출장 경비 정산</h1>
        </Link>
      </div>
    </header>
  )
}
