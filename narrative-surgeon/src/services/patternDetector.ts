import { Pattern, EditPattern, AutoFix } from '../types';
import { databaseService } from './database';
import { v4 as uuidv4 } from 'uuid';

export class PatternDetector {
  private readonly patterns = {
    filter_words: /\b(just|really|very|quite|rather|simply|actually|basically|literally|totally|absolutely|completely)\b/gi,
    passive_voice: /\b(was|were|been|being|be|is|are|am)\s+\w+ed\b/gi,
    telling_phrases: /\b(felt|thought|knew|realized|understood|wondered|seemed|appeared|looked like|sounded like)\b/gi,
    weak_verbs: /\b(went|got|put|made|came|took|gave|had|said|looked|turned|moved|walked)\b/gi,
    adverb_overuse: /\b\w+ly\b/gi,
    filler_phrases: /\b(in order to|due to the fact that|at this point in time|it should be noted that)\b/gi,
    redundancy: /\b(advance forward|past history|future plans|end result|final outcome|close proximity|each and every)\b/gi,
    cliches: /\b(avoid like the plague|busy as a bee|crystal clear|dead as a doornail|fit as a fiddle)\b/gi
  };

  private readonly autoFixes: Record<string, AutoFix[]> = {
    filter_words: [
      {
        id: 'remove_very',
        type: 'filter_word',
        description: 'Remove "very" - find stronger word',
        pattern: /\bvery\s+(\w+)/gi,
        replacement: (match: string) => {
          const word = match.replace(/very\s+/i, '');
          const strongerWords: Record<string, string> = {
            'good': 'excellent',
            'bad': 'terrible',
            'big': 'enormous',
            'small': 'tiny',
            'fast': 'rapid',
            'slow': 'sluggish',
            'happy': 'ecstatic',
            'sad': 'devastated',
            'angry': 'furious',
            'scared': 'terrified'
          };
          return strongerWords[word.toLowerCase()] || word;
        },
        preserveCase: true
      },
      {
        id: 'remove_really',
        type: 'filter_word',
        description: 'Remove "really" and find stronger alternative',
        pattern: /\breally\s+(\w+)/gi,
        replacement: '$1',
        preserveCase: true
      }
    ],
    
    passive_voice: [
      {
        id: 'convert_passive',
        type: 'passive_voice',
        description: 'Convert passive voice to active',
        pattern: /\b(was|were)\s+(\w+ed)\s+by\s+(\w+)/gi,
        replacement: '$3 $2',
        preserveCase: true
      }
    ],

    weak_verbs: [
      {
        id: 'strengthen_said',
        type: 'weak_verb',
        description: 'Replace "said" with stronger dialogue tag',
        pattern: /\bsaid\b/gi,
        replacement: (match: string) => {
          const alternatives = ['whispered', 'declared', 'muttered', 'exclaimed', 'stated', 'replied'];
          return alternatives[Math.floor(Math.random() * alternatives.length)];
        },
        preserveCase: true
      }
    ],

    redundancy: [
      {
        id: 'fix_redundant_phrases',
        type: 'redundancy',
        description: 'Remove redundant words from common phrases',
        pattern: /\b(advance forward|past history|future plans|end result|final outcome)\b/gi,
        replacement: (match: string) => {
          const fixes: Record<string, string> = {
            'advance forward': 'advance',
            'past history': 'history', 
            'future plans': 'plans',
            'end result': 'result',
            'final outcome': 'outcome'
          };
          return fixes[match.toLowerCase()] || match;
        },
        preserveCase: true
      }
    ]
  };

  async detectAllPatterns(text: string): Promise<Pattern[]> {
    const detected: Pattern[] = [];
    
    // Detect regex patterns
    for (const [name, pattern] of Object.entries(this.patterns)) {
      if (pattern instanceof RegExp) {
        const matches = [...text.matchAll(pattern)];
        detected.push(...matches.map(m => ({
          type: name,
          text: m[0],
          position: m.index!,
          severity: this.calculateSeverity(name, matches.length, text.length),
          autoFix: this.getAutoFix(name, m[0])
        })));
      }
    }

    // Detect complex patterns
    detected.push(...this.detectRepetition(text));
    detected.push(...this.analyzeSentenceVariety(text));
    detected.push(...this.detectDialogueIssues(text));

    return detected;
  }

  private calculateSeverity(patternType: string, frequency: number, textLength: number): number {
    const density = frequency / (textLength / 1000); // Per 1000 chars
    
    const severityMap: Record<string, number> = {
      'filter_words': Math.min(density * 15, 100),
      'passive_voice': Math.min(density * 20, 100), 
      'telling_phrases': Math.min(density * 25, 100),
      'weak_verbs': Math.min(density * 10, 100),
      'adverb_overuse': Math.min(density * 8, 100),
      'redundancy': Math.min(density * 30, 100),
      'cliches': Math.min(density * 40, 100)
    };

    return Math.round(severityMap[patternType] || density * 10);
  }

  private getAutoFix(patternType: string, matchText: string): { suggestion: string; replacement?: string } | undefined {
    const fixes = this.autoFixes[patternType];
    if (!fixes) return undefined;

    for (const fix of fixes) {
      if (fix.pattern.test(matchText)) {
        const replacement = typeof fix.replacement === 'function' 
          ? fix.replacement(matchText)
          : matchText.replace(fix.pattern, fix.replacement);
        
        return {
          suggestion: fix.description,
          replacement: replacement
        };
      }
    }

    return { suggestion: `Consider revising "${matchText}"` };
  }

  private detectRepetition(text: string): Pattern[] {
    const words = text.toLowerCase().split(/\s+/);
    const frequency: Record<string, number> = {};
    const positions: Record<string, number[]> = {};
    
    // Count word frequency and track positions
    words.forEach((word, index) => {
      if (word.length > 4 && !/^(that|this|with|from|they|them|were|been|have|will|would|could|should)$/.test(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
        positions[word] = positions[word] || [];
        positions[word].push(index);
      }
    });
    
    // Find overused words
    const threshold = Math.max(3, Math.floor(words.length / 200)); // Adaptive threshold
    
    return Object.entries(frequency)
      .filter(([_, count]) => count > threshold)
      .map(([word, count]) => ({
        type: 'repetition',
        text: word,
        position: positions[word][0] * 6, // Rough character position estimate
        severity: Math.min(count * 15, 100),
        autoFix: { 
          suggestion: `"${word}" appears ${count} times. Consider using synonyms or restructuring.`,
          replacement: this.getSynonyms(word)[0] || word
        }
      }));
  }

  private analyzeSentenceVariety(text: string): Pattern[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 3) return [];

    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    
    const patterns: Pattern[] = [];

    // Check for lack of sentence variety (low variance)
    if (variance < 20 && sentences.length > 5) {
      patterns.push({
        type: 'sentence_variety',
        text: 'sentence structure',
        position: 0,
        severity: Math.round((20 - variance) * 3),
        autoFix: {
          suggestion: 'Vary sentence length and structure for better flow'
        }
      });
    }

    // Check for overly long sentences
    lengths.forEach((length, index) => {
      if (length > 30) {
        const sentenceStart = text.indexOf(sentences[index].trim());
        patterns.push({
          type: 'sentence_too_long',
          text: sentences[index].trim().substring(0, 50) + '...',
          position: sentenceStart,
          severity: Math.min((length - 30) * 2, 100),
          autoFix: {
            suggestion: `Consider breaking this ${length}-word sentence into smaller parts`
          }
        });
      }
    });

    return patterns;
  }

  private detectDialogueIssues(text: string): Pattern[] {
    const patterns: Pattern[] = [];
    const dialogueMatches = text.matchAll(/"([^"]+)"/g);
    
    for (const match of dialogueMatches) {
      const dialogue = match[1];
      const position = match.index!;

      // Check for excessive adverbs in dialogue tags
      const tagPattern = /"[^"]*"\s*,?\s*\w+\s+said\s+(\w+ly)/gi;
      const tagMatches = text.substring(position).match(tagPattern);
      
      if (tagMatches) {
        patterns.push({
          type: 'dialogue_adverb',
          text: tagMatches[0],
          position: position,
          severity: 60,
          autoFix: {
            suggestion: 'Show emotion through action instead of adverbs'
          }
        });
      }

      // Check for unnatural contractions
      if (dialogue.includes(' cannot ') || dialogue.includes(' will not ')) {
        patterns.push({
          type: 'dialogue_formal',
          text: dialogue,
          position: position,
          severity: 40,
          autoFix: {
            suggestion: 'Use contractions in dialogue for natural speech',
            replacement: dialogue.replace(' cannot ', " can't ").replace(' will not ', " won't ")
          }
        });
      }
    }

    return patterns;
  }

  private getSynonyms(word: string): string[] {
    // Simple synonym dictionary - in production, this would use a thesaurus API
    const synonyms: Record<string, string[]> = {
      'said': ['stated', 'declared', 'mentioned', 'replied', 'responded'],
      'good': ['excellent', 'outstanding', 'superb', 'fine', 'great'],
      'bad': ['terrible', 'awful', 'horrible', 'poor', 'dreadful'],
      'big': ['large', 'enormous', 'huge', 'massive', 'gigantic'],
      'small': ['tiny', 'little', 'minute', 'compact', 'petite'],
      'went': ['traveled', 'moved', 'proceeded', 'advanced', 'journeyed'],
      'looked': ['gazed', 'stared', 'glanced', 'peered', 'observed']
    };

    return synonyms[word.toLowerCase()] || [word];
  }

  async savePatterns(manuscriptId: string, patterns: Pattern[]): Promise<void> {
    // Group patterns by type and calculate frequency
    const patternGroups: Record<string, Pattern[]> = {};
    patterns.forEach(p => {
      patternGroups[p.type] = patternGroups[p.type] || [];
      patternGroups[p.type].push(p);
    });

    // Save each pattern type to database
    for (const [type, typePatterns] of Object.entries(patternGroups)) {
      const frequency = typePatterns.length;
      const avgSeverity = typePatterns.reduce((sum, p) => sum + p.severity, 0) / frequency;
      
      const editPattern: EditPattern = {
        id: uuidv4(),
        manuscriptId,
        patternType: type as any,
        frequency,
        severity: Math.round(avgSeverity),
        autoFixAvailable: typePatterns.some(p => p.autoFix?.replacement),
        suggestedAlternatives: this.extractAlternatives(typePatterns)
      };

      await this.saveEditPattern(editPattern);
    }
  }

  private extractAlternatives(patterns: Pattern[]): string[] {
    const alternatives = new Set<string>();
    patterns.forEach(p => {
      if (p.autoFix?.replacement) {
        alternatives.add(p.autoFix.replacement);
      }
    });
    return Array.from(alternatives);
  }

  private async saveEditPattern(pattern: EditPattern): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO edit_patterns 
      (id, manuscript_id, pattern_type, pattern_text, frequency, severity, auto_fix_available, suggested_alternatives)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await databaseService.executeQuery(query, [
      pattern.id,
      pattern.manuscriptId,
      pattern.patternType,
      pattern.patternText,
      pattern.frequency,
      pattern.severity,
      pattern.autoFixAvailable,
      JSON.stringify(pattern.suggestedAlternatives)
    ]);
  }

  async getPatterns(manuscriptId: string): Promise<EditPattern[]> {
    const query = `
      SELECT * FROM edit_patterns 
      WHERE manuscript_id = ? 
      ORDER BY severity DESC, frequency DESC
    `;
    
    const rows = await databaseService.getAll(query, [manuscriptId]);
    
    return rows.map(row => ({
      id: row.id,
      manuscriptId: row.manuscript_id,
      patternType: row.pattern_type,
      patternText: row.pattern_text,
      frequency: row.frequency,
      severity: row.severity,
      autoFixAvailable: row.auto_fix_available,
      suggestedAlternatives: JSON.parse(row.suggested_alternatives || '[]')
    }));
  }

  // Apply auto-fixes to text
  applyAutoFix(text: string, pattern: Pattern): string {
    if (!pattern.autoFix?.replacement) return text;

    // Find the specific occurrence at the pattern position
    const before = text.substring(0, pattern.position);
    const after = text.substring(pattern.position + pattern.text.length);
    
    return before + pattern.autoFix.replacement + after;
  }

  // Apply all auto-fixes of a specific type
  applyAllAutoFixes(text: string, patternType: string): string {
    const fixes = this.autoFixes[patternType];
    if (!fixes) return text;

    let result = text;
    fixes.forEach(fix => {
      if (typeof fix.replacement === 'string') {
        result = result.replace(fix.pattern, fix.replacement);
      } else if (typeof fix.replacement === 'function') {
        result = result.replace(fix.pattern, fix.replacement);
      }
    });

    return result;
  }
}

export const patternDetector = new PatternDetector();