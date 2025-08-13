import { PatternDetector } from '../src/services/patternDetector';
import { BetaReaderSimulator } from '../src/services/betaReaderSimulator';
import { SuggestionEngine } from '../src/services/suggestionEngine';
import { revisionModeService } from '../src/services/revisionModes';
import { Pattern, PersonaType, ReadingExperience, Scene, Manuscript } from '../src/types';

// Mock dependencies
jest.mock('../src/services/database');
jest.mock('../src/services/llmProvider');

describe('PatternDetector', () => {
  let patternDetector: PatternDetector;

  beforeEach(() => {
    patternDetector = new PatternDetector();
  });

  describe('detectAllPatterns', () => {
    it('should detect filter words', async () => {
      const text = 'The very good book was really quite interesting. It was just very compelling.';
      
      const patterns = await patternDetector.detectAllPatterns(text);
      
      const filterWords = patterns.filter(p => p.type === 'filter_words');
      expect(filterWords.length).toBeGreaterThan(0);
      expect(filterWords.some(p => p.text === 'very')).toBe(true);
      expect(filterWords.some(p => p.text === 'really')).toBe(true);
      expect(filterWords.some(p => p.text === 'quite')).toBe(true);
      expect(filterWords.some(p => p.text === 'just')).toBe(true);
    });

    it('should detect passive voice', async () => {
      const text = 'The door was opened by John. The book was written by the author.';
      
      const patterns = await patternDetector.detectAllPatterns(text);
      
      const passiveVoice = patterns.filter(p => p.type === 'passive_voice');
      expect(passiveVoice.length).toBeGreaterThan(0);
      expect(passiveVoice.some(p => p.text.includes('was opened'))).toBe(true);
      expect(passiveVoice.some(p => p.text.includes('was written'))).toBe(true);
    });

    it('should detect telling phrases', async () => {
      const text = 'Sarah felt tired. She thought about the day. John realized he was late.';
      
      const patterns = await patternDetector.detectAllPatterns(text);
      
      const tellingPhrases = patterns.filter(p => p.type === 'telling_phrases');
      expect(tellingPhrases.length).toBeGreaterThan(0);
      expect(tellingPhrases.some(p => p.text === 'felt')).toBe(true);
      expect(tellingPhrases.some(p => p.text === 'thought')).toBe(true);
      expect(tellingPhrases.some(p => p.text === 'realized')).toBe(true);
    });

    it('should detect word repetition', async () => {
      const text = 'The mystery was mysterious. The mysterious events were mysteriously connected.';
      
      const patterns = await patternDetector.detectAllPatterns(text);
      
      const repetition = patterns.filter(p => p.type === 'repetition');
      expect(repetition.length).toBeGreaterThan(0);
      expect(repetition.some(p => p.text.includes('mysterio'))).toBe(true);
    });

    it('should detect dialogue issues', async () => {
      const text = '"I cannot believe this," she said sadly. "I will not go there," he replied angrily.';
      
      const patterns = await patternDetector.detectAllPatterns(text);
      
      const dialogueIssues = patterns.filter(p => p.type.includes('dialogue'));
      expect(dialogueIssues.length).toBeGreaterThan(0);
    });

    it('should calculate appropriate severity scores', async () => {
      const text = 'very very very very very good'.repeat(10);
      
      const patterns = await patternDetector.detectAllPatterns(text);
      
      const filterWords = patterns.filter(p => p.type === 'filter_words');
      expect(filterWords.some(p => p.severity > 50)).toBe(true);
    });
  });

  describe('applyAutoFix', () => {
    it('should apply text replacement for simple patterns', () => {
      const text = 'This is very good writing.';
      const pattern: Pattern = {
        type: 'filter_words',
        text: 'very good',
        position: 8,
        severity: 50,
        autoFix: { 
          suggestion: 'Remove "very" and use stronger word',
          replacement: 'excellent'
        }
      };

      const result = patternDetector.applyAutoFix(text, pattern);
      
      expect(result).toBe('This is excellent writing.');
    });

    it('should return original text if no replacement provided', () => {
      const text = 'This is very good writing.';
      const pattern: Pattern = {
        type: 'filter_words',
        text: 'very good',
        position: 8,
        severity: 50,
        autoFix: { 
          suggestion: 'Consider stronger alternative'
        }
      };

      const result = patternDetector.applyAutoFix(text, pattern);
      
      expect(result).toBe(text);
    });
  });

  describe('applyAllAutoFixes', () => {
    it('should apply all fixes of a specific type', () => {
      const text = 'This is very good and really nice, quite simply the best.';
      
      const result = patternDetector.applyAllAutoFixes(text, 'filter_words');
      
      // Should have fewer filter words
      expect(result.split('very').length).toBeLessThan(text.split('very').length);
      expect(result.split('really').length).toBeLessThan(text.split('really').length);
    });
  });
});

describe('BetaReaderSimulator', () => {
  let simulator: BetaReaderSimulator;
  let mockManuscript: Manuscript;
  let mockScenes: Scene[];

  beforeEach(() => {
    simulator = new BetaReaderSimulator();
    
    mockManuscript = {
      id: 'ms-1',
      title: 'Test Manuscript',
      genre: 'mystery',
      targetAudience: 'adult',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalWordCount: 50000,
      compTitles: ['Gone Girl', 'The Girl with the Dragon Tattoo']
    };

    mockScenes = [
      {
        id: 'scene-1',
        manuscriptId: 'ms-1',
        indexInManuscript: 0,
        rawText: 'Detective Sarah Chen stood in the rain, staring at the body. This was no ordinary murder.',
        wordCount: 16,
        isOpening: true,
        isChapterEnd: false,
        opensWithHook: true,
        endsWithHook: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'scene-2', 
        manuscriptId: 'ms-1',
        indexInManuscript: 1,
        rawText: 'The victim was Dr. Elizabeth Hartwell, a renowned geneticist. Her research was groundbreaking.',
        wordCount: 14,
        isOpening: false,
        isChapterEnd: false,
        opensWithHook: false,
        endsWithHook: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'scene-3',
        manuscriptId: 'ms-1', 
        indexInManuscript: 2,
        rawText: 'Sarah examined the crime scene carefully. Something felt wrong about the whole setup.',
        wordCount: 14,
        isOpening: false,
        isChapterEnd: true,
        opensWithHook: false,
        endsWithHook: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
  });

  describe('simulateReading', () => {
    it('should complete reading for editor persona', async () => {
      const experience = await simulator.simulateReading(mockManuscript, mockScenes, 'editor');
      
      expect(experience.persona).toBe('editor');
      expect(experience.reactions).toHaveLength(3);
      expect(experience.wouldFinish).toBe(true); // Editors always finish
      expect(experience.overallEngagement).toBeGreaterThan(0);
    });

    it('should potentially stop reading for agent persona', async () => {
      // Create boring scenes to trigger stop
      const boringScenes = mockScenes.map(scene => ({
        ...scene,
        rawText: 'This is a very boring scene with no action or tension. Nothing happens here.'
      }));

      const experience = await simulator.simulateReading(mockManuscript, boringScenes, 'agent');
      
      expect(experience.persona).toBe('agent');
      expect(experience.reactions.length).toBeGreaterThan(0);
      // Agent might stop reading if engagement is too low
    });

    it('should provide different reactions based on persona type', async () => {
      const agentExperience = await simulator.simulateReading(mockManuscript, mockScenes, 'agent');
      const casualExperience = await simulator.simulateReading(mockManuscript, mockScenes, 'casual_reader');
      
      expect(agentExperience.persona).toBe('agent');
      expect(casualExperience.persona).toBe('casual_reader');
      
      // Reactions should potentially differ between personas
      expect(agentExperience.reactions[0].emotion).toBeDefined();
      expect(casualExperience.reactions[0].emotion).toBeDefined();
    });

    it('should track engagement over time', async () => {
      const experience = await simulator.simulateReading(mockManuscript, mockScenes, 'genre_fan');
      
      expect(experience.reactions).toHaveLength(3);
      experience.reactions.forEach(reaction => {
        expect(reaction.engagement).toBeGreaterThanOrEqual(0);
        expect(reaction.engagement).toBeLessThanOrEqual(100);
      });
    });

    it('should provide actionable feedback', async () => {
      const experience = await simulator.simulateReading(mockManuscript, mockScenes, 'literary_critic');
      
      expect(experience.keyIssues).toBeDefined();
      expect(experience.highlights).toBeDefined();
      expect(Array.isArray(experience.keyIssues)).toBe(true);
      expect(Array.isArray(experience.highlights)).toBe(true);
    });
  });

  describe('simulateAllPersonas', () => {
    it('should simulate all persona types', async () => {
      const experiences = await simulator.simulateAllPersonas(mockManuscript, mockScenes);
      
      expect(experiences).toHaveLength(5); // All persona types
      
      const personaTypes = experiences.map(exp => exp.persona);
      expect(personaTypes).toContain('agent');
      expect(personaTypes).toContain('genre_fan');
      expect(personaTypes).toContain('casual_reader');
      expect(personaTypes).toContain('editor');
      expect(personaTypes).toContain('literary_critic');
    });

    it('should handle simulation errors gracefully', async () => {
      // Test with empty scenes to trigger error handling
      const experiences = await simulator.simulateAllPersonas(mockManuscript, []);
      
      expect(experiences).toHaveLength(5);
      experiences.forEach(exp => {
        expect(exp.persona).toBeDefined();
        expect(exp.reactions).toBeDefined();
      });
    });
  });
});

describe('SuggestionEngine', () => {
  let suggestionEngine: SuggestionEngine;
  let mockScene: Scene;

  beforeEach(() => {
    suggestionEngine = new SuggestionEngine();
    
    mockScene = {
      id: 'scene-1',
      manuscriptId: 'ms-1',
      indexInManuscript: 0,
      rawText: 'The detective was very tired. He felt that something was wrong. The door was opened by the suspect.',
      wordCount: 18,
      isOpening: true,
      isChapterEnd: false,
      opensWithHook: false,
      endsWithHook: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions for opening polish mode', async () => {
      const mode = revisionModeService.setMode('opening_polish')!;
      
      const suggestions = await suggestionEngine.generateSuggestions(mockScene, mode);
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      suggestions.forEach(suggestion => {
        expect(suggestion.id).toBeDefined();
        expect(suggestion.type).toBeDefined();
        expect(suggestion.severity).toBeDefined();
        expect(suggestion.impactScore).toBeGreaterThan(0);
      });
    });

    it('should generate suggestions for dialogue enhancement mode', async () => {
      const dialogueScene = {
        ...mockScene,
        rawText: '"Hello there," he said quietly. "How are you?" she replied softly. "I am fine," he answered slowly.'
      };
      
      const mode = revisionModeService.setMode('dialogue_pass')!;
      
      const suggestions = await suggestionEngine.generateSuggestions(dialogueScene, mode);
      
      expect(suggestions.length).toBeGreaterThan(0);
      // Should include dialogue-related suggestions
      expect(suggestions.some(s => s.type === 'voice' || s.rationale.toLowerCase().includes('dialogue'))).toBe(true);
    });

    it('should rank suggestions by impact score', async () => {
      const mode = revisionModeService.getCurrentMode();
      
      const suggestions = await suggestionEngine.generateSuggestions(mockScene, mode);
      
      // Should be sorted by impact score (highest first)
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i-1].impactScore).toBeGreaterThanOrEqual(suggestions[i].impactScore);
      }
    });

    it('should limit suggestions to reasonable number', async () => {
      const mode = revisionModeService.getCurrentMode();
      
      const suggestions = await suggestionEngine.generateSuggestions(mockScene, mode);
      
      expect(suggestions.length).toBeLessThanOrEqual(10); // Should be limited
    });

    it('should include rationale for each suggestion', async () => {
      const mode = revisionModeService.getCurrentMode();
      
      const suggestions = await suggestionEngine.generateSuggestions(mockScene, mode);
      
      suggestions.forEach(suggestion => {
        expect(suggestion.rationale).toBeDefined();
        expect(suggestion.rationale.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('RevisionModeService', () => {
  describe('getAllModes', () => {
    it('should return all available revision modes', () => {
      const modes = revisionModeService.getAllModes();
      
      expect(modes.length).toBeGreaterThan(5);
      
      const modeNames = modes.map(m => m.name);
      expect(modeNames).toContain('Opening Pages Polish');
      expect(modeNames).toContain('Dialogue Enhancement');
      expect(modeNames).toContain('Tension Calibration');
      expect(modeNames).toContain('Line Editing');
      expect(modeNames).toContain('Copy Editing');
      expect(modeNames).toContain('Developmental Editing');
    });
  });

  describe('getModeByType', () => {
    it('should return appropriate mode for session type', () => {
      const devMode = revisionModeService.getModeByType('developmental');
      const lineMode = revisionModeService.getModeByType('line');
      const copyMode = revisionModeService.getModeByType('copy');
      
      expect(devMode.name).toContain('Developmental');
      expect(lineMode.name).toContain('Line');
      expect(copyMode.name).toContain('Copy');
    });

    it('should return default mode for unknown type', () => {
      const unknownMode = revisionModeService.getModeByType('unknown');
      
      expect(unknownMode.name).toContain('Line'); // Default fallback
    });
  });

  describe('customizeCompAlignmentMode', () => {
    it('should customize comp alignment mode with actual titles', () => {
      const compTitles = ['Gone Girl', 'The Girl with the Dragon Tattoo'];
      
      const customMode = revisionModeService.customizeCompAlignmentMode(compTitles);
      
      expect(customMode.aiPromptBias).toContain('Gone Girl');
      expect(customMode.aiPromptBias).toContain('The Girl with the Dragon Tattoo');
    });
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end for pattern detection and suggestions', async () => {
    const patternDetector = new PatternDetector();
    const suggestionEngine = new SuggestionEngine();
    
    const scene: Scene = {
      id: 'scene-1',
      manuscriptId: 'ms-1',
      indexInManuscript: 0,
      rawText: 'The very good book was really quite interesting. The character felt sad and thought deeply.',
      wordCount: 15,
      isOpening: true,
      isChapterEnd: false,
      opensWithHook: false,
      endsWithHook: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Detect patterns
    const patterns = await patternDetector.detectAllPatterns(scene.rawText);
    expect(patterns.length).toBeGreaterThan(0);

    // Generate suggestions based on mode
    const mode = revisionModeService.setMode('line_editing')!;
    const suggestions = await suggestionEngine.generateSuggestions(scene, mode);
    
    expect(suggestions.length).toBeGreaterThan(0);
    
    // Should include pattern-based suggestions
    const filterWordSuggestions = suggestions.filter(s => 
      s.rationale.toLowerCase().includes('very') || 
      s.rationale.toLowerCase().includes('really') ||
      s.rationale.toLowerCase().includes('quite')
    );
    
    expect(filterWordSuggestions.length).toBeGreaterThan(0);
  });

  it('should handle complex manuscript analysis workflow', async () => {
    const patternDetector = new PatternDetector();
    const simulator = new BetaReaderSimulator();
    
    const manuscript: Manuscript = {
      id: 'ms-1',
      title: 'Test Novel',
      genre: 'thriller',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalWordCount: 50000
    };

    const scenes: Scene[] = [
      {
        id: 'scene-1',
        manuscriptId: 'ms-1',
        indexInManuscript: 0,
        rawText: 'The explosion rocked the building. Detective Smith rushed to the scene, his heart pounding with adrenaline.',
        wordCount: 16,
        isOpening: true,
        isChapterEnd: false,
        opensWithHook: true,
        endsWithHook: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    // Run pattern detection
    const patterns = await patternDetector.detectAllPatterns(scenes[0].rawText);
    
    // Run beta reader simulation
    const experience = await simulator.simulateReading(manuscript, scenes, 'agent');
    
    expect(experience.reactions).toHaveLength(1);
    expect(experience.persona).toBe('agent');
    expect(typeof experience.overallEngagement).toBe('number');
  });
});