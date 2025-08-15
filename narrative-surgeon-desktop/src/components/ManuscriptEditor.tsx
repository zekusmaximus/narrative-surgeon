import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { TextStyle } from '@tiptap/extension-text-style';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { ExportDialog } from './ExportDialog';
import { DocumentOutline } from './DocumentOutline';
import { WritingStats } from '@/components/WritingStats';
import { TrackChangesSimple } from './extensions/TrackChangesSimple';
import { useSingleManuscriptStore } from '@/store/singleManuscriptStore';
import { 
  SaveIcon, 
  UndoIcon, 
  RedoIcon, 
  BoldIcon, 
  ItalicIcon,
  DownloadIcon,
  SearchIcon,
  MessageSquareIcon,
  EditIcon,
  EyeIcon,
  TypeIcon,
  ClockIcon,
  CheckIcon,
  XIcon
} from 'lucide-react';
// REMOVED: import { useManuscriptStore } from '../store/manuscriptStore'; // Multi-manuscript feature removed
import type { Manuscript, Scene } from '../types';

interface ManuscriptEditorProps {
  manuscript: Manuscript;
  onBack: () => void;
}

interface EditorState {
  isTrackChangesActive: boolean;
  isFindReplaceOpen: boolean;
  isTypewriterMode: boolean;
  isFocusMode: boolean;
  searchTerm: string;
  replaceTerm: string;
}

export function ManuscriptEditor({ manuscript, onBack }: ManuscriptEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [editorState, setEditorState] = useState<EditorState>({
    isTrackChangesActive: false,
    isFindReplaceOpen: false,
    isTypewriterMode: false,
    isFocusMode: false,
    searchTerm: '',
    replaceTerm: '',
  });
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    scenes, 
    loadManuscriptData, 
    updateScene, 
    setActiveManuscript,
    reorderScenes,
    createScene,
    deleteScene,
    renameScene
  } = useSingleManuscriptStore();

  const manuscriptScenes = scenes.get(manuscript.id) || [];

  // Auto-save function  
  const autoSave = useCallback(async (editorInstance: any) => {
    if (!editorInstance || !currentScene || isSaving) return;
    
    const content = editorInstance.getHTML();
    const wordCount = editorInstance.storage.characterCount.words() || 0;
    
    try {
      await updateScene(currentScene.id, {
        rawText: content,
        wordCount,
        updatedAt: Date.now(),
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [currentScene, isSaving, updateScene]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Placeholder.configure({
        placeholder: 'Start writing your story here...',
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
      }),
      CharacterCount.configure({
        limit: null,
      }),
      TrackChangesSimple.configure({
        enabled: editorState.isTrackChangesActive,
      }),
    ],
    content: currentScene?.rawText || '<p>Loading...</p>',
    editorProps: {
      attributes: {
        class: 'manuscript-editor prose prose-lg max-w-none focus:outline-none min-h-[500px] px-6 py-4',
      },
    },
    onUpdate: ({ editor: editorInstance }: { editor: any }) => {
      // Set up auto-save timer (30 seconds)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => autoSave(editorInstance), 30000);
    },
  });

  useEffect(() => {
    setActiveManuscript(manuscript);
    loadManuscriptData(manuscript.id);
    
    // Cleanup auto-save timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [manuscript, setActiveManuscript, loadManuscriptData]);

  useEffect(() => {
    // Load the first scene if available
    if (manuscriptScenes.length > 0 && !currentScene) {
      const firstScene = manuscriptScenes[0];
      setCurrentScene(firstScene);
      if (editor) {
        (editor.commands as any).setContent(firstScene.rawText || '<p>Start writing here...</p>');
      }
    }
  }, [manuscriptScenes, currentScene, editor]);

  const handleSave = async () => {
    if (!editor || !currentScene) return;

    setIsSaving(true);
    try {
      const content = editor.getHTML();
      const wordCount = editor.storage.characterCount.words() || 0;

      await updateScene(currentScene.id, {
        rawText: content,
        wordCount,
        updatedAt: Date.now(),
      });

      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSceneSelect = (scene: Scene) => {
    if (editor) {
      setCurrentScene(scene);
  (editor.commands as any).setContent(scene.rawText || '<p>Start writing here...</p>');
    }
  };

  const handleScenesReorder = async (newOrder: string[]) => {
    try {
      await reorderScenes(manuscript.id, newOrder);
      // The store will update the local state
    } catch (error) {
      console.error('Failed to reorder scenes:', error);
    }
  };

  const handleSceneCreate = async (afterSceneId?: string) => {
    try {
      const newScene = await createScene(manuscript.id, afterSceneId);
      setCurrentScene(newScene);
      if (editor) {
  (editor.commands as any).setContent(newScene.rawText || '<p>Start writing here...</p>');
      }
    } catch (error) {
      console.error('Failed to create scene:', error);
    }
  };

  const handleSceneDelete = async (sceneId: string) => {
    try {
      await deleteScene(sceneId);
      // If we deleted the current scene, select the first available scene
      if (currentScene?.id === sceneId) {
        const remainingScenes = manuscriptScenes.filter((s: any) => s.id !== sceneId);
        if (remainingScenes.length > 0) {
          handleSceneSelect(remainingScenes[0]);
        } else {
          setCurrentScene(null);
          if (editor) {
            (editor.commands as any).setContent('<p>No scenes available. Create a new scene to start writing.</p>');
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete scene:', error);
    }
  };

  const handleSceneRename = async (sceneId: string, newTitle: string) => {
    try {
      await renameScene(sceneId, newTitle);
      // The store will update the local state
    } catch (error) {
      console.error('Failed to rename scene:', error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleTrackChanges = () => {
    setEditorState(prev => ({
      ...prev,
      isTrackChangesActive: !prev.isTrackChangesActive
    }));
    // Track changes are controlled via extension configuration
    // The extension will be recreated with the new state
  };

  const toggleFindReplace = () => {
    setEditorState(prev => ({
      ...prev,
      isFindReplaceOpen: !prev.isFindReplaceOpen
    }));
  };

  const toggleTypewriterMode = () => {
    setEditorState(prev => ({
      ...prev,
      isTypewriterMode: !prev.isTypewriterMode
    }));
  };

  const toggleFocusMode = () => {
    setEditorState(prev => ({
      ...prev,
      isFocusMode: !prev.isFocusMode
    }));
  };
  
  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="text-sm">
            ← Back to manuscripts
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{manuscript.title}</h1>
            <p className="text-sm text-muted-foreground">
              {manuscript.genre} {manuscript.targetAudience && `• ${manuscript.targetAudience}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-sm text-muted-foreground">
              Saved at {formatDate(lastSaved)}
            </span>
          )}
          <Button
            onClick={() => setShowExportDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <DownloadIcon size={16} />
            Export
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <SaveIcon size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <DocumentOutline
            scenes={manuscriptScenes}
            activeSceneId={currentScene?.id}
            onSceneSelect={handleSceneSelect}
            onScenesReorder={handleScenesReorder}
            onSceneCreate={handleSceneCreate}
            onSceneDelete={handleSceneDelete}
            onSceneRename={handleSceneRename}
            manuscriptWordCount={manuscript.totalWordCount}
            targetWordCount={80000} // Could be configurable per manuscript
          />
          
          {editor && (
            <WritingStats
              currentWordCount={editor.storage.characterCount.words() || 0}
              currentCharacterCount={editor.storage.characterCount.characters() || 0}
              totalWordCount={manuscript.totalWordCount}
              scenes={manuscriptScenes}
              targetWordCount={80000}
            />
          )}
        </div>

        {/* Main Editor */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {currentScene?.title || 'New Scene'}
                </CardTitle>
                
                {/* Enhanced Toolbar */}
                <div className="flex items-center gap-1">
                  {/* Basic editing */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => (editor.chain() as any).focus().undo().run()}
                    disabled={!(editor.can() as any).undo()}
                    title="Undo"
                  >
                    <UndoIcon size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => (editor.chain() as any).focus().redo().run()}
                    disabled={!(editor.can() as any).redo()}
                    title="Redo"
                  >
                    <RedoIcon size={16} />
                  </Button>
                  <Separator orientation="vertical" className="h-6 mx-2" />
                  
                  {/* Text formatting */}
                  <Button
                    variant={editor.isActive('bold') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => (editor.chain() as any).focus().toggleBold().run()}
                    title="Bold"
                  >
                    <BoldIcon size={16} />
                  </Button>
                  <Button
                    variant={editor.isActive('italic') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => (editor.chain() as any).focus().toggleItalic().run()}
                    title="Italic"
                  >
                    <ItalicIcon size={16} />
                  </Button>
                  <Separator orientation="vertical" className="h-6 mx-2" />
                  
                  {/* Advanced features */}
                  <Button
                    variant={editorState.isTrackChangesActive ? 'default' : 'ghost'}
                    size="sm"
                    onClick={toggleTrackChanges}
                    title="Track Changes"
                  >
                    <EditIcon size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Placeholder for comment functionality
                      console.log('Add comment functionality');
                    }}
                    disabled={editor?.state.selection.empty}
                    title="Add Comment (Coming Soon)"
                  >
                    <MessageSquareIcon size={16} />
                  </Button>
                  <Button
                    variant={editorState.isFindReplaceOpen ? 'default' : 'ghost'}
                    size="sm"
                    onClick={toggleFindReplace}
                    title="Find & Replace (Coming Soon)"
                  >
                    <SearchIcon size={16} />
                  </Button>
                  <Separator orientation="vertical" className="h-6 mx-2" />
                  
                  {/* Writing modes */}
                  <Button
                    variant={editorState.isTypewriterMode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={toggleTypewriterMode}
                    title="Typewriter Mode (Coming Soon)"
                  >
                    <TypeIcon size={16} />
                  </Button>
                  <Button
                    variant={editorState.isFocusMode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={toggleFocusMode}
                    title="Focus Mode (Coming Soon)"
                  >
                    <EyeIcon size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Find & Replace Panel (Coming Soon) */}
              {editorState.isFindReplaceOpen && (
                <div className="border-b bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Find..."
                      className="px-2 py-1 text-sm border rounded flex-1"
                      value={editorState.searchTerm}
                      onChange={(e) => {
                        setEditorState(prev => ({ ...prev, searchTerm: e.target.value }));
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Replace..."
                      className="px-2 py-1 text-sm border rounded flex-1"
                      value={editorState.replaceTerm}
                      onChange={(e) => {
                        setEditorState(prev => ({ ...prev, replaceTerm: e.target.value }));
                      }}
                    />
                    <Button size="sm" variant="ghost" disabled>
                      Next
                    </Button>
                    <Button size="sm" variant="ghost" disabled>
                      Replace
                    </Button>
                    <Button size="sm" variant="ghost" disabled>
                      All
                    </Button>
                    <Button size="sm" variant="ghost" onClick={toggleFindReplace}>
                      <XIcon size={14} />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Main Editor */}
              <div className="manuscript-editor min-h-[600px]">
                <EditorContent editor={editor} />
              </div>
              
              {/* Status Bar */}
              <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {editor && (
                    <>
                      <span className="flex items-center gap-1">
                        <TypeIcon size={12} />
                        Words: {editor.storage.characterCount.words() || 0}
                      </span>
                      <span>Characters: {editor.storage.characterCount.characters() || 0}</span>
                      {editorState.isTrackChangesActive && (
                        <span className="flex items-center gap-1">
                          <EditIcon size={12} />
                          Track changes enabled
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {lastSaved && (
                    <span className="flex items-center gap-1">
                      <ClockIcon size={12} />
                      Auto-saved at {formatDate(lastSaved)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CheckIcon size={12} />
                    Scene: {currentScene?.title || 'Untitled'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showExportDialog && (
        <ExportDialog
          manuscriptTitle={manuscript.title}
          content={editor?.getHTML() || ''}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
}