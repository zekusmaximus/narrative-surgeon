export interface Manuscript {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  targetAudience?: string;
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
  role?: string;
  firstAppearanceSceneId?: string;
  voiceSample?: string;
  createdAt: number;
}

export interface RevisionNote {
  id: string;
  sceneId: string;
  type?: string;
  content: string;
  resolved: boolean;
  createdAt: number;
}

export interface SceneAnalysis {
  id: string;
  sceneId: string;
  summary?: string;
  primaryEmotion?: string;
  secondaryEmotion?: string;
  tensionLevel?: number;
  pacingScore?: number;
  functionTags?: string;
  voiceFingerprint?: string;
  conflictPresent?: boolean;
  characterIntroduced?: boolean;
  analyzedAt?: number;
}

export interface OpeningAnalysis {
  id: string;
  manuscriptId: string;
  hookType?: string;
  hookStrength?: number;
  voiceEstablished?: boolean;
  characterEstablished?: boolean;
  conflictEstablished?: boolean;
  genreAppropriate?: boolean;
  similarToComps?: string;
  agentReadinessScore?: number;
  analysisNotes?: string;
  analyzedAt?: number;
}