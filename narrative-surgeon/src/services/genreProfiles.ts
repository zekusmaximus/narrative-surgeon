import { GenreProfile } from '../types';

export const genreProfiles: Record<string, GenreProfile> = {
  literary: {
    name: 'Literary Fiction',
    typicalOpeningElements: ['character', 'voice', 'setting', 'mood'],
    expectedPaceBeats: 2,
    averageSceneLength: 1200,
    chapterEndExpectations: ['quiet_moment', 'revelation', 'introspection'],
  },
  thriller: {
    name: 'Thriller',
    typicalOpeningElements: ['action', 'mystery', 'danger', 'character'],
    expectedPaceBeats: 4,
    averageSceneLength: 800,
    chapterEndExpectations: ['cliffhanger', 'revelation', 'escalation'],
  },
  romance: {
    name: 'Romance',
    typicalOpeningElements: ['character', 'meet_cute', 'attraction', 'conflict'],
    expectedPaceBeats: 3,
    averageSceneLength: 1000,
    chapterEndExpectations: ['romantic_tension', 'obstacle', 'revelation'],
  },
  mystery: {
    name: 'Mystery',
    typicalOpeningElements: ['mystery', 'detective', 'crime', 'clue'],
    expectedPaceBeats: 3,
    averageSceneLength: 900,
    chapterEndExpectations: ['clue', 'revelation', 'red_herring'],
  },
  fantasy: {
    name: 'Fantasy',
    typicalOpeningElements: ['world_building', 'magic', 'character', 'quest'],
    expectedPaceBeats: 3,
    averageSceneLength: 1100,
    chapterEndExpectations: ['revelation', 'quest_progress', 'world_expansion'],
  },
  scifi: {
    name: 'Science Fiction',
    typicalOpeningElements: ['technology', 'world_building', 'concept', 'character'],
    expectedPaceBeats: 3,
    averageSceneLength: 1000,
    chapterEndExpectations: ['revelation', 'tech_advancement', 'ethical_dilemma'],
  },
  historical: {
    name: 'Historical Fiction',
    typicalOpeningElements: ['setting', 'period_detail', 'character', 'conflict'],
    expectedPaceBeats: 2,
    averageSceneLength: 1300,
    chapterEndExpectations: ['historical_tension', 'character_growth', 'period_conflict'],
  },
  other: {
    name: 'General Fiction',
    typicalOpeningElements: ['character', 'setting', 'conflict', 'voice'],
    expectedPaceBeats: 3,
    averageSceneLength: 1000,
    chapterEndExpectations: ['revelation', 'conflict', 'character_growth'],
  },
};

export const audienceProfiles = {
  adult: {
    name: 'Adult Fiction',
    expectedComplexity: 'high',
    typicalWordCount: { min: 80000, max: 120000 },
    averageChapterLength: 3000,
    openingPagesImportance: 'critical',
  },
  ya: {
    name: 'Young Adult',
    expectedComplexity: 'medium',
    typicalWordCount: { min: 50000, max: 80000 },
    averageChapterLength: 2500,
    openingPagesImportance: 'very_high',
  },
  mg: {
    name: 'Middle Grade',
    expectedComplexity: 'medium',
    typicalWordCount: { min: 20000, max: 50000 },
    averageChapterLength: 1500,
    openingPagesImportance: 'high',
  },
};

export class GenreAnalyzer {
  getProfile(genre: string): GenreProfile {
    return genreProfiles[genre] || genreProfiles.other;
  }

  analyzeOpeningAlignment(scenes: any[], genre: string): number {
    const profile = this.getProfile(genre);
    const openingScenes = scenes.filter(scene => scene.isOpening);
    
    if (openingScenes.length === 0) return 0;
    
    let alignmentScore = 0;
    const maxScore = profile.typicalOpeningElements.length;
    
    profile.typicalOpeningElements.forEach(element => {
      const hasElement = this.detectElement(openingScenes, element);
      if (hasElement) alignmentScore += 1;
    });
    
    return Math.round((alignmentScore / maxScore) * 100);
  }

  analyzePacing(scenes: any[], genre: string): { score: number; issues: string[] } {
    const profile = this.getProfile(genre);
    const issues: string[] = [];
    let score = 100;
    
    const avgSceneLength = scenes.reduce((sum, scene) => sum + scene.wordCount, 0) / scenes.length;
    const expectedLength = profile.averageSceneLength;
    const deviation = Math.abs(avgSceneLength - expectedLength) / expectedLength;
    
    if (deviation > 0.3) {
      issues.push(`Average scene length (${Math.round(avgSceneLength)} words) significantly differs from genre expectation (${expectedLength} words)`);
      score -= 20;
    }
    
    const paceConsistency = this.analyzePaceConsistency(scenes);
    if (paceConsistency < 0.7) {
      issues.push('Pacing appears inconsistent between scenes');
      score -= 15;
    }
    
    const chapterEndQuality = this.analyzeChapterEndings(scenes, genre);
    if (chapterEndQuality < 0.8) {
      issues.push('Chapter endings may not align with genre expectations');
      score -= 10;
    }
    
    return {
      score: Math.max(0, score),
      issues,
    };
  }

  private detectElement(scenes: any[], element: string): boolean {
    const combinedText = scenes.map(s => s.rawText.toLowerCase()).join(' ');
    
    const elementKeywords = {
      character: ['protagonist', 'character', 'person', 'name', 'she', 'he', 'they'],
      action: ['ran', 'jumped', 'fight', 'battle', 'chase', 'attack', 'violence'],
      setting: ['room', 'house', 'city', 'forest', 'building', 'place', 'location'],
      mystery: ['mystery', 'question', 'unknown', 'secret', 'hidden', 'puzzle'],
      dialogue: ['"', "'", 'said', 'asked', 'whispered', 'shouted', 'replied'],
      world_building: ['world', 'kingdom', 'realm', 'universe', 'society', 'culture'],
      magic: ['magic', 'spell', 'wizard', 'witch', 'enchant', 'supernatural'],
      technology: ['computer', 'robot', 'ai', 'space', 'future', 'technology'],
      romance: ['love', 'heart', 'kiss', 'romantic', 'attraction', 'beautiful'],
      voice: [], // Detected through other means like sentence structure
      mood: [], // Detected through tone and word choice
    };
    
    const keywords = elementKeywords[element as keyof typeof elementKeywords] || [];
    return keywords.some(keyword => combinedText.includes(keyword));
  }

  private analyzePaceConsistency(scenes: any[]): number {
    if (scenes.length < 3) return 1;
    
    const lengths = scenes.map(s => s.wordCount);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, length) => sum + Math.pow(length - avg, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avg;
    
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private analyzeChapterEndings(scenes: any[], genre: string): number {
    const profile = this.getProfile(genre);
    const chapterEndScenes = scenes.filter(scene => scene.isChapterEnd);
    
    if (chapterEndScenes.length === 0) return 1;
    
    let qualityScore = 0;
    chapterEndScenes.forEach(scene => {
      const lastSentences = this.getLastSentences(scene.rawText, 2);
      const hasExpectedEnding = this.detectExpectedEnding(lastSentences, profile.chapterEndExpectations);
      if (hasExpectedEnding) qualityScore += 1;
    });
    
    return qualityScore / chapterEndScenes.length;
  }

  private getLastSentences(text: string, count: number): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(-count).join('. ').toLowerCase();
  }

  private detectExpectedEnding(text: string, expectations: string[]): boolean {
    const endingKeywords = {
      cliffhanger: ['but', 'however', 'suddenly', 'then', 'just as', 'until'],
      revelation: ['realized', 'discovered', 'understood', 'revealed', 'truth', 'secret'],
      quiet_moment: ['peaceful', 'calm', 'quiet', 'rest', 'sleep', 'gentle'],
      romantic_tension: ['looked into', 'closer', 'almost', 'heart', 'feeling'],
      escalation: ['worse', 'more', 'increase', 'growing', 'mounting'],
    };
    
    return expectations.some(expectation => {
      const keywords = endingKeywords[expectation as keyof typeof endingKeywords] || [];
      return keywords.some(keyword => text.includes(keyword));
    });
  }

  getRecommendations(manuscriptData: any): string[] {
    const recommendations: string[] = [];
    const { manuscript, scenes } = manuscriptData;
    
    if (!manuscript.genre) {
      recommendations.push('Consider setting a genre to get more targeted analysis and recommendations.');
      return recommendations;
    }
    
    const profile = this.getProfile(manuscript.genre);
    const openingAlignment = this.analyzeOpeningAlignment(scenes, manuscript.genre);
    const pacingAnalysis = this.analyzePacing(scenes, manuscript.genre);
    
    if (openingAlignment < 50) {
      recommendations.push(
        `Your opening may benefit from incorporating more ${manuscript.genre} elements: ${profile.typicalOpeningElements.join(', ')}.`
      );
    }
    
    if (pacingAnalysis.score < 70) {
      recommendations.push(...pacingAnalysis.issues);
    }
    
    const avgSceneLength = scenes.reduce((sum: number, scene: any) => sum + scene.wordCount, 0) / scenes.length;
    const expectedLength = profile.averageSceneLength;
    
    if (avgSceneLength < expectedLength * 0.7) {
      recommendations.push(`Consider expanding scenes. Average length (${Math.round(avgSceneLength)} words) is shorter than typical for ${manuscript.genre} (${expectedLength} words).`);
    } else if (avgSceneLength > expectedLength * 1.5) {
      recommendations.push(`Consider breaking up longer scenes. Average length (${Math.round(avgSceneLength)} words) is longer than typical for ${manuscript.genre} (${expectedLength} words).`);
    }
    
    return recommendations;
  }
}