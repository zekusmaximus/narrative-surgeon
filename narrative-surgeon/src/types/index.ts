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

// Phase 3: Revision Workspace Types
export interface RevisionSession {
  id: string;
  manuscriptId: string;
  sessionType?: 'developmental' | 'line' | 'copy' | 'proof';
  focusArea?: 'pacing' | 'character' | 'dialogue' | 'description' | 'overall';
  startedAt: number;
  endedAt?: number;
  scenesRevised: number;
  wordsChanged: number;
  qualityDelta?: number;
}

export interface Edit {
  id: string;
  sceneId: string;
  sessionId?: string;
  editType?: 'ai_suggested' | 'manual' | 'accepted_suggestion' | 'rejected_suggestion';
  beforeText: string;
  afterText?: string;
  startPosition: number;
  endPosition: number;
  rationale?: string;
  impactScore?: number;
  affectsPlot: boolean;
  affectsCharacter: boolean;
  affectsPacing: boolean;
  createdAt: number;
  appliedAt?: number;
  revertedAt?: number;
}

export interface EditPattern {
  id: string;
  manuscriptId: string;
  patternType?: 'overused_phrase' | 'filter_word' | 'passive_voice' | 'telling';
  patternText?: string;
  frequency: number;
  severity: number;
  autoFixAvailable: boolean;
  suggestedAlternatives?: string[];
}

export interface CompAnalysis {
  id: string;
  manuscriptId: string;
  compTitle: string;
  compAuthor?: string;
  openingSimilarity?: number;
  pacingSimilarity?: number;
  voiceSimilarity?: number;
  structureSimilarity?: number;
  marketPosition?: string;
  keyDifferences?: string;
  keySimilarities?: string;
  analyzedAt?: number;
}

export interface BetaReaderPersona {
  id: string;
  manuscriptId: string;
  personaType?: 'genre_fan' | 'literary_critic' | 'casual_reader' | 'agent' | 'editor';
  expectations?: Record<string, any>;
  likelyReactions?: Record<string, string>;
  engagementCurve?: number[];
  wouldContinueReading: boolean;
  wouldRecommend: boolean;
  primaryCriticism?: string;
  primaryPraise?: string;
}

// Revision workspace interfaces
export interface RevisionMode {
  name: string;
  description: string;
  checksEnabled: string[];
  aiPromptBias: string;
  highlightPatterns: RegExp[];
  quickActions: string[];
}

export interface Suggestion {
  id: string;
  type: 'spelling' | 'grammar' | 'style' | 'structure' | 'voice' | 'pacing';
  severity: 'info' | 'warning' | 'error' | 'success';
  startPosition: number;
  endPosition: number;
  originalText: string;
  suggestedText: string;
  rationale: string;
  impactScore: number;
}

export interface EditIndicator {
  color: string;
  icon: string;
  tooltip: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export interface DiffEditorProps {
  showThreePaneDiff: boolean;
  diffGranularity: 'character' | 'word' | 'sentence' | 'paragraph';
  suggestionMode: 'aggressive' | 'balanced' | 'conservative' | 'voice_preserve';
}

export interface EditGroup {
  id: string;
  edits: Edit[];
  groupType: 'batch_suggestion' | 'search_replace' | 'pattern_fix' | 'manual_selection';
  description: string;
  totalImpact: number;
}

export interface Pattern {
  type: string;
  text: string;
  position: number;
  severity: number;
  autoFix?: { suggestion: string; replacement?: string };
}

export interface ReadingExperience {
  persona: PersonaType;
  reactions: SceneReaction[];
  overallEngagement: number;
  wouldFinish: boolean;
  wouldRecommend: boolean;
  keyIssues: string[];
  highlights: string[];
}

export interface SceneReaction {
  sceneId: string;
  engagement: number;
  emotion: string;
  notes: string;
  wouldStopReading?: boolean;
  reason?: string;
}

export type PersonaType = 'genre_fan' | 'literary_critic' | 'casual_reader' | 'agent' | 'editor';

export interface QuickFix {
  id: string;
  description: string;
  impactScore: number;
  effortScore: number;
  autoApplicable: boolean;
  targetScenes: string[];
}

export interface AutoFix {
  id: string;
  type: string;
  description: string;
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  preserveCase: boolean;
}

export interface Issue {
  id: string;
  type: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  sceneIds: string[];
  suggestedFix: string;
  impactIfIgnored: string;
}

// Phase 4: Agent Submission Types
export interface QueryLetter {
  id: string;
  manuscriptId: string;
  versionNumber: number;
  hook: string;
  bio: string;
  logline: string;
  wordCount: number;
  compTitles: string[];
  personalizationTemplate?: string;
  generatedText: string;
  optimizationScore?: number;
  abTestGroup?: string;
  performanceMetrics?: QueryLetterMetrics;
  createdAt: number;
  updatedAt: number;
}

export interface QueryLetterMetrics {
  openRate?: number;
  responseRate?: number;
  requestRate?: number;
  avgResponseTime?: number;
  rejectionReasons?: string[];
}

export interface Synopsis {
  id: string;
  manuscriptId: string;
  lengthType: 'one_page' | 'two_page' | 'chapter_by_chapter';
  wordCount: number;
  content: string;
  structuralBeats: string[];
  characterArcs: Record<string, string>;
  genreElements: string[];
  optimizationScore?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SamplePages {
  id: string;
  manuscriptId: string;
  pageCount: number;
  formatType: 'industry_standard' | 'agent_specific' | 'contest';
  content: string;
  fontSettings: FontSettings;
  marginSettings: MarginSettings;
  headerSettings: HeaderSettings;
  industryStandard: string;
  filePath?: string;
  createdAt: number;
}

export interface FontSettings {
  family: string;
  size: number;
  lineSpacing: number;
}

export interface MarginSettings {
  top: number;
  bottom: number;
  left: number;
  right: number;
  units: 'inches' | 'cm';
}

export interface HeaderSettings {
  includeTitle: boolean;
  includeAuthor: boolean;
  includePageNumbers: boolean;
  customText?: string;
}

export interface Agent {
  id: string;
  name: string;
  agency?: string;
  genres: string[];
  clientList: string[];
  submissionGuidelines: SubmissionGuidelines;
  responseTimeDays?: number;
  acceptanceRate?: number;
  clientSuccessStories: string[];
  socialMediaHandles: Record<string, string>;
  interviewQuotes: string[];
  manuscriptWishlist: string[];
  recentDeals: Deal[];
  queryPreferences: QueryPreferences;
  redFlags: string[];
  updatedAt: number;
}

export interface SubmissionGuidelines {
  queryFormat: 'email' | 'form' | 'postal';
  synopsisRequired: boolean;
  samplePagesCount: number;
  samplePagesFormat: 'first_pages' | 'first_chapter' | 'first_50';
  attachmentsAllowed: boolean;
  responsePolicy: string;
  exclusiveSubmissions: boolean;
}

export interface QueryPreferences {
  personalizationRequired: boolean;
  genreInSubject: boolean;
  compTitlesRequired: boolean;
  wordCountRequired: boolean;
  bioRequired: boolean;
}

export interface Deal {
  title: string;
  author: string;
  publisher: string;
  year: number;
  genre: string;
}

export interface SubmissionRecord {
  id: string;
  manuscriptId: string;
  agentId: string;
  queryLetterId?: string;
  synopsisId?: string;
  samplePagesId?: string;
  submissionDate: number;
  status: SubmissionStatus;
  responseDate?: number;
  responseType?: ResponseType;
  personalizationNotes?: string;
  followUpDate?: number;
  notes?: string;
  tags: string[];
}

export type SubmissionStatus = 
  | 'queued'
  | 'sent'
  | 'acknowledged'
  | 'under_review'
  | 'requested_full'
  | 'rejected'
  | 'no_response'
  | 'withdrawn';

export type ResponseType = 
  | 'form_rejection'
  | 'personalized_rejection'
  | 'request_for_full'
  | 'request_for_partial'
  | 'offer_of_representation'
  | 'referral';

export interface SubmissionAnalytics {
  id: string;
  manuscriptId: string;
  timePeriod: string;
  submissionsSent: number;
  responsesReceived: number;
  requestsForMore: number;
  rejections: number;
  noResponses: number;
  responseRate: number;
  requestRate: number;
  avgResponseTime: number;
  topRejectionReasons: string[];
  optimizationSuggestions: string[];
  calculatedAt: number;
}

export interface AgentMatch {
  id: string;
  manuscriptId: string;
  agentId: string;
  compatibilityScore: number;
  genreMatchScore?: number;
  clientSuccessScore?: number;
  submissionPreferencesScore?: number;
  marketPositionScore?: number;
  matchReasoning: string;
  priorityRank: number;
  contacted: boolean;
  calculatedAt: number;
}

export interface AgentResearch {
  recentInterviews: string[];
  manuscriptWishes: string[];
  recentSales: Deal[];
  clientUpdates: string[];
  socialMediaActivity: string[];
  conferenceAppearances: string[];
  lastUpdated: number;
}

export interface SubmissionPipeline {
  manuscripts: SubmissionManuscript[];
  totalAgentsResearched: number;
  totalSubmissionsSent: number;
  totalResponsesReceived: number;
  averageResponseTime: number;
  successRate: number;
}

export interface SubmissionManuscript {
  manuscriptId: string;
  title: string;
  genre: string;
  wordCount: number;
  agentReadinessScore: number;
  submissionsActive: number;
  submissionsWaiting: number;
  requestsReceived: number;
  nextSubmissionDate?: number;
}