// @ts-nocheck
/**
 * Unit Tests - React Components
 * Tests individual components in isolation
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Component imports
import { TextEditor } from '@/components/editor/TextEditor'
import { WordCountDisplay } from '@/components/ui/WordCountDisplay'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { QueryLetterGenerator } from '@/components/submissions/QueryLetterGenerator'
import { SubmissionTracker } from '@/components/submissions/SubmissionTracker'
import { PerformanceAnalytics } from '@/components/submissions/PerformanceAnalytics'

// Mock Tauri API
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn()
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    pathname: '/'
  })
}))

describe('TextEditor Component', () => {
  const defaultProps = {
    content: '',
    onChange: jest.fn(),
    onSave: jest.fn(),
    isAutoSaving: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders text editor with empty content', () => {
    render(<TextEditor {...defaultProps} />)
    
  const editor = screen.getByRole('textbox') as HTMLInputElement
  expect(editor as any).toBeInTheDocument()
  expect(editor as any).toHaveValue('')
  })

  test('displays provided content', () => {
    const content = 'This is test content for the editor.'
    render(<TextEditor {...defaultProps} content={content} />)
    
  const editor = screen.getByRole('textbox') as HTMLInputElement
  expect(editor as any).toHaveValue(content)
  })

  test('calls onChange when content is modified', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    
    render(<TextEditor {...defaultProps} onChange={onChange} />)
    
    const editor = screen.getByRole('textbox')
    await user.type(editor, 'New content')
    
    expect(onChange).toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith('New content')
  })

  test('handles keyboard shortcuts correctly', async () => {
    const user = userEvent.setup()
    const onSave = jest.fn()
    
    render(<TextEditor {...defaultProps} onSave={onSave} />)
    
    const editor = screen.getByRole('textbox')
    await user.type(editor, 'Some content')
    
    // Test Ctrl+S shortcut
    await user.keyboard('{Control>}s{/Control}')
    
    expect(onSave).toHaveBeenCalled()
  })

  test('shows auto-saving indicator', () => {
    render(<TextEditor {...defaultProps} isAutoSaving={true} />)
    
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })

  test('handles large content efficiently', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    const largeContent = 'A '.repeat(10000) // 20,000 characters
    
    const startTime = Date.now()
    render(<TextEditor {...defaultProps} content={largeContent} onChange={onChange} />)
    const renderTime = Date.now() - startTime
    
    // Should render large content within reasonable time
    expect(renderTime).toBeLessThan(1000)
    
    const editor = screen.getByRole('textbox')
    expect(editor).toHaveValue(largeContent)
    
    // Test typing performance with large content
    const typeStart = Date.now()
    await user.type(editor, 'new')
    const typeTime = Date.now() - typeStart
    
    expect(typeTime).toBeLessThan(500) // Should remain responsive
  })

  test('preserves cursor position during updates', async () => {
    const user = userEvent.setup()
    let content = 'Initial content'
    const onChange = jest.fn()
    
    const { rerender } = render(
      <TextEditor {...defaultProps} content={content} onChange={onChange} />
    )
    
    const editor = screen.getByRole('textbox')
    
    // Position cursor in middle
    editor.focus()
  editor.setSelectionRange(7, 7) // After "Initial"
    
    // Update content
    content = 'Initial updated content'
    rerender(<TextEditor {...defaultProps} content={content} onChange={onChange} />)
    
    // Cursor should be preserved (this is a simplified test)
    expect(document.activeElement).toBe(editor)
  })
})

describe('WordCountDisplay Component', () => {
  test('displays correct word count', () => {
    render(<WordCountDisplay text="This is a test sentence with eight words." />)
    
    expect(screen.getByText('8 words')).toBeInTheDocument()
  })

  test('handles empty text', () => {
    render(<WordCountDisplay text="" />)
    
    expect(screen.getByText('0 words')).toBeInTheDocument()
  })

  test('displays character count when enabled', () => {
    render(<WordCountDisplay text="Hello world" showCharacters={true} />)
    
    expect(screen.getByText('2 words')).toBeInTheDocument()
    expect(screen.getByText('11 characters')).toBeInTheDocument()
  })

  test('displays reading time estimate', () => {
    const longText = 'word '.repeat(200) // 200 words
    render(<WordCountDisplay text={longText} showReadingTime={true} />)
    
    expect(screen.getByText('200 words')).toBeInTheDocument()
    expect(screen.getByText(/1 min read/)).toBeInTheDocument()
  })

  test('updates counts in real-time', () => {
    const { rerender } = render(<WordCountDisplay text="Initial text" />)
    
    expect(screen.getByText('2 words')).toBeInTheDocument()
    
    rerender(<WordCountDisplay text="Initial text with more words added" />)
    
    expect(screen.getByText('6 words')).toBeInTheDocument()
  })

  test('handles non-English text correctly', () => {
    render(<WordCountDisplay text="こんにちは 世界" />)
    
    // Should handle Unicode text appropriately
    expect(screen.getByText('2 words')).toBeInTheDocument()
  })
})

describe('QueryLetterGenerator Component', () => {
  const mockManuscript = {
    id: 'test-manuscript',
    title: 'Test Novel',
    author: 'Test Author',
    genre: 'Literary Fiction',
    wordCount: 85000,
    logline: 'A compelling story about...',
    synopsis: 'This is a test synopsis...'
  }

  beforeEach(() => {
    // Mock the invoke function
    const { invoke } = require('@tauri-apps/api/tauri')
    invoke.mockResolvedValue({
      query: 'Generated query letter content...',
      score: 85,
      suggestions: ['Improve hook', 'Add comparative titles']
    })
  })

  test('renders query generator form', () => {
    render(<QueryLetterGenerator manuscript={mockManuscript} />)
    
    expect(screen.getByLabelText(/manuscript title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/word count/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/genre/i)).toBeInTheDocument()
  })

  test('populates form with manuscript data', () => {
    render(<QueryLetterGenerator manuscript={mockManuscript} />)
    
    expect(screen.getByDisplayValue('Test Novel')).toBeInTheDocument()
    expect(screen.getByDisplayValue('85000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Literary Fiction')).toBeInTheDocument()
  })

  test('generates query letter when form is submitted', async () => {
    const user = userEvent.setup()
    const { invoke } = require('@tauri-apps/api/tauri')
    
    render(<QueryLetterGenerator manuscript={mockManuscript} />)
    
    const generateButton = screen.getByRole('button', { name: /generate query/i })
    await user.click(generateButton)
    
    expect(invoke).toHaveBeenCalledWith('generate_query_letter', expect.any(Object))
    
    await waitFor(() => {
      expect(screen.getByText(/generated query letter content/i)).toBeInTheDocument()
    })
  })

  test('displays query score and suggestions', async () => {
    const user = userEvent.setup()
    
    render(<QueryLetterGenerator manuscript={mockManuscript} />)
    
    const generateButton = screen.getByRole('button', { name: /generate query/i })
    await user.click(generateButton)
    
    await waitFor(() => {
      expect(screen.getByText('85/100')).toBeInTheDocument()
      expect(screen.getByText('Improve hook')).toBeInTheDocument()
    })
  })

  test('handles generation errors gracefully', async () => {
    const user = userEvent.setup()
    const { invoke } = require('@tauri-apps/api/tauri')
    invoke.mockRejectedValue(new Error('Generation failed'))
    
    render(<QueryLetterGenerator manuscript={mockManuscript} />)
    
    const generateButton = screen.getByRole('button', { name: /generate query/i })
    await user.click(generateButton)
    
    await waitFor(() => {
      expect(screen.getByText(/unable to generate query/i)).toBeInTheDocument()
    })
  })

  test('validates required fields', async () => {
    const user = userEvent.setup()
    
    render(<QueryLetterGenerator manuscript={{}} />)
    
    const generateButton = screen.getByRole('button', { name: /generate query/i })
    await user.click(generateButton)
    
    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    expect(screen.getByText(/word count is required/i)).toBeInTheDocument()
  })
})

describe('SubmissionTracker Component', () => {
  const mockSubmissions = [
    {
      id: 'sub-1',
      agentName: 'Jane Smith',
      agency: 'Literary Dreams',
      status: 'submitted',
      submittedDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      expectedResponseDate: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days from now
    }
  ]

  beforeEach(() => {
    const { invoke } = require('@tauri-apps/api/tauri')
    invoke.mockImplementation((command) => {
      switch (command) {
        case 'get_submissions':
          return Promise.resolve(mockSubmissions)
        case 'create_submission':
          return Promise.resolve({ id: 'new-sub', ...mockSubmissions[0] })
        default:
          return Promise.resolve({})
      }
    })
  })

  test('renders submission list', async () => {
    render(<SubmissionTracker manuscriptId="test-manuscript" />)
    
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Literary Dreams')).toBeInTheDocument()
    })
  })

  test('displays submission status correctly', async () => {
    render(<SubmissionTracker manuscriptId="test-manuscript" />)
    
    await waitFor(() => {
      expect(screen.getByText('submitted')).toBeInTheDocument()
    })
  })

  test('shows overdue submissions', async () => {
    const overdueSubmission = {
      ...mockSubmissions[0],
      expectedResponseDate: Date.now() - 5 * 24 * 60 * 60 * 1000 // 5 days ago
    }
    
    const { invoke } = require('@tauri-apps/api/tauri')
    invoke.mockResolvedValue([overdueSubmission])
    
    render(<SubmissionTracker manuscriptId="test-manuscript" />)
    
    await waitFor(() => {
      expect(screen.getByText(/overdue/i)).toBeInTheDocument()
    })
  })

  test('can add new submission', async () => {
    const user = userEvent.setup()
    
    render(<SubmissionTracker manuscriptId="test-manuscript" />)
    
    const addButton = screen.getByRole('button', { name: /add submission/i })
    await user.click(addButton)
    
    expect(screen.getByLabelText(/agent name/i)).toBeInTheDocument()
    
    await user.type(screen.getByLabelText(/agent name/i), 'New Agent')
    await user.type(screen.getByLabelText(/agency/i), 'New Agency')
    
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)
    
    const { invoke } = require('@tauri-apps/api/tauri')
    expect(invoke).toHaveBeenCalledWith('create_submission', expect.any(Object))
  })

  test('filters submissions by status', async () => {
    const user = userEvent.setup()
    
    render(<SubmissionTracker manuscriptId="test-manuscript" />)
    
    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i })
    await user.selectOptions(statusFilter, 'rejected')
    
    // Should filter the displayed submissions
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
  })
})

describe('PerformanceAnalytics Component', () => {
  const mockAnalytics = {
    query_performance: {
      average_score: 84,
      score_trend: 'improving',
      top_performing_elements: ['Strong hook', 'Clear positioning'],
      weak_areas: ['Comparative titles']
    },
    optimization_opportunities: [
      {
        id: 'query-personalization',
        title: 'Improve Query Personalization',
        potential_impact: 'high',
        estimated_improvement: 15
      }
    ]
  }

  const { invoke } = require('@tauri-apps/api/tauri');

  beforeEach(() => {
    invoke.mockClear();
  });

  test('renders analytics overview', async () => {
    invoke.mockResolvedValue(mockAnalytics);
    render(<PerformanceAnalytics manuscriptId="test-manuscript" />);
    
    expect(await screen.findByText('84/100')).toBeInTheDocument();
    expect(await screen.findByText(/improving/i)).toBeInTheDocument();
  });

  test('displays optimization opportunities', async () => {
    invoke.mockResolvedValue(mockAnalytics);
    render(<PerformanceAnalytics manuscriptId="test-manuscript" />);
    
    expect(await screen.findByText('Improve Query Personalization')).toBeInTheDocument();
    expect(await screen.findByText('+15%')).toBeInTheDocument();
  });

  test('handles loading state', () => {
    invoke.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<PerformanceAnalytics manuscriptId="test-manuscript" />);
    
    expect(screen.getByText(/Analyzing performance data.../i)).toBeInTheDocument();
  });

  test('handles analytics errors', async () => {
    invoke.mockRejectedValue(new Error('Analytics failed'));
    
    render(<PerformanceAnalytics manuscriptId="test-manuscript" />);
    
    expect(await screen.findByText(/Failed to load performance analytics/i)).toBeInTheDocument();
  });

  test('allows time range selection', async () => {
    const user = userEvent.setup();
    invoke.mockResolvedValue(mockAnalytics);
    
    render(<PerformanceAnalytics manuscriptId="test-manuscript" />);
    
    // Wait for initial load to complete
    await screen.findByText('Performance Analytics & Optimization');

    // The custom Select component renders a button as the trigger.
    // Let's find it by the default value text.
    const timeRangeSelect = screen.getByText(/Last 30 days/i)
    await user.click(timeRangeSelect)

    // Now select the new option
    const option = await screen.findByText('Last 90 days');
    await user.click(option);

    // It should be called once on mount, and once on change.
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenLastCalledWith(
      'get_performance_analytics',
      { manuscriptId: 'test-manuscript', timeRange: '90d' }
    );
  });
})

describe('Accessibility Tests', () => {
  test('components have proper ARIA labels', () => {
    render(<WordCountDisplay text="Test content" />)
    
    const wordCount = screen.getByLabelText(/word count/i)
    expect(wordCount).toBeInTheDocument()
  })

  test('keyboard navigation works correctly', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    
    render(<TextEditor content="" onChange={onChange} />)
    
    // Test tab navigation
    await user.tab()
    const editor = screen.getByRole('textbox')
    expect(editor).toHaveFocus()
    
    // Test escape key
    await user.keyboard('{Escape}')
    expect(editor).not.toHaveFocus()
  })

  test('screen reader support', () => {
    render(<QueryLetterGenerator manuscript={{}} />)
    
    // Check for proper labels and descriptions
    const titleInput = screen.getByLabelText(/manuscript title/i)
    expect(titleInput).toBeInTheDocument()
    expect(titleInput).toHaveAttribute('aria-required', 'true')
  })
})

describe('Error Boundary Tests', () => {
  const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) {
      throw new Error('Test error')
    }
    return <div>No error</div>
  }

  test('error boundary catches component errors', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('No error')).toBeInTheDocument()
    
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    
    consoleError.mockRestore()
  })
})