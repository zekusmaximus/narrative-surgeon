'use client'

import React, { useState, useCallback } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useSingleManuscriptStore } from '@/store/singleManuscriptStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SortableChapterItem } from './SortableChapterItem'
import { ChapterDependencyWarnings } from './ChapterDependencyWarnings'
import { 
  ArrowLeft, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  BookOpen
} from 'lucide-react'
import type { Chapter, ConsistencyCheck } from '@/types/single-manuscript'

export function ChapterReorderPanel() {
  const { 
    manuscript, 
    currentVersion, 
    consistencyReport, 
    editorMode 
  } = useSingleManuscriptStore()
  
  const { 
    setEditorMode, 
    reorderChapters, 
    previewReordering, 
    applyReordering, 
    cancelReordering,
    runConsistencyCheck
  } = useSingleManuscriptStore(state => state.actions)
  
  const [localChapterOrder, setLocalChapterOrder] = useState<string[]>([])
  const [previewReport, setPreviewReport] = useState<ConsistencyCheck[]>([])
  const [isPreviewingChanges, setIsPreviewingChanges] = useState(false)
  const [hasUnsavedReordering, setHasUnsavedReordering] = useState(false)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // Initialize local order when entering reorder mode
  React.useEffect(() => {
    if (editorMode === 'reorder' && currentVersion && manuscript) {
      const currentOrder = currentVersion.chapterOrder.length > 0 
        ? currentVersion.chapterOrder 
        : manuscript.content.chapters.map(ch => ch.id)
      setLocalChapterOrder(currentOrder)
      setHasUnsavedReordering(false)
    }
  }, [editorMode, currentVersion, manuscript])
  
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (active.id !== over?.id) {
      setLocalChapterOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over!.id as string)
        const newOrder = arrayMove(items, oldIndex, newIndex)
        
        // Preview consistency issues
        setIsPreviewingChanges(true)
        previewReordering(newOrder).then(report => {
          setPreviewReport(report.checks)
          setIsPreviewingChanges(false)
          setHasUnsavedReordering(true)
        }).catch(() => {
          setIsPreviewingChanges(false)
          setHasUnsavedReordering(true)
        })
        
        return newOrder
      })
    }
  }, [previewReordering])
  
  const handleApplyReordering = useCallback(async () => {
    try {
      reorderChapters(localChapterOrder)
      await applyReordering()
      setHasUnsavedReordering(false)
      await runConsistencyCheck()
    } catch (error) {
      console.error('Failed to apply reordering:', error)
    }
  }, [localChapterOrder, reorderChapters, applyReordering, runConsistencyCheck])
  
  const handleCancelReordering = useCallback(() => {
    cancelReordering()
    setEditorMode('edit')
    setHasUnsavedReordering(false)
  }, [cancelReordering, setEditorMode])
  
  const handlePreviewInEditor = useCallback((chapterId: string) => {
    // TODO: Open chapter in preview mode
    console.log('Preview chapter:', chapterId)
  }, [])
  
  if (!manuscript || !currentVersion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">No manuscript loaded</div>
      </div>
    )
  }
  
  const chapters = localChapterOrder
    .map(id => manuscript.content.chapters.find(ch => ch.id === id))
    .filter(Boolean) as Chapter[]
  
  const hasWarnings = previewReport.some(check => check.severity === 'warning' || check.severity === 'error')
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancelReordering}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Chapter Reordering</h2>
            <p className="text-sm text-muted-foreground">
              {manuscript.metadata.title} - {currentVersion.name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedReordering && (
            <Badge variant="secondary" className="text-orange-600">
              Unsaved Changes
            </Badge>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCancelReordering}
            disabled={!hasUnsavedReordering}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button 
            onClick={handleApplyReordering}
            disabled={!hasUnsavedReordering}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Apply Changes
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chapter List */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Chapter Order</h3>
              <p className="text-sm text-muted-foreground">
                Drag chapters to reorder them. Warnings will appear for potential consistency issues.
              </p>
            </div>
            
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext 
                items={localChapterOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {chapters.map((chapter, index) => (
                    <SortableChapterItem 
                      key={chapter.id}
                      chapter={chapter}
                      index={index + 1}
                      warnings={previewReport.filter(check => 
                        check.chapterIds.includes(chapter.id)
                      )}
                      onPreview={handlePreviewInEditor}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            {isPreviewingChanges && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span className="text-sm">Analyzing consistency...</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Warnings Panel */}
        {previewReport.length > 0 && (
          <div className="w-80 border-l bg-muted/20">
            <ChapterDependencyWarnings warnings={previewReport} />
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="border-t bg-muted/50 px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              {chapters.length} chapters
            </span>
            {hasWarnings ? (
              <div className="flex items-center gap-1 text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span>{previewReport.length} consistency issues</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>No issues detected</span>
              </div>
            )}
          </div>
          
          <div className="text-muted-foreground">
            {hasUnsavedReordering ? 'Changes not saved' : 'All changes saved'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChapterReorderPanel