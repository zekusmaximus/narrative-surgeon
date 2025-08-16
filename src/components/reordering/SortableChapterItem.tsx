'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  GripVertical, 
  Eye, 
  AlertTriangle, 
  Info, 
  Clock,
  MapPin,
  User
} from 'lucide-react'
import type { Chapter, ConsistencyCheck } from '@/types/single-manuscript'

interface SortableChapterItemProps {
  chapter: Chapter
  index: number
  warnings: ConsistencyCheck[]
  onPreview: (chapterId: string) => void
}

export function SortableChapterItem({ 
  chapter, 
  index, 
  warnings,
  onPreview 
}: SortableChapterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasErrors = warnings.some(w => w.severity === 'error')
  const hasWarnings = warnings.some(w => w.severity === 'warning')
  
  const warningCount = warnings.length

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className={`
        transition-all duration-200
        ${isDragging ? 'opacity-50 shadow-lg scale-105' : 'opacity-100'}
        ${hasErrors ? 'border-red-200 bg-red-50' : ''}
        ${hasWarnings && !hasErrors ? 'border-orange-200 bg-orange-50' : ''}
        hover:shadow-md
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div 
            className="flex items-center mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </div>
          
          {/* Chapter Number */}
          <div className="flex-shrink-0">
            <Badge variant="outline" className="font-mono">
              {index}
            </Badge>
          </div>
          
          {/* Chapter Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="font-medium truncate">
                  {chapter.title}
                </h4>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>{chapter.wordCount.toLocaleString()} words</span>
                  {chapter.metadata.pov && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{chapter.metadata.pov}</span>
                    </div>
                  )}
                  {chapter.metadata.location.length > 0 && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{chapter.metadata.location[0]}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {warningCount > 0 && (
                  <Badge 
                    variant={hasErrors ? 'destructive' : 'secondary'}
                    className={hasErrors ? '' : 'text-orange-600'}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {warningCount}
                  </Badge>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onPreview(chapter.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Chapter Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {chapter.metadata.tensionLevel && (
                <span>Tension: {chapter.metadata.tensionLevel}/10</span>
              )}
              {chapter.metadata.timeframe && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{chapter.metadata.timeframe}</span>
                </div>
              )}
              {chapter.metadata.majorEvents.length > 0 && (
                <span>{chapter.metadata.majorEvents.length} major events</span>
              )}
            </div>
            
            {/* Dependencies Preview */}
            {chapter.dependencies.requiredKnowledge.length > 0 && (
              <div className="mt-2 text-xs">
                <span className="text-muted-foreground">Requires: </span>
                <span className="text-blue-600">
                  {chapter.dependencies.requiredKnowledge.slice(0, 3).join(', ')}
                  {chapter.dependencies.requiredKnowledge.length > 3 && '...'}
                </span>
              </div>
            )}
            
            {chapter.dependencies.introduces.length > 0 && (
              <div className="mt-1 text-xs">
                <span className="text-muted-foreground">Introduces: </span>
                <span className="text-green-600">
                  {chapter.dependencies.introduces.slice(0, 3).join(', ')}
                  {chapter.dependencies.introduces.length > 3 && '...'}
                </span>
              </div>
            )}
            
            {/* Warning Preview */}
            {warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {warnings.slice(0, 2).map((warning, idx) => (
                  <div 
                    key={idx}
                    className={`text-xs p-2 rounded flex items-start gap-2 ${
                      warning.severity === 'error' 
                        ? 'bg-red-100 text-red-700' 
                        : warning.severity === 'warning'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {warning.severity === 'error' ? (
                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="flex-1">{warning.message}</span>
                  </div>
                ))}
                {warnings.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{warnings.length - 2} more issues
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default SortableChapterItem