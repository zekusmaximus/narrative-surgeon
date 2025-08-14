'use client'

import { useEffect } from 'react'
import { useAppStore } from '../../lib/store'
import { ManuscriptsList } from '../../components/ManuscriptsList'
import { Button } from '../../components/ui/button'
import { Plus, Upload } from 'lucide-react'

export default function ManuscriptsPage() {
  const { 
    loading, 
    error, 
    loadManuscripts, 
    setCurrentView,
    setError 
  } = useAppStore()

  useEffect(() => {
    setCurrentView('dashboard')
    loadManuscripts()
  }, [setCurrentView, loadManuscripts])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading manuscripts...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-destructive mb-4">Error: {error}</div>
          <Button 
            onClick={() => {
              setError(null)
              loadManuscripts()
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manuscripts</h1>
          <p className="text-muted-foreground">
            Manage your writing projects
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import Multiple
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Manuscript
          </Button>
        </div>
      </div>

      <ManuscriptsList 
        onManuscriptSelect={(manuscript) => {
          // Navigate to manuscript overview
          window.location.href = `/manuscripts/${manuscript.id}`
        }}
        onCreateNew={() => {
          // This will be handled by the CreateManuscriptDialog component
        }}
      />
    </div>
  )
}