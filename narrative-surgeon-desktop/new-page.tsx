'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Hard-coded manuscript configuration for single techno-thriller
const MANUSCRIPT_CONFIG = {
  id: 'digital-shadows-2024',
  title: 'Digital Shadows',
  author: 'Your Name', // TODO: Update with actual author
  wordCount: 90000,
  genre: 'techno-thriller'
}

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Immediately redirect to the single manuscript editor
    // No manuscript selection needed for single-manuscript app
    router.push(`/manuscripts/${MANUSCRIPT_CONFIG.id}/editor`)
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-pulse">
          <h1 className="text-2xl font-bold text-gray-800">Digital Shadows</h1>
          <p className="text-gray-600">Loading manuscript editor...</p>
        </div>
        
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        
        <div className="text-sm text-gray-500 space-y-1">
          <div>90,000 words • Techno-thriller</div>
          <div>Chapter reordering mode</div>
        </div>
      </div>
    </div>
  )
}