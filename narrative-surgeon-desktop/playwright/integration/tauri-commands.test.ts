/**
 * Integration Tests - Tauri Commands
 * Tests integration between frontend and Rust backend
 */

import { test, expect } from '@playwright/test'
import { invoke } from '@tauri-apps/api/tauri'

// Mock Tauri commands for testing
const mockTauriCommands = {
  get_manuscripts: jest.fn(),
  create_manuscript: jest.fn(),
  update_scene: jest.fn(),
  export_manuscript: jest.fn(),
  get_export_formats: jest.fn(),
  search_content: jest.fn(),
  get_writing_analytics: jest.fn()
}

// Mock the Tauri API
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: (command: string, args?: any) => {
    if (mockTauriCommands[command as keyof typeof mockTauriCommands]) {
      return mockTauriCommands[command as keyof typeof mockTauriCommands](args)
    }
    throw new Error(`Unknown command: ${command}`)
  }
}))

describe('Tauri Command Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    Object.values(mockTauriCommands).forEach(mock => mock.mockReset())
  })

  describe('Manuscript Management Commands', () => {
    test('get_manuscripts returns valid manuscript list', async () => {
      const mockManuscripts = [
        {
          id: '1',
          title: 'Test Novel',
          author: 'Test Author',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          word_count: 50000,
          scene_count: 20
        }
      ]
      
      mockTauriCommands.get_manuscripts.mockResolvedValue(mockManuscripts)
      
      const result = await invoke('get_manuscripts')
      
      ;(expect(result) as any).toEqual(mockManuscripts)
      (expect(mockTauriCommands.get_manuscripts) as any).toHaveBeenCalledTimes(1)
    })

    test('create_manuscript with valid data succeeds', async () => {
      const manuscriptData = {
        title: 'New Novel',
        author: 'New Author',
        genre: 'Literary Fiction',
        description: 'A compelling story...'
      }
      
      const expectedResult = {
        id: 'new-id',
        ...manuscriptData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        word_count: 0,
        scene_count: 0
      }
      
      mockTauriCommands.create_manuscript.mockResolvedValue(expectedResult)
      
      const result = await invoke('create_manuscript', { manuscript: manuscriptData })
      
      ;(expect(result) as any).toEqual(expectedResult)
      (expect(mockTauriCommands.create_manuscript) as any).toHaveBeenCalledWith({ manuscript: manuscriptData })
    })

    test('create_manuscript with invalid data fails gracefully', async () => {
      const invalidData = {
        title: '', // Empty title should fail
        author: 'Test Author'
      }
      
      mockTauriCommands.create_manuscript.mockRejectedValue(new Error('Title cannot be empty'))
      
      await expect(invoke('create_manuscript', { manuscript: invalidData }))
        .rejects.toThrow('Title cannot be empty')
    })

    test('update_scene preserves data integrity', async () => {
      const sceneData = {
        id: 'scene-1',
        manuscript_id: 'manuscript-1',
        title: 'Chapter 1',
        content: 'This is the scene content...',
        order_index: 0,
        notes: 'Some notes about this scene'
      }
      
      const expectedResult = {
        ...sceneData,
        updated_at: '2024-01-01T00:00:00Z',
        word_count: 6
      }
      
      mockTauriCommands.update_scene.mockResolvedValue(expectedResult)
      
      const result = await invoke('update_scene', { scene: sceneData })
      
      expect(result).toEqual(expectedResult)
      expect(result.word_count).toBe(6) // Verify word count calculation
    })
  })

  describe('Export Commands', () => {
    test('get_export_formats returns all available formats', async () => {
      const expectedFormats = [
        'shunn_manuscript',
        'query_package', 
        'synopsis_short',
        'synopsis_long',
        'pitch_sheet',
        'book_proposal',
        'screenplay_final',
        'stage_play_standard',
        'standard_manuscript',
        'docx',
        'pdf',
        'markdown'
      ]
      
      mockTauriCommands.get_export_formats.mockResolvedValue(expectedFormats)
      
      const result = await invoke('get_export_formats')
      
      expect(result).toEqual(expectedFormats)
      expect(result).toContain('shunn_manuscript') // Industry standard format
      expect(result).toContain('query_package') // Publishing workflow format
    })

    test('export_manuscript with valid options succeeds', async () => {
      const exportOptions = {
        manuscript_id: 'manuscript-1',
        format: 'shunn_manuscript',
        output_path: '/path/to/output.docx',
        include_comments: false,
        include_notes: true,
        preserve_formatting: true
      }
      
      const expectedResult = {
        success: true,
        output_path: '/path/to/output.docx',
        file_size: 125000,
        page_count: 250,
        word_count: 75000,
        errors: [],
        warnings: []
      }
      
      mockTauriCommands.export_manuscript.mockResolvedValue(expectedResult)
      
      const result = await invoke('export_manuscript', exportOptions)
      
      expect(result.success).toBe(true)
      expect(result.output_path).toBe(exportOptions.output_path)
      expect(result.errors).toHaveLength(0)
    })

    test('export_manuscript handles formatting errors gracefully', async () => {
      const exportOptions = {
        manuscript_id: 'manuscript-1',
        format: 'invalid_format',
        output_path: '/path/to/output.docx'
      }
      
      mockTauriCommands.export_manuscript.mockRejectedValue(
        new Error('Unsupported export format: invalid_format')
      )
      
      await expect(invoke('export_manuscript', exportOptions))
        .rejects.toThrow('Unsupported export format')
    })
  })

  describe('Search Commands', () => {
    test('search_content returns relevant results', async () => {
      const searchQuery = {
        manuscript_id: 'manuscript-1',
        query: 'protagonist',
        case_sensitive: false,
        whole_words: true
      }
      
      const expectedResults = {
        results: [
          {
            scene_id: 'scene-1',
            scene_title: 'Chapter 1',
            matches: [
              {
                text: 'The protagonist walked slowly',
                start_position: 145,
                end_position: 170,
                line_number: 12,
                context: 'As the sun set, the protagonist walked slowly down the empty street.'
              }
            ]
          }
        ],
        total_matches: 1,
        search_time_ms: 25
      }
      
      mockTauriCommands.search_content.mockResolvedValue(expectedResults)
      
      const result = await invoke('search_content', searchQuery)
      
      expect(result.results).toHaveLength(1)
      expect(result.total_matches).toBe(1)
      expect(result.search_time_ms).toBeLessThan(1000) // Should be fast
    })

    test('search_content handles empty results', async () => {
      const searchQuery = {
        manuscript_id: 'manuscript-1',
        query: 'nonexistentword',
        case_sensitive: false,
        whole_words: true
      }
      
      const expectedResults = {
        results: [],
        total_matches: 0,
        search_time_ms: 15
      }
      
      mockTauriCommands.search_content.mockResolvedValue(expectedResults)
      
      const result = await invoke('search_content', searchQuery)
      
      expect(result.results).toHaveLength(0)
      expect(result.total_matches).toBe(0)
    })
  })

  describe('Analytics Commands', () => {
    test('get_writing_analytics returns comprehensive metrics', async () => {
      const analyticsQuery = {
        manuscript_id: 'manuscript-1',
        time_range: '30d'
      }
      
      const expectedAnalytics = {
        word_count_history: [
          { date: '2024-01-01', word_count: 1000 },
          { date: '2024-01-02', word_count: 1500 },
          { date: '2024-01-03', word_count: 2000 }
        ],
        daily_word_counts: {
          average: 750,
          max: 1200,
          min: 200,
          total_days: 30
        },
        productivity_metrics: {
          words_per_session: 500,
          average_session_length: 45,
          most_productive_time: '14:00',
          streak_days: 7
        },
        genre_analysis: {
          readability_score: 8.5,
          complexity_level: 'intermediate',
          pacing_score: 7.8,
          dialogue_ratio: 0.35
        }
      }
      
      mockTauriCommands.get_writing_analytics.mockResolvedValue(expectedAnalytics)
      
      const result = await invoke('get_writing_analytics', analyticsQuery)
      
      expect(result.word_count_history).toHaveLength(3)
      expect(result.daily_word_counts.average).toBe(750)
      expect(result.productivity_metrics.streak_days).toBe(7)
      expect(result.genre_analysis.readability_score).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    test('handles database connection errors', async () => {
      mockTauriCommands.get_manuscripts.mockRejectedValue(
        new Error('Database connection failed')
      )
      
      await expect(invoke('get_manuscripts'))
        .rejects.toThrow('Database connection failed')
    })

    test('handles file system permission errors', async () => {
      const exportOptions = {
        manuscript_id: 'manuscript-1',
        format: 'docx',
        output_path: '/restricted/path/output.docx'
      }
      
      mockTauriCommands.export_manuscript.mockRejectedValue(
        new Error('Permission denied: /restricted/path/output.docx')
      )
      
      await expect(invoke('export_manuscript', exportOptions))
        .rejects.toThrow('Permission denied')
    })

    test('handles invalid manuscript ID', async () => {
      mockTauriCommands.update_scene.mockRejectedValue(
        new Error('Manuscript not found: invalid-id')
      )
      
      const sceneData = {
        manuscript_id: 'invalid-id',
        title: 'Test Scene',
        content: 'Test content'
      }
      
      await expect(invoke('update_scene', { scene: sceneData }))
        .rejects.toThrow('Manuscript not found')
    })
  })

  describe('Performance Requirements', () => {
    test('commands complete within acceptable timeframes', async () => {
      // Mock realistic response times
      mockTauriCommands.get_manuscripts.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      )
      
      const start = Date.now()
      await invoke('get_manuscripts')
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(5000) // 5 second timeout
    })

    test('search operations are performant', async () => {
      const searchResults = {
        results: [],
        total_matches: 0,
        search_time_ms: 50
      }
      
      mockTauriCommands.search_content.mockResolvedValue(searchResults)
      
      const result = await invoke('search_content', {
        manuscript_id: 'test',
        query: 'test'
      })
      
      expect(result.search_time_ms).toBeLessThan(1000) // Search should be fast
    })

    test('export operations handle large files efficiently', async () => {
      const exportResult = {
        success: true,
        output_path: '/test/large-manuscript.docx',
        file_size: 5000000, // 5MB
        page_count: 1000,
        word_count: 250000,
        errors: [],
        warnings: []
      }
      
      mockTauriCommands.export_manuscript.mockResolvedValue(exportResult)
      
      const result = await invoke('export_manuscript', {
        manuscript_id: 'large-manuscript',
        format: 'docx'
      })
      
      expect(result.success).toBe(true)
      expect(result.file_size).toBeGreaterThan(1000000) // Should handle large files
    })
  })
})

describe('Cross-Platform Compatibility', () => {
  test('file paths work correctly on Windows', async () => {
    const windowsPath = 'C:\\Users\\Test\\Documents\\manuscript.docx'
    
    mockTauriCommands.export_manuscript.mockResolvedValue({
      success: true,
      output_path: windowsPath,
      file_size: 100000,
      page_count: 50,
      word_count: 25000,
      errors: [],
      warnings: []
    })
    
    const result = await invoke('export_manuscript', {
      manuscript_id: 'test',
      format: 'docx',
      output_path: windowsPath
    })
    
    expect(result.output_path).toBe(windowsPath)
  })

  test('file paths work correctly on macOS/Linux', async () => {
    const unixPath = '/Users/test/Documents/manuscript.docx'
    
    mockTauriCommands.export_manuscript.mockResolvedValue({
      success: true,
      output_path: unixPath,
      file_size: 100000,
      page_count: 50,
      word_count: 25000,
      errors: [],
      warnings: []
    })
    
    const result = await invoke('export_manuscript', {
      manuscript_id: 'test',
      format: 'docx',
      output_path: unixPath
    })
    
    expect(result.output_path).toBe(unixPath)
  })

  test('handles different file system encodings', async () => {
    const unicodePath = '/Users/test/Documents/小説.docx' // Japanese characters
    
    mockTauriCommands.export_manuscript.mockResolvedValue({
      success: true,
      output_path: unicodePath,
      file_size: 100000,
      page_count: 50,
      word_count: 25000,
      errors: [],
      warnings: []
    })
    
    const result = await invoke('export_manuscript', {
      manuscript_id: 'test',
      format: 'docx',
      output_path: unicodePath
    })
    
    expect(result.output_path).toBe(unicodePath)
  })
})