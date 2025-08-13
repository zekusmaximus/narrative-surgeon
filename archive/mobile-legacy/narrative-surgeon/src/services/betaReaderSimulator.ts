import { PersonaType, ReadingExperience, SceneReaction, Scene, Manuscript, BetaReaderPersona } from '../types';
import { ChunkedLLMProvider } from './llmProvider';
import { databaseService } from './database';
import { v4 as uuidv4 } from 'uuid';

// Persona prompts for LLM
const personaPrompts = {
  agent: `You are a literary agent reading submissions. You have 50 other manuscripts to read today. 
          You'll stop reading the moment you lose interest or see a red flag.
          Look for: commercial viability, strong voice, compelling opening, clear market position.
          Be critical but fair. Rate engagement 0-100.`,
  
  genre_fan: `You are an avid {{genre}} reader who reads 100+ books per year in this genre.
              You know all the tropes and have high expectations.
              You'll stop if the book doesn't deliver expected genre elements.
              Rate how well it meets genre expectations.`,
  
  casual_reader: `You picked this up on a friend's recommendation. You read maybe 10 books a year.
                   You need to be hooked quickly and clearly or you'll DNF.
                   Focus on: easy to follow, engaging characters, clear stakes.
                   Be honest about confusion or boredom.`,
  
  editor: `You are an acquisitions editor at a major publisher.
           You're reading to evaluate publication potential.
           Note every issue but read to completion for full assessment.
           Consider: marketability, writing quality, structural soundness.`,

  literary_critic: `You are a literary critic with an MFA in Creative Writing.
                    You analyze technique, style, and artistic merit.
                    Look for: originality, prose quality, thematic depth, literary devices.
                    You have high standards but appreciate experimental work.`
};

interface PersonaConfig {
  attentionSpan: number; // How long they'll persist with boring content
  genreTolerance: number; // How forgiving of genre deviations
  pacePreference: 'fast' | 'medium' | 'slow';
  voiceSensitivity: number; // How much voice matters
  plotImportance: number; // vs character development
  stopThreshold: number; // Engagement level where they quit
}

const personaConfigs: Record<PersonaType, PersonaConfig> = {
  agent: {
    attentionSpan: 20,
    genreTolerance: 30,
    pacePreference: 'fast',
    voiceSensitivity: 90,
    plotImportance: 80,
    stopThreshold: 25
  },
  
  genre_fan: {
    attentionSpan: 60,
    genreTolerance: 10,
    pacePreference: 'medium',
    voiceSensitivity: 70,
    plotImportance: 85,
    stopThreshold: 35
  },
  
  casual_reader: {
    attentionSpan: 15,
    genreTolerance: 50,
    pacePreference: 'fast',
    voiceSensitivity: 60,
    plotImportance: 90,
    stopThreshold: 40
  },
  
  editor: {
    attentionSpan: 100,
    genreTolerance: 40,
    pacePreference: 'medium',
    voiceSensitivity: 85,
    plotImportance: 75,
    stopThreshold: 0 // Editors read to the end
  },

  literary_critic: {
    attentionSpan: 80,
    genreTolerance: 60,
    pacePreference: 'slow',
    voiceSensitivity: 95,
    plotImportance: 60,
    stopThreshold: 20
  }
};

export class BetaReaderSimulator {
  private llmProvider: ChunkedLLMProvider;

  constructor(llmProvider?: ChunkedLLMProvider) {
    this.llmProvider = llmProvider || new ChunkedLLMProvider();
  }

  async simulateReading(manuscript: Manuscript, scenes: Scene[], persona: PersonaType): Promise<ReadingExperience> {
    const config = personaConfigs[persona];
    const reactions: SceneReaction[] = [];
    let engagementLevel = this.getInitialEngagement(persona);
    
    console.log(`Starting ${persona} reading simulation with engagement: ${engagementLevel}`);

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      
      try {
        const reaction = await this.getReaderReaction(scene, persona, engagementLevel, i, scenes.length);
        reactions.push(reaction);
        
        // Update engagement based on reaction
        const prevEngagement = engagementLevel;
        engagementLevel = this.updateEngagement(engagementLevel, reaction, config);
        
        console.log(`Scene ${i + 1}: ${prevEngagement} -> ${engagementLevel} (${reaction.emotion})`);
        
        // Check if reader would stop
        if (engagementLevel < config.stopThreshold && persona !== "editor") {
          reaction.wouldStopReading = true;
          reaction.reason = await this.explainWhyStopped(scene, persona, engagementLevel);
          console.log(`${persona} stopped reading at scene ${i + 1}: ${reaction.reason}`);
          break;
        }

        // Simulate attention fatigue
        if (i > config.attentionSpan && engagementLevel < 60) {
          engagementLevel *= 0.95;
        }
      } catch (error) {
        console.error(`Error simulating reaction for scene ${i + 1}:`, error);
        
        // Add a fallback reaction
        reactions.push({
          sceneId: scene.id,
          engagement: Math.max(20, engagementLevel * 0.8),
          emotion: 'confused',
          notes: 'Analysis unavailable - technical error',
          wouldStopReading: false
        });
        
        engagementLevel *= 0.9; // Slight decrease due to confusion
      }
    }

    const experience = this.analyzeReadingExperience(reactions, persona, engagementLevel);
    
    // Save to database
    await this.saveBetaReaderPersona(manuscript.id, experience);
    
    return experience;
  }

  private getInitialEngagement(persona: PersonaType): number {
    const initialEngagement = {
      agent: 60,
      genre_fan: 70,
      casual_reader: 65,
      editor: 75,
      literary_critic: 70
    };
    
    return initialEngagement[persona];
  }

  private async getReaderReaction(
    scene: Scene,
    persona: PersonaType,
    currentEngagement: number,
    sceneIndex: number,
    totalScenes: number
  ): Promise<SceneReaction> {
    const prompt = this.buildReaderPrompt(scene, persona, currentEngagement, sceneIndex, totalScenes);
    
    try {
      const response = await this.llmProvider.callLLM('reader-simulation', prompt);
      
      return {
        sceneId: scene.id,
        engagement: Math.max(0, Math.min(100, response.engagement || currentEngagement)),
        emotion: response.emotion || 'neutral',
        notes: response.notes || 'No specific reaction noted',
        wouldStopReading: response.wouldStopReading || false,
        reason: response.reason
      };
    } catch (error) {
      console.error('Error getting reader reaction:', error);
      
      // Fallback to rule-based reaction
      return this.getFallbackReaction(scene, persona, currentEngagement, sceneIndex);
    }
  }

  private buildReaderPrompt(
    scene: Scene,
    persona: PersonaType,
    currentEngagement: number,
    sceneIndex: number,
    totalScenes: number
  ): string {
    let basePrompt = personaPrompts[persona];
    
    // Replace genre placeholder if present
    if (basePrompt.includes('{{genre}}') && scene.manuscriptId) {
      basePrompt = basePrompt.replace('{{genre}}', 'genre'); // Would get actual genre from manuscript
    }

    return `${basePrompt}

You are currently reading scene ${sceneIndex + 1} of ${totalScenes}.
Your current engagement level is ${currentEngagement}/100.

Scene content:
${scene.rawText.substring(0, 1000)}${scene.rawText.length > 1000 ? '...' : ''}

Respond in JSON format with:
{
  "engagement": 0-100,
  "emotion": "engaged|bored|confused|excited|frustrated|intrigued|disappointed",
  "notes": "Brief reaction to this scene",
  "wouldStopReading": boolean,
  "reason": "Why you'd stop reading (if applicable)"
}

Be realistic about your persona's attention span and preferences.`;
  }

  private getFallbackReaction(
    scene: Scene,
    persona: PersonaType,
    currentEngagement: number,
    sceneIndex: number
  ): SceneReaction {
    const config = personaConfigs[persona];
    
    // Simple rule-based reaction based on scene characteristics
    let engagementDelta = 0;
    let emotion = 'neutral';
    
    // Check scene length
    if (scene.wordCount > 2000) {
      engagementDelta -= 5; // Long scenes can be tiring
    } else if (scene.wordCount < 300) {
      engagementDelta -= 3; // Very short scenes feel incomplete
    }

    // Check for dialogue (usually engaging)
    const dialogueRatio = (scene.rawText.match(/"/g) || []).length / (scene.wordCount * 2);
    if (dialogueRatio > 0.3) {
      engagementDelta += 5;
      emotion = 'engaged';
    }

    // Check for action words
    const actionWords = ['ran', 'jumped', 'fought', 'chased', 'exploded', 'crashed'];
    if (actionWords.some(word => scene.rawText.toLowerCase().includes(word))) {
      engagementDelta += 8;
      emotion = 'excited';
    }

    // Opening scenes are critical
    if (sceneIndex < 3 && currentEngagement < 50) {
      engagementDelta -= 15;
      emotion = 'disappointed';
    }

    const newEngagement = Math.max(0, Math.min(100, currentEngagement + engagementDelta));

    return {
      sceneId: scene.id,
      engagement: newEngagement,
      emotion,
      notes: `Rule-based analysis: ${emotion} (${engagementDelta > 0 ? '+' : ''}${engagementDelta})`,
      wouldStopReading: false
    };
  }

  private updateEngagement(
    currentEngagement: number,
    reaction: SceneReaction,
    config: PersonaConfig
  ): number {
    // Blend current engagement with reaction
    const blendFactor = 0.7;
    const newEngagement = (currentEngagement * (1 - blendFactor)) + (reaction.engagement * blendFactor);
    
    // Apply persona-specific modifiers
    let modifier = 1.0;
    
    if (reaction.emotion === 'bored' && config.attentionSpan < 30) {
      modifier = 0.85; // Impatient readers lose engagement faster
    } else if (reaction.emotion === 'excited' && config.pacePreference === 'fast') {
      modifier = 1.1; // Fast-paced readers get more excited by action
    } else if (reaction.emotion === 'confused') {
      modifier = 0.9; // Confusion always hurts
    }
    
    return Math.max(0, Math.min(100, newEngagement * modifier));
  }

  private async explainWhyStopped(scene: Scene, persona: PersonaType, engagement: number): Promise<string> {
    const reasons = {
      agent: [
        "Opening didn't hook me within 3 pages",
        "Voice isn't distinctive enough for the market",
        "Pacing is too slow for commercial fiction",
        "Character lacks clear motivation",
        "Story premise isn't compelling"
      ],
      genre_fan: [
        "Not delivering on genre expectations",
        "Tropes are being used incorrectly",
        "Missing key genre elements",
        "Doesn't feel authentic to the genre",
        "Pacing doesn't match genre standards"
      ],
      casual_reader: [
        "Too confusing to follow",
        "Nothing exciting has happened",
        "Can't connect with the main character",
        "Story feels too complicated",
        "Getting bored, nothing grabs me"
      ],
      literary_critic: [
        "Prose quality isn't meeting literary standards",
        "Lacks thematic depth or originality",
        "Voice feels derivative",
        "Structure seems unfocused",
        "Not bringing anything new to the conversation"
      ],
      editor: [] // Editors don't stop reading
    };

    const personaReasons = reasons[persona];
    if (personaReasons.length === 0) return "Would continue reading for full evaluation";
    
    // Choose reason based on engagement level
    const reasonIndex = Math.floor((100 - engagement) / 20);
    return personaReasons[Math.min(reasonIndex, personaReasons.length - 1)];
  }

  private analyzeReadingExperience(
    reactions: SceneReaction[],
    persona: PersonaType,
    finalEngagement: number
  ): ReadingExperience {
    const averageEngagement = reactions.reduce((sum, r) => sum + r.engagement, 0) / reactions.length;
    
    // Extract key issues and highlights
    const keyIssues = reactions
      .filter(r => r.engagement < 40 || r.emotion === 'bored' || r.emotion === 'frustrated')
      .map(r => r.notes)
      .filter((note, index, arr) => arr.indexOf(note) === index) // Deduplicate
      .slice(0, 5);

    const highlights = reactions
      .filter(r => r.engagement > 75 || r.emotion === 'excited' || r.emotion === 'intrigued')
      .map(r => r.notes)
      .filter((note, index, arr) => arr.indexOf(note) === index)
      .slice(0, 5);

    const stoppedReading = reactions.some(r => r.wouldStopReading);
    
    return {
      persona,
      reactions,
      overallEngagement: Math.round(averageEngagement),
      wouldFinish: !stoppedReading,
      wouldRecommend: averageEngagement > 60 && !stoppedReading,
      keyIssues,
      highlights
    };
  }

  private async saveBetaReaderPersona(manuscriptId: string, experience: ReadingExperience): Promise<void> {
    const persona: BetaReaderPersona = {
      id: uuidv4(),
      manuscriptId,
      personaType: experience.persona,
      expectations: personaConfigs[experience.persona],
      likelyReactions: this.buildReactionsMap(experience.reactions),
      engagementCurve: experience.reactions.map(r => r.engagement),
      wouldContinueReading: experience.wouldFinish,
      wouldRecommend: experience.wouldRecommend,
      primaryCriticism: experience.keyIssues[0] || 'No major issues identified',
      primaryPraise: experience.highlights[0] || 'Solid writing throughout'
    };

    const query = `
      INSERT OR REPLACE INTO beta_reader_personas 
      (id, manuscript_id, persona_type, expectations, likely_reactions, engagement_curve, 
       would_continue_reading, would_recommend, primary_criticism, primary_praise)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await databaseService.executeQuery(query, [
      persona.id,
      persona.manuscriptId,
      persona.personaType,
      JSON.stringify(persona.expectations),
      JSON.stringify(persona.likelyReactions),
      JSON.stringify(persona.engagementCurve),
      persona.wouldContinueReading,
      persona.wouldRecommend,
      persona.primaryCriticism,
      persona.primaryPraise
    ]);
  }

  private buildReactionsMap(reactions: SceneReaction[]): Record<string, string> {
    const map: Record<string, string> = {};
    reactions.forEach(r => {
      map[r.sceneId] = `${r.emotion}: ${r.notes}`;
    });
    return map;
  }

  async getBetaReaderPersonas(manuscriptId: string): Promise<BetaReaderPersona[]> {
    const query = `
      SELECT * FROM beta_reader_personas 
      WHERE manuscript_id = ? 
      ORDER BY persona_type
    `;

    const rows = await databaseService.getAll(query, [manuscriptId]);

    return rows.map(row => ({
      id: row.id,
      manuscriptId: row.manuscript_id,
      personaType: row.persona_type,
      expectations: JSON.parse(row.expectations || '{}'),
      likelyReactions: JSON.parse(row.likely_reactions || '{}'),
      engagementCurve: JSON.parse(row.engagement_curve || '[]'),
      wouldContinueReading: row.would_continue_reading,
      wouldRecommend: row.would_recommend,
      primaryCriticism: row.primary_criticism,
      primaryPraise: row.primary_praise
    }));
  }

  // Run simulation for all personas
  async simulateAllPersonas(manuscript: Manuscript, scenes: Scene[]): Promise<ReadingExperience[]> {
    const personas: PersonaType[] = ['agent', 'genre_fan', 'casual_reader', 'editor', 'literary_critic'];
    const experiences: ReadingExperience[] = [];

    for (const persona of personas) {
      try {
        console.log(`Running ${persona} simulation...`);
        const experience = await this.simulateReading(manuscript, scenes, persona);
        experiences.push(experience);
        
        // Add small delay to avoid overwhelming the LLM API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error simulating ${persona}:`, error);
        
        // Add a fallback experience
        experiences.push({
          persona,
          reactions: [],
          overallEngagement: 50,
          wouldFinish: true,
          wouldRecommend: false,
          keyIssues: ['Simulation error - could not complete analysis'],
          highlights: []
        });
      }
    }

    return experiences;
  }
}

export const betaReaderSimulator = new BetaReaderSimulator();