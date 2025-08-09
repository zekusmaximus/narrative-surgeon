import { ChunkedLLMProvider } from '../src/services/llmProvider';
import { SceneContext, SceneInfo, ManuscriptContext, PacingProfile } from '../src/types';

// Mock fetch
global.fetch = jest.fn();

describe('ChunkedLLMProvider', () => {
  let provider: ChunkedLLMProvider;

  beforeEach(() => {
    provider = new ChunkedLLMProvider('test-api-key');
    jest.clearAllMocks();
  });

  const mockFetchResponse = (data: any) => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify(data)
          }
        }]
      })
    });
  };

  const mockFetchError = (status: number = 400, message: string = 'API Error') => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status,
      json: jest.fn().mockResolvedValueOnce({
        error: { message }
      })
    });
  };

  describe('analyzeScene', () => {
    it('should analyze scene with context', async () => {
      const mockResponse = {
        summary: 'Character explores mysterious room',
        primaryEmotion: 'curiosity',
        secondaryEmotion: 'fear',
        tensionLevel: 75,
        pacingScore: 65,
        functionTags: ['exposition', 'character_development'],
        voiceFingerprint: {
          averageSentenceLength: 15,
          complexSentenceRatio: 0.4,
          dialogueToNarrationRatio: 0.2,
          commonWords: ['the', 'and', 'but'],
          uniqueStyleMarkers: ['however', 'nevertheless'],
          emotionalTone: 'mysterious'
        },
        conflictPresent: true,
        characterIntroduced: false
      };

      mockFetchResponse(mockResponse);

      const context: SceneContext = {
        previousSummary: 'Character enters building',
        nextOpening: 'The door slams shut behind them',
        positionInChapter: 2,
        totalScenesInChapter: 5,
        chapterNumber: 1,
        manuscriptGenre: 'mystery',
        charactersPresent: ['Detective Smith']
      };

      const result = await provider.analyzeScene('The room was dark and full of shadows.', context);

      expect(result.summary).toBe(mockResponse.summary);
      expect(result.tensionLevel).toBe(75);
      expect(result.conflictPresent).toBe(true);
      expect(result.voiceFingerprint).toEqual(mockResponse.voiceFingerprint);
    });

    it('should handle API errors gracefully', async () => {
      mockFetchError(401, 'Invalid API key');

      const context: SceneContext = {
        positionInChapter: 1,
        totalScenesInChapter: 1,
        charactersPresent: []
      };

      await expect(provider.analyzeScene('Test text', context))
        .rejects.toThrow('LLM API error: Invalid API key');
    });

    it('should handle invalid JSON responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          choices: [{
            message: {
              content: 'Invalid JSON response'
            }
          }]
        })
      });

      const context: SceneContext = {
        positionInChapter: 1,
        totalScenesInChapter: 1,
        charactersPresent: []
      };

      await expect(provider.analyzeScene('Test text', context))
        .rejects.toThrow('Invalid JSON response from LLM');
    });
  });

  describe('analyzeOpening', () => {
    it('should analyze opening pages with genre and comp titles', async () => {
      const mockResponse = {
        hookType: 'action',
        hookStrength: 85,
        voiceEstablished: true,
        characterEstablished: true,
        conflictEstablished: false,
        genreAppropriate: true,
        similarToComps: ['The Girl with the Dragon Tattoo'],
        agentReadinessScore: 78,
        analysisNotes: 'Strong opening with immediate action',
        firstLineStrength: 82,
        suggestions: ['Consider establishing conflict earlier', 'Add more sensory details']
      };

      mockFetchResponse(mockResponse);

      const result = await provider.analyzeOpening(
        'Detective Sarah Chen burst through the door, gun drawn.',
        'mystery',
        ['The Girl with the Dragon Tattoo', 'Gone Girl']
      );

      expect(result.hookType).toBe('action');
      expect(result.hookStrength).toBe(85);
      expect(result.voiceEstablished).toBe(true);
      expect(result.agentReadinessScore).toBe(78);
    });

    it('should handle opening analysis without comp titles', async () => {
      const mockResponse = {
        hookType: 'character',
        hookStrength: 65,
        voiceEstablished: true,
        characterEstablished: true,
        conflictEstablished: true,
        genreAppropriate: true,
        similarToComps: [],
        agentReadinessScore: 72
      };

      mockFetchResponse(mockResponse);

      const result = await provider.analyzeOpening('Sarah woke up feeling different.', 'literary');

      expect(result.hookType).toBe('character');
      expect(result.similarToComps).toEqual([]);
    });
  });

  describe('analyzeCharacterVoice', () => {
    it('should analyze character voice without existing profile', async () => {
      const mockResponse = {
        vocabularyLevel: 8,
        sentencePatterns: [
          { type: 'simple', frequency: 0.6, averageLength: 12 },
          { type: 'complex', frequency: 0.4, averageLength: 18 }
        ],
        uniquePhrases: ['you know', 'listen here', 'mark my words'],
        emotionalRegister: 'informal',
        consistencyScore: 100
      };

      mockFetchResponse(mockResponse);

      const dialogue = [
        'Listen here, you know what I mean?',
        'Mark my words, this will not end well.',
        'I told you this would happen.'
      ];

      const result = await provider.analyzeCharacterVoice(dialogue, 'Detective Smith');

      expect(result.vocabularyLevel).toBe(8);
      expect(result.emotionalRegister).toBe('informal');
      expect(result.uniquePhrases).toEqual(['you know', 'listen here', 'mark my words']);
    });

    it('should analyze consistency with existing profile', async () => {
      const mockResponse = {
        vocabularyLevel: 8,
        sentencePatterns: [{ type: 'simple', frequency: 0.8, averageLength: 10 }],
        uniquePhrases: ['you know', 'basically'],
        emotionalRegister: 'casual',
        consistencyScore: 75
      };

      mockFetchResponse(mockResponse);

      const existingProfile = {
        averageSentenceLength: 12,
        complexSentenceRatio: 0.3,
        dialogueToNarrationRatio: 1.0,
        commonWords: ['you', 'know', 'like'],
        uniqueStyleMarkers: ['you know', 'basically'],
        emotionalTone: 'casual'
      };

      const result = await provider.analyzeCharacterVoice(
        ['You know, basically what happened was...'],
        'Character',
        existingProfile
      );

      expect(result.consistencyScore).toBe(75);
    });
  });

  describe('analyzePacing', () => {
    it('should analyze manuscript pacing', async () => {
      const mockResponse = {
        beatsPerThousand: 4,
        tensionArc: [30, 45, 70, 85, 60, 40],
        compTitleComparison: {
          title: 'Similar Thriller',
          similarities: ['Fast-paced opening', 'Strong midpoint'],
          differences: ['Longer resolution'],
          alignmentScore: 82
        },
        suggestions: 'Consider tightening the resolution section',
        actBreaks: [5, 12]
      };

      mockFetchResponse(mockResponse);

      const scenes: SceneInfo[] = [
        { id: '1', text: 'Scene 1 text', wordCount: 800, sceneNumber: 1, isOpening: true, isChapterEnd: false },
        { id: '2', text: 'Scene 2 text', wordCount: 1200, sceneNumber: 2, isOpening: false, isChapterEnd: true }
      ];

      const result = await provider.analyzePacing(scenes, 'thriller');

      expect(result.beatsPerThousand).toBe(4);
      expect(result.tensionArc).toEqual([30, 45, 70, 85, 60, 40]);
    });
  });

  describe('findWeakestElement', () => {
    it('should identify weakest scene element', async () => {
      const mockResponse = {
        element: 'dialogue',
        issue: 'Characters sound too similar',
        fix: 'Give each character distinct speech patterns and vocabulary'
      };

      mockFetchResponse(mockResponse);

      const result = await provider.findWeakestElement('Scene with problematic dialogue');

      expect(result.element).toBe('dialogue');
      expect(result.issue).toBe('Characters sound too similar');
      expect(result.fix).toBe('Give each character distinct speech patterns and vocabulary');
    });
  });

  describe('suggestHook', () => {
    it('should suggest opening hook', async () => {
      const mockResponse = {
        type: 'mystery',
        strength: 75,
        location: 0,
        suggestion: 'Start with the discovery of the mysterious object'
      };

      mockFetchResponse(mockResponse);

      const result = await provider.suggestHook('The scene begins slowly...', 'opening');

      expect(result.type).toBe('mystery');
      expect(result.strength).toBe(75);
      expect(result.suggestion).toBe('Start with the discovery of the mysterious object');
    });

    it('should suggest ending hook', async () => {
      const mockResponse = {
        type: 'action',
        strength: 85,
        location: 450,
        suggestion: 'End with the sudden appearance of danger'
      };

      mockFetchResponse(mockResponse);

      const result = await provider.suggestHook('Scene ending text...', 'ending');

      expect(result.type).toBe('action');
      expect(result.location).toBe(450);
    });
  });

  describe('checkVoiceConsistency', () => {
    it('should check dialogue consistency', async () => {
      const mockResponse = {
        score: 85,
        maintainedElements: ['casual tone', 'short sentences'],
        driftDetected: ['more formal vocabulary'],
        specificFixes: [
          {
            line: 'I must endeavor to complete this task',
            issue: 'Too formal for established character',
            suggestion: 'I gotta finish this thing'
          }
        ]
      };

      mockFetchResponse(mockResponse);

      const voiceProfile = {
        averageSentenceLength: 8,
        complexSentenceRatio: 0.2,
        dialogueToNarrationRatio: 1.0,
        commonWords: ['gotta', 'yeah', 'thing'],
        uniqueStyleMarkers: ['gotta', 'thing'],
        emotionalTone: 'casual'
      };

      const result = await provider.checkVoiceConsistency(
        'I must endeavor to complete this task.',
        voiceProfile
      );

      expect(result.score).toBe(85);
      expect(result.driftDetected).toContain('more formal vocabulary');
      expect(result.specificFixes).toHaveLength(1);
    });
  });

  describe('detectPlotHoles', () => {
    it('should detect continuity issues', async () => {
      const mockResponse = {
        plotHoles: [
          {
            type: 'continuity',
            severity: 'moderate',
            description: 'Character appears in two places simultaneously',
            affectedScenes: ['scene-1', 'scene-2'],
            suggestion: 'Add transition showing character movement'
          }
        ]
      };

      mockFetchResponse(mockResponse);

      const scenes = [
        {
          id: 'scene-1',
          manuscriptId: 'ms-1',
          chapterNumber: 1,
          indexInManuscript: 0,
          rawText: 'John was in the kitchen.',
          isOpening: true,
          isChapterEnd: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'scene-2',
          manuscriptId: 'ms-1',
          chapterNumber: 1,
          indexInManuscript: 1,
          rawText: 'John was in the garden at the same time.',
          isOpening: false,
          isChapterEnd: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ] as any[];

      const context: ManuscriptContext = {
        genre: 'mystery',
        characters: [],
        totalScenes: 2,
        totalWordCount: 1000
      };

      const result = await provider.detectPlotHoles(scenes, context);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('continuity');
      expect(result[0].severity).toBe('moderate');
    });
  });

  describe('suggestTensionAdjustment', () => {
    it('should suggest specific edits for tension', async () => {
      const mockResponse = {
        edits: [
          {
            type: 'replace',
            start: 50,
            end: 80,
            text: 'heart pounding',
            reason: 'Add physical manifestation of tension'
          }
        ]
      };

      mockFetchResponse(mockResponse);

      const result = await provider.suggestTensionAdjustment('Scene text here', 85);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('replace');
      expect(result[0].text).toBe('heart pounding');
      expect(result[0].reason).toBe('Add physical manifestation of tension');
    });
  });

  describe('compareToCompTitle', () => {
    it('should compare pacing to comp title', async () => {
      const mockResponse = {
        title: 'The Girl with the Dragon Tattoo',
        similarities: ['Slow burn opening', 'Complex character development'],
        differences: ['Faster resolution', 'More action beats'],
        alignmentScore: 78
      };

      mockFetchResponse(mockResponse);

      const pacingProfile: PacingProfile = {
        totalScenes: 20,
        averageSceneLength: 1200,
        tensionArc: [30, 50, 70, 90, 60],
        beatsPerThousand: 3,
        actBreaks: [6, 15]
      };

      const result = await provider.compareToCompTitle(pacingProfile, 'The Girl with the Dragon Tattoo');

      expect(result.title).toBe('The Girl with the Dragon Tattoo');
      expect(result.alignmentScore).toBe(78);
      expect(result.similarities).toContain('Slow burn opening');
    });
  });

  describe('helper methods', () => {
    it('should calculate variance correctly', async () => {
      const numbers = [10, 20, 30, 40, 50];
      const variance = provider['calculateVariance'](numbers);
      
      // Expected variance for this sequence is 200
      expect(variance).toBe(200);
    });

    it('should create sliding windows', async () => {
      const items = [1, 2, 3, 4, 5];
      const windows = provider['createSlidingWindows'](items, 3);
      
      expect(windows).toHaveLength(3);
      expect(windows[0]).toEqual([1, 2, 3]);
      expect(windows[1]).toEqual([2, 3, 4]);
      expect(windows[2]).toEqual([3, 4, 5]);
    });

    it('should consolidate duplicate issues', async () => {
      const issues = [
        {
          id: '',
          type: 'continuity' as const,
          severity: 'minor' as const,
          description: 'Character missing',
          affectedScenes: ['scene1'],
          suggestion: 'Fix it'
        },
        {
          id: '',
          type: 'continuity' as const,
          severity: 'minor' as const,
          description: 'Character missing',
          affectedScenes: ['scene2'],
          suggestion: 'Fix it'
        }
      ];
      
      const consolidated = provider['consolidateIssues'](issues);
      
      expect(consolidated).toHaveLength(1);
      expect(consolidated[0].affectedScenes).toEqual(['scene1', 'scene2']);
    });
  });
});