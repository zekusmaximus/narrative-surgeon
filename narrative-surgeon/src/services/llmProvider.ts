import { MMKV } from 'react-native-mmkv';
import {
  SceneAnalysis,
  OpeningAnalysis,
  CharacterVoice,
  PacingAnalysis,
  SceneContext,
  Hook,
  ConsistencyReport,
  PlotHole,
  Edit,
  VoiceFingerprint,
  CompTitleComparison,
  Scene,
  Character,
  SceneInfo,
  ManuscriptContext,
  PacingProfile
} from '../types';

// Enhanced secure storage for API keys with optional dynamic encryption
const getOrCreateEncryptionKey = async (): Promise<string> => {
  try {
    // Try to use Expo SecureStore if available
    const SecureStore = require('expo-secure-store');
    const Crypto = require('expo-crypto');
    
    let key = await SecureStore.getItemAsync('encryption_key');
    if (!key) {
      key = Crypto.randomUUID();
      await SecureStore.setItemAsync('encryption_key', key);
    }
    return key;
  } catch (error) {
    // Fallback to static key if Expo modules not available
    console.log('Using fallback encryption (install expo-secure-store for enhanced security)');
    return 'narrative-surgeon-encryption-key-v2';
  }
};

// Create storage instance with dynamic encryption key
let secureStorage: MMKV | null = null;

const getSecureStorage = async (): Promise<MMKV> => {
  if (!secureStorage) {
    const encryptionKey = await getOrCreateEncryptionKey();
    secureStorage = new MMKV({
      id: 'narrative-surgeon-secure',
      encryptionKey
    });
  }
  return secureStorage;
};

export interface LLMProvider {
  // Core analysis
  analyzeScene(text: string, context: SceneContext): Promise<SceneAnalysis>;
  analyzeOpening(firstPages: string, genre: string, comps: string[]): Promise<OpeningAnalysis>;
  analyzeCharacterVoice(dialogue: string[], characterName: string, existingProfile?: VoiceFingerprint): Promise<CharacterVoice>;
  analyzePacing(scenes: SceneInfo[], genre: string): Promise<PacingAnalysis>;
  
  // Revision assistance
  findWeakestElement(scene: string): Promise<{element: string, issue: string, fix: string}>;
  suggestHook(scene: string, position: "opening" | "ending"): Promise<Hook>;
  checkVoiceConsistency(dialogue: string, voiceProfile: VoiceFingerprint): Promise<ConsistencyReport>;
  
  // Advanced features
  detectPlotHoles(scenes: Scene[], context: ManuscriptContext): Promise<PlotHole[]>;
  suggestTensionAdjustment(scene: string, targetTension: number): Promise<Edit[]>;
  compareToCompTitle(manuscript: PacingProfile, compTitle: string): Promise<CompTitleComparison>;

  // Provider info
  getName(): string;
  isAvailable(): Promise<boolean>;
  supportsStreaming(): boolean;
}

export type AnalysisType = 'scene' | 'opening' | 'voice' | 'pacing' | 'plot_holes' | 'tension';
export type RevisionMode = 'developmental' | 'line' | 'copy' | 'voice_consistency' | 'pacing';

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  metadata?: any;
}

export interface LLMProviderConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'offline';
  apiKey?: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}


// Chunked LLM Provider Implementation
export class ChunkedLLMProvider implements LLMProvider {
  private readonly maxTokens = 2000;
  private readonly overlapTokens = 200;
  private apiKey: string | undefined;
  private readonly baseURL: string;

  constructor(apiKey?: string, baseURL: string = 'https://api.openai.com/v1') {
    this.baseURL = baseURL;
    this.initializeApiKey(apiKey);
  }

  getName(): string {
    return 'OpenAI';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey();
      return !!apiKey;
    } catch {
      return false;
    }
  }

  supportsStreaming(): boolean {
    return true;
  }

  private async initializeApiKey(providedKey?: string): Promise<void> {
    if (providedKey) {
      this.apiKey = providedKey;
      return;
    }

    try {
      const storage = await getSecureStorage();
      this.apiKey = storage.getString('openai_api_key');
    } catch (error) {
      console.error('Error loading API key:', error);
      this.apiKey = undefined;
    }
  }

  async setApiKey(key: string): Promise<void> {
    try {
      const storage = await getSecureStorage();
      storage.set('openai_api_key', key);
      this.apiKey = key;
    } catch (error) {
      console.error('Error saving API key:', error);
      throw new Error('Failed to save API key securely');
    }
  }

  async getApiKey(): Promise<string | undefined> {
    if (!this.apiKey) {
      await this.initializeApiKey();
    }
    return this.apiKey;
  }

  async callLLM(systemPrompt: string, userPrompt: string, maxTokens: number = 1000): Promise<any> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set your API key in App Settings.');
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective model for analysis
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3, // Lower temperature for consistent analysis
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LLM API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from LLM');
    }

    try {
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse LLM response as JSON:', content);
      throw new Error('Invalid JSON response from LLM');
    }
  }

  async analyzeScene(text: string, context: SceneContext): Promise<SceneAnalysis> {
    const enrichedPrompt = this.buildContextualPrompt(text, context);
    
    const systemPrompt = `You are an expert literary analyst. Analyze this scene for narrative elements, emotional content, pacing, and structural function. Focus on objective, measurable qualities that aid revision.

Return analysis as JSON with this exact structure:
{
  "summary": "2-3 sentence summary of key events",
  "primaryEmotion": "dominant emotion (anger, fear, joy, sadness, disgust, surprise, love, etc.)",
  "secondaryEmotion": "secondary emotion or null",
  "tensionLevel": 0-100,
  "pacingScore": 0-100,
  "functionTags": ["exposition", "rising_action", "climax", "falling_action", "resolution", "character_development", "world_building", "dialogue_heavy", "action_sequence", "internal_monologue"],
  "voiceFingerprint": {
    "averageSentenceLength": number,
    "complexSentenceRatio": 0-1,
    "dialogueToNarrationRatio": 0-1,
    "commonWords": ["most", "frequent", "words"],
    "uniqueStyleMarkers": ["distinctive", "phrases", "or", "patterns"],
    "emotionalTone": "description"
  },
  "conflictPresent": true/false,
  "characterIntroduced": true/false
}`;

    const response = await this.callLLM(systemPrompt, enrichedPrompt, 1500);
    
    return {
      id: '', // Will be set by caller
      sceneId: '', // Will be set by caller
      summary: response.summary,
      primaryEmotion: response.primaryEmotion,
      secondaryEmotion: response.secondaryEmotion,
      tensionLevel: response.tensionLevel,
      pacingScore: response.pacingScore,
      functionTags: response.functionTags,
      voiceFingerprint: response.voiceFingerprint,
      conflictPresent: response.conflictPresent,
      characterIntroduced: response.characterIntroduced,
      analyzedAt: Date.now()
    };
  }

  async analyzeOpening(firstPages: string, genre: string, comps: string[] = []): Promise<OpeningAnalysis> {
    const systemPrompt = `You are a literary agent's first reader. Evaluate manuscript openings with publishing industry expectations. Be rigorous but constructive.

GENRE: ${genre}
COMP TITLES: ${comps.join(', ') || 'None provided'}

Analyze these opening pages (≤1250 words) for:
1. Hook effectiveness (compels continued reading?)
2. Voice establishment (distinctive and appropriate?)
3. Character introduction (compelling and clear goals?)
4. Conflict seeds (tension/problem evident?)
5. Genre fit (meets expectations?)

Return JSON:
{
  "hookType": "action|voice|mystery|character|setting",
  "hookStrength": 0-100,
  "voiceEstablished": true/false,
  "characterEstablished": true/false,
  "conflictEstablished": true/false,
  "genreAppropriate": true/false,
  "similarToComps": ["comp1", "comp2"],
  "agentReadinessScore": 0-100,
  "analysisNotes": "Specific, actionable feedback focusing on the most important issues",
  "firstLineStrength": 0-100,
  "suggestions": ["specific", "actionable", "improvements"]
}`;

    const response = await this.callLLM(systemPrompt, firstPages, 1500);
    
    return {
      id: '', // Will be set by caller
      manuscriptId: '', // Will be set by caller
      hookType: response.hookType,
      hookStrength: response.hookStrength,
      voiceEstablished: response.voiceEstablished,
      characterEstablished: response.characterEstablished,
      conflictEstablished: response.conflictEstablished,
      genreAppropriate: response.genreAppropriate,
      similarToComps: response.similarToComps,
      agentReadinessScore: response.agentReadinessScore,
      analysisNotes: response.analysisNotes,
      analyzedAt: Date.now()
    };
  }

  async analyzeCharacterVoice(dialogue: string[], characterName: string, existingProfile?: VoiceFingerprint): Promise<CharacterVoice> {
    const dialogueText = dialogue.join('\n\n');
    
    let systemPrompt = `You are a dialogue coach ensuring character voices remain distinct and consistent.

CHARACTER: ${characterName}
`;

    if (existingProfile) {
      systemPrompt += `
ESTABLISHED VOICE PROFILE:
- Avg sentence length: ${existingProfile.averageSentenceLength}
- Complex sentence ratio: ${existingProfile.complexSentenceRatio}
- Dialogue/narration ratio: ${existingProfile.dialogueToNarrationRatio}
- Common words: ${existingProfile.commonWords.join(', ')}
- Style markers: ${existingProfile.uniqueStyleMarkers.join(', ')}
- Emotional tone: ${existingProfile.emotionalTone}

ANALYZE for consistency with established voice.`;
    } else {
      systemPrompt += `
ANALYZE this dialogue to establish voice profile.`;
    }

    systemPrompt += `

Return JSON:
{
  "vocabularyLevel": 1-20,
  "sentencePatterns": [
    {"type": "simple|compound|complex|compound-complex", "frequency": 0-1, "averageLength": number}
  ],
  "uniquePhrases": ["distinctive", "expressions"],
  "emotionalRegister": "formal|informal|casual|intimate|professional",
  "consistencyScore": 0-100
}`;

    const response = await this.callLLM(systemPrompt, `DIALOGUE TO ANALYZE:\n${dialogueText}`, 1000);
    
    return {
      id: '', // Will be set by caller
      characterId: '', // Will be set by caller
      sceneId: '', // Will be set by caller
      dialogueSample: dialogueText.slice(0, 500), // Store sample
      vocabularyLevel: response.vocabularyLevel,
      sentencePatterns: response.sentencePatterns,
      uniquePhrases: response.uniquePhrases,
      emotionalRegister: response.emotionalRegister,
      consistencyScore: response.consistencyScore || 100 // Default for new profiles
    };
  }

  async analyzePacing(scenes: SceneInfo[], genre: string): Promise<PacingAnalysis> {
    // Build manuscript pacing profile
    const totalWords = scenes.reduce((sum, scene) => sum + scene.wordCount, 0);
    const averageSceneLength = totalWords / scenes.length;
    const sceneLengths = scenes.map(s => s.wordCount);
    
    const systemPrompt = `You are a pacing expert analyzing manuscript structure against ${genre} conventions.

MANUSCRIPT DATA:
- Total scenes: ${scenes.length}
- Total words: ${totalWords}
- Average scene length: ${Math.round(averageSceneLength)}
- Scene length variance: ${this.calculateVariance(sceneLengths)}

Analyze pacing and structure:

Return JSON:
{
  "beatsPerThousand": number,
  "tensionArc": [0-100 values for each act],
  "compTitleComparison": {
    "title": "Similar ${genre} novel",
    "similarities": ["aspects that align"],
    "differences": ["aspects that diverge"],
    "alignmentScore": 0-100
  },
  "suggestions": "Specific pacing improvements needed",
  "actBreaks": [scene_number_for_act_1_end, scene_number_for_act_2_end]
}`;

    const sceneData = scenes.map(s => `Scene ${s.sceneNumber}: ${s.wordCount} words, Chapter ${s.chapterNumber || 1}`).join('\n');
    
    const response = await this.callLLM(systemPrompt, `SCENE BREAKDOWN:\n${sceneData}`, 1200);
    
    return {
      id: '', // Will be set by caller
      manuscriptId: '', // Will be set by caller
      actNumber: 1, // Full manuscript analysis
      beatsPerThousand: response.beatsPerThousand,
      tensionArc: response.tensionArc,
      compTitleComparison: response.compTitleComparison,
      suggestions: response.suggestions
    };
  }

  async findWeakestElement(scene: string): Promise<{element: string, issue: string, fix: string}> {
    const systemPrompt = `Identify the single weakest element in this scene that most needs revision. Focus on structural issues, not style preferences.

Return JSON:
{
  "element": "dialogue|description|action|pacing|character_motivation|conflict|transition",
  "issue": "Specific problem description",
  "fix": "Concrete, actionable solution"
}`;

    const response = await this.callLLM(systemPrompt, scene, 800);
    return response;
  }

  async suggestHook(scene: string, position: "opening" | "ending"): Promise<Hook> {
    const systemPrompt = `Suggest a compelling ${position} hook for this scene. Focus on immediate engagement and forward momentum.

Return JSON:
{
  "type": "action|dialogue|mystery|character|setting",
  "strength": 0-100,
  "location": word_position_in_text,
  "suggestion": "Specific text or approach to create the hook"
}`;

    const response = await this.callLLM(systemPrompt, scene, 600);
    return response;
  }

  async checkVoiceConsistency(dialogue: string, voiceProfile: VoiceFingerprint): Promise<ConsistencyReport> {
    const systemPrompt = `Compare this dialogue against the established voice profile. Identify inconsistencies and drift.

ESTABLISHED VOICE:
${JSON.stringify(voiceProfile, null, 2)}

Return JSON:
{
  "score": 0-100,
  "maintainedElements": ["aspects that remained consistent"],
  "driftDetected": ["specific inconsistencies"],
  "specificFixes": [
    {"line": "problematic dialogue", "issue": "what's wrong", "suggestion": "how to fix"}
  ]
}`;

    const response = await this.callLLM(systemPrompt, dialogue, 1000);
    return response;
  }

  async detectPlotHoles(scenes: Scene[], context: ManuscriptContext): Promise<PlotHole[]> {
    // Process in sliding windows for continuity checking
    const windows = this.createSlidingWindows(scenes, 5);
    const issues: PlotHole[] = [];

    for (const window of windows) {
      const windowText = window.map(s => `Scene ${s.indexInManuscript}: ${s.rawText}`).join('\n\n---\n\n');
      
      const systemPrompt = `Identify plot holes, continuity errors, and logical inconsistencies in this scene sequence. Focus on:
- Character locations/capabilities
- Object appearance/disappearance  
- Timeline inconsistencies
- Contradictory facts
- Missing logical connections

Return JSON:
{
  "plotHoles": [
    {
      "type": "continuity|logic|character|timeline|object",
      "severity": "minor|moderate|major", 
      "description": "Clear description of the issue",
      "affectedScenes": ["scene_ids"],
      "suggestion": "How to fix this issue"
    }
  ]
}`;

      try {
        const response = await this.callLLM(systemPrompt, windowText, 1200);
        if (response.plotHoles && Array.isArray(response.plotHoles)) {
          issues.push(...response.plotHoles.map((hole: any) => ({
            id: '', // Will be set by caller
            type: hole.type,
            severity: hole.severity,
            description: hole.description,
            affectedScenes: hole.affectedScenes,
            suggestion: hole.suggestion
          })));
        }
      } catch (error) {
        console.warn('Plot hole detection failed for window:', error);
      }
    }

    return this.consolidateIssues(issues);
  }

  async suggestTensionAdjustment(scene: string, targetTension: number): Promise<Edit[]> {
    const systemPrompt = `Suggest specific edits to adjust scene tension to ${targetTension}/100. Focus on concrete text changes.

Return JSON:
{
  "edits": [
    {
      "type": "replace|insert|delete",
      "start": character_position,
      "end": character_position,
      "text": "replacement or inserted text",
      "reason": "why this change increases/decreases tension"
    }
  ]
}`;

    const response = await this.callLLM(systemPrompt, scene, 1000);
    return response.edits || [];
  }

  async compareToCompTitle(manuscript: PacingProfile, compTitle: string): Promise<CompTitleComparison> {
    const systemPrompt = `Compare this manuscript's pacing profile to "${compTitle}". Identify strengths, weaknesses, and alignment.

MANUSCRIPT PROFILE:
${JSON.stringify(manuscript, null, 2)}

Return JSON:
{
  "title": "${compTitle}",
  "similarities": ["pacing aspects that align well"],
  "differences": ["significant pacing differences"],
  "alignmentScore": 0-100
}`;

    const response = await this.callLLM(systemPrompt, `Analyze pacing comparison with ${compTitle}`, 800);
    return response;
  }

  // Helper methods
  private buildContextualPrompt(text: string, context: SceneContext): string {
    return `CONTEXT:
Previous scene: ${context.previousSummary || "Beginning of manuscript"}
Next scene opening: ${context.nextOpening?.slice(0, 150) || "End of manuscript"}
Position: Scene ${context.positionInChapter}/${context.totalScenesInChapter} in Chapter ${context.chapterNumber || 1}
Genre: ${context.manuscriptGenre || "Unknown"}
Characters present: ${context.charactersPresent.join(', ') || "None specified"}

SCENE TO ANALYZE:
${text}`;
  }

  private createSlidingWindows<T>(items: T[], windowSize: number): T[][] {
    const windows: T[][] = [];
    for (let i = 0; i <= items.length - windowSize; i++) {
      windows.push(items.slice(i, i + windowSize));
    }
    return windows;
  }

  private consolidateIssues(issues: PlotHole[]): PlotHole[] {
    // Remove duplicates and merge similar issues
    const consolidated = new Map<string, PlotHole>();
    
    for (const issue of issues) {
      const key = `${issue.type}-${issue.description.slice(0, 50)}`;
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.affectedScenes = [...new Set([...existing.affectedScenes, ...issue.affectedScenes])];
      } else {
        consolidated.set(key, { ...issue, id: key });
      }
    }
    
    return Array.from(consolidated.values());
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
  }
}

// Anthropic Claude Provider
export class ClaudeProvider implements LLMProvider {
  private apiKey: string | undefined;
  private readonly baseURL = 'https://api.anthropic.com/v1';
  private readonly model = 'claude-3-sonnet-20240229';

  constructor(apiKey?: string) {
    this.initializeApiKey(apiKey);
  }

  getName(): string {
    return 'Anthropic Claude';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey();
      return !!apiKey;
    } catch {
      return false;
    }
  }

  supportsStreaming(): boolean {
    return true;
  }

  private async initializeApiKey(providedKey?: string): Promise<void> {
    if (providedKey) {
      this.apiKey = providedKey;
      return;
    }

    try {
      const storage = await getSecureStorage();
      this.apiKey = storage.getString('anthropic_api_key');
    } catch (error) {
      console.error('Error loading Anthropic API key:', error);
      this.apiKey = undefined;
    }
  }

  async setApiKey(key: string): Promise<void> {
    try {
      const storage = await getSecureStorage();
      storage.set('anthropic_api_key', key);
      this.apiKey = key;
    } catch (error) {
      console.error('Error saving Anthropic API key:', error);
      throw new Error('Failed to save API key securely');
    }
  }

  async getApiKey(): Promise<string | undefined> {
    if (!this.apiKey) {
      await this.initializeApiKey();
    }
    return this.apiKey;
  }

  async callLLM(systemPrompt: string, userPrompt: string, maxTokens: number = 1000): Promise<any> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('Anthropic API key not configured. Please set your API key in App Settings.');
    }

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: maxTokens,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text;
    
    if (!content) {
      throw new Error('No response from Claude');
    }

    try {
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse Claude response as JSON:', content);
      throw new Error('Invalid JSON response from Claude');
    }
  }

  // Implement the same analysis methods as ChunkedLLMProvider
  async analyzeScene(text: string, context: SceneContext): Promise<SceneAnalysis> {
    const enrichedPrompt = this.buildContextualPrompt(text, context);
    
    const systemPrompt = `You are an expert literary analyst. Analyze this scene for narrative elements, emotional content, pacing, and structural function. Focus on objective, measurable qualities that aid revision.

Return analysis as JSON with this exact structure:
{
  "summary": "2-3 sentence summary of key events",
  "primaryEmotion": "dominant emotion (anger, fear, joy, sadness, disgust, surprise, love, etc.)",
  "secondaryEmotion": "secondary emotion or null",
  "tensionLevel": 0-100,
  "pacingScore": 0-100,
  "functionTags": ["exposition", "rising_action", "climax", "falling_action", "resolution", "character_development", "world_building", "dialogue_heavy", "action_sequence", "internal_monologue"],
  "voiceFingerprint": {
    "averageSentenceLength": number,
    "complexSentenceRatio": 0-1,
    "dialogueToNarrationRatio": 0-1,
    "commonWords": ["most", "frequent", "words"],
    "uniqueStyleMarkers": ["distinctive", "phrases", "or", "patterns"],
    "emotionalTone": "description"
  },
  "conflictPresent": true/false,
  "characterIntroduced": true/false
}`;

    const response = await this.callLLM(systemPrompt, enrichedPrompt, 1500);
    
    return {
      id: '',
      sceneId: '',
      summary: response.summary,
      primaryEmotion: response.primaryEmotion,
      secondaryEmotion: response.secondaryEmotion,
      tensionLevel: response.tensionLevel,
      pacingScore: response.pacingScore,
      functionTags: response.functionTags,
      voiceFingerprint: response.voiceFingerprint,
      conflictPresent: response.conflictPresent,
      characterIntroduced: response.characterIntroduced,
      analyzedAt: Date.now()
    };
  }

  async analyzeOpening(firstPages: string, genre: string, comps: string[] = []): Promise<OpeningAnalysis> {
    const systemPrompt = `You are a literary agent's first reader. Evaluate manuscript openings with publishing industry expectations. Be rigorous but constructive.

GENRE: ${genre}
COMP TITLES: ${comps.join(', ') || 'None provided'}

Analyze these opening pages (≤1250 words) for:
1. Hook effectiveness (compels continued reading?)
2. Voice establishment (distinctive and appropriate?)
3. Character introduction (compelling and clear goals?)
4. Conflict seeds (tension/problem evident?)
5. Genre fit (meets expectations?)

Return JSON:
{
  "hookType": "action|voice|mystery|character|setting",
  "hookStrength": 0-100,
  "voiceEstablished": true/false,
  "characterEstablished": true/false,
  "conflictEstablished": true/false,
  "genreAppropriate": true/false,
  "similarToComps": ["comp1", "comp2"],
  "agentReadinessScore": 0-100,
  "analysisNotes": "Specific, actionable feedback focusing on the most important issues",
  "firstLineStrength": 0-100,
  "suggestions": ["specific", "actionable", "improvements"]
}`;

    const response = await this.callLLM(systemPrompt, firstPages, 1500);
    
    return {
      id: '',
      manuscriptId: '',
      hookType: response.hookType,
      hookStrength: response.hookStrength,
      voiceEstablished: response.voiceEstablished,
      characterEstablished: response.characterEstablished,
      conflictEstablished: response.conflictEstablished,
      genreAppropriate: response.genreAppropriate,
      similarToComps: response.similarToComps,
      agentReadinessScore: response.agentReadinessScore,
      analysisNotes: response.analysisNotes,
      analyzedAt: Date.now()
    };
  }

  // Implement other required methods with the same logic as ChunkedLLMProvider
  async analyzeCharacterVoice(dialogue: string[], characterName: string, existingProfile?: VoiceFingerprint): Promise<CharacterVoice> {
    // Same implementation as ChunkedLLMProvider but using Claude API
    const dialogueText = dialogue.join('\n\n');
    
    let systemPrompt = `You are a dialogue coach ensuring character voices remain distinct and consistent.

CHARACTER: ${characterName}
`;

    if (existingProfile) {
      systemPrompt += `
ESTABLISHED VOICE PROFILE:
- Avg sentence length: ${existingProfile.averageSentenceLength}
- Complex sentence ratio: ${existingProfile.complexSentenceRatio}
- Dialogue/narration ratio: ${existingProfile.dialogueToNarrationRatio}
- Common words: ${existingProfile.commonWords.join(', ')}
- Style markers: ${existingProfile.uniqueStyleMarkers.join(', ')}
- Emotional tone: ${existingProfile.emotionalTone}

ANALYZE for consistency with established voice.`;
    } else {
      systemPrompt += `
ANALYZE this dialogue to establish voice profile.`;
    }

    systemPrompt += `

Return JSON:
{
  "vocabularyLevel": 1-20,
  "sentencePatterns": [
    {"type": "simple|compound|complex|compound-complex", "frequency": 0-1, "averageLength": number}
  ],
  "uniquePhrases": ["distinctive", "expressions"],
  "emotionalRegister": "formal|informal|casual|intimate|professional",
  "consistencyScore": 0-100
}`;

    const response = await this.callLLM(systemPrompt, `DIALOGUE TO ANALYZE:\n${dialogueText}`, 1000);
    
    return {
      id: '',
      characterId: '',
      sceneId: '',
      dialogueSample: dialogueText.slice(0, 500),
      vocabularyLevel: response.vocabularyLevel,
      sentencePatterns: response.sentencePatterns,
      uniquePhrases: response.uniquePhrases,
      emotionalRegister: response.emotionalRegister,
      consistencyScore: response.consistencyScore || 100
    };
  }

  async analyzePacing(scenes: SceneInfo[], genre: string): Promise<PacingAnalysis> {
    const totalWords = scenes.reduce((sum, scene) => sum + scene.wordCount, 0);
    const averageSceneLength = totalWords / scenes.length;
    const sceneLengths = scenes.map(s => s.wordCount);
    
    const systemPrompt = `You are a pacing expert analyzing manuscript structure against ${genre} conventions.

MANUSCRIPT DATA:
- Total scenes: ${scenes.length}
- Total words: ${totalWords}
- Average scene length: ${Math.round(averageSceneLength)}
- Scene length variance: ${this.calculateVariance(sceneLengths)}

Analyze pacing and structure:

Return JSON:
{
  "beatsPerThousand": number,
  "tensionArc": [0-100 values for each act],
  "compTitleComparison": {
    "title": "Similar ${genre} novel",
    "similarities": ["aspects that align"],
    "differences": ["aspects that diverge"],
    "alignmentScore": 0-100
  },
  "suggestions": "Specific pacing improvements needed",
  "actBreaks": [scene_number_for_act_1_end, scene_number_for_act_2_end]
}`;

    const sceneData = scenes.map(s => `Scene ${s.sceneNumber}: ${s.wordCount} words, Chapter ${s.chapterNumber || 1}`).join('\n');
    
    const response = await this.callLLM(systemPrompt, `SCENE BREAKDOWN:\n${sceneData}`, 1200);
    
    return {
      id: '',
      manuscriptId: '',
      actNumber: 1,
      beatsPerThousand: response.beatsPerThousand,
      tensionArc: response.tensionArc,
      compTitleComparison: response.compTitleComparison,
      suggestions: response.suggestions
    };
  }

  async findWeakestElement(scene: string): Promise<{element: string, issue: string, fix: string}> {
    const systemPrompt = `Identify the single weakest element in this scene that most needs revision. Focus on structural issues, not style preferences.

Return JSON:
{
  "element": "dialogue|description|action|pacing|character_motivation|conflict|transition",
  "issue": "Specific problem description",
  "fix": "Concrete, actionable solution"
}`;

    const response = await this.callLLM(systemPrompt, scene, 800);
    return response;
  }

  async suggestHook(scene: string, position: "opening" | "ending"): Promise<Hook> {
    const systemPrompt = `Suggest a compelling ${position} hook for this scene. Focus on immediate engagement and forward momentum.

Return JSON:
{
  "type": "action|dialogue|mystery|character|setting",
  "strength": 0-100,
  "location": word_position_in_text,
  "suggestion": "Specific text or approach to create the hook"
}`;

    const response = await this.callLLM(systemPrompt, scene, 600);
    return response;
  }

  async checkVoiceConsistency(dialogue: string, voiceProfile: VoiceFingerprint): Promise<ConsistencyReport> {
    const systemPrompt = `Compare this dialogue against the established voice profile. Identify inconsistencies and drift.

ESTABLISHED VOICE:
${JSON.stringify(voiceProfile, null, 2)}

Return JSON:
{
  "score": 0-100,
  "maintainedElements": ["aspects that remained consistent"],
  "driftDetected": ["specific inconsistencies"],
  "specificFixes": [
    {"line": "problematic dialogue", "issue": "what's wrong", "suggestion": "how to fix"}
  ]
}`;

    const response = await this.callLLM(systemPrompt, dialogue, 1000);
    return response;
  }

  async detectPlotHoles(scenes: Scene[], context: ManuscriptContext): Promise<PlotHole[]> {
    const windows = this.createSlidingWindows(scenes, 5);
    const issues: PlotHole[] = [];

    for (const window of windows) {
      const windowText = window.map(s => `Scene ${s.indexInManuscript}: ${s.rawText}`).join('\n\n---\n\n');
      
      const systemPrompt = `Identify plot holes, continuity errors, and logical inconsistencies in this scene sequence. Focus on:
- Character locations/capabilities
- Object appearance/disappearance  
- Timeline inconsistencies
- Contradictory facts
- Missing logical connections

Return JSON:
{
  "plotHoles": [
    {
      "type": "continuity|logic|character|timeline|object",
      "severity": "minor|moderate|major", 
      "description": "Clear description of the issue",
      "affectedScenes": ["scene_ids"],
      "suggestion": "How to fix this issue"
    }
  ]
}`;

      try {
        const response = await this.callLLM(systemPrompt, windowText, 1200);
        if (response.plotHoles && Array.isArray(response.plotHoles)) {
          issues.push(...response.plotHoles.map((hole: any) => ({
            id: '',
            type: hole.type,
            severity: hole.severity,
            description: hole.description,
            affectedScenes: hole.affectedScenes,
            suggestion: hole.suggestion
          })));
        }
      } catch (error) {
        console.warn('Plot hole detection failed for window:', error);
      }
    }

    return this.consolidateIssues(issues);
  }

  async suggestTensionAdjustment(scene: string, targetTension: number): Promise<Edit[]> {
    const systemPrompt = `Suggest specific edits to adjust scene tension to ${targetTension}/100. Focus on concrete text changes.

Return JSON:
{
  "edits": [
    {
      "type": "replace|insert|delete",
      "start": character_position,
      "end": character_position,
      "text": "replacement or inserted text",
      "reason": "why this change increases/decreases tension"
    }
  ]
}`;

    const response = await this.callLLM(systemPrompt, scene, 1000);
    return response.edits || [];
  }

  async compareToCompTitle(manuscript: PacingProfile, compTitle: string): Promise<CompTitleComparison> {
    const systemPrompt = `Compare this manuscript's pacing profile to "${compTitle}". Identify strengths, weaknesses, and alignment.

MANUSCRIPT PROFILE:
${JSON.stringify(manuscript, null, 2)}

Return JSON:
{
  "title": "${compTitle}",
  "similarities": ["pacing aspects that align well"],
  "differences": ["significant pacing differences"],
  "alignmentScore": 0-100
}`;

    const response = await this.callLLM(systemPrompt, `Analyze pacing comparison with ${compTitle}`, 800);
    return response;
  }

  // Helper methods
  private buildContextualPrompt(text: string, context: SceneContext): string {
    return `CONTEXT:
Previous scene: ${context.previousSummary || "Beginning of manuscript"}
Next scene opening: ${context.nextOpening?.slice(0, 150) || "End of manuscript"}
Position: Scene ${context.positionInChapter}/${context.totalScenesInChapter} in Chapter ${context.chapterNumber || 1}
Genre: ${context.manuscriptGenre || "Unknown"}
Characters present: ${context.charactersPresent.join(', ') || "None specified"}

SCENE TO ANALYZE:
${text}`;
  }

  private createSlidingWindows<T>(items: T[], windowSize: number): T[][] {
    const windows: T[][] = [];
    for (let i = 0; i <= items.length - windowSize; i++) {
      windows.push(items.slice(i, i + windowSize));
    }
    return windows;
  }

  private consolidateIssues(issues: PlotHole[]): PlotHole[] {
    const consolidated = new Map<string, PlotHole>();
    
    for (const issue of issues) {
      const key = `${issue.type}-${issue.description.slice(0, 50)}`;
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.affectedScenes = [...new Set([...existing.affectedScenes, ...issue.affectedScenes])];
      } else {
        consolidated.set(key, { ...issue, id: key });
      }
    }
    
    return Array.from(consolidated.values());
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
  }
}

// Ollama Provider for local inference
export class OllamaProvider implements LLMProvider {
  private readonly baseURL: string;
  private readonly model: string;

  constructor(baseURL: string = 'http://localhost:11434', model: string = 'llama3.1') {
    this.baseURL = baseURL;
    this.model = model;
  }

  getName(): string {
    return `Ollama (${this.model})`;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      const data = await response.json();
      return data.models && data.models.some((m: any) => m.name.includes(this.model));
    } catch {
      return false;
    }
  }

  supportsStreaming(): boolean {
    return true;
  }

  async callLLM(systemPrompt: string, userPrompt: string, maxTokens: number = 1000): Promise<any> {
    const response = await fetch(`${this.baseURL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        stream: false,
        options: {
          num_predict: maxTokens,
          temperature: 0.3
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.response;
    
    if (!content) {
      throw new Error('No response from Ollama');
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (e) {
      console.error('Failed to parse Ollama response as JSON:', content);
      throw new Error('Invalid JSON response from Ollama');
    }
  }

  // Implement the same analysis methods as other providers
  async analyzeScene(text: string, context: SceneContext): Promise<SceneAnalysis> {
    const enrichedPrompt = this.buildContextualPrompt(text, context);
    
    const systemPrompt = `You are an expert literary analyst. Analyze this scene for narrative elements, emotional content, pacing, and structural function. Focus on objective, measurable qualities that aid revision.

Return analysis as JSON with this exact structure:
{
  "summary": "2-3 sentence summary of key events",
  "primaryEmotion": "dominant emotion (anger, fear, joy, sadness, disgust, surprise, love, etc.)",
  "secondaryEmotion": "secondary emotion or null",
  "tensionLevel": 0-100,
  "pacingScore": 0-100,
  "functionTags": ["exposition", "rising_action", "climax", "falling_action", "resolution", "character_development", "world_building", "dialogue_heavy", "action_sequence", "internal_monologue"],
  "voiceFingerprint": {
    "averageSentenceLength": 15,
    "complexSentenceRatio": 0.3,
    "dialogueToNarrationRatio": 0.4,
    "commonWords": ["said", "the", "and"],
    "uniqueStyleMarkers": ["distinctive", "phrases"],
    "emotionalTone": "description"
  },
  "conflictPresent": true,
  "characterIntroduced": false
}`;

    const response = await this.callLLM(systemPrompt, enrichedPrompt, 1500);
    
    return {
      id: '',
      sceneId: '',
      summary: response.summary || 'Scene analysis completed',
      primaryEmotion: response.primaryEmotion || 'neutral',
      secondaryEmotion: response.secondaryEmotion,
      tensionLevel: response.tensionLevel || 50,
      pacingScore: response.pacingScore || 50,
      functionTags: response.functionTags || ['general'],
      voiceFingerprint: response.voiceFingerprint || {
        averageSentenceLength: 15,
        complexSentenceRatio: 0.3,
        dialogueToNarrationRatio: 0.4,
        commonWords: ['the', 'and', 'a'],
        uniqueStyleMarkers: [],
        emotionalTone: 'neutral'
      },
      conflictPresent: response.conflictPresent ?? false,
      characterIntroduced: response.characterIntroduced ?? false,
      analyzedAt: Date.now()
    };
  }

  // Simplified implementations for other methods for Ollama
  async analyzeOpening(firstPages: string, genre: string, comps: string[] = []): Promise<OpeningAnalysis> {
    const systemPrompt = `Analyze this opening for hook effectiveness, voice, character, conflict, and genre fit. Return JSON format.`;
    
    try {
      const response = await this.callLLM(systemPrompt, firstPages, 1000);
      return {
        id: '',
        manuscriptId: '',
        hookType: response.hookType || 'character',
        hookStrength: response.hookStrength || 60,
        voiceEstablished: response.voiceEstablished ?? true,
        characterEstablished: response.characterEstablished ?? true,
        conflictEstablished: response.conflictEstablished ?? false,
        genreAppropriate: response.genreAppropriate ?? true,
        similarToComps: response.similarToComps || [],
        agentReadinessScore: response.agentReadinessScore || 70,
        analysisNotes: response.analysisNotes || 'Opening analysis completed',
        analyzedAt: Date.now()
      };
    } catch (error) {
      console.warn('Ollama opening analysis failed, returning default:', error);
      return {
        id: '', manuscriptId: '', hookType: 'character', hookStrength: 60,
        voiceEstablished: true, characterEstablished: true, conflictEstablished: false,
        genreAppropriate: true, similarToComps: [], agentReadinessScore: 70,
        analysisNotes: 'Basic analysis completed (offline mode)', analyzedAt: Date.now()
      };
    }
  }

  async analyzeCharacterVoice(dialogue: string[], characterName: string, existingProfile?: VoiceFingerprint): Promise<CharacterVoice> {
    return {
      id: '', characterId: '', sceneId: '', dialogueSample: dialogue.join(' ').slice(0, 500),
      vocabularyLevel: 12, sentencePatterns: [], uniquePhrases: [], 
      emotionalRegister: 'casual', consistencyScore: 80
    };
  }

  async analyzePacing(scenes: SceneInfo[], genre: string): Promise<PacingAnalysis> {
    return {
      id: '', manuscriptId: '', actNumber: 1, beatsPerThousand: 15,
      tensionArc: [30, 50, 70, 40], compTitleComparison: {
        title: 'Generic comparison', similarities: [], differences: [], alignmentScore: 70
      }, suggestions: 'Pacing analysis completed offline'
    };
  }

  async findWeakestElement(scene: string): Promise<{element: string, issue: string, fix: string}> {
    return { element: 'pacing', issue: 'Scene may benefit from tension adjustment', fix: 'Consider adding conflict or urgency' };
  }

  async suggestHook(scene: string, position: "opening" | "ending"): Promise<Hook> {
    return { type: 'character', strength: 70, location: 0, suggestion: 'Focus on character motivation' };
  }

  async checkVoiceConsistency(dialogue: string, voiceProfile: VoiceFingerprint): Promise<ConsistencyReport> {
    return {
      score: 75, maintainedElements: ['emotional tone'], driftDetected: [], 
      specificFixes: []
    };
  }

  async detectPlotHoles(scenes: Scene[], context: ManuscriptContext): Promise<PlotHole[]> {
    return [];
  }

  async suggestTensionAdjustment(scene: string, targetTension: number): Promise<Edit[]> {
    return [];
  }

  async compareToCompTitle(manuscript: PacingProfile, compTitle: string): Promise<CompTitleComparison> {
    return {
      title: compTitle, similarities: ['pacing'], differences: ['style'], alignmentScore: 70
    };
  }

  private buildContextualPrompt(text: string, context: SceneContext): string {
    return `CONTEXT: ${context.manuscriptGenre || "Unknown genre"} scene ${context.positionInChapter}/${context.totalScenesInChapter}

SCENE TO ANALYZE:
${text}`;
  }
}

// Fallback/Offline Provider
export class OfflineProvider implements LLMProvider {
  getName(): string {
    return 'Offline Mode';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  supportsStreaming(): boolean {
    return false;
  }

  async analyzeScene(text: string, context: SceneContext): Promise<SceneAnalysis> {
    // Basic heuristic analysis
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const dialogueMarkers = (text.match(/["'"]/g) || []).length;
    
    const avgSentenceLength = wordCount / sentenceCount;
    const dialogueRatio = dialogueMarkers / (wordCount * 2);
    
    let tensionLevel = 40;
    if (/fight|attack|danger|threat|afraid|panic/i.test(text)) tensionLevel += 20;
    if (/love|kiss|heart|feel/i.test(text)) tensionLevel += 10;
    
    let primaryEmotion = 'neutral';
    if (/angry|mad|furious/i.test(text)) primaryEmotion = 'anger';
    else if (/sad|cry|tears/i.test(text)) primaryEmotion = 'sadness';
    else if (/happy|joy|laugh/i.test(text)) primaryEmotion = 'joy';
    else if (/afraid|fear|scary/i.test(text)) primaryEmotion = 'fear';

    return {
      id: '', sceneId: '', 
      summary: `Scene with approximately ${wordCount} words and ${sentenceCount} sentences`,
      primaryEmotion, secondaryEmotion: null,
      tensionLevel: Math.min(100, tensionLevel),
      pacingScore: wordCount < 500 ? 70 : wordCount > 2000 ? 40 : 55,
      functionTags: dialogueRatio > 0.3 ? ['dialogue_heavy'] : ['description_heavy'],
      voiceFingerprint: {
        averageSentenceLength: Math.round(avgSentenceLength),
        complexSentenceRatio: 0.3,
        dialogueToNarrationRatio: Math.min(1, dialogueRatio),
        commonWords: ['the', 'and', 'a'],
        uniqueStyleMarkers: [],
        emotionalTone: primaryEmotion
      },
      conflictPresent: /conflict|problem|issue|tension/i.test(text),
      characterIntroduced: /character|person|name/i.test(text),
      analyzedAt: Date.now()
    };
  }

  async analyzeOpening(firstPages: string, genre: string, comps: string[] = []): Promise<OpeningAnalysis> {
    const hookStrength = firstPages.length > 1000 ? 60 : 40;
    
    return {
      id: '', manuscriptId: '',
      hookType: 'character', hookStrength,
      voiceEstablished: true, characterEstablished: true,
      conflictEstablished: false, genreAppropriate: true,
      similarToComps: [], agentReadinessScore: 65,
      analysisNotes: 'Basic offline analysis completed. Consider using online analysis for detailed feedback.',
      analyzedAt: Date.now()
    };
  }

  async analyzeCharacterVoice(dialogue: string[], characterName: string, existingProfile?: VoiceFingerprint): Promise<CharacterVoice> {
    return {
      id: '', characterId: '', sceneId: '',
      dialogueSample: dialogue.join(' ').slice(0, 500),
      vocabularyLevel: 12, sentencePatterns: [], uniquePhrases: [],
      emotionalRegister: 'casual', consistencyScore: 75
    };
  }

  async analyzePacing(scenes: SceneInfo[], genre: string): Promise<PacingAnalysis> {
    return {
      id: '', manuscriptId: '', actNumber: 1,
      beatsPerThousand: 12, tensionArc: [30, 40, 60, 35],
      compTitleComparison: { title: 'Offline analysis', similarities: [], differences: [], alignmentScore: 50 },
      suggestions: 'Connect to internet for detailed pacing analysis'
    };
  }

  async findWeakestElement(scene: string): Promise<{element: string, issue: string, fix: string}> {
    return {
      element: 'analysis_limited',
      issue: 'Offline analysis provides basic feedback only',
      fix: 'Connect to internet for detailed AI analysis'
    };
  }

  async suggestHook(scene: string, position: "opening" | "ending"): Promise<Hook> {
    return {
      type: 'character', strength: 50, location: 0,
      suggestion: 'Consider online analysis for specific hook suggestions'
    };
  }

  async checkVoiceConsistency(dialogue: string, voiceProfile: VoiceFingerprint): Promise<ConsistencyReport> {
    return {
      score: 70, maintainedElements: ['basic structure'], driftDetected: [],
      specificFixes: []
    };
  }

  async detectPlotHoles(scenes: Scene[], context: ManuscriptContext): Promise<PlotHole[]> {
    return [];
  }

  async suggestTensionAdjustment(scene: string, targetTension: number): Promise<Edit[]> {
    return [];
  }

  async compareToCompTitle(manuscript: PacingProfile, compTitle: string): Promise<CompTitleComparison> {
    return {
      title: compTitle, similarities: [], differences: [], alignmentScore: 50
    };
  }
}

// Provider Manager
export class LLMProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private currentProvider: string = 'openai';

  constructor() {
    this.providers.set('openai', new ChunkedLLMProvider());
    this.providers.set('anthropic', new ClaudeProvider());
    this.providers.set('ollama', new OllamaProvider());
    this.providers.set('offline', new OfflineProvider());
  }

  async setProvider(provider: 'openai' | 'anthropic' | 'ollama' | 'offline'): Promise<void> {
    if (this.providers.has(provider)) {
      this.currentProvider = provider;
    } else {
      throw new Error(`Provider ${provider} not found`);
    }
  }

  getCurrentProvider(): LLMProvider {
    return this.providers.get(this.currentProvider)!;
  }

  async getAvailableProviders(): Promise<Array<{name: string, key: string, available: boolean}>> {
    const results = [];
    for (const [key, provider] of this.providers) {
      const available = await provider.isAvailable();
      results.push({ name: provider.getName(), key, available });
    }
    return results;
  }

  async setApiKey(provider: 'openai' | 'anthropic', key: string): Promise<void> {
    const providerInstance = this.providers.get(provider);
    if (providerInstance && 'setApiKey' in providerInstance) {
      await (providerInstance as any).setApiKey(key);
    }
  }
}

// Export singleton instance
export const llmProvider = new ChunkedLLMProvider();
export const llmProviderManager = new LLMProviderManager();