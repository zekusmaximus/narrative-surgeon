'use client'

import { llmManager } from '../llmProvider'
import { analysisCache } from '../cache'
import type { AnalysisResult } from '../llmProvider'

export interface RealTimeSuggestion {
  id: string
  type: 'grammar' | 'style' | 'character' | 'plot' | 'pacing' | 'dialogue'
  severity: 'info' | 'warning' | 'error'
  position: { start: number; end: number }
  message: string
  suggestion: string
  confidence: number
  timestamp: number
}

export interface WritingPattern {
  sessionId: string
  startTime: number
  endTime?: number
  totalWords: number
  wordsPerMinute: number
  pausePatterns: number[]
  revisionRatio: number
  focusAreas: string[]
  productivityScore: number
}

export interface InlineSuggestion {
  id: string
  text: string
  position: number
  type: 'completion' | 'improvement' | 'alternative'
  confidence: number
}

class RealTimeAnalyzer {
  private analysisTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private suggestionCallbacks: Map<string, (suggestions: RealTimeSuggestion[]) => void> = new Map()
  private writingPatterns: Map<string, WritingPattern> = new Map()
  private lastAnalysis: Map<string, { content: string; timestamp: number }> = new Map()

  // Debounce settings
  private readonly TYPING_DEBOUNCE = 500 // ms
  private readonly ANALYSIS_DEBOUNCE = 2000 // ms
  private readonly MIN_CONTENT_LENGTH = 50 // characters

  async analyzeTextAsUserTypes(
    sessionId: string,
    content: string,
    cursorPosition: number,
    onSuggestions: (suggestions: RealTimeSuggestion[]) => void
  ): Promise<void> {
    // Clear existing timeout
    const existingTimeout = this.analysisTimeouts.get(sessionId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Store callback
    this.suggestionCallbacks.set(sessionId, onSuggestions)

    // Skip analysis for very short content
    if (content.length < this.MIN_CONTENT_LENGTH) {
      return
    }

    // Check if content has changed significantly
    const lastAnalysis = this.lastAnalysis.get(sessionId)
    if (lastAnalysis && this.calculateContentSimilarity(lastAnalysis.content, content) > 0.95) {
      return // Content hasn't changed enough
    }

    // Set debounced analysis
    const timeout = setTimeout(async () => {
      try {
        await this.performRealTimeAnalysis(sessionId, content, cursorPosition)
        this.lastAnalysis.set(sessionId, { content, timestamp: Date.now() })
      } catch (error) {
        console.error('Real-time analysis failed:', error)
      }
    }, this.ANALYSIS_DEBOUNCE)

    this.analysisTimeouts.set(sessionId, timeout)
  }

  private async performRealTimeAnalysis(
    sessionId: string,
    content: string,
    cursorPosition: number
  ): Promise<void> {
    // Get context around cursor (500 characters before and after)
    const contextStart = Math.max(0, cursorPosition - 500)
    const contextEnd = Math.min(content.length, cursorPosition + 500)
    const contextText = content.substring(contextStart, contextEnd)

    // Check cache for similar context
    const cacheKey = analysisCache.generateKey(contextText, 'realtime_analysis')
    let cachedResult = analysisCache.get(cacheKey)

    if (!cachedResult) {
      // Perform multiple types of analysis in parallel
      const analyses = await Promise.allSettled([
        this.analyzeGrammarAndStyle(contextText),
        this.analyzeCharacterVoice(contextText),
        this.analyzePacing(contextText),
        this.analyzeDialogue(contextText)
      ])

      cachedResult = this.consolidateAnalysisResults(analyses, contextStart)
      
      // Cache with shorter TTL for real-time results
      analysisCache.set(cacheKey, cachedResult, 10 * 60 * 1000) // 10 minutes
    }

    const suggestions = this.convertToSuggestions(cachedResult, contextStart)
    const callback = this.suggestionCallbacks.get(sessionId)
    callback?.(suggestions)
  }

  private async analyzeGrammarAndStyle(text: string): Promise<AnalysisResult> {
    const prompt = `Analyze this text for grammar, style, and clarity issues. Be concise and specific:

${text}

Provide feedback in JSON format:
{
  "issues": [
    {
      "type": "grammar|style|clarity",
      "severity": "info|warning|error", 
      "position": {"start": 0, "end": 10},
      "message": "Brief description",
      "suggestion": "Specific fix"
    }
  ]
}`

    return await llmManager.processLargeManuscript(text, 'style-analysis')
  }

  private async analyzeCharacterVoice(text: string): Promise<AnalysisResult> {
    const prompt = `Analyze character dialogue and narrative voice in this text:

${text}

Look for:
- Voice consistency
- Character distinction in dialogue
- Narrative voice strength`

    return await llmManager.processLargeManuscript(text, 'character-development')
  }

  private async analyzePacing(text: string): Promise<AnalysisResult> {
    const prompt = `Analyze the pacing of this text segment:

${text}

Look for:
- Sentence rhythm variation
- Paragraph flow
- Information density`

    return await llmManager.processLargeManuscript(text, 'pacing-analysis')
  }

  private async analyzeDialogue(text: string): Promise<AnalysisResult> {
    if (!text.includes('"') && !text.includes("'")) {
      return {
        id: 'no-dialogue',
        type: 'dialogue',
        content: { issues: [] },
        confidence: 1,
        processingTime: 0,
        model: 'skip',
        provider: 'skip',
        timestamp: Date.now()
      }
    }

    const prompt = `Analyze the dialogue in this text:

${text}

Check for:
- Natural speech patterns
- Character voice distinction
- Dialogue tags effectiveness
- Balance of dialogue vs narrative`

    return await llmManager.processLargeManuscript(text, 'dialogue-analysis')
  }

  private consolidateAnalysisResults(
    analyses: PromiseSettledResult<AnalysisResult>[],
    contextStart: number
  ): any {
    const consolidated = {
      suggestions: [] as any[],
      patterns: [] as any[],
      overallScore: 0
    }

    let successfulAnalyses = 0
    let totalScore = 0

    for (const result of analyses) {
      if (result.status === 'fulfilled' && result.value.content) {
        const analysis = result.value.content
        
        if (analysis.issues) {
          consolidated.suggestions.push(...analysis.issues)
        }
        
        if (analysis.score) {
          totalScore += analysis.score
          successfulAnalyses++
        }
      }
    }

    consolidated.overallScore = successfulAnalyses > 0 ? totalScore / successfulAnalyses : 0

    return consolidated
  }

  private convertToSuggestions(
    analysisResult: any,
    contextStart: number
  ): RealTimeSuggestion[] {
    const suggestions: RealTimeSuggestion[] = []

    if (analysisResult.suggestions) {
      for (const issue of analysisResult.suggestions) {
        suggestions.push({
          id: `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: issue.type || 'style',
          severity: issue.severity || 'info',
          position: {
            start: contextStart + (issue.position?.start || 0),
            end: contextStart + (issue.position?.end || 0)
          },
          message: issue.message || 'Suggestion available',
          suggestion: issue.suggestion || 'Consider revising this section',
          confidence: issue.confidence || 0.8,
          timestamp: Date.now()
        })
      }
    }

    return suggestions
  }

  // Track writing patterns and productivity
  startWritingSession(sessionId: string): void {
    const pattern: WritingPattern = {
      sessionId,
      startTime: Date.now(),
      totalWords: 0,
      wordsPerMinute: 0,
      pausePatterns: [],
      revisionRatio: 0,
      focusAreas: [],
      productivityScore: 0
    }

    this.writingPatterns.set(sessionId, pattern)
  }

  updateWritingPattern(
    sessionId: string,
    currentWordCount: number,
    timeSinceLastKeypress: number
  ): void {
    const pattern = this.writingPatterns.get(sessionId)
    if (!pattern) return

    const now = Date.now()
    const sessionDuration = now - pattern.startTime
    
    // Update words per minute
    pattern.totalWords = currentWordCount
    pattern.wordsPerMinute = (currentWordCount / sessionDuration) * 60 * 1000

    // Track pause patterns
    if (timeSinceLastKeypress > 5000) { // 5 second pause
      pattern.pausePatterns.push(timeSinceLastKeypress)
    }

    // Calculate productivity score
    pattern.productivityScore = this.calculateProductivityScore(pattern)
  }

  endWritingSession(sessionId: string): WritingPattern | undefined {
    const pattern = this.writingPatterns.get(sessionId)
    if (!pattern) return undefined

    pattern.endTime = Date.now()
    this.writingPatterns.delete(sessionId)

    // Clean up related data
    this.analysisTimeouts.delete(sessionId)
    this.suggestionCallbacks.delete(sessionId)
    this.lastAnalysis.delete(sessionId)

    return pattern
  }

  getWritingInsights(sessionId: string): {
    currentWPM: number
    averagePauseTime: number
    focusLevel: number
    suggestions: string[]
  } {
    const pattern = this.writingPatterns.get(sessionId)
    if (!pattern) {
      return {
        currentWPM: 0,
        averagePauseTime: 0,
        focusLevel: 0,
        suggestions: []
      }
    }

    const avgPauseTime = pattern.pausePatterns.length > 0
      ? pattern.pausePatterns.reduce((a, b) => a + b) / pattern.pausePatterns.length
      : 0

    const focusLevel = this.calculateFocusLevel(pattern)

    return {
      currentWPM: Math.round(pattern.wordsPerMinute),
      averagePauseTime: Math.round(avgPauseTime / 1000), // Convert to seconds
      focusLevel,
      suggestions: this.generateProductivitySuggestions(pattern)
    }
  }

  // Inline text completion and suggestions
  async getInlineCompletions(
    text: string,
    cursorPosition: number,
    maxSuggestions: number = 3
  ): Promise<InlineSuggestion[]> {
    // Get context before cursor
    const contextLength = 200
    const contextStart = Math.max(0, cursorPosition - contextLength)
    const context = text.substring(contextStart, cursorPosition)
    
    // Don't suggest for very short context
    if (context.trim().length < 10) {
      return []
    }

    try {
      const prompt = `Complete this text naturally. Provide ${maxSuggestions} different completions:

${context}

Continue with just the next few words (2-10 words maximum per completion).`

      const result = await llmManager.processLargeManuscript(context, 'text-completion')
      
      return this.parseCompletionSuggestions(result, cursorPosition, maxSuggestions)
    } catch (error) {
      console.error('Inline completion failed:', error)
      return []
    }
  }

  private parseCompletionSuggestions(
    result: AnalysisResult,
    position: number,
    maxSuggestions: number
  ): InlineSuggestion[] {
    const suggestions: InlineSuggestion[] = []
    
    // Parse completions from result
    if (result.content?.completions) {
      for (let i = 0; i < Math.min(result.content.completions.length, maxSuggestions); i++) {
        const completion = result.content.completions[i]
        suggestions.push({
          id: `completion_${Date.now()}_${i}`,
          text: completion.text || '',
          position,
          type: 'completion',
          confidence: completion.confidence || 0.8
        })
      }
    }

    return suggestions
  }

  // Helper methods
  private calculateContentSimilarity(content1: string, content2: string): number {
    // Simple similarity calculation based on character diff
    const maxLength = Math.max(content1.length, content2.length)
    if (maxLength === 0) return 1
    
    let commonChars = 0
    const minLength = Math.min(content1.length, content2.length)
    
    for (let i = 0; i < minLength; i++) {
      if (content1[i] === content2[i]) {
        commonChars++
      } else {
        break
      }
    }
    
    return commonChars / maxLength
  }

  private calculateProductivityScore(pattern: WritingPattern): number {
    const baseScore = Math.min(pattern.wordsPerMinute / 30, 1) * 100 // 30 WPM = 100 score
    
    // Adjust for pause patterns (frequent long pauses reduce score)
    const longPauses = pattern.pausePatterns.filter(p => p > 10000).length
    const pausePenalty = longPauses * 5
    
    return Math.max(0, Math.round(baseScore - pausePenalty))
  }

  private calculateFocusLevel(pattern: WritingPattern): number {
    // Focus based on consistency of writing pace and pause patterns
    if (pattern.pausePatterns.length === 0) return 100
    
    const avgPause = pattern.pausePatterns.reduce((a, b) => a + b) / pattern.pausePatterns.length
    const maxPause = Math.max(...pattern.pausePatterns)
    
    // Lower variance in pauses = higher focus
    const variance = pattern.pausePatterns.reduce((acc, pause) => {
      return acc + Math.pow(pause - avgPause, 2)
    }, 0) / pattern.pausePatterns.length
    
    const focusScore = Math.max(0, 100 - (Math.sqrt(variance) / 1000))
    return Math.round(focusScore)
  }

  private generateProductivitySuggestions(pattern: WritingPattern): string[] {
    const suggestions: string[] = []
    
    if (pattern.wordsPerMinute < 15) {
      suggestions.push('Consider using voice-to-text for faster drafting')
    }
    
    if (pattern.pausePatterns.filter(p => p > 30000).length > 3) {
      suggestions.push('Take a short break to maintain focus')
    }
    
    if (pattern.wordsPerMinute > 50) {
      suggestions.push('Great pace! Consider periodic saves to preserve progress')
    }
    
    return suggestions
  }

  // Clean up resources
  cleanup(): void {
    // Clear all timeouts
    for (const timeout of this.analysisTimeouts.values()) {
      clearTimeout(timeout)
    }
    
    // Clear all maps
    this.analysisTimeouts.clear()
    this.suggestionCallbacks.clear()
    this.writingPatterns.clear()
    this.lastAnalysis.clear()
  }
}

export const realTimeAnalyzer = new RealTimeAnalyzer()
export default realTimeAnalyzer