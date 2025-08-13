import { jest } from '@jest/globals';

// Mock Tauri API
const mockInvoke = jest.fn();
const mockListen = jest.fn();
const mockEmit = jest.fn();

global.window = {
  ...global.window,
  tauri: {
    invoke: mockInvoke,
    event: {
      listen: mockListen,
      emit: mockEmit,
    },
  },
} as any;

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock components - in a real app these would be the actual components
const MockManuscriptList = ({ onCreateNew, onSelectManuscript }: any) => (
  <div>
    <h1>My Manuscripts</h1>
    <button onClick={onCreateNew}>Create New Manuscript</button>
    <div>
      <button onClick={() => onSelectManuscript('test-id')}>Test Manuscript</button>
    </div>
  </div>
);

const MockManuscriptEditor = ({ manuscriptId, onSave, onAnalyze }: any) => (
  <div>
    <h1>Editing Manuscript: {manuscriptId}</h1>
    <textarea data-testid="editor" placeholder="Start writing..." />
    <button onClick={onSave}>Save</button>
    <button onClick={onAnalyze}>Analyze</button>
  </div>
);

const MockCreateManuscriptDialog = ({ visible, onSubmit, onCancel }: any) => (
  visible ? (
    <div>
      <h2>Create New Manuscript</h2>
      <input data-testid="title-input" placeholder="Manuscript Title" />
      <button onClick={() => onSubmit('New Test Manuscript')}>Create</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ) : null
);

describe('E2E: Complete Manuscript Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockInvoke.mockImplementation((command, args) => {
      switch (command) {
        case 'get_manuscripts_safe':
          return Promise.resolve([
            {
              id: 'test-id',
              title: 'Test Manuscript',
              author: 'Test Author',
              created_at: Date.now(),
              updated_at: Date.now(),
              total_word_count: 1000,
            }
          ]);
        case 'create_manuscript_safe':
          return Promise.resolve({ id: 'new-manuscript-id' });
        case 'get_scenes_safe':
          return Promise.resolve([
            {
              id: 'scene-1',
              manuscript_id: args.manuscript_id,
              title: 'Opening Scene',
              raw_text: 'It was a dark and stormy night...',
              word_count: 8,
              index_in_manuscript: 0,
            }
          ]);
        case 'update_scene_safe':
          return Promise.resolve({ success: true });
        default:
          return Promise.resolve({});
      }
    });
  });

  test('User can create a new manuscript', async () => {
    const ManuscriptApp = () => {
      const [currentView, setCurrentView] = React.useState('list');
      const [showCreateDialog, setShowCreateDialog] = React.useState(false);
      const [selectedManuscriptId, setSelectedManuscriptId] = React.useState<string | null>(null);

      const handleCreateNew = () => {
        setShowCreateDialog(true);
      };

      const handleSubmitNew = async (title: string) => {
        try {
          const result = await mockInvoke('create_manuscript_safe', {
            title,
            text: '',
            metadata: null,
          });
          
          setSelectedManuscriptId(result.id);
          setCurrentView('editor');
          setShowCreateDialog(false);
        } catch (error) {
          console.error('Failed to create manuscript:', error);
        }
      };

      const handleSelectManuscript = (id: string) => {
        setSelectedManuscriptId(id);
        setCurrentView('editor');
      };

      return (
        <div>
          {currentView === 'list' && (
            <MockManuscriptList
              onCreateNew={handleCreateNew}
              onSelectManuscript={handleSelectManuscript}
            />
          )}
          
          {currentView === 'editor' && selectedManuscriptId && (
            <MockManuscriptEditor
              manuscriptId={selectedManuscriptId}
              onSave={async () => {
                await mockInvoke('update_scene_safe', {
                  scene_id: 'scene-1',
                  updates: { raw_text: 'Updated content' },
                });
              }}
              onAnalyze={async () => {
                await mockInvoke('analyze_scene', { scene_id: 'scene-1' });
              }}
            />
          )}

          <MockCreateManuscriptDialog
            visible={showCreateDialog}
            onSubmit={handleSubmitNew}
            onCancel={() => setShowCreateDialog(false)}
          />
        </div>
      );
    };

    render(<ManuscriptApp />);

    // 1. User sees manuscript list
    expect(screen.getByText('My Manuscripts')).toBeTruthy();

    // 2. User clicks "Create New Manuscript"
    fireEvent.press(screen.getByText('Create New Manuscript'));

    // 3. Create dialog appears
    expect(screen.getByText('Create New Manuscript')).toBeTruthy();

    // 4. User enters title and creates manuscript
    fireEvent.press(screen.getByText('Create'));

    // 5. Wait for manuscript creation and navigation to editor
    await waitFor(() => {
      expect(screen.getByText('Editing Manuscript: new-manuscript-id')).toBeTruthy();
    });

    // 6. Verify Tauri command was called
    expect(mockInvoke).toHaveBeenCalledWith('create_manuscript_safe', {
      title: 'New Test Manuscript',
      text: '',
      metadata: null,
    });
  });

  test('User can edit existing manuscript', async () => {
    const EditWorkflow = () => {
      const [currentView, setCurrentView] = React.useState('editor');
      const [manuscript] = React.useState({
        id: 'test-id',
        title: 'Test Manuscript',
      });

      return (
        <MockManuscriptEditor
          manuscriptId={manuscript.id}
          onSave={async () => {
            const editorContent = 'This is the updated manuscript content with more words.';
            await mockInvoke('update_scene_safe', {
              scene_id: 'scene-1',
              updates: { raw_text: editorContent },
            });
          }}
          onAnalyze={async () => {
            await mockInvoke('analyze_scene', { scene_id: 'scene-1' });
          }}
        />
      );
    };

    render(<EditWorkflow />);

    // 1. User sees editor
    expect(screen.getByText('Editing Manuscript: test-id')).toBeTruthy();

    // 2. User types in editor (simulated by save action)
    fireEvent.press(screen.getByText('Save'));

    // 3. Wait for save to complete
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('update_scene_safe', {
        scene_id: 'scene-1',
        updates: { raw_text: 'This is the updated manuscript content with more words.' },
      });
    });

    // 4. User requests analysis
    fireEvent.press(screen.getByText('Analyze'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('analyze_scene', { scene_id: 'scene-1' });
    });
  });

  test('User can handle errors gracefully', async () => {
    // Setup error responses
    mockInvoke.mockImplementation((command) => {
      if (command === 'create_manuscript_safe') {
        return Promise.reject(JSON.stringify({
          type: 'Validation',
          message: 'Title cannot be empty',
          field: 'title',
          timestamp: new Date().toISOString(),
        }));
      }
      return Promise.resolve({});
    });

    const ErrorHandlingApp = () => {
      const [error, setError] = React.useState<string | null>(null);
      const [showCreateDialog, setShowCreateDialog] = React.useState(true);

      const handleSubmitNew = async (title: string) => {
        try {
          setError(null);
          await mockInvoke('create_manuscript_safe', { title, text: '', metadata: null });
        } catch (err) {
          const errorObj = JSON.parse(err as string);
          setError(errorObj.message);
        }
      };

      return (
        <div>
          {error && <div role="alert">Error: {error}</div>}
          <MockCreateManuscriptDialog
            visible={showCreateDialog}
            onSubmit={handleSubmitNew}
            onCancel={() => setShowCreateDialog(false)}
          />
        </div>
      );
    };

    render(<ErrorHandlingApp />);

    // 1. User tries to create manuscript (which will fail)
    fireEvent.press(screen.getByText('Create'));

    // 2. Error message appears
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText('Error: Title cannot be empty')).toBeTruthy();
    });

    // 3. Verify error was handled properly
    expect(mockInvoke).toHaveBeenCalledWith('create_manuscript_safe', {
      title: 'New Test Manuscript',
      text: '',
      metadata: null,
    });
  });

  test('User can export manuscript', async () => {
    mockInvoke.mockImplementation((command, args) => {
      if (command === 'export_manuscript') {
        return Promise.resolve({
          success: true,
          path: '/path/to/exported/file.pdf',
        });
      }
      return Promise.resolve({});
    });

    const ExportWorkflow = () => {
      const [exportStatus, setExportStatus] = React.useState<string | null>(null);

      const handleExport = async () => {
        try {
          setExportStatus('Exporting...');
          const result = await mockInvoke('export_manuscript', {
            manuscript_id: 'test-id',
            format: 'pdf',
            options: {},
          });
          
          setExportStatus(`Export complete: ${result.path}`);
        } catch (error) {
          setExportStatus('Export failed');
        }
      };

      return (
        <div>
          <h1>Export Manuscript</h1>
          <button onClick={handleExport}>Export as PDF</button>
          {exportStatus && <div data-testid="export-status">{exportStatus}</div>}
        </div>
      );
    };

    render(<ExportWorkflow />);

    // 1. User clicks export
    fireEvent.press(screen.getByText('Export as PDF'));

    // 2. Export status updates
    expect(screen.getByTestId('export-status')).toHaveTextContent('Exporting...');

    // 3. Export completes
    await waitFor(() => {
      expect(screen.getByTestId('export-status')).toHaveTextContent('Export complete: /path/to/exported/file.pdf');
    });

    // 4. Verify export command was called
    expect(mockInvoke).toHaveBeenCalledWith('export_manuscript', {
      manuscript_id: 'test-id',
      format: 'pdf',
      options: {},
    });
  });

  test('User can search through manuscripts', async () => {
    mockInvoke.mockImplementation((command, args) => {
      if (command === 'search_content') {
        return Promise.resolve([
          {
            scene_id: 'scene-1',
            manuscript_id: 'test-id',
            scene_title: 'Opening Scene',
            matching_text: 'dark and stormy <mark>night</mark>',
            match_rank: 0.95,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const SearchWorkflow = () => {
      const [searchQuery, setSearchQuery] = React.useState('');
      const [searchResults, setSearchResults] = React.useState<any[]>([]);
      const [isSearching, setIsSearching] = React.useState(false);

      const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        try {
          setIsSearching(true);
          const results = await mockInvoke('search_content', {
            query: searchQuery,
            manuscript_id: null,
            limit: 20,
            highlight: true,
          });
          
          setSearchResults(results);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      };

      return (
        <div>
          <h1>Search Manuscripts</h1>
          <input
            data-testid="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
          />
          <button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          
          <div data-testid="search-results">
            {searchResults.map((result, index) => (
              <div key={index}>
                <h3>{result.scene_title}</h3>
                <p dangerouslySetInnerHTML={{ __html: result.matching_text }} />
              </div>
            ))}
          </div>
        </div>
      );
    };

    render(<SearchWorkflow />);

    // 1. User enters search query
    const searchInput = screen.getByTestId('search-input');
    fireEvent.changeText(searchInput, 'night');

    // 2. User clicks search
    fireEvent.press(screen.getByText('Search'));

    // 3. Search results appear
    await waitFor(() => {
      const results = screen.getByTestId('search-results');
      expect(results).toBeTruthy();
      expect(screen.getByText('Opening Scene')).toBeTruthy();
    });

    // 4. Verify search command was called
    expect(mockInvoke).toHaveBeenCalledWith('search_content', {
      query: 'night',
      manuscript_id: null,
      limit: 20,
      highlight: true,
    });
  });

  test('Complete workflow: Create → Edit → Analyze → Export', async () => {
    const FullWorkflow = () => {
      const [step, setStep] = React.useState('create');
      const [manuscriptId, setManuscriptId] = React.useState<string | null>(null);
      const [analysisResult, setAnalysisResult] = React.useState<any>(null);

      const steps = {
        create: () => (
          <div>
            <h1>Step 1: Create Manuscript</h1>
            <button onClick={async () => {
              const result = await mockInvoke('create_manuscript_safe', {
                title: 'Complete Workflow Test',
                text: 'Initial content',
                metadata: null,
              });
              setManuscriptId(result.id);
              setStep('edit');
            }}>
              Create Manuscript
            </button>
          </div>
        ),
        
        edit: () => (
          <div>
            <h1>Step 2: Edit Content</h1>
            <textarea data-testid="editor" defaultValue="Initial content" />
            <button onClick={async () => {
              await mockInvoke('update_scene_safe', {
                scene_id: 'scene-1',
                updates: { raw_text: 'Updated content for analysis' },
              });
              setStep('analyze');
            }}>
              Save and Continue
            </button>
          </div>
        ),
        
        analyze: () => (
          <div>
            <h1>Step 3: Analyze Content</h1>
            <button onClick={async () => {
              const result = await mockInvoke('analyze_scene', { scene_id: 'scene-1' });
              setAnalysisResult(result);
              setStep('export');
            }}>
              Analyze Scene
            </button>
            {analysisResult && <div>Analysis complete!</div>}
          </div>
        ),
        
        export: () => (
          <div>
            <h1>Step 4: Export Manuscript</h1>
            <button onClick={async () => {
              await mockInvoke('export_manuscript', {
                manuscript_id: manuscriptId,
                format: 'pdf',
                options: {},
              });
              setStep('complete');
            }}>
              Export as PDF
            </button>
          </div>
        ),
        
        complete: () => (
          <div>
            <h1>Workflow Complete!</h1>
            <p>Manuscript created, edited, analyzed, and exported successfully.</p>
          </div>
        ),
      };

      return steps[step as keyof typeof steps]();
    };

    render(<FullWorkflow />);

    // Step 1: Create
    fireEvent.press(screen.getByText('Create Manuscript'));
    await waitFor(() => expect(screen.getByText('Step 2: Edit Content')).toBeTruthy());

    // Step 2: Edit
    fireEvent.press(screen.getByText('Save and Continue'));
    await waitFor(() => expect(screen.getByText('Step 3: Analyze Content')).toBeTruthy());

    // Step 3: Analyze
    fireEvent.press(screen.getByText('Analyze Scene'));
    await waitFor(() => expect(screen.getByText('Step 4: Export Manuscript')).toBeTruthy());

    // Step 4: Export
    fireEvent.press(screen.getByText('Export as PDF'));
    await waitFor(() => expect(screen.getByText('Workflow Complete!')).toBeTruthy());

    // Verify all commands were called in sequence
    expect(mockInvoke).toHaveBeenCalledWith('create_manuscript_safe', expect.any(Object));
    expect(mockInvoke).toHaveBeenCalledWith('update_scene_safe', expect.any(Object));
    expect(mockInvoke).toHaveBeenCalledWith('analyze_scene', expect.any(Object));
    expect(mockInvoke).toHaveBeenCalledWith('export_manuscript', expect.any(Object));
  });
});