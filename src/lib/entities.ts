/**
 * Entity Extraction Library
 * Advanced algorithms for extracting narrative elements from text
 */

export interface Character {
  name: string
  aliases: string[]
  mentions: number
  sentiment: 'positive' | 'negative' | 'neutral'
  relationships: string[]
  firstMention: number
  lastMention: number
}

export interface Location {
  name: string
  type: 'indoor' | 'outdoor' | 'vehicle' | 'abstract'
  mentions: number
  significance: 'major' | 'minor' | 'background'
  firstMention: number
  lastMention: number
}

export interface TechElement {
  name: string
  category: 'hardware' | 'software' | 'theory' | 'process'
  complexity: 'simple' | 'moderate' | 'complex'
  accuracy: 'realistic' | 'speculative' | 'fictional'
  mentions: number
  firstMention: number
  lastMention: number
}

export interface PlotPoint {
  type: 'setup' | 'inciting_incident' | 'plot_point_1' | 'midpoint' | 'plot_point_2' | 'climax' | 'resolution'
  description: string
  position: number
  importance: 'critical' | 'important' | 'minor'
  consequences: string[]
}

export interface EmotionalBeat {
  emotion: string
  intensity: number // 1-10
  character: string
  trigger: string
  position: number
  duration: 'brief' | 'sustained' | 'arc'
}

export class EntityExtractor {
  private characterPatterns: RegExp[]
  private locationPatterns: RegExp[]
  private techPatterns: RegExp[]
  private emotionPatterns: RegExp[]

  constructor() {
    this.initializePatterns()
  }

  private initializePatterns(): void {
    // Character name patterns (capitalized words, titles, pronouns)
    this.characterPatterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Full names
      /\b(?:Dr|Professor|Agent|Detective|Mr|Ms|Mrs)\.?\s+[A-Z][a-z]+/g, // Titles
      /\b[A-Z][a-z]+(?:'s|s')\b/g // Possessive names
    ]

    // Location patterns
    this.locationPatterns = [
      /\b(?:the\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Lab|Laboratory|Building|Office|Room|Street|Avenue|Hospital|University|Institute)\b/g,
      /\b(?:MIT|NSA|FBI|CIA|Pentagon|Silicon Valley|Wall Street)\b/g,
      /\bin\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
    ]

    // Technology patterns for techno-thrillers
    this.techPatterns = [
      /\b(?:quantum|neural|artificial|machine|deep)\s+(?:computing|network|intelligence|learning|algorithm)\b/gi,
      /\b(?:blockchain|cryptocurrency|encryption|cybersecurity|malware|virus|trojan|ransomware)\b/gi,
      /\b(?:DNA|CRISPR|genome|biometric|satellite|drone|robot|android|cyborg)\b/gi,
      /\b(?:algorithm|protocol|firewall|server|database|API|cloud|IoT|5G|6G)\b/gi
    ]

    // Emotion patterns
    this.emotionPatterns = [
      /\b(?:felt|feeling|was|seemed|appeared)\s+(?:anxious|nervous|terrified|excited|confused|angry|frustrated|relieved|hopeful|desperate)\b/gi,
      /\b(?:heart\s+(?:raced|pounded|sank)|stomach\s+(?:churned|dropped)|hands\s+(?:trembled|shook))/gi,
      /\b(?:adrenaline|fear|panic|dread|hope|joy|anger|rage|frustration|relief)\b/gi
    ]
  }

  /**
   * Extract all characters from text with advanced name recognition
   */
  extractCharacters(text: string): Character[] {
    const characterMap = new Map<string, Character>()
    const sentences = this.splitIntoSentences(text)

    sentences.forEach((sentence, index) => {
      this.characterPatterns.forEach(pattern => {
        const matches = sentence.match(pattern)
        if (matches) {
          matches.forEach(match => {
            const cleanName = this.cleanCharacterName(match)
            if (this.isValidCharacterName(cleanName)) {
              if (!characterMap.has(cleanName)) {
                characterMap.set(cleanName, {
                  name: cleanName,
                  aliases: [],
                  mentions: 0,
                  sentiment: 'neutral',
                  relationships: [],
                  firstMention: index,
                  lastMention: index
                })
              }
              
              const character = characterMap.get(cleanName)!
              character.mentions++
              character.lastMention = index
              character.sentiment = this.analyzeSentiment(sentence, cleanName)
            }
          })
        }
      })
    })

    // Post-process to identify aliases and relationships
    return this.postProcessCharacters(Array.from(characterMap.values()), sentences)
  }

  /**
   * Extract locations with type classification
   */
  extractLocations(text: string): Location[] {
    const locationMap = new Map<string, Location>()
    const sentences = this.splitIntoSentences(text)

    sentences.forEach((sentence, index) => {
      this.locationPatterns.forEach(pattern => {
        const matches = sentence.match(pattern)
        if (matches) {
          matches.forEach(match => {
            const cleanLocation = this.cleanLocationName(match)
            if (this.isValidLocation(cleanLocation)) {
              if (!locationMap.has(cleanLocation)) {
                locationMap.set(cleanLocation, {
                  name: cleanLocation,
                  type: this.classifyLocationType(cleanLocation, sentence),
                  mentions: 0,
                  significance: 'minor',
                  firstMention: index,
                  lastMention: index
                })
              }
              
              const location = locationMap.get(cleanLocation)!
              location.mentions++
              location.lastMention = index
            }
          })
        }
      })
    })

    return this.postProcessLocations(Array.from(locationMap.values()))
  }

  /**
   * Extract technology elements specific to techno-thrillers
   */
  extractTechElements(text: string): TechElement[] {
    const techMap = new Map<string, TechElement>()
    const sentences = this.splitIntoSentences(text)

    sentences.forEach((sentence, index) => {
      this.techPatterns.forEach(pattern => {
        const matches = sentence.match(pattern)
        if (matches) {
          matches.forEach(match => {
            const cleanTech = match.toLowerCase().trim()
            if (!techMap.has(cleanTech)) {
              techMap.set(cleanTech, {
                name: cleanTech,
                category: this.categorizeTech(cleanTech),
                complexity: this.assessTechComplexity(cleanTech, sentence),
                accuracy: this.assessTechAccuracy(cleanTech, sentence),
                mentions: 0,
                firstMention: index,
                lastMention: index
              })
            }
            
            const tech = techMap.get(cleanTech)!
            tech.mentions++
            tech.lastMention = index
          })
        }
      })
    })

    return Array.from(techMap.values()).sort((a, b) => b.mentions - a.mentions)
  }

  /**
   * Extract plot points using narrative structure analysis
   */
  extractPlotPoints(text: string): PlotPoint[] {
    const sentences = this.splitIntoSentences(text)
    const plotPoints: PlotPoint[] = []
    
    // Look for action verbs and significant events
    const actionPatterns = [
      /\b(?:discovered|found|realized|learned|uncovered|revealed)\b/gi,
      /\b(?:attacked|pursued|chased|escaped|confronted|fought)\b/gi,
      /\b(?:decided|chose|planned|plotted|schemed|betrayed)\b/gi,
      /\b(?:died|killed|murdered|assassinated|destroyed|exploded)\b/gi
    ]

    sentences.forEach((sentence, index) => {
      actionPatterns.forEach((pattern, patternIndex) => {
        if (pattern.test(sentence)) {
          const type = this.classifyPlotPointType(sentence, index, sentences.length)
          const importance = this.assessPlotImportance(sentence)
          
          plotPoints.push({
            type,
            description: sentence.trim(),
            position: index,
            importance,
            consequences: this.identifyConsequences(sentence, sentences, index)
          })
        }
      })
    })

    return plotPoints.sort((a, b) => a.position - b.position)
  }

  /**
   * Extract emotional beats and character development
   */
  extractEmotionalBeats(text: string): EmotionalBeat[] {
    const sentences = this.splitIntoSentences(text)
    const emotionalBeats: EmotionalBeat[] = []
    
    sentences.forEach((sentence, index) => {
      this.emotionPatterns.forEach(pattern => {
        const matches = sentence.match(pattern)
        if (matches) {
          matches.forEach(match => {
            const emotion = this.extractEmotionFromMatch(match)
            const intensity = this.assessEmotionalIntensity(sentence, emotion)
            const character = this.identifyEmotionalCharacter(sentence)
            const trigger = this.identifyEmotionalTrigger(sentence)
            
            if (emotion && character) {
              emotionalBeats.push({
                emotion,
                intensity,
                character,
                trigger,
                position: index,
                duration: this.assessEmotionalDuration(sentence, sentences, index)
              })
            }
          })
        }
      })
    })

    return emotionalBeats.sort((a, b) => a.position - b.position)
  }

  /**
   * Comprehensive entity extraction for a scene
   */
  extractAllEntities(text: string): {
    characters: Character[]
    locations: Location[]
    techElements: TechElement[]
    plotPoints: PlotPoint[]
    emotionalBeats: EmotionalBeat[]
    summary: {
      totalEntities: number
      primaryCharacters: string[]
      keyLocations: string[]
      majorTech: string[]
      climacticMoments: PlotPoint[]
    }
  } {
    const characters = this.extractCharacters(text)
    const locations = this.extractLocations(text)
    const techElements = this.extractTechElements(text)
    const plotPoints = this.extractPlotPoints(text)
    const emotionalBeats = this.extractEmotionalBeats(text)

    return {
      characters,
      locations,
      techElements,
      plotPoints,
      emotionalBeats,
      summary: {
        totalEntities: characters.length + locations.length + techElements.length,
        primaryCharacters: characters
          .filter(c => c.mentions >= 3)
          .map(c => c.name)
          .slice(0, 5),
        keyLocations: locations
          .filter(l => l.significance === 'major')
          .map(l => l.name)
          .slice(0, 3),
        majorTech: techElements
          .filter(t => t.mentions >= 2)
          .map(t => t.name)
          .slice(0, 5),
        climacticMoments: plotPoints
          .filter(p => p.importance === 'critical')
          .slice(0, 3)
      }
    }
  }

  // Helper methods
  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  }

  private cleanCharacterName(name: string): string {
    return name.replace(/['s|s']$/, '').replace(/^(?:Dr|Professor|Agent|Detective|Mr|Ms|Mrs)\.?\s+/, '').trim()
  }

  private cleanLocationName(location: string): string {
    return location.replace(/^in\s+(?:the\s+)?/i, '').trim()
  }

  private isValidCharacterName(name: string): boolean {
    return name.length >= 2 && 
           name.length <= 50 && 
           !/\b(?:the|and|or|but|in|on|at|to|for|of|with|by)\b/i.test(name) &&
           /^[A-Za-z\s'-]+$/.test(name)
  }

  private isValidLocation(location: string): boolean {
    return location.length >= 3 && location.length <= 100
  }

  private analyzeSentiment(sentence: string, character: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = /\b(?:smiled|laughed|succeeded|won|happy|joy|relief|triumph)\b/i
    const negativeWords = /\b(?:frowned|cried|failed|lost|angry|fear|panic|terror|died)\b/i
    
    if (positiveWords.test(sentence)) return 'positive'
    if (negativeWords.test(sentence)) return 'negative'
    return 'neutral'
  }

  private classifyLocationType(location: string, context: string): 'indoor' | 'outdoor' | 'vehicle' | 'abstract' {
    if (/\b(?:lab|office|room|building|hospital|institute)\b/i.test(location)) return 'indoor'
    if (/\b(?:street|park|city|country|mountain|ocean)\b/i.test(location)) return 'outdoor'
    if (/\b(?:car|plane|ship|train|bus|helicopter)\b/i.test(location)) return 'vehicle'
    return 'abstract'
  }

  private categorizeTech(tech: string): 'hardware' | 'software' | 'theory' | 'process' {
    if (/\b(?:computer|server|device|chip|sensor|drone|robot)\b/i.test(tech)) return 'hardware'
    if (/\b(?:algorithm|software|program|app|code|virus|malware)\b/i.test(tech)) return 'software'
    if (/\b(?:quantum|theory|principle|law|hypothesis)\b/i.test(tech)) return 'theory'
    return 'process'
  }

  private assessTechComplexity(tech: string, context: string): 'simple' | 'moderate' | 'complex' {
    if (/\b(?:quantum|neural|artificial|deep|advanced|sophisticated)\b/i.test(tech)) return 'complex'
    if (/\b(?:network|system|database|encryption|protocol)\b/i.test(tech)) return 'moderate'
    return 'simple'
  }

  private assessTechAccuracy(tech: string, context: string): 'realistic' | 'speculative' | 'fictional' {
    if (/\b(?:current|existing|available|proven|established)\b/i.test(context)) return 'realistic'
    if (/\b(?:experimental|theoretical|prototype|cutting-edge|breakthrough)\b/i.test(context)) return 'speculative'
    return 'fictional'
  }

  private classifyPlotPointType(sentence: string, position: number, totalSentences: number): PlotPoint['type'] {
    const relativePosition = position / totalSentences
    
    if (relativePosition < 0.1) return 'setup'
    if (relativePosition < 0.25) return 'inciting_incident'
    if (relativePosition < 0.5) return 'plot_point_1'
    if (relativePosition < 0.6) return 'midpoint'
    if (relativePosition < 0.8) return 'plot_point_2'
    if (relativePosition < 0.95) return 'climax'
    return 'resolution'
  }

  private assessPlotImportance(sentence: string): 'critical' | 'important' | 'minor' {
    if (/\b(?:died|killed|destroyed|discovered|revealed|betrayed)\b/i.test(sentence)) return 'critical'
    if (/\b(?:attacked|escaped|confronted|decided|realized)\b/i.test(sentence)) return 'important'
    return 'minor'
  }

  private identifyConsequences(sentence: string, allSentences: string[], position: number): string[] {
    // Look at following sentences for consequences
    const consequences: string[] = []
    const nextSentences = allSentences.slice(position + 1, position + 4)
    
    nextSentences.forEach(nextSentence => {
      if (/\b(?:because|as a result|consequently|therefore|this led to)\b/i.test(nextSentence)) {
        consequences.push(nextSentence.trim())
      }
    })
    
    return consequences
  }

  private extractEmotionFromMatch(match: string): string {
    const emotionMap: { [key: string]: string } = {
      'anxious': 'anxiety',
      'nervous': 'nervousness',
      'terrified': 'terror',
      'excited': 'excitement',
      'confused': 'confusion',
      'angry': 'anger',
      'frustrated': 'frustration',
      'relieved': 'relief',
      'hopeful': 'hope',
      'desperate': 'desperation'
    }
    
    for (const [key, emotion] of Object.entries(emotionMap)) {
      if (match.toLowerCase().includes(key)) {
        return emotion
      }
    }
    
    return match.toLowerCase()
  }

  private assessEmotionalIntensity(sentence: string, emotion: string): number {
    if (/\b(?:extremely|incredibly|utterly|completely|absolutely)\b/i.test(sentence)) return 10
    if (/\b(?:very|really|quite|deeply|intensely)\b/i.test(sentence)) return 8
    if (/\b(?:somewhat|rather|fairly|moderately)\b/i.test(sentence)) return 5
    if (/\b(?:slightly|barely|hardly|barely)\b/i.test(sentence)) return 2
    return 6 // default moderate intensity
  }

  private identifyEmotionalCharacter(sentence: string): string {
    const pronouns = /\b(?:he|she|they|I)\b/i
    const names = /\b[A-Z][a-z]+\b/g
    
    const nameMatches = sentence.match(names)
    if (nameMatches && nameMatches.length > 0) {
      return nameMatches[0]
    }
    
    if (pronouns.test(sentence)) {
      return 'protagonist' // fallback
    }
    
    return 'unknown'
  }

  private identifyEmotionalTrigger(sentence: string): string {
    const triggers = [
      'discovery', 'attack', 'betrayal', 'revelation', 'confrontation',
      'success', 'failure', 'loss', 'reunion', 'threat'
    ]
    
    for (const trigger of triggers) {
      if (sentence.toLowerCase().includes(trigger)) {
        return trigger
      }
    }
    
    return 'unknown'
  }

  private assessEmotionalDuration(sentence: string, allSentences: string[], position: number): 'brief' | 'sustained' | 'arc' {
    // Check if emotion continues in following sentences
    const emotion = this.extractEmotionFromMatch(sentence)
    let continuationCount = 0
    
    for (let i = position + 1; i < Math.min(position + 5, allSentences.length); i++) {
      if (allSentences[i].toLowerCase().includes(emotion)) {
        continuationCount++
      }
    }
    
    if (continuationCount >= 3) return 'arc'
    if (continuationCount >= 1) return 'sustained'
    return 'brief'
  }

  private postProcessCharacters(characters: Character[], sentences: string[]): Character[] {
    // Identify aliases and relationships
    characters.forEach(character => {
      character.relationships = this.findCharacterRelationships(character.name, characters, sentences)
      character.significance = character.mentions >= 5 ? 'major' : 'minor'
    })
    
    return characters.sort((a, b) => b.mentions - a.mentions)
  }

  private postProcessLocations(locations: Location[]): Location[] {
    locations.forEach(location => {
      location.significance = location.mentions >= 3 ? 'major' : 
                             location.mentions >= 2 ? 'minor' : 'background'
    })
    
    return locations.sort((a, b) => b.mentions - a.mentions)
  }

  private findCharacterRelationships(characterName: string, allCharacters: Character[], sentences: string[]): string[] {
    const relationships: string[] = []
    const relationshipWords = /\b(?:with|and|beside|alongside|against|versus|fought|helped|betrayed|loved|hated)\b/i
    
    sentences.forEach(sentence => {
      if (sentence.includes(characterName) && relationshipWords.test(sentence)) {
        allCharacters.forEach(other => {
          if (other.name !== characterName && sentence.includes(other.name)) {
            relationships.push(other.name)
          }
        })
      }
    })
    
    return [...new Set(relationships)]
  }
}

export default EntityExtractor