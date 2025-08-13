'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Lightbulb, 
  CheckCircle, 
 
  Users, 
  BookOpen, 
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles
} from 'lucide-react'
import { realTimeAnalyzer } from '@/lib/analysis/RealTimeAnalyzer'
import type { RealTimeSuggestion, InlineSuggestion } from '@/lib/analysis/RealTimeAnalyzer'

interface InlineAssistantProps {
  editorContent: string
  cursorPosition: number
  selectedText?: string
  manuscriptId: string
  isActive: boolean
  onSuggestionApply?: (suggestion: string) => void
  onTextReplace?: (start: number, end: number, replacement: string) => void
  className?: string
}

interface SuggestionGroup {
  type: string
  icon: React.ReactNode
  color: string
  suggestions: RealTimeSuggestion[]
}

export function InlineAssistant({
  editorContent,
  cursorPosition,
  manuscriptId,
  isActive,
  onSuggestionApply,
  onTextReplace,
  className
}: InlineAssistantProps) {
  const [suggestions, setSuggestions] = useState<RealTimeSuggestion[]>([])
  const [completions, setCompletions] = useState<InlineSuggestion[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['grammar', 'style']))
  const [showCompletions, setShowCompletions] = useState(false)
  const [writingInsights, setWritingInsights] = useState<any>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Track writing session
  useEffect(() => {
    if (isActive) {
      realTimeAnalyzer.startWritingSession(manuscriptId)
    }
    
    return () => {
      realTimeAnalyzer.endWritingSession(manuscriptId)
    }
  }, [isActive, manuscriptId])

  // Real-time analysis as user types
  useEffect(() => {
    if (!isActive || editorContent.length < 50) {
      setSuggestions([])
      return
    }

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce analysis calls
    debounceRef.current = setTimeout(async () => {
      setIsAnalyzing(true)
      
      try {
        await realTimeAnalyzer.analyzeTextAsUserTypes(
          manuscriptId,
          editorContent,
          cursorPosition,
          (newSuggestions) => {
            setSuggestions(newSuggestions)
            setIsAnalyzing(false)
          }
        )

        // Update writing insights
        const insights = realTimeAnalyzer.getWritingInsights(manuscriptId)
        setWritingInsights(insights)
      } catch (error) {
        console.error('Real-time analysis failed:', error)
        setIsAnalyzing(false)
      }
    }, 1000) // 1 second debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [editorContent, cursorPosition, isActive, manuscriptId])

  // Get text completions when user pauses
  useEffect(() => {
    if (!isActive || !showCompletions) return

    const getCompletions = async () => {
      try {
        const newCompletions = await realTimeAnalyzer.getInlineCompletions(
          editorContent,
          cursorPosition,
          3
        )
        setCompletions(newCompletions)
      } catch (error) {
        console.error('Completion failed:', error)
      }
    }

    const timeout = setTimeout(getCompletions, 2000) // 2 second pause
    return () => clearTimeout(timeout)
  }, [editorContent, cursorPosition, isActive, showCompletions])

  const groupSuggestions = (): SuggestionGroup[] => {
    const groups: SuggestionGroup[] = []
    const groupMap: { [key: string]: RealTimeSuggestion[] } = {}

    // Group suggestions by type
    suggestions.forEach(suggestion => {
      if (!groupMap[suggestion.type]) {
        groupMap[suggestion.type] = []
      }
      groupMap[suggestion.type].push(suggestion)
    })

    // Create grouped structure with icons and colors
    Object.entries(groupMap).forEach(([type, suggestions]) => {
      const config = getSuggestionConfig(type)
      groups.push({
        type,
        icon: config.icon,
        color: config.color,
        suggestions: suggestions.sort((a, b) => {
          const severityOrder = { error: 3, warning: 2, info: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        })
      })
    })

    return groups.sort((a, b) => a.suggestions.length - b.suggestions.length)
  }

  const getSuggestionConfig = (type: string) => {
    const configs: { [key: string]: { icon: React.ReactNode; color: string } } = {
      grammar: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-red-500' },
      style: { icon: <Sparkles className="w-4 h-4" />, color: 'text-blue-500' },
      character: { icon: <Users className="w-4 h-4" />, color: 'text-purple-500' },
      plot: { icon: <BookOpen className="w-4 h-4" />, color: 'text-green-500' },
      pacing: { icon: <Zap className="w-4 h-4" />, color: 'text-orange-500' },
      dialogue: { icon: <MessageSquare className="w-4 h-4" />, color: 'text-pink-500' }
    }
    return configs[type] || { icon: <Lightbulb className="w-4 h-4" />, color: 'text-gray-500' }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'warning': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'info': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const applySuggestion = (suggestion: RealTimeSuggestion) => {
    if (onTextReplace) {
      onTextReplace(suggestion.position.start, suggestion.position.end, suggestion.suggestion)
    }
  }

  const applyCompletion = (completion: InlineSuggestion) => {
    if (onSuggestionApply) {
      onSuggestionApply(completion.text)
    }
  }

  const toggleGroup = (groupType: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupType)) {
      newExpanded.delete(groupType)
    } else {
      newExpanded.add(groupType)
    }
    setExpandedGroups(newExpanded)
  }

  if (!isActive) {
    return null
  }

  const suggestionGroups = groupSuggestions()
  const hasActiveSuggestions = suggestions.length > 0
  const hasCompletions = completions.length > 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Writing Insights */}
      {writingInsights && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Writing Flow</span>
            {isAnalyzing && (
              <div className="animate-pulse">
                <div className="w-2 h-2 bg-primary rounded-full" />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {writingInsights.currentWPM}
              </div>
              <div className="text-muted-foreground">WPM</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">
                {writingInsights.focusLevel}%
              </div>
              <div className="text-muted-foreground">Focus</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-500">
                {writingInsights.averagePauseTime}s
              </div>
              <div className="text-muted-foreground">Avg Pause</div>
            </div>
          </div>

          {writingInsights.suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-muted-foreground space-y-1">
                {writingInsights.suggestions.map((tip: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Text Completions */}
      {hasCompletions && showCompletions && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Completions</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompletions(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {completions.map((completion) => (
              <div
                key={completion.id}
                className="p-2 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-colors"
                onClick={() => applyCompletion(completion)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{completion.text}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(completion.confidence * 100)}%
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Real-time Suggestions */}
      {hasActiveSuggestions && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Writing Assistant</span>
            <Badge variant="outline" className="text-xs">
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="space-y-3">
            {suggestionGroups.map((group) => (
              <div key={group.type}>
                <div
                  className="flex items-center justify-between cursor-pointer py-1"
                  onClick={() => toggleGroup(group.type)}
                >
                  <div className="flex items-center gap-2">
                    <div className={group.color}>
                      {group.icon}
                    </div>
                    <span className="text-sm font-medium capitalize">
                      {group.type}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {group.suggestions.length}
                    </Badge>
                  </div>
                  {expandedGroups.has(group.type) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>

                {expandedGroups.has(group.type) && (
                  <div className="space-y-2 ml-6 mt-2">
                    {group.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={`p-3 rounded-lg border ${getSeverityColor(suggestion.severity)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium mb-1">
                              {suggestion.message}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {suggestion.suggestion}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  suggestion.severity === 'error' ? 'destructive' :
                                  suggestion.severity === 'warning' ? 'secondary' : 'outline'
                                }
                                className="text-xs"
                              >
                                {suggestion.severity}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                {Math.round(suggestion.confidence * 100)}% confident
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applySuggestion(suggestion)}
                            className="flex-shrink-0"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!hasActiveSuggestions && !isAnalyzing && !hasCompletions && (
        <Card className="p-6">
          <div className="text-center space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-sm font-medium">Writing Assistant Ready</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Start writing to receive contextual suggestions and improvements.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompletions(!showCompletions)}
              >
                {showCompletions ? 'Hide' : 'Show'} Completions
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Analysis Status */}
      {isAnalyzing && (
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin">
              <Zap className="w-4 h-4" />
            </div>
            <span>Analyzing your writing...</span>
          </div>
        </Card>
      )}
    </div>
  )
}

export default InlineAssistant