import { AnalysisService } from '../src/services/analysisService';
import { databaseService } from '../src/services/database';
import { SceneAnalysis, OpeningAnalysis, CharacterVoice } from '../src/types';

// Mock dependencies
jest.mock('../src/services/database');
jest.mock('../src/services/llmProvider');

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('AnalysisService', () => {
  let analysisService: AnalysisService;
  let mockLLMProvider: any;

  beforeEach(() => {
    mockLLMProvider = {
      analyzeScene: jest.fn(),
      analyzeOpening: jest.fn(),
      analyzeCharacterVoice: jest.fn(),
      detectPlotHoles: jest.fn(),
      findWeakestElement: jest.fn(),
      suggestHook: jest.fn(),
      checkVoiceConsistency: jest.fn(),
    };

    analysisService = new AnalysisService(mockLLMProvider);
    jest.clearAllMocks();
  });

  describe('analyzeScene', () => {
    it('should return existing analysis if recent and not forced', async () => {
      const existingAnalysis: SceneAnalysis = {
        id: 'analysis-1',
        sceneId: 'scene-1',
        summary: 'Existing analysis',
        tensionLevel: 75,
        analyzedAt: Date.now() - 1000, // 1 second ago
      };

      mockDatabaseService.getFirst
        .mockResolvedValueOnce({
          id: 'analysis-1',
          scene_id: 'scene-1',
          summary: 'Existing analysis',
          tension_level: 75,
          analyzed_at: Date.now() - 1000,
        });

      const result = await analysisService.analyzeScene('scene-1', false);

      expect(result.id).toBe('analysis-1');
      expect(result.summary).toBe('Existing analysis');
      expect(mockLLMProvider.analyzeScene).not.toHaveBeenCalled();
    });

    it('should perform new analysis if forced', async () => {
      const sceneData = {
        id: 'scene-1',
        raw_text: 'Scene text content',
        manuscript_id: 'ms-1',
        index_in_manuscript: 0,
        scene_number_in_chapter: 1,
        chapter_number: 1,
      };

      const mockAnalysis = {
        id: 'new-analysis-1',
        sceneId: 'scene-1',
        summary: 'New analysis',
        tensionLevel: 80,
        analyzedAt: Date.now(),
      };

      mockDatabaseService.getFirst
        .mockResolvedValueOnce(null) // No existing analysis
        .mockResolvedValueOnce(sceneData) // Scene data
        .mockResolvedValueOnce(null) // Previous scene
        .mockResolvedValueOnce(null) // Next scene
        .mockResolvedValueOnce({ count: 3 }) // Chapter scenes count
        .mockResolvedValueOnce({ genre: 'mystery' }) // Manuscript data
        .mockResolvedValueOnce([{ name: 'Detective Smith' }]); // Characters

      mockLLMProvider.analyzeScene.mockResolvedValueOnce(mockAnalysis);
      mockDatabaseService.executeQuery.mockResolvedValueOnce(undefined);

      const result = await analysisService.analyzeScene('scene-1', true);

      expect(mockLLMProvider.analyzeScene).toHaveBeenCalled();
      expect(result.summary).toBe('New analysis');
      expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO scene_analysis'),
        expect.arrayContaining(['new-analysis-1', 'scene-1'])
      );
    });

    it('should throw error if scene not found', async () => {
      mockDatabaseService.getFirst.mockResolvedValueOnce(null);

      await expect(analysisService.analyzeScene('nonexistent-scene'))
        .rejects.toThrow('Scene not found');
    });

    it('should build proper scene context', async () => {
      const sceneData = {
        id: 'scene-1',
        raw_text: 'Scene content',
        manuscript_id: 'ms-1',
        index_in_manuscript: 1,
        scene_number_in_chapter: 2,
        chapter_number: 1,
      };

      const mockAnalysis = {
        id: 'analysis-1',
        sceneId: 'scene-1',
        summary: 'Analysis with context',
        analyzedAt: Date.now(),
      };

      mockDatabaseService.getFirst
        .mockResolvedValueOnce(null) // No existing analysis
        .mockResolvedValueOnce(sceneData) // Scene data
        .mockResolvedValueOnce({ summary: 'Previous scene summary' }) // Previous scene
        .mockResolvedValueOnce({ raw_text: 'Next scene opening...' }) // Next scene
        .mockResolvedValueOnce({ count: 5 }) // Chapter scenes count
        .mockResolvedValueOnce({ genre: 'thriller' }) // Manuscript
        .mockResolvedValueOnce([
          { name: 'Alice' },
          { name: 'Bob' }
        ]); // Characters

      mockLLMProvider.analyzeScene.mockResolvedValueOnce(mockAnalysis);
      mockDatabaseService.executeQuery.mockResolvedValueOnce(undefined);

      await analysisService.analyzeScene('scene-1');

      const [sceneText, context] = mockLLMProvider.analyzeScene.mock.calls[0];
      
      expect(context.previousSummary).toBe('Previous scene summary');
      expect(context.nextOpening).toBe('Next scene opening...');
      expect(context.positionInChapter).toBe(2);
      expect(context.totalScenesInChapter).toBe(5);
      expect(context.manuscriptGenre).toBe('thriller');
      expect(context.charactersPresent).toEqual([]);
    });
  });

  describe('analyzeOpening', () => {
    it('should return existing analysis if recent', async () => {
      const existingAnalysis = {
        id: 'opening-1',
        manuscript_id: 'ms-1',
        hook_strength: 85,
        agent_readiness_score: 78,
        analyzed_at: Date.now() - 1000,
      };

      mockDatabaseService.getFirst.mockResolvedValueOnce(existingAnalysis);

      const result = await analysisService.analyzeOpening('ms-1', false);

      expect(result.hookStrength).toBe(85);
      expect(result.agentReadinessScore).toBe(78);
      expect(mockLLMProvider.analyzeOpening).not.toHaveBeenCalled();
    });

    it('should perform new opening analysis', async () => {
      const manuscriptData = {
        id: 'ms-1',
        title: 'Test Manuscript',
        genre: 'mystery',
        comp_titles: JSON.stringify(['The Girl with the Dragon Tattoo']),
      };

      const openingScenes = [
        {
          id: 'scene-1',
          raw_text: 'Detective Sarah Chen burst through the door. The room was empty except for a single red rose on the table.',
          is_opening: 1,
          index_in_manuscript: 0,
        }
      ];

      const mockAnalysis = {
        id: 'opening-analysis-1',
        manuscriptId: 'ms-1',
        hookType: 'action',
        hookStrength: 82,
        agentReadinessScore: 76,
        analyzedAt: Date.now(),
      };

      mockDatabaseService.getFirst
        .mockResolvedValueOnce(null) // No existing analysis
        .mockResolvedValueOnce(manuscriptData); // Manuscript data

      mockDatabaseService.getAll.mockResolvedValueOnce(openingScenes);
      mockLLMProvider.analyzeOpening.mockResolvedValueOnce(mockAnalysis);
      mockDatabaseService.executeQuery.mockResolvedValueOnce(undefined);

      const result = await analysisService.analyzeOpening('ms-1', true);

      expect(mockLLMProvider.analyzeOpening).toHaveBeenCalledWith(
        expect.stringContaining('Detective Sarah Chen'),
        'mystery',
        ['The Girl with the Dragon Tattoo']
      );
      expect(result.hookType).toBe('action');
      expect(result.hookStrength).toBe(82);
    });

    it('should handle manuscripts without comp titles', async () => {
      const manuscriptData = {
        id: 'ms-1',
        genre: 'literary',
        comp_titles: null,
      };

      const openingScenes = [
        {
          raw_text: 'It was the best of times.',
          is_opening: 1,
        }
      ];

      mockDatabaseService.getFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(manuscriptData);
      mockDatabaseService.getAll.mockResolvedValueOnce(openingScenes);
      
      const mockAnalysis = {
        id: 'analysis-1',
        manuscriptId: 'ms-1',
        analyzedAt: Date.now(),
      };
      
      mockLLMProvider.analyzeOpening.mockResolvedValueOnce(mockAnalysis);
      mockDatabaseService.executeQuery.mockResolvedValueOnce(undefined);

      await analysisService.analyzeOpening('ms-1');

      expect(mockLLMProvider.analyzeOpening).toHaveBeenCalledWith(
        expect.any(String),
        'literary',
        []
      );
    });

    it('should limit opening text to 1250 words', async () => {
      const manuscriptData = { genre: 'mystery', comp_titles: null };
      
      // Create a scene that would exceed 1250 words
      const longText = 'word '.repeat(2000); // 2000 words
      const openingScenes = [
        {
          raw_text: longText,
          is_opening: 1,
        }
      ];

      mockDatabaseService.getFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(manuscriptData);
      mockDatabaseService.getAll.mockResolvedValueOnce(openingScenes);
      
      const mockAnalysis = { id: 'analysis-1', manuscriptId: 'ms-1', analyzedAt: Date.now() };
      mockLLMProvider.analyzeOpening.mockResolvedValueOnce(mockAnalysis);
      mockDatabaseService.executeQuery.mockResolvedValueOnce(undefined);

      await analysisService.analyzeOpening('ms-1');

      const [openingText] = mockLLMProvider.analyzeOpening.mock.calls[0];
      const wordCount = openingText.split(/\s+/).length;
      
      expect(wordCount).toBeLessThanOrEqual(1250);
    });
  });

  describe('analyzeCharacterVoice', () => {
    it('should analyze character voice from scene dialogue', async () => {
      const characterData = {
        id: 'char-1',
        name: 'Detective Smith',
        voice_sample: null,
      };

      const sceneData = {
        id: 'scene-1',
        raw_text: `Detective Smith looked around the room. "Listen here," he said gruffly. "You know what I mean?" The suspect remained silent. "Mark my words," Smith continued, "this won't end well."`,
      };

      const mockAnalysis = {
        id: 'voice-analysis-1',
        characterId: 'char-1',
        sceneId: 'scene-1',
        vocabularyLevel: 8,
        emotionalRegister: 'informal',
        consistencyScore: 100,
      };

      mockDatabaseService.getFirst
        .mockResolvedValueOnce(characterData)
        .mockResolvedValueOnce(sceneData);

      mockLLMProvider.analyzeCharacterVoice.mockResolvedValueOnce(mockAnalysis);
      mockDatabaseService.executeQuery.mockResolvedValueOnce(undefined);

      const result = await analysisService.analyzeCharacterVoice('char-1', 'scene-1');

      expect(mockLLMProvider.analyzeCharacterVoice).toHaveBeenCalledWith(
        expect.arrayContaining(['Listen here', 'You know what I mean?', 'Mark my words']),
        'Detective Smith',
        undefined
      );
      expect(result.vocabularyLevel).toBe(8);
      expect(result.emotionalRegister).toBe('informal');
    });

    it('should handle characters with existing voice profiles', async () => {
      const existingProfile = JSON.stringify({
        averageSentenceLength: 12,
        complexSentenceRatio: 0.3,
        commonWords: ['listen', 'you', 'know'],
      });

      const characterData = {
        name: 'Detective Smith',
        voice_sample: existingProfile,
      };

      const sceneData = {
        raw_text: 'Detective Smith said, "You know what I think?"',
      };

      const mockAnalysis = {
        id: 'voice-1',
        characterId: 'char-1',
        sceneId: 'scene-1',
        consistencyScore: 85,
      };

      mockDatabaseService.getFirst
        .mockResolvedValueOnce(characterData)
        .mockResolvedValueOnce(sceneData);

      mockLLMProvider.analyzeCharacterVoice.mockResolvedValueOnce(mockAnalysis);
      mockDatabaseService.executeQuery.mockResolvedValueOnce(undefined);

      await analysisService.analyzeCharacterVoice('char-1', 'scene-1');

      expect(mockLLMProvider.analyzeCharacterVoice).toHaveBeenCalledWith(
        expect.any(Array),
        'Detective Smith',
        expect.objectContaining({
          averageSentenceLength: 12,
          complexSentenceRatio: 0.3,
        })
      );
    });

    it('should throw error if no dialogue found', async () => {
      const characterData = { name: 'Detective Smith', voice_sample: null };
      const sceneData = { raw_text: 'There was no dialogue in this scene.' };

      mockDatabaseService.getFirst
        .mockResolvedValueOnce(characterData)
        .mockResolvedValueOnce(sceneData);

      await expect(analysisService.analyzeCharacterVoice('char-1', 'scene-1'))
        .rejects.toThrow('No dialogue found for this character in this scene');
    });
  });

  describe('detectPlotHoles', () => {
    it('should detect plot holes across manuscript scenes', async () => {
      const scenes = [
        {
          id: 'scene-1',
          manuscript_id: 'ms-1',
          raw_text: 'John was in the kitchen.',
          index_in_manuscript: 0,
        },
        {
          id: 'scene-2',
          manuscript_id: 'ms-1',
          raw_text: 'At the same time, John was in the garden.',
          index_in_manuscript: 1,
        },
        {
          id: 'scene-3',
          manuscript_id: 'ms-1',
          raw_text: 'John continued his conversation from the library.',
          index_in_manuscript: 2,
        }
      ];

      const characters = [
        { id: 'char-1', name: 'John', role: 'protagonist' }
      ];

      const manuscript = {
        genre: 'mystery',
        target_audience: 'adult',
        total_word_count: 3000,
      };

      const mockPlotHoles = [
        {
          id: 'hole-1',
          type: 'continuity',
          severity: 'major',
          description: 'Character appears in multiple locations simultaneously',
          affectedScenes: ['scene-1', 'scene-2'],
          suggestion: 'Add transition showing character movement',
        }
      ];

      mockDatabaseService.getAll
        .mockResolvedValueOnce(scenes) // Scenes
        .mockResolvedValueOnce(characters); // Characters

      mockDatabaseService.getFirst.mockResolvedValueOnce(manuscript);
      mockLLMProvider.detectPlotHoles.mockResolvedValueOnce(mockPlotHoles);

      const result = await analysisService.detectPlotHoles('ms-1');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('continuity');
      expect(result[0].severity).toBe('major');
      expect(mockLLMProvider.detectPlotHoles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'scene-1', rawText: 'John was in the kitchen.' })
        ]),
        expect.objectContaining({
          genre: 'mystery',
          totalScenes: 3,
          totalWordCount: 3000,
        })
      );
    });

    it('should return empty array for manuscripts with fewer than 3 scenes', async () => {
      const scenes = [
        { id: 'scene-1', raw_text: 'Short manuscript' },
        { id: 'scene-2', raw_text: 'Only two scenes' }
      ];

      mockDatabaseService.getAll.mockResolvedValueOnce(scenes);

      const result = await analysisService.detectPlotHoles('ms-1');

      expect(result).toEqual([]);
      expect(mockLLMProvider.detectPlotHoles).not.toHaveBeenCalled();
    });
  });

  describe('suggestRevisions', () => {
    it('should provide weakest element and hook suggestions', async () => {
      const sceneData = {
        id: 'scene-1',
        raw_text: 'Scene content for revision analysis',
      };

      const mockWeakestElement = {
        element: 'pacing',
        issue: 'Scene moves too slowly',
        fix: 'Cut unnecessary description and increase action',
      };

      const mockOpeningHook = {
        type: 'action',
        strength: 65,
        location: 0,
        suggestion: 'Start with immediate conflict',
      };

      const mockEndingHook = {
        type: 'mystery',
        strength: 75,
        location: 200,
        suggestion: 'End with unanswered question',
      };

      mockDatabaseService.getFirst.mockResolvedValueOnce(sceneData);
      
      mockLLMProvider.findWeakestElement.mockResolvedValueOnce(mockWeakestElement);
      mockLLMProvider.suggestHook
        .mockResolvedValueOnce(mockOpeningHook)
        .mockResolvedValueOnce(mockEndingHook);

      const result = await analysisService.suggestRevisions('scene-1');

      expect(result.weakestElement.element).toBe('pacing');
      expect(result.hookSuggestions.opening.type).toBe('action');
      expect(result.hookSuggestions.ending.type).toBe('mystery');
    });
  });

  describe('checkVoiceConsistency', () => {
    it('should check dialogue consistency against established voice', async () => {
      const characterData = {
        id: 'char-1',
        name: 'Detective Smith',
        voice_sample: JSON.stringify({
          averageSentenceLength: 8,
          emotionalTone: 'gruff',
          uniqueStyleMarkers: ['listen here', 'mark my words'],
        }),
      };

      const sceneData = {
        raw_text: 'Detective Smith said, "Listen here, this is important."',
      };

      const mockConsistencyReport = {
        score: 92,
        maintainedElements: ['gruff tone', 'signature phrases'],
        driftDetected: [],
        specificFixes: [],
      };

      mockDatabaseService.getFirst
        .mockResolvedValueOnce(characterData)
        .mockResolvedValueOnce(sceneData);

      mockLLMProvider.checkVoiceConsistency.mockResolvedValueOnce(mockConsistencyReport);

      const result = await analysisService.checkVoiceConsistency('char-1', 'scene-1');

      expect(result.score).toBe(92);
      expect(result.maintainedElements).toContain('gruff tone');
      expect(mockLLMProvider.checkVoiceConsistency).toHaveBeenCalledWith(
        'Listen here, this is important.',
        expect.objectContaining({
          averageSentenceLength: 8,
          emotionalTone: 'gruff',
        })
      );
    });

    it('should throw error if character voice profile not established', async () => {
      const characterData = {
        name: 'Detective Smith',
        voice_sample: null,
      };

      mockDatabaseService.getFirst.mockResolvedValueOnce(characterData);

      await expect(analysisService.checkVoiceConsistency('char-1', 'scene-1'))
        .rejects.toThrow('Character voice profile not established');
    });
  });

  describe('dialogue extraction', () => {
    it('should extract dialogue correctly', async () => {
      const text = `
        Detective Smith entered the room. "What happened here?" he asked.
        The witness looked nervous. "I saw everything," she replied quietly.
        Smith pressed further. "Tell me exactly what you observed."
      `;

      // Test the private extractDialogue method indirectly through analyzeCharacterVoice
      const characterData = { name: 'Detective Smith', voice_sample: null };
      const sceneData = { raw_text: text };
      const mockAnalysis = { id: 'test', characterId: 'char-1', sceneId: 'scene-1' };

      mockDatabaseService.getFirst
        .mockResolvedValueOnce(characterData)
        .mockResolvedValueOnce(sceneData);
      mockLLMProvider.analyzeCharacterVoice.mockResolvedValueOnce(mockAnalysis);
      mockDatabaseService.executeQuery.mockResolvedValueOnce(undefined);

      await analysisService.analyzeCharacterVoice('char-1', 'scene-1');

      const [dialogueArray] = mockLLMProvider.analyzeCharacterVoice.mock.calls[0];
      
      expect(dialogueArray).toContain('What happened here?');
      expect(dialogueArray).toContain('Tell me exactly what you observed.');
      expect(dialogueArray).not.toContain('I saw everything'); // Different character
    });
  });
});