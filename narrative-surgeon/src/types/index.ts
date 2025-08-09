export interface Manuscript {
  id: string;
  title: string;
  genre?: 'literary' | 'thriller' | 'romance' | 'mystery' | 'fantasy' | 'scifi' | 'historical' | 'other';
  targetAudience?: 'adult' | 'ya' | 'mg';
  compTitles?: string[];
  createdAt: number;
  updatedAt: number;
  totalWordCount: number;
  openingStrengthScore?: number;
  hookEffectiveness?: number;
}

export interface Scene {
  id: string;
  manuscriptId: string;
  chapterNumber?: number;
  sceneNumberInChapter?: number;
  indexInManuscript: number;
  title?: string;
  rawText: string;
  wordCount: number;
  isOpening: boolean;
  isChapterEnd: boolean;
  opensWithHook: boolean;
  endsWithHook: boolean;
  povCharacter?: string;
  location?: string;
  timeMarker?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Character {
  id: string;
  manuscriptId: string;
  name: string;
  role?: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  firstAppearanceSceneId?: string;
  voiceSample?: string;
  createdAt: number;
}

export interface RevisionNote {
  id: string;
  sceneId: string;
  type?: 'plot_hole' | 'consistency' | 'pacing' | 'voice' | 'hook';
  content: string;
  resolved: boolean;
  createdAt: number;
}

export interface ChapterBreak {
  position: number;
  chapterNumber?: number;
  title?: string;
  type: 'numbered' | 'titled' | 'marker';
}

export interface GenreProfile {
  name: string;
  typicalOpeningElements: string[];
  expectedPaceBeats: number;
  averageSceneLength: number;
  chapterEndExpectations: string[];
}

export interface EditorState {
  currentScene: Scene;
  wordCountDelta: number;
  unsavedChanges: boolean;
  lastSaved: Date;
  revisionNotes: RevisionNote[];
}

// Phase 2: LLM Analysis Types
export interface SceneAnalysis {
  id: string;
  sceneId: string;
  summary?: string;
  primaryEmotion?: string;
  secondaryEmotion?: string;
  tensionLevel?: number; // 0-100
  pacingScore?: number; // 0-100
  functionTags?: string[]; // JSON array
  voiceFingerprint?: VoiceFingerprint; // JSON object
  conflictPresent?: boolean;
  characterIntroduced?: boolean;
  analyzedAt: number;
}

export interface OpeningAnalysis {
  id: string;
  manuscriptId: string;
  hookType?: 'action' | 'voice' | 'mystery' | 'character' | 'setting';
  hookStrength?: number; // 0-100
  voiceEstablished?: boolean;
  characterEstablished?: boolean;
  conflictEstablished?: boolean;
  genreAppropriate?: boolean;
  similarToComps?: string[]; // JSON array
  agentReadinessScore?: number; // 0-100
  analysisNotes?: string;
  analyzedAt: number;
}

export interface CharacterVoice {
  id: string;
  characterId: string;
  sceneId: string;
  dialogueSample?: string;
  vocabularyLevel?: number; // grade level
  sentencePatterns?: SentencePattern[]; // JSON
  uniquePhrases?: string[]; // JSON array
  emotionalRegister?: string;
  consistencyScore?: number; // compared to voice_sample
}

export interface PacingAnalysis {
  id: string;
  manuscriptId: string;
  actNumber?: number; // 1, 2, 3
  startSceneId?: string;
  endSceneId?: string;
  beatsPerThousand?: number;
  tensionArc?: number[]; // JSON array of tension values
  compTitleComparison?: CompTitleComparison; // JSON
  suggestions?: string;
}

// Supporting types
export interface VoiceFingerprint {
  averageSentenceLength: number;
  complexSentenceRatio: number;
  dialogueToNarrationRatio: number;
  commonWords: string[];
  uniqueStyleMarkers: string[];
  emotionalTone: string;
}

export interface SentencePattern {
  type: 'simple' | 'compound' | 'complex' | 'compound-complex';
  frequency: number;
  averageLength: number;
}

export interface CompTitleComparison {
  title: string;
  similarities: string[];
  differences: string[];
  alignmentScore: number; // 0-100
}

export interface Hook {
  type: 'action' | 'dialogue' | 'mystery' | 'character' | 'setting';
  strength: number; // 0-100
  location: number; // word position
  suggestion?: string;
}

export interface ConsistencyReport {
  score: number; // 0-100
  maintainedElements: string[];
  driftDetected: string[];
  specificFixes: VoiceFix[];
}

export interface VoiceFix {
  line: string;
  issue: string;
  suggestion: string;
}

export interface PlotHole {
  id: string;
  type: 'continuity' | 'logic' | 'character' | 'timeline' | 'object';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  affectedScenes: string[];
  suggestion: string;
}

export interface SceneContext {
  previousSummary?: string;
  nextOpening?: string;
  positionInChapter: number;
  totalScenesInChapter: number;
  chapterNumber?: number;
  manuscriptGenre?: string;
  charactersPresent: string[];
}

export interface Edit {
  type: 'replace' | 'insert' | 'delete';
  start: number;
  end?: number;
  text: string;
  reason: string;
}

export interface CharacterArc {
  character: string;
  startState: EmotionalState;
  endState: EmotionalState;
  turningPoints: string[]; // scene IDs
  arcType: 'positive' | 'negative' | 'flat' | 'corruption';
  completeness: number; // 0-100
}

export interface EmotionalState {
  primary: string;
  secondary?: string;
  intensity: number; // 0-100
  context: string;
}

// Additional types needed for LLM Provider
export interface SceneInfo {
  id: string;
  text: string;
  wordCount: number;
  sceneNumber: number;
  chapterNumber?: number;
  isOpening: boolean;
  isChapterEnd: boolean;
}

export interface ManuscriptContext {
  genre?: string;
  targetAudience?: string;
  characters: Character[];
  totalScenes: number;
  totalWordCount: number;
}

export interface PacingProfile {
  totalScenes: number;
  averageSceneLength: number;
  tensionArc: number[];
  beatsPerThousand: number;
  actBreaks: number[];
}