import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Woka - 출장 경비 정산',
  description: '출장 경비 정산 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {children}
        </main>
      </body>
    </html>
  )
}
