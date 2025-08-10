import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  SaveIcon, 
  UndoIcon, 
  RedoIcon, 
  BoldIcon, 
  ItalicIcon,
  TypeIcon,
  FileTextIcon,
  TimerIcon
} from 'lucide-react';
import { useManuscriptStore } from '../store/manuscriptStore';
import type { Manuscript, Scene } from '../types';

interface ManuscriptEditorProps {
  manuscript: Manuscript;
  onBack: () => void;
}

export function ManuscriptEditor({ manuscript, onBack }: ManuscriptEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  
  const { 
    scenes, 
    loadManuscriptData, 
    updateScene, 
    setActiveManuscript 
  } = useManuscriptStore();

  const manuscriptScenes = scenes.get(manuscript.id) || [];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your story here...',
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
      }),
      CharacterCount.configure({
        limit: null,
      }),
    ],
    content: currentScene?.rawText || '<p>Loading...</p>',
    editorProps: {
      attributes: {
        class: 'manuscript-editor prose prose-lg max-w-none focus:outline-none min-h-[500px] px-6 py-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save logic would go here
      // For now, we'll implement manual save
    },
  });

  useEffect(() => {
    setActiveManuscript(manuscript);
    loadManuscriptData(manuscript.id);
  }, [manuscript, setActiveManuscript, loadManuscriptData]);

  useEffect(() => {
    // Load the first scene if available
    if (manuscriptScenes.length > 0 && !currentScene) {
      const firstScene = manuscriptScenes[0];
      setCurrentScene(firstScene);
      if (editor) {
        editor.commands.setContent(firstScene.rawText || '<p>Start writing here...</p>');
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
      editor.commands.setContent(scene.rawText || '<p>Start writing here...</p>');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
        {/* Scene Navigator */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileTextIcon size={18} />
                Scenes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {manuscriptScenes.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No scenes yet. Start writing to create your first scene.
                </div>
              ) : (
                manuscriptScenes.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => handleSceneSelect(scene)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      currentScene?.id === scene.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium text-sm">
                      {scene.title || `Scene ${scene.indexInManuscript + 1}`}
                    </div>
                    <div className="text-xs opacity-75">
                      {scene.wordCount} words
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Writing Stats */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TypeIcon size={18} />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Words:</span>
                <span className="font-medium">
                  {editor.storage.characterCount.words()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Characters:</span>
                <span className="font-medium">
                  {editor.storage.characterCount.characters()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Words:</span>
                <span className="font-medium">
                  {manuscript.totalWordCount.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Editor */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {currentScene?.title || 'New Scene'}
                </CardTitle>
                
                {/* Toolbar */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                  >
                    <UndoIcon size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                  >
                    <RedoIcon size={16} />
                  </Button>
                  <div className="w-px h-6 bg-border mx-2" />
                  <Button
                    variant={editor.isActive('bold') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    <BoldIcon size={16} />
                  </Button>
                  <Button
                    variant={editor.isActive('italic') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    <ItalicIcon size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="manuscript-editor min-h-[600px]">
                <EditorContent editor={editor} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}