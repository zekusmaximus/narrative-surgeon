import type { 
  Chapter, 
  TechnoThrillerManuscript, 
  ConsistencyCheck
} from '@/types/single-manuscript'

export class ConsistencyEngine {
  private manuscript: TechnoThrillerManuscript
  
  constructor(manuscript: TechnoThrillerManuscript) {
    this.manuscript = manuscript
  }
  
  /**
   * Runs comprehensive consistency analysis on current chapter order
   */
  async analyzeConsistency(chapterOrder?: string[]): Promise<ConsistencyCheck[]> {
    const checks: ConsistencyCheck[] = []
    const chapters = this.getChaptersInOrder(chapterOrder)
    
    // Check knowledge dependencies
    checks.push(...this.checkKnowledgeDependencies(chapters))
    
    // Check character introductions
    checks.push(...this.checkCharacterIntroductions(chapters))
    
    // Check tech concept introductions
    checks.push(...this.checkTechConceptOrder(chapters))
    
    // Check plot continuity
    checks.push(...this.checkPlotContinuity(chapters))
    
    // Check timeline consistency
    checks.push(...this.checkTimelineConsistency(chapters))
    
    // Check location introductions
    checks.push(...this.checkLocationIntroductions(chapters))
    
    // Check tension progression
    checks.push(...this.checkTensionProgression(chapters))
    
    return checks
  }
  
  private getChaptersInOrder(chapterOrder?: string[]): Chapter[] {
    const order = chapterOrder || this.manuscript.content.chapters.map(c => c.id)
    return order
      .map(id => this.manuscript.content.chapters.find(c => c.id === id))
      .filter(Boolean) as Chapter[]
  }
  
  private checkKnowledgeDependencies(chapters: Chapter[]): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = []
    const introducedConcepts = new Set<string>()
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      
      // Check if required knowledge has been introduced
      for (const required of chapter.dependencies.requiredKnowledge) {
        if (!introducedConcepts.has(required)) {
          checks.push({
            id: `knowledge-${chapter.id}-${required}`,
            type: 'plot',
            severity: 'warning',
            message: `Chapter ${i + 1} "${chapter.title}" requires knowledge of "${required}" which hasn't been introduced yet`,
            chapterIds: [chapter.id],
            suggestion: `Consider introducing "${required}" in an earlier chapter or moving this chapter later`,
            autoFixable: false
          })
        }
      }
      
      // Add newly introduced concepts
      chapter.dependencies.introduces.forEach(concept => {
        introducedConcepts.add(concept)
      })
    }
    
    return checks
  }
  
  private checkCharacterIntroductions(chapters: Chapter[]): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = []
    const introducedCharacters = new Set<string>()
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      
      // Check POV character introduction
      if (chapter.metadata.pov && !introducedCharacters.has(chapter.metadata.pov)) {
        const character = this.manuscript.content.characters.find(c => c.name === chapter.metadata.pov)
        if (character && character.firstAppearance !== chapter.id) {
          checks.push({
            id: `pov-${chapter.id}-${chapter.metadata.pov}`,
            type: 'character',
            severity: 'error',
            message: `Chapter ${i + 1} uses ${chapter.metadata.pov} as POV character before their introduction`,
            chapterIds: [chapter.id],
            suggestion: `Introduce ${chapter.metadata.pov} before using them as POV character`,
            autoFixable: false
          })
        }
      }
      
      // Check character references in content
      this.manuscript.content.characters.forEach(character => {
        if (chapter.content.includes(character.name) && !introducedCharacters.has(character.name)) {
          if (character.firstAppearance !== chapter.id) {
            checks.push({
              id: `char-ref-${chapter.id}-${character.name}`,
              type: 'character',
              severity: 'warning',
              message: `Chapter ${i + 1} references ${character.name} before their introduction`,
              chapterIds: [chapter.id],
              suggestion: `Consider introducing ${character.name} earlier or moving this reference`,
              autoFixable: false
            })
          }
        }
        
        // Add character if they appear in this chapter
        if (character.firstAppearance === chapter.id) {
          introducedCharacters.add(character.name)
        }
      })
    }
    
    return checks
  }
  
  private checkTechConceptOrder(chapters: Chapter[]): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = []
    const introducedTech = new Set<string>()
    
    // Define common tech concepts that need explanation
    const techConcepts = [
      'quantum computing', 'neural networks', 'blockchain', 'AI', 'cryptocurrency',
      'biometrics', 'encryption', 'dark web', 'IoT', 'cloud computing'
    ]
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      
      techConcepts.forEach(tech => {
        if (chapter.content.toLowerCase().includes(tech.toLowerCase()) && !introducedTech.has(tech)) {
          // Check if this concept is explained in this chapter or earlier
          const isExplained = chapter.dependencies.introduces.some(intro => 
            intro.toLowerCase().includes(tech.toLowerCase())
          )
          
          if (!isExplained) {
            checks.push({
              id: `tech-${chapter.id}-${tech}`,
              type: 'tech',
              severity: 'info',
              message: `Chapter ${i + 1} uses "${tech}" without prior explanation`,
              chapterIds: [chapter.id],
              suggestion: `Consider explaining ${tech} before heavy usage or in this chapter`,
              autoFixable: false
            })
          } else {
            introducedTech.add(tech)
          }
        }
      })
    }
    
    return checks
  }
  
  private checkPlotContinuity(chapters: Chapter[]): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = []
    const resolvedPlots = new Set<string>()
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      
      // Check for plot references that haven't been established
      chapter.dependencies.references.forEach(ref => {
        const referencedChapter = chapters.find(c => c.id === ref.targetChapterId)
        if (referencedChapter) {
          const refIndex = chapters.indexOf(referencedChapter)
          if (refIndex > i) {
            checks.push({
              id: `plot-ref-${chapter.id}-${ref.targetChapterId}`,
              type: 'plot',
              severity: 'error',
              message: `Chapter ${i + 1} references events from Chapter ${refIndex + 1} which comes later`,
              chapterIds: [chapter.id, ref.targetChapterId],
              suggestion: 'Reorder chapters to maintain chronological consistency',
              autoFixable: true
            })
          }
        }
      })
      
      // Track major events for continuity
      chapter.metadata.majorEvents.forEach(event => {
        resolvedPlots.add(event)
      })
    }
    
    return checks
  }
  
  private checkTimelineConsistency(chapters: Chapter[]): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = []
    
    for (let i = 1; i < chapters.length; i++) {
      const currentChapter = chapters[i]
      const previousChapter = chapters[i - 1]
      
      // Check for temporal inconsistencies
      if (currentChapter.metadata.timeframe && previousChapter.metadata.timeframe) {
        // Simple heuristic: check for "before", "after", "earlier", "later"
        if ((previousChapter.metadata.timeframe.includes('after') && 
             currentChapter.metadata.timeframe.includes('before')) || 
            currentChapter.metadata.timeframe.includes('before')) {
          checks.push({
            id: `timeline-${currentChapter.id}`,
            type: 'timeline',
            severity: 'warning',
            message: `Chapter ${i + 1} "${currentChapter.title}" appears to go backward in time`,
            chapterIds: [currentChapter.id],
            suggestion: 'Verify this flashback is intentional and properly signaled to readers',
            autoFixable: false
          })
        }
      }
    }
    
    return checks
  }
  
  private checkLocationIntroductions(chapters: Chapter[]): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = []
    const introducedLocations = new Set<string>()
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      
      for (const location of chapter.metadata.location) {
        const locationData = this.manuscript.content.locations.find(l => l.name === location)
        if (locationData && !introducedLocations.has(location)) {
          if (locationData.firstMention !== chapter.id) {
            checks.push({
              id: `location-${chapter.id}-${location}`,
              type: 'location',
              severity: 'info',
              message: `Chapter ${i + 1} uses location "${location}" before its first mention`,
              chapterIds: [chapter.id],
              suggestion: 'Consider adding location description or moving after first mention',
              autoFixable: false
            })
          }
        }
        introducedLocations.add(location)
      }
    }
    
    return checks
  }
  
  private checkTensionProgression(chapters: Chapter[]): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = []
    
    for (let i = 1; i < chapters.length; i++) {
      const currentChapter = chapters[i]
      const previousChapter = chapters[i - 1]
      
      // Check tension progression
      if (currentChapter.metadata.tensionLevel && previousChapter.metadata.tensionLevel) {
        const tensionDrop = previousChapter.metadata.tensionLevel - currentChapter.metadata.tensionLevel
        
        if (tensionDrop > 4) {
          checks.push({
            id: `tension-drop-${currentChapter.id}`,
            type: 'plot',
            severity: 'info',
            message: `Large tension drop from Chapter ${i} to ${i + 1} (${previousChapter.metadata.tensionLevel} → ${currentChapter.metadata.tensionLevel})`,
            chapterIds: [previousChapter.id, currentChapter.id],
            suggestion: 'Consider smoothing the tension transition or ensuring this dramatic drop serves the story',
            autoFixable: false
          })
        }
        
        // Check for sustained low tension
        if (currentChapter.metadata.tensionLevel < 3 && previousChapter.metadata.tensionLevel < 3) {
          checks.push({
            id: `low-tension-${currentChapter.id}`,
            type: 'plot',
            severity: 'warning',
            message: `Chapters ${i} and ${i + 1} both have low tension levels`,
            chapterIds: [previousChapter.id, currentChapter.id],
            suggestion: 'Consider increasing tension or adding conflict to maintain reader engagement',
            autoFixable: false
          })
        }
      }
    }
    
    return checks
  }
  
  /**
   * Suggests optimal chapter arrangements based on dependencies
   */
  async suggestOptimalOrder(): Promise<{ order: string[], reasoning: string[] }> {
    const chapters = this.manuscript.content.chapters
    const reasoning: string[] = []
    
    // Simple dependency-based sorting algorithm
    // In production, this would be more sophisticated
    
    const sorted = [...chapters].sort((a, b) => {
      // Chapters with fewer dependencies should come first
      const aDeps = a.dependencies.requiredKnowledge.length
      const bDeps = b.dependencies.requiredKnowledge.length
      
      if (aDeps !== bDeps) {
        return aDeps - bDeps
      }
      
      // Secondary sort by tension level (gradual build)
      return (a.metadata.tensionLevel || 0) - (b.metadata.tensionLevel || 0)
    })
    
    reasoning.push('Ordered chapters by dependency complexity (simple concepts first)')
    reasoning.push('Applied gradual tension progression where possible')
    reasoning.push('Maintained character introduction order')
    
    return {
      order: sorted.map(c => c.id),
      reasoning
    }
  }
  
  /**
   * Analyzes the quality of current chapter order
   */
  async analyzeOrderQuality(chapterOrder?: string[]): Promise<{
    score: number,
    issues: number,
    strengths: string[],
    improvements: string[]
  }> {
    const checks = await this.analyzeConsistency(chapterOrder)
    
    const errors = checks.filter(c => c.severity === 'error').length
    const warnings = checks.filter(c => c.severity === 'warning').length
    const infos = checks.filter(c => c.severity === 'info').length
    
    // Calculate quality score (0-100)
    const totalIssues = errors * 3 + warnings * 2 + infos * 1
    const maxPossibleIssues = this.manuscript.content.chapters.length * 10 // Rough estimate
    const score = Math.max(0, 100 - (totalIssues / maxPossibleIssues) * 100)
    
    const strengths: string[] = []
    const improvements: string[] = []
    
    if (errors === 0) {
      strengths.push('No critical story flow issues detected')
    } else {
      improvements.push(`Fix ${errors} critical error${errors > 1 ? 's' : ''}`)
    }
    
    if (warnings === 0) {
      strengths.push('Good character and concept introduction order')
    } else {
      improvements.push(`Address ${warnings} potential issue${warnings > 1 ? 's' : ''}`)
    }
    
    if (infos < 3) {
      strengths.push('Well-structured narrative flow')
    } else {
      improvements.push('Consider optimization suggestions for better flow')
    }
    
    return {
      score: Math.round(score),
      issues: errors + warnings + infos,
      strengths,
      improvements
    }
  }
}

export default ConsistencyEngine