'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  GitCommit, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Plus,
  RotateCcw,
  BarChart3,
  Eye,
  Copy,
  Download
} from 'lucide-react'
import { diffChars, diffWords, diffSentences, Change } from 'diff'

interface Revision {
  id: string
  timestamp: number
  title: string
  description?: string
  wordCount: number
  characterCount: number
  content: string
  author?: string
  version: string
}

interface RevisionComparisonProps {
  revisions: Revision[]
  selectedRevisions?: [string, string]
  onRevisionSelect?: (revisionIds: [string, string]) => void
  onRevertToRevision?: (revisionId: string) => void
  onExportComparison?: (comparison: ComparisonResult) => void
  className?: string
}

interface ComparisonResult {
  oldRevision: Revision
  newRevision: Revision
  stats: {
    additions: number
    deletions: number
    changes: number
    wordsAdded: number
    wordsRemoved: number
    characterDelta: number
    similarityScore: number
  }
  changes: Change[]
  wordChanges: Change[]
  sentenceChanges: Change[]
}

export function RevisionComparison({
  revisions,
  selectedRevisions,
  onRevisionSelect,
  onRevertToRevision,
  onExportComparison,
  className
}: RevisionComparisonProps) {
  const [currentRevisions, setCurrentRevisions] = useState<[string, string]>(
    selectedRevisions || [revisions[1]?.id || '', revisions[0]?.id || '']
  )
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('unified')
  const [diffMode, setDiffMode] = useState<'words' | 'characters' | 'sentences'>('words')
  const [showStats, setShowStats] = useState(true)

  useEffect(() => {
    if (selectedRevisions) {
      setCurrentRevisions(selectedRevisions)
    }
  }, [selectedRevisions])

  const comparison = useMemo((): ComparisonResult | null => {
    const [oldId, newId] = currentRevisions
    if (!oldId || !newId) return null

    const oldRevision = revisions.find(r => r.id === oldId)
    const newRevision = revisions.find(r => r.id === newId)
    
    if (!oldRevision || !newRevision) return null

    const charChanges = diffChars(oldRevision.content, newRevision.content)
    const wordChanges = diffWords(oldRevision.content, newRevision.content)
    const sentenceChanges = diffSentences(oldRevision.content, newRevision.content)

    const stats = calculateStats(oldRevision, newRevision, charChanges, wordChanges)

    return {
      oldRevision,
      newRevision,
      stats,
      changes: charChanges,
      wordChanges,
      sentenceChanges
    }
  }, [currentRevisions, revisions])

  const calculateStats = (
    oldRevision: Revision, 
    newRevision: Revision, 
    charChanges: Change[],
    wordChanges: Change[]
  ) => {
    let additions = 0
    let deletions = 0
    let wordsAdded = 0
    let wordsRemoved = 0

    charChanges.forEach(change => {
      if (change.added) additions += change.value.length
      if (change.removed) deletions += change.value.length
    })

    wordChanges.forEach(change => {
      if (change.added) wordsAdded += change.value.split(/\s+/).length
      if (change.removed) wordsRemoved += change.value.split(/\s+/).length
    })

    const changes = charChanges.filter(c => c.added || c.removed).length
    const characterDelta = newRevision.characterCount - oldRevision.characterCount
    const maxLength = Math.max(oldRevision.content.length, newRevision.content.length)
    const similarityScore = maxLength > 0 ? ((maxLength - Math.max(additions, deletions)) / maxLength) * 100 : 100

    return {
      additions,
      deletions,
      changes,
      wordsAdded,
      wordsRemoved,
      characterDelta,
      similarityScore
    }
  }

  const handleRevisionChange = (position: 'old' | 'new', revisionId: string) => {
    const newSelection: [string, string] = position === 'old' 
      ? [revisionId, currentRevisions[1]]
      : [currentRevisions[0], revisionId]
    
    setCurrentRevisions(newSelection)
    onRevisionSelect?.(newSelection)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderDiff = () => {
    if (!comparison) return null

    const changes = diffMode === 'words' ? comparison.wordChanges :
                   diffMode === 'sentences' ? comparison.sentenceChanges :
                   comparison.changes

    if (viewMode === 'split') {
      return renderSplitView(changes)
    } else {
      return renderUnifiedView(changes)
    }
  }

  const renderSplitView = (changes: Change[]) => {
    const oldLines: React.ReactNode[] = []
    const newLines: React.ReactNode[] = []

    changes.forEach((change, index) => {
      if (!change.added && !change.removed) {
        // Unchanged content
        oldLines.push(
          <div key={`old-${index}`} className="py-1 px-2">
            {change.value}
          </div>
        )
        newLines.push(
          <div key={`new-${index}`} className="py-1 px-2">
            {change.value}
          </div>
        )
      } else if (change.removed) {
        // Removed content (only in old)
        oldLines.push(
          <div key={`old-${index}`} className="py-1 px-2 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
            <span className="text-red-700 dark:text-red-300">{change.value}</span>
          </div>
        )
        newLines.push(<div key={`new-empty-${index}`} className="py-1 px-2 text-muted-foreground">—</div>)
      } else if (change.added) {
        // Added content (only in new)
        oldLines.push(<div key={`old-empty-${index}`} className="py-1 px-2 text-muted-foreground">—</div>)
        newLines.push(
          <div key={`new-${index}`} className="py-1 px-2 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500">
            <span className="text-green-700 dark:text-green-300">{change.value}</span>
          </div>
        )
      }
    })

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Original</span>
            <Badge variant="outline">{comparison?.oldRevision.version}</Badge>
          </div>
          <ScrollArea className="h-96">
            <div className="font-mono text-sm space-y-1">
              {oldLines}
            </div>
          </ScrollArea>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Revised</span>
            <Badge variant="outline">{comparison?.newRevision.version}</Badge>
          </div>
          <ScrollArea className="h-96">
            <div className="font-mono text-sm space-y-1">
              {newLines}
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  }

  const renderUnifiedView = (changes: Change[]) => {
    return (
      <ScrollArea className="h-96">
        <div className="font-mono text-sm leading-relaxed">
          {changes.map((change, index) => {
            if (change.added) {
              return (
                <span
                  key={index}
                  className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-1 rounded"
                >
                  {change.value}
                </span>
              )
            } else if (change.removed) {
              return (
                <span
                  key={index}
                  className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 line-through px-1 rounded"
                >
                  {change.value}
                </span>
              )
            } else {
              return <span key={index}>{change.value}</span>
            }
          })}
        </div>
      </ScrollArea>
    )
  }

  if (revisions.length < 2) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center space-y-3">
          <GitCommit className="w-8 h-8 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">No Revisions Available</h3>
            <p className="text-sm text-muted-foreground">
              You need at least 2 revisions to compare changes.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Revision Selector */}
      <Card className="p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitCommit className="w-5 h-5" />
            Compare Revisions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Original Version</label>
              <select
                value={currentRevisions[0]}
                onChange={(e) => handleRevisionChange('old', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {revisions.map(revision => (
                  <option key={revision.id} value={revision.id}>
                    {revision.version} - {formatDate(revision.timestamp)} ({revision.wordCount} words)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Revised Version</label>
              <select
                value={currentRevisions[1]}
                onChange={(e) => handleRevisionChange('new', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {revisions.map(revision => (
                  <option key={revision.id} value={revision.id}>
                    {revision.version} - {formatDate(revision.timestamp)} ({revision.wordCount} words)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Comparison Stats */}
      {comparison && showStats && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Comparison Stats
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {Math.round(comparison.stats.similarityScore)}% similar
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <Plus className="w-4 h-4" />
                <span className="text-lg font-bold">{comparison.stats.wordsAdded}</span>
              </div>
              <div className="text-xs text-muted-foreground">Words Added</div>
            </div>
            
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                <Minus className="w-4 h-4" />
                <span className="text-lg font-bold">{comparison.stats.wordsRemoved}</span>
              </div>
              <div className="text-xs text-muted-foreground">Words Removed</div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                {comparison.stats.characterDelta >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-lg font-bold">
                  {Math.abs(comparison.stats.characterDelta)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Character Change</div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                <GitCommit className="w-4 h-4" />
                <span className="text-lg font-bold">{comparison.stats.changes}</span>
              </div>
              <div className="text-xs text-muted-foreground">Total Changes</div>
            </div>
          </div>
        </Card>
      )}

      {/* Comparison View */}
      {comparison && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold">Content Comparison</h4>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <Button
                variant={viewMode === 'unified' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('unified')}
              >
                Unified
              </Button>
              <Button
                variant={viewMode === 'split' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('split')}
              >
                Split
              </Button>
              
              {/* Diff Mode */}
              <select
                value={diffMode}
                onChange={(e) => setDiffMode(e.target.value as typeof diffMode)}
                className="p-1 text-sm border rounded"
              >
                <option value="characters">Characters</option>
                <option value="words">Words</option>
                <option value="sentences">Sentences</option>
              </select>
            </div>
          </div>
          
          {renderDiff()}
        </Card>
      )}

      {/* Actions */}
      {comparison && (
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => setShowStats(!showStats)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showStats ? 'Hide' : 'Show'} Stats
          </Button>
          
          <Button
            variant="outline"
            onClick={() => onExportComparison?.(comparison)}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Comparison
          </Button>
          
          <Button
            variant="outline"
            onClick={() => onRevertToRevision?.(comparison.oldRevision.id)}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Revert to Original
          </Button>
          
          <Button
            onClick={() => onRevertToRevision?.(comparison.newRevision.id)}
          >
            <Copy className="w-4 h-4 mr-2" />
            Keep Revised
          </Button>
        </div>
      )}
    </div>
  )
}

export default RevisionComparison