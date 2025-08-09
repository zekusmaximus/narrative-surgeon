import { v4 as uuidv4 } from 'uuid';
import { ChapterBreak, Scene } from '../types';

export class SceneParser {
  private static readonly WORDS_PER_PAGE = 250;
  private static readonly OPENING_PAGE_COUNT = 5;
  
  detectChapterBreaks(text: string): ChapterBreak[] {
    const breaks: ChapterBreak[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const chapterMatch = this.matchChapterPattern(line);
      if (chapterMatch) {
        breaks.push({
          position: this.getPositionFromLineIndex(lines, i),
          chapterNumber: chapterMatch.number,
          title: chapterMatch.title,
          type: chapterMatch.type
        });
      }
    }
    
    if (breaks.length === 0) {
      breaks.push({
        position: 0,
        chapterNumber: 1,
        type: 'numbered'
      });
    }
    
    return breaks;
  }

  private matchChapterPattern(line: string): { number?: number; title?: string; type: ChapterBreak['type'] } | null {
    const patterns = [
      /^Chapter\s+(\d+)(?:\s*[:\-]\s*(.+))?$/i,
      /^Ch\.?\s+(\d+)(?:\s*[:\-]\s*(.+))?$/i,
      /^(\d+)\.?\s*(.*)$/,
      /^(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty)(?:\s*[:\-]\s*(.+))?$/i,
      /^(I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX)(?:\s*[:\-]\s*(.+))?$/i,
      /^[#*]{3,}\s*(.*)$/,
      /^\*\*\*+\s*(.*)$/,
    ];

    const numberWords = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
    };

    const romanNumbers = {
      'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8,
      'IX': 9, 'X': 10, 'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15,
      'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
    };

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        let number: number | undefined;
        let title: string | undefined;
        
        if (pattern.source.includes('Chapter|Ch')) {
          number = parseInt(match[1], 10);
          title = match[2]?.trim() || undefined;
          return { number, title, type: 'numbered' };
        } else if (pattern.source.includes('One|Two|Three')) {
          const wordNumber = match[1].toLowerCase();
          number = numberWords[wordNumber as keyof typeof numberWords];
          title = match[2]?.trim() || undefined;
          return { number, title, type: 'numbered' };
        } else if (pattern.source.includes('I{1,3}|IV|V')) {
          number = romanNumbers[match[1] as keyof typeof romanNumbers];
          title = match[2]?.trim() || undefined;
          return { number, title, type: 'numbered' };
        } else if (pattern.source.includes('^(\\d+)')) {
          const potentialNumber = parseInt(match[1], 10);
          if (potentialNumber <= 50 && match[2]?.trim()) {
            return { number: potentialNumber, title: match[2].trim(), type: 'numbered' };
          }
        } else if (pattern.source.includes('[#*]{3,}|\\*\\*\\*+')) {
          return { title: match[1]?.trim() || undefined, type: 'marker' };
        }
      }
    }

    if (line.length < 50 && line.length > 3 && !line.includes('.')) {
      const words = line.split(/\s+/).length;
      if (words <= 8) {
        return { title: line, type: 'titled' };
      }
    }

    return null;
  }

  private getPositionFromLineIndex(lines: string[], lineIndex: number): number {
    return lines.slice(0, lineIndex).join('\n').length;
  }

  segmentScenes(text: string, breakpoints: ChapterBreak[]): Scene[] {
    const scenes: Scene[] = [];
    let currentPosition = 0;
    
    for (let i = 0; i < breakpoints.length; i++) {
      const currentBreak = breakpoints[i];
      const nextBreak = breakpoints[i + 1];
      
      const chapterText = nextBreak 
        ? text.slice(currentBreak.position, nextBreak.position)
        : text.slice(currentBreak.position);
      
      const chapterScenes = this.segmentScenesInChapter(
        chapterText,
        currentBreak.chapterNumber || 1,
        scenes.length
      );
      
      scenes.push(...chapterScenes);
      currentPosition = nextBreak ? nextBreak.position : text.length;
    }

    return scenes;
  }

  private segmentScenesInChapter(chapterText: string, chapterNumber: number, startingIndex: number): Scene[] {
    const sceneBreaks = this.detectSceneBreaks(chapterText);
    const scenes: Scene[] = [];
    
    for (let i = 0; i < sceneBreaks.length; i++) {
      const currentBreak = sceneBreaks[i];
      const nextBreak = sceneBreaks[i + 1];
      
      const sceneText = nextBreak
        ? chapterText.slice(currentBreak, nextBreak).trim()
        : chapterText.slice(currentBreak).trim();
      
      if (sceneText.length === 0) continue;
      
      const wordCount = this.countWords(sceneText);
      const now = Date.now();
      
      scenes.push({
        id: uuidv4(),
        manuscriptId: '', // Will be set when saving to database
        chapterNumber,
        sceneNumberInChapter: i + 1,
        indexInManuscript: startingIndex + i,
        rawText: sceneText,
        wordCount,
        isOpening: false, // Will be marked later
        isChapterEnd: i === sceneBreaks.length - 1,
        opensWithHook: false, // Will be analyzed later
        endsWithHook: false, // Will be analyzed later
        createdAt: now,
        updatedAt: now
      });
    }
    
    return scenes;
  }

  private detectSceneBreaks(text: string): number[] {
    const breaks: number[] = [0]; // Always start with beginning of chapter
    
    const sceneBreakPatterns = [
      /\n\s*\*{3,}\s*\n/g, // *** scene breaks
      /\n\s*#{3,}\s*\n/g, // ### scene breaks  
      /\n\s*-{3,}\s*\n/g, // --- scene breaks
      /\n\s*~{3,}\s*\n/g, // ~~~ scene breaks
      /\n\s*\n\s*\n\s*\n/g, // Multiple line breaks (3+ empty lines)
    ];
    
    for (const pattern of sceneBreakPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const position = match.index + match[0].length;
        if (!breaks.includes(position)) {
          breaks.push(position);
        }
      }
    }
    
    // If no scene breaks found, treat entire chapter as one scene
    if (breaks.length === 1) {
      return [0];
    }
    
    return breaks.sort((a, b) => a - b);
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  markOpeningPages(scenes: Scene[], wordsPerPage: number = SceneParser.WORDS_PER_PAGE): Scene[] {
    const openingWordLimit = wordsPerPage * SceneParser.OPENING_PAGE_COUNT;
    let currentWordCount = 0;
    
    return scenes.map(scene => {
      const wasOpening = currentWordCount < openingWordLimit;
      currentWordCount += scene.wordCount;
      
      return {
        ...scene,
        isOpening: wasOpening || (currentWordCount - scene.wordCount < openingWordLimit)
      };
    });
  }

  identifyChapterEnds(scenes: Scene[]): Scene[] {
    const chapterMap = new Map<number, Scene[]>();
    
    // Group scenes by chapter
    scenes.forEach(scene => {
      if (scene.chapterNumber) {
        if (!chapterMap.has(scene.chapterNumber)) {
          chapterMap.set(scene.chapterNumber, []);
        }
        chapterMap.get(scene.chapterNumber)!.push(scene);
      }
    });
    
    // Mark the last scene in each chapter
    return scenes.map(scene => {
      if (scene.chapterNumber) {
        const chapterScenes = chapterMap.get(scene.chapterNumber) || [];
        const lastSceneInChapter = chapterScenes[chapterScenes.length - 1];
        return {
          ...scene,
          isChapterEnd: scene.id === lastSceneInChapter?.id
        };
      }
      return scene;
    });
  }
}