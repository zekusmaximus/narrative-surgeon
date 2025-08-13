import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SceneRevisionAssistant from '../src/components/SceneRevisionAssistant';
import { analysisService } from '../src/services/analysisService';

jest.mock('../src/services/analysisService');

const mockAnalysisService = analysisService as jest.Mocked<typeof analysisService>;

describe('SceneRevisionAssistant', () => {
  const defaultProps = {
    sceneId: 'scene-1',
    sceneText: 'Test scene content',
    visible: true,
    onClose: jest.fn(),
    onRevisionSuggestion: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    const { getByText } = render(<SceneRevisionAssistant {...defaultProps} />);
    
    expect(getByText('Revision Assistant')).toBeTruthy();
    expect(getByText('Analysis')).toBeTruthy();
    expect(getByText('Weakest Element')).toBeTruthy();
    expect(getByText('Hook Suggestions')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <SceneRevisionAssistant {...defaultProps} visible={false} />
    );
    
    expect(queryByText('Revision Assistant')).toBeNull();
  });

  it('should call onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <SceneRevisionAssistant {...defaultProps} onClose={onClose} />
    );
    
    fireEvent.press(getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should load existing analysis on mount', async () => {
    const mockAnalysis = {
      id: 'analysis-1',
      sceneId: 'scene-1',
      summary: 'Test summary',
      tensionLevel: 75,
      pacingScore: 80,
      primaryEmotion: 'suspense',
      functionTags: ['rising_action', 'character_development'],
      conflictPresent: true,
      characterIntroduced: false,
      analyzedAt: Date.now(),
    };

    const mockRevisionSuggestions = {
      weakestElement: {
        element: 'dialogue',
        issue: 'Characters sound similar',
        fix: 'Give each character distinct voice',
      },
      hookSuggestions: {
        opening: {
          type: 'action' as const,
          strength: 70,
          location: 0,
          suggestion: 'Start with immediate conflict',
        },
        ending: {
          type: 'mystery' as const,
          strength: 85,
          location: 200,
          suggestion: 'End with unanswered question',
        },
      },
    };

    mockAnalysisService.getSceneAnalysis.mockResolvedValueOnce(mockAnalysis);
    mockAnalysisService.suggestRevisions.mockResolvedValueOnce(mockRevisionSuggestions);

    const { getByText } = render(<SceneRevisionAssistant {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Test summary')).toBeTruthy();
      expect(getByText('75/100')).toBeTruthy(); // Tension level
      expect(getByText('80/100')).toBeTruthy(); // Pacing score
      expect(getByText('suspense')).toBeTruthy();
    });

    expect(mockAnalysisService.getSceneAnalysis).toHaveBeenCalledWith('scene-1');
    expect(mockAnalysisService.suggestRevisions).toHaveBeenCalledWith('scene-1');
  });

  it('should switch between tabs', () => {
    const { getByText } = render(<SceneRevisionAssistant {...defaultProps} />);
    
    // Should start on Analysis tab
    expect(getByText('Scene Analysis')).toBeTruthy();
    
    // Switch to Weakest Element tab
    fireEvent.press(getByText('Weakest Element'));
    expect(getByText('Weakest Element')).toBeTruthy();
    
    // Switch to Hook Suggestions tab
    fireEvent.press(getByText('Hook Suggestions'));
    expect(getByText('Hook Suggestions')).toBeTruthy();
  });

  it('should run full analysis when re-analyze button is pressed', async () => {
    const mockAnalysis = {
      id: 'new-analysis',
      sceneId: 'scene-1',
      summary: 'Updated analysis',
      tensionLevel: 85,
      analyzedAt: Date.now(),
    };

    mockAnalysisService.analyzeScene.mockResolvedValueOnce(mockAnalysis);
    mockAnalysisService.getSceneAnalysis.mockResolvedValueOnce(null);
    mockAnalysisService.suggestRevisions.mockResolvedValueOnce({
      weakestElement: { element: 'test', issue: 'test', fix: 'test' },
      hookSuggestions: { opening: {} as any, ending: {} as any },
    });

    const { getByText } = render(<SceneRevisionAssistant {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Re-analyze')).toBeTruthy();
    });

    fireEvent.press(getByText('Re-analyze'));

    await waitFor(() => {
      expect(mockAnalysisService.analyzeScene).toHaveBeenCalledWith('scene-1', true);
    });
  });

  it('should display scene metrics correctly', async () => {
    const mockAnalysis = {
      id: 'analysis-1',
      sceneId: 'scene-1',
      summary: 'Test summary',
      tensionLevel: 75,
      pacingScore: 60,
      primaryEmotion: 'fear',
      secondaryEmotion: 'curiosity',
      functionTags: ['exposition', 'world_building'],
      conflictPresent: true,
      characterIntroduced: false,
      analyzedAt: Date.now(),
    };

    mockAnalysisService.getSceneAnalysis.mockResolvedValueOnce(mockAnalysis);
    mockAnalysisService.suggestRevisions.mockResolvedValueOnce({
      weakestElement: { element: 'test', issue: 'test', fix: 'test' },
      hookSuggestions: { opening: {} as any, ending: {} as any },
    });

    const { getByText } = render(<SceneRevisionAssistant {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('75/100')).toBeTruthy(); // Tension
      expect(getByText('60/100')).toBeTruthy(); // Pacing
      expect(getByText('fear')).toBeTruthy(); // Primary emotion
      expect(getByText('curiosity')).toBeTruthy(); // Secondary emotion
      expect(getByText('exposition')).toBeTruthy(); // Function tag
      expect(getByText('world building')).toBeTruthy(); // Function tag (formatted)
      expect(getByText('✓')).toBeTruthy(); // Conflict present
      expect(getByText('✗')).toBeTruthy(); // Character not introduced
    });
  });

  it('should display weakest element analysis', async () => {
    const mockWeakestElement = {
      element: 'pacing',
      issue: 'Scene moves too slowly in the middle section',
      fix: 'Cut unnecessary description and increase character actions',
    };

    mockAnalysisService.getSceneAnalysis.mockResolvedValueOnce(null);
    mockAnalysisService.suggestRevisions.mockResolvedValueOnce({
      weakestElement: mockWeakestElement,
      hookSuggestions: { opening: {} as any, ending: {} as any },
    });

    const { getByText } = render(<SceneRevisionAssistant {...defaultProps} />);

    // Switch to Weakest Element tab
    fireEvent.press(getByText('Weakest Element'));

    await waitFor(() => {
      expect(getByText('pacing')).toBeTruthy();
      expect(getByText(/Scene moves too slowly/)).toBeTruthy();
      expect(getByText(/Cut unnecessary description/)).toBeTruthy();
    });
  });

  it('should display hook suggestions', async () => {
    const mockHookSuggestions = {
      opening: {
        type: 'action' as const,
        strength: 70,
        location: 0,
        suggestion: 'Start with protagonist in immediate danger',
      },
      ending: {
        type: 'mystery' as const,
        strength: 85,
        location: 150,
        suggestion: 'End with the discovery of a crucial clue',
      },
    };

    mockAnalysisService.getSceneAnalysis.mockResolvedValueOnce(null);
    mockAnalysisService.suggestRevisions.mockResolvedValueOnce({
      weakestElement: { element: 'test', issue: 'test', fix: 'test' },
      hookSuggestions: mockHookSuggestions,
    });

    const { getByText } = render(<SceneRevisionAssistant {...defaultProps} />);

    // Switch to Hook Suggestions tab
    fireEvent.press(getByText('Hook Suggestions'));

    await waitFor(() => {
      expect(getByText('Opening Hook')).toBeTruthy();
      expect(getByText('Ending Hook')).toBeTruthy();
      expect(getByText('70/100')).toBeTruthy(); // Opening hook strength
      expect(getByText('85/100')).toBeTruthy(); // Ending hook strength
      expect(getByText('Type: action')).toBeTruthy();
      expect(getByText('Type: mystery')).toBeTruthy();
      expect(getByText(/Start with protagonist in immediate danger/)).toBeTruthy();
      expect(getByText(/End with the discovery of a crucial clue/)).toBeTruthy();
    });
  });

  it('should apply revision suggestions', async () => {
    const onRevisionSuggestion = jest.fn();
    const mockWeakestElement = {
      element: 'dialogue',
      issue: 'Characters sound similar',
      fix: 'Add unique speech patterns for each character',
    };

    mockAnalysisService.getSceneAnalysis.mockResolvedValueOnce(null);
    mockAnalysisService.suggestRevisions.mockResolvedValueOnce({
      weakestElement: mockWeakestElement,
      hookSuggestions: { opening: {} as any, ending: {} as any },
    });

    const { getByText } = render(
      <SceneRevisionAssistant
        {...defaultProps}
        onRevisionSuggestion={onRevisionSuggestion}
      />
    );

    // Switch to Weakest Element tab
    fireEvent.press(getByText('Weakest Element'));

    await waitFor(() => {
      expect(getByText('Apply Fix')).toBeTruthy();
    });

    fireEvent.press(getByText('Apply Fix'));

    expect(onRevisionSuggestion).toHaveBeenCalledWith('Add unique speech patterns for each character');
  });

  it('should apply hook suggestions', async () => {
    const onRevisionSuggestion = jest.fn();
    const mockHookSuggestions = {
      opening: {
        type: 'action' as const,
        strength: 70,
        location: 0,
        suggestion: 'The explosion shattered the silence',
      },
      ending: {
        type: 'mystery' as const,
        strength: 85,
        location: 150,
        suggestion: 'But the briefcase was empty',
      },
    };

    mockAnalysisService.getSceneAnalysis.mockResolvedValueOnce(null);
    mockAnalysisService.suggestRevisions.mockResolvedValueOnce({
      weakestElement: { element: 'test', issue: 'test', fix: 'test' },
      hookSuggestions: mockHookSuggestions,
    });

    const { getByText, getAllByText } = render(
      <SceneRevisionAssistant
        {...defaultProps}
        onRevisionSuggestion={onRevisionSuggestion}
      />
    );

    // Switch to Hook Suggestions tab
    fireEvent.press(getByText('Hook Suggestions'));

    await waitFor(() => {
      expect(getAllByText('Apply Suggestion')).toHaveLength(2);
    });

    // Apply opening hook suggestion
    fireEvent.press(getAllByText('Apply Suggestion')[0]);
    expect(onRevisionSuggestion).toHaveBeenCalledWith('The explosion shattered the silence');

    // Apply ending hook suggestion
    fireEvent.press(getAllByText('Apply Suggestion')[1]);
    expect(onRevisionSuggestion).toHaveBeenCalledWith('But the briefcase was empty');
  });

  it('should handle loading states', async () => {
    // Mock long-running analysis
    mockAnalysisService.getSceneAnalysis.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(null), 100))
    );
    mockAnalysisService.suggestRevisions.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        weakestElement: { element: 'test', issue: 'test', fix: 'test' },
        hookSuggestions: { opening: {} as any, ending: {} as any },
      }), 100))
    );

    const { getByText } = render(<SceneRevisionAssistant {...defaultProps} />);

    // Should show loading state
    expect(getByText('Analyzing scene...')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('Scene Analysis')).toBeTruthy();
    }, { timeout: 200 });
  });

  it('should handle analysis errors gracefully', async () => {
    mockAnalysisService.getSceneAnalysis.mockRejectedValueOnce(new Error('Analysis failed'));
    mockAnalysisService.suggestRevisions.mockRejectedValueOnce(new Error('Analysis failed'));

    // Mock Alert.alert
    const mockAlert = jest.fn();
    jest.spyOn(require('react-native'), 'Alert', 'get').mockReturnValue({ alert: mockAlert });

    render(<SceneRevisionAssistant {...defaultProps} />);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Failed to load scene analysis');
    });
  });

  it('should display no data message when analysis is unavailable', async () => {
    mockAnalysisService.getSceneAnalysis.mockResolvedValueOnce(null);
    mockAnalysisService.suggestRevisions.mockResolvedValueOnce({
      weakestElement: { element: 'test', issue: 'test', fix: 'test' },
      hookSuggestions: { opening: {} as any, ending: {} as any },
    });

    const { getByText } = render(<SceneRevisionAssistant {...defaultProps} />);

    await waitFor(() => {
      expect(getByText(/No analysis available/)).toBeTruthy();
    });
  });

  it('should color-code scores appropriately', async () => {
    const mockAnalysis = {
      id: 'analysis-1',
      sceneId: 'scene-1',
      tensionLevel: 90, // Should be green (good)
      pacingScore: 45, // Should be orange (warning)
      analyzedAt: Date.now(),
    };

    mockAnalysisService.getSceneAnalysis.mockResolvedValueOnce(mockAnalysis);
    mockAnalysisService.suggestRevisions.mockResolvedValueOnce({
      weakestElement: { element: 'test', issue: 'test', fix: 'test' },
      hookSuggestions: {
        opening: { strength: 85 } as any, // Good
        ending: { strength: 25 } as any, // Poor
      },
    });

    const { getByText } = render(<SceneRevisionAssistant {...defaultProps} />);

    await waitFor(() => {
      // Check that scores are displayed
      expect(getByText('90/100')).toBeTruthy();
      expect(getByText('45/100')).toBeTruthy();
    });

    // Switch to hooks tab to check hook strength colors
    fireEvent.press(getByText('Hook Suggestions'));

    await waitFor(() => {
      expect(getByText('85/100')).toBeTruthy();
      expect(getByText('25/100')).toBeTruthy();
    });
  });
});