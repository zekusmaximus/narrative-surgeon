'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAppStore } from '../../../lib/store'
import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { WritingStats } from '../../../components/WritingStats'
import { DocumentOutline } from '../../../components/DocumentOutline'
import { Edit, BarChart3, Send, FileText } from 'lucide-react'
import Link from 'next/link'

export default function ManuscriptOverview() {
  const params = useParams()
  const manuscriptId = params.id as string
  const { scenes, loadScenes, loading, setLoading } = useAppStore()
  const [manuscript, setManuscript] = useState<any>(null)
  const [currentScene, setCurrentScene] = useState<any>(null)

  useEffect(() => {
    const loadManuscriptData = async () => {
      if (!manuscriptId) return
      
      setLoading(true)
      try {
        // Load manuscript details and scenes
        await loadScenes(manuscriptId)
        
        // Get manuscript metadata (this would need to be implemented in TauriAPI)
        // For now, we'll use mock data
        setManuscript({
          id: manuscriptId,
          title: 'Sample Manuscript',
          author: 'Author Name',
          genre: 'Fiction',
          created_at: Date.now(),
          updated_at: Date.now(),
        })
      } catch (error) {
        console.error('Failed to load manuscript:', error)
      } finally {
        setLoading(false)
      }
    }

    loadManuscriptData()
  }, [manuscriptId, loadScenes, setLoading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading manuscript...</div>
      </div>
    )
  }

  if (!manuscript) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-4">Manuscript not found</div>
          <Link href="/manuscripts">
            <Button>Back to Manuscripts</Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalWords = scenes.reduce((acc, scene) => acc + (scene.word_count || 0), 0)

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/manuscripts" className="text-muted-foreground hover:text-foreground mb-2 inline-block">
          ← Back to Manuscripts
        </Link>
        <h1 className="text-3xl font-bold mb-2">{manuscript.title}</h1>
        <p className="text-muted-foreground">
          {manuscript.genre} • {totalWords.toLocaleString()} words • {scenes.length} scenes
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link href={`/manuscripts/${manuscriptId}/editor`}>
          <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Edit className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Edit</div>
                <div className="text-sm text-muted-foreground">Continue writing</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/manuscripts/${manuscriptId}/analysis`}>
          <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Analyze</div>
                <div className="text-sm text-muted-foreground">AI insights</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/manuscripts/${manuscriptId}/submissions`}>
          <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Submissions</div>
                <div className="text-sm text-muted-foreground">Query letters</div>
              </div>
            </div>
          </Card>
        </Link>

        <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium">Export</div>
              <div className="text-sm text-muted-foreground">Various formats</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Writing Statistics</h2>
            <WritingStats 
              currentWordCount={currentScene?.word_count || 0}
              currentCharacterCount={currentScene?.character_count || 0}
              totalWordCount={totalWords}
              scenes={scenes}
              targetWordCount={80000}
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="text-muted-foreground">
              No recent activity to display
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Document Outline</h2>
            <DocumentOutline 
              scenes={scenes}
              activeSceneId={currentScene?.id}
              onSceneSelect={(scene) => setCurrentScene(scene)}
              onScenesReorder={(newOrder) => {
                // TODO: Implement scene reordering
                console.log('Reorder scenes:', newOrder)
              }}
              onSceneCreate={(afterSceneId) => {
                // TODO: Implement scene creation
                console.log('Create scene after:', afterSceneId)
              }}
              onSceneDelete={(sceneId) => {
                // TODO: Implement scene deletion
                console.log('Delete scene:', sceneId)
              }}
              onSceneRename={(sceneId, newTitle) => {
                // TODO: Implement scene renaming
                console.log('Rename scene:', sceneId, newTitle)
              }}
              manuscriptWordCount={totalWords}
              targetWordCount={80000}
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Manuscript Details</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>{' '}
                {new Date(manuscript.created_at).toLocaleDateString()}
              </div>
              <div>
                <span className="text-muted-foreground">Last Modified:</span>{' '}
                {new Date(manuscript.updated_at).toLocaleDateString()}
              </div>
              <div>
                <span className="text-muted-foreground">Word Count:</span>{' '}
                {totalWords.toLocaleString()}
              </div>
              <div>
                <span className="text-muted-foreground">Scenes:</span>{' '}
                {scenes.length}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}