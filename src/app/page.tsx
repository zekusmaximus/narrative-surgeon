'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, FileText } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    // Auto-redirect to editor after brief delay
    const timer = setTimeout(() => {
      router.push('/editor')
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [router])

  const handleDirectEntry = () => {
    router.push('/editor')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-8">
          <BookOpen className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Narrative Surgeon
          </h1>
          <p className="text-slate-600">
            Chapter Reordering & Consistency Editor
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="text-sm text-slate-500">
            Loading your manuscript...
          </div>
          
          <Button 
            onClick={handleDirectEntry}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Enter Editor
          </Button>
        </div>
      </div>
    </div>
  )
}