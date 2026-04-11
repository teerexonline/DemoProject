'use client'

import dynamic from 'next/dynamic'

const PaddleProvider = dynamic(() => import('./PaddleProvider'), { ssr: false })

export default function PaddleProviderWrapper() {
  return <PaddleProvider />
}
