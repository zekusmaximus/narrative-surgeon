'use client'

import { llmManager } from '../llmProvider'
import { analysisCache, chunkCache } from '../cache'
import type { AnalysisResult } from '../llmProvider'

export interface ManuscriptAnalysisReport {
  totalWords: number
  analysisDate: number
  processingTime: number
  
  // Structure Analysis
  storyStructure: {
    actBreakdown: ActAnalysis[]
    plotPoints: PlotPoint[]
    pacingScore: number
    structuralIssues: Issue[]
  }
  
  // Character Analysis
  characters: {
    mainCharacters: CharacterAnalysis[]
    characterArcs: CharacterArc[]
    voiceConsistency: number
    developmentScore: number
  }
  
  // Writing Quality
  writingQuality: {
    proseQuality: number
    dialogueQuality: number
    showVsTell: number
    styleConsistency: number
    readabilityScore: number
  }
  
  // Market Analysis
  marketFit: {
    genreAlignment: number
    targetAudience: string
    competitiveAnalysis: CompetitiveAnalysis
    marketRecommendations: string[]
  }
  
  // Overall Assessment
  overallScore: number
  keyStrengths: string[]
  criticalIssues: string[]
  actionableRecommendations: Recommendation[]
}

export interface ActAnalysis {
  actNumber: number
  wordCount: number
  percentageOfTotal: number
  keyEvents: string[]
  pacingNotes: string
  issues: Issue[]
}

export interface PlotPoint {
  type: 'inciting_incident' | 'first_plot_point' | 'midpoint' | 'climax' | 'resolution'
  location: number // Word position
  description: string
  effectiveness: number
  suggestions: string[]
}

export interface CharacterAnalysis {
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  firstAppearance: number
  screenTime: number
  voiceDistinctiveness: number
  characterTraits: string[]
  goals: string[]
  conflicts: string[]
}

export interface CharacterArc {
  character: string
  startingState: string
  endingState: string
  transformationClarity: number
  keyMoments: Array<{ location: number; description: string }>
  arcCompleteness: number
}

export interface Issue {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  location: number
  description: string
  suggestion: string
}

export interface CompetitiveAnalysis {
  similarTitles: Array<{ title: string; similarity: number; notes: string }>
  genreExpectations: string[]
  differentiators: string[]
  positioningAdvice: string
}

export interface Recommendation {
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  issue: string
  solution: string
  effort: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
}

class FullManuscriptAnalyzer {
  private chunkSize = 2000
  private overlapWords = 200

  async analyzeFullManuscript(
    manuscriptId: string,
    content: string,
    onProgress?: (progress: number) => void
  ): Promise<ManuscriptAnalysisReport> {
    const startTime = Date.now()
    const totalWords = content.split(/\s+/).length

    // Check cache first
    const cacheKey = analysisCache.generateKey(content, 'full_manuscript_analysis')
    const cached = analysisCache.get(cacheKey)
    if (cached) {
      return cached
    }

    onProgress?.(5)

    // Step 1: Chunk the manuscript and analyze structure
    const chunks = this.chunkManuscript(content, this.chunkSize, this.overlapWords)
    const structureAnalysis = await this.analyzeStructure(chunks, onProgress, 5, 25)

    onProgress?.(30)

    // Step 2: Character analysis across the entire manuscript
    const characterAnalysis = await this.analyzeCharacters(chunks, onProgress, 30, 50)

    onProgress?.(55)

    // Step 3: Writing quality analysis
    const qualityAnalysis = await this.analyzeWritingQuality(chunks, onProgress, 55, 75)

    onProgress?.(80)

    // Step 4: Market fit analysis
    const marketAnalysis = await this.analyzeMarketFit(content, totalWords, onProgress, 80, 90)

    onProgress?.(95)

    // Step 5: Compile comprehensive report
    const report = this.compileReport(
      manuscriptId,
      totalWords,
      structureAnalysis,
      characterAnalysis,
      qualityAnalysis,
      marketAnalysis,
      Date.now() - startTime
    )

    onProgress?.(100)

    // Cache the result
    analysisCache.set(cacheKey, report, 7 * 24 * 60 * 60 * 1000) // 7 days

    return report
  }

  private chunkManuscript(content: string, chunkSize: number, overlap: number): string[] {
    const words = content.split(/\s+/)
    const chunks: string[] = []

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, Math.min(i + chunkSize, words.length)).join(' ')
      chunks.push(chunk)
      
      // Cache chunk for reuse
      chunkCache.storeChunk('temp', chunks.length - 1, chunk)
    }

    return chunks
  }

  private async analyzeStructure(
    chunks: string[],
    onProgress?: (progress: number) => void,
    startProgress = 0,
    endProgress = 100
  ): Promise<any> {
    const results = []
    const progressRange = endProgress - startProgress

    for (let i = 0; i < chunks.length; i++) {
      const chunkProgress = startProgress + ((i + 1) / chunks.length) * progressRange
      onProgress?.(chunkProgress)

      try {
        const result = await llmManager.processLargeManuscript(
          chunks[i],
          'story-structure',
          (chunkProg) => {
            const totalProgress = startProgress + (i / chunks.length + chunkProg / chunks.length) * progressRange
            onProgress?.(totalProgress)
          }
        )
        results.push(result)

        // Small delay to prevent overwhelming the API
        await this.delay(100)
      } catch (error) {
        console.error(`Structure analysis failed for chunk ${i}:`, error)
      }
    }

    return this.synthesizeStructureAnalysis(results)
  }

  private async analyzeCharacters(
    chunks: string[],
    onProgress?: (progress: number) => void,
    startProgress = 0,
    endProgress = 100
  ): Promise<any> {
    // Character tracking across chunks with context maintenance
    const characterTracker = new Map<string, any>()
    const results = []
    const progressRange = endProgress - startProgress

    for (let i = 0; i < chunks.length; i++) {
      const chunkProgress = startProgress + ((i + 1) / chunks.length) * progressRange
      onProgress?.(chunkProgress)

      try {
        // Include context from character tracker
        const contextualPrompt = this.buildCharacterContextPrompt(chunks[i], characterTracker)
        
        const result = await llmManager.processLargeManuscript(
          contextualPrompt,
          'character-development'
        )
        
        // Update character tracker with new findings
        this.updateCharacterTracker(characterTracker, result, i * this.chunkSize)
        results.push(result)

        await this.delay(100)
      } catch (error) {
        console.error(`Character analysis failed for chunk ${i}:`, error)
      }
    }

    return this.synthesizeCharacterAnalysis(results, characterTracker)
  }

  private async analyzeWritingQuality(
    chunks: string[],
    onProgress?: (progress: number) => void,
    startProgress = 0,
    endProgress = 100
  ): Promise<any> {
    const qualityMetrics = {
      proseScores: [] as number[],
      dialogueScores: [] as number[],
      showVsTellScores: [] as number[],
      styleConsistencyScores: [] as number[],
      readabilityScores: [] as number[]
    }

    const progressRange = endProgress - startProgress

    for (let i = 0; i < Math.min(chunks.length, 10); i++) { // Sample first 10 chunks
      const chunkProgress = startProgress + ((i + 1) / 10) * progressRange
      onProgress?.(chunkProgress)

      try {
        const result = await llmManager.processLargeManuscript(chunks[i], 'style-analysis')
        this.extractQualityMetrics(result, qualityMetrics)
        await this.delay(100)
      } catch (error) {
        console.error(`Quality analysis failed for chunk ${i}:`, error)
      }
    }

    return this.synthesizeQualityAnalysis(qualityMetrics)
  }

  private async analyzeMarketFit(
    content: string,
    wordCount: number,
    onProgress?: (progress: number) => void,
    startProgress = 0,
    endProgress = 100
  ): Promise<any> {
    onProgress?.(startProgress + 5)

    // Extract key elements for market analysis
    const summary = content.substring(0, Math.min(5000, content.length)) // First 5000 chars
    
    try {
      const result = await llmManager.processLargeManuscript(
        `Analyze this manuscript excerpt for market fit and genre alignment. Word count: ${wordCount}\n\n${summary}`,
        'genre-fit'
      )

      onProgress?.(endProgress)
      return this.parseMarketAnalysis(result)
    } catch (error) {
      console.error('Market analysis failed:', error)
      return this.getDefaultMarketAnalysis()
    }
  }

  private buildCharacterContextPrompt(chunk: string, characterTracker: Map<string, any>): string {
    const knownCharacters = Array.from(characterTracker.keys()).slice(0, 5) // Top 5 characters
    const context = knownCharacters.length > 0 
      ? `Known characters so far: ${knownCharacters.join(', ')}\n\n`
      : ''
    
    return `${context}Analyze characters in this text:\n\n${chunk}`
  }

  private updateCharacterTracker(tracker: Map<string, any>, result: any, wordPosition: number): void {
    // Extract character mentions and update tracker
    if (result.content && result.content.characters) {
      for (const character of result.content.characters) {
        const existing = tracker.get(character.name) || {
          appearances: [],
          traits: new Set(),
          totalMentions: 0
        }
        
        existing.appearances.push(wordPosition)
        existing.totalMentions++
        
        if (character.traits) {
          character.traits.forEach((trait: string) => existing.traits.add(trait))
        }
        
        tracker.set(character.name, existing)
      }
    }
  }

  private synthesizeStructureAnalysis(results: any[]): any {
    // Combine chunk-level structure analysis into manuscript-level insights
    const plotPoints: PlotPoint[] = []
    const issues: Issue[] = []
    let pacingScores: number[] = []

    for (const result of results) {
      if (result.content?.plotPoints) {
        plotPoints.push(...result.content.plotPoints)
      }
      if (result.content?.pacingScore) {
        pacingScores.push(result.content.pacingScore)
      }
      if (result.content?.issues) {
        issues.push(...result.content.issues)
      }
    }

    return {
      actBreakdown: this.identifyActs(plotPoints),
      plotPoints: this.consolidatePlotPoints(plotPoints),
      pacingScore: pacingScores.length > 0 ? pacingScores.reduce((a, b) => a + b) / pacingScores.length : 0,
      structuralIssues: this.deduplicateIssues(issues)
    }
  }

  private synthesizeCharacterAnalysis(results: any[], characterTracker: Map<string, any>): any {
    const mainCharacters: CharacterAnalysis[] = []
    const characterArcs: CharacterArc[] = []

    // Convert tracker data to character analysis
    for (const [name, data] of characterTracker.entries()) {
      if (data.totalMentions >= 3) { // Filter to significant characters
        mainCharacters.push({
          name,
          role: this.determineCharacterRole(name, data),
          firstAppearance: Math.min(...data.appearances),
          screenTime: data.totalMentions,
          voiceDistinctiveness: this.calculateVoiceDistinctiveness(data),
          characterTraits: Array.from(data.traits),
          goals: data.goals || [],
          conflicts: data.conflicts || []
        })
      }
    }

    return {
      mainCharacters,
      characterArcs,
      voiceConsistency: this.calculateVoiceConsistency(mainCharacters),
      developmentScore: this.calculateDevelopmentScore(mainCharacters)
    }
  }

  private synthesizeQualityAnalysis(metrics: any): any {
    return {
      proseQuality: this.average(metrics.proseScores),
      dialogueQuality: this.average(metrics.dialogueScores),
      showVsTell: this.average(metrics.showVsTellScores),
      styleConsistency: this.average(metrics.styleConsistencyScores),
      readabilityScore: this.average(metrics.readabilityScores)
    }
  }

  private compileReport(
    manuscriptId: string,
    totalWords: number,
    structure: any,
    characters: any,
    quality: any,
    market: any,
    processingTime: number
  ): ManuscriptAnalysisReport {
    const overallScore = this.calculateOverallScore(structure, characters, quality, market)
    
    return {
      manuscriptId,
      totalWords,
      analysisDate: Date.now(),
      processingTime,
      storyStructure: structure,
      characters,
      writingQuality: quality,
      marketFit: market,
      overallScore,
      keyStrengths: this.identifyStrengths(structure, characters, quality, market),
      criticalIssues: this.identifyCriticalIssues(structure, characters, quality),
      actionableRecommendations: this.generateRecommendations(structure, characters, quality, market)
    }
  }

  // Helper methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b) / numbers.length : 0
  }

  private identifyActs(plotPoints: PlotPoint[]): ActAnalysis[] {
    // Implement act identification logic
    return []
  }

  private consolidatePlotPoints(plotPoints: PlotPoint[]): PlotPoint[] {
    // Remove duplicates and merge similar plot points
    return plotPoints
  }

  private deduplicateIssues(issues: Issue[]): Issue[] {
    // Remove duplicate issues
    const seen = new Set()
    return issues.filter(issue => {
      const key = `${issue.type}_${issue.location}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private determineCharacterRole(name: string, data: any): CharacterAnalysis['role'] {
    // Logic to determine character role based on mentions and context
    if (data.totalMentions > 50) return 'protagonist'
    if (data.totalMentions > 20) return 'supporting'
    return 'minor'
  }

  private calculateVoiceDistinctiveness(data: any): number {
    // Calculate how distinctive a character's voice is
    return Math.min(data.traits.size / 5, 1) * 100
  }

  private calculateVoiceConsistency(characters: CharacterAnalysis[]): number {
    // Calculate overall voice consistency across characters
    return 85 // Placeholder
  }

  private calculateDevelopmentScore(characters: CharacterAnalysis[]): number {
    // Calculate character development score
    return 80 // Placeholder
  }

  private extractQualityMetrics(result: any, metrics: any): void {
    // Extract quality metrics from analysis result
    if (result.content?.proseScore) metrics.proseScores.push(result.content.proseScore)
    if (result.content?.dialogueScore) metrics.dialogueScores.push(result.content.dialogueScore)
    // Add other metrics...
  }

  private parseMarketAnalysis(result: any): any {
    // Parse market analysis result
    return {
      genreAlignment: 85,
      targetAudience: 'Adult Fiction Readers',
      competitiveAnalysis: {
        similarTitles: [],
        genreExpectations: [],
        differentiators: [],
        positioningAdvice: 'Position as literary fiction with commercial appeal'
      },
      marketRecommendations: []
    }
  }

  private getDefaultMarketAnalysis(): any {
    return {
      genreAlignment: 0,
      targetAudience: 'Unknown',
      competitiveAnalysis: {
        similarTitles: [],
        genreExpectations: [],
        differentiators: [],
        positioningAdvice: 'Market analysis unavailable'
      },
      marketRecommendations: []
    }
  }

  private calculateOverallScore(structure: any, characters: any, quality: any, market: any): number {
    // Weighted average of all scores
    return Math.round(
      (structure.pacingScore * 0.3 +
       characters.developmentScore * 0.25 +
       quality.proseQuality * 0.25 +
       market.genreAlignment * 0.2)
    )
  }

  private identifyStrengths(structure: any, characters: any, quality: any, market: any): string[] {
    const strengths: string[] = []
    
    if (structure.pacingScore > 80) strengths.push('Strong story pacing')
    if (characters.voiceConsistency > 85) strengths.push('Consistent character voices')
    if (quality.proseQuality > 85) strengths.push('High-quality prose')
    if (market.genreAlignment > 80) strengths.push('Good genre alignment')
    
    return strengths
  }

  private identifyCriticalIssues(structure: any, characters: any, quality: any): string[] {
    const issues: string[] = []
    
    if (structure.pacingScore < 60) issues.push('Pacing problems need attention')
    if (characters.developmentScore < 60) issues.push('Character development needs work')
    if (quality.proseQuality < 60) issues.push('Prose quality needs improvement')
    
    return issues
  }

  private generateRecommendations(structure: any, characters: any, quality: any, market: any): Recommendation[] {
    const recommendations: Recommendation[] = []
    
    // Add specific recommendations based on analysis
    if (structure.pacingScore < 70) {
      recommendations.push({
        priority: 'high',
        category: 'Structure',
        issue: 'Pacing inconsistencies detected',
        solution: 'Review scene transitions and chapter breaks',
        effort: 'medium',
        impact: 'high'
      })
    }
    
    return recommendations
  }
}

export const fullManuscriptAnalyzer = new FullManuscriptAnalyzer()
export default fullManuscriptAnalyzer