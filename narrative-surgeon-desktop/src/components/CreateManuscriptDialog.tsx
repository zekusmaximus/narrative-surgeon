import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useManuscriptStore } from '../store/manuscriptStore';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeftIcon, FileIcon, UploadIcon } from 'lucide-react';

interface CreateManuscriptDialogProps {
  onClose: () => void;
  onManuscriptCreated: (manuscript: any) => void;
}

export function CreateManuscriptDialog({ onClose, onManuscriptCreated }: CreateManuscriptDialogProps) {
  const [step, setStep] = useState<'method' | 'details' | 'import'>('method');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [genre, setGenre] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createManuscript } = useManuscriptStore();

  const handleCreateFromScratch = () => {
    setStep('details');
  };

  const handleImportFile = () => {
    setStep('import');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const manuscript = await createManuscript(title, text || 'Start writing here...', {
        genre: genre || undefined,
        targetAudience: targetAudience || undefined,
      });
      onManuscriptCreated(manuscript);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create manuscript');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileImport = async () => {
    try {
      // In a full implementation, this would open a file dialog first
      // For now, show an input for file path (development purposes)
      const filePath = prompt('Enter file path to import (development mode):');
      if (!filePath) return;

      const result = await invoke('import_manuscript_file', { filePath });
      console.log('Import result:', result);
      
      // Create manuscript with imported content
      const manuscript = await createManuscript(
        result.filename.replace(/\.[^/.]+$/, ''), // Remove extension from filename
        result.content,
        {}
      );
      
      onManuscriptCreated(manuscript);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import file');
    }
  };

  if (step === 'method') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Create New Manuscript</CardTitle>
            <CardDescription>
              How would you like to start your new manuscript?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleCreateFromScratch}
              variant="outline"
              className="w-full justify-start text-left h-auto p-4"
            >
              <FileIcon className="mr-3" size={20} />
              <div>
                <div className="font-medium">Start from scratch</div>
                <div className="text-sm text-muted-foreground">
                  Begin with a blank manuscript
                </div>
              </div>
            </Button>
            
            <Button 
              onClick={handleImportFile}
              variant="outline"
              className="w-full justify-start text-left h-auto p-4"
            >
              <UploadIcon className="mr-3" size={20} />
              <div>
                <div className="font-medium">Import existing file</div>
                <div className="text-sm text-muted-foreground">
                  Upload a .docx, .txt, or other document
                </div>
              </div>
            </Button>

            <div className="pt-4">
              <Button onClick={onClose} variant="ghost" className="w-full">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'import') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <Button 
              onClick={() => setStep('method')} 
              variant="ghost" 
              size="sm"
              className="w-fit mb-2"
            >
              <ArrowLeftIcon size={16} className="mr-2" />
              Back
            </Button>
            <CardTitle>Import File</CardTitle>
            <CardDescription>
              Select a file to import as your new manuscript
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <UploadIcon className="mx-auto mb-4 text-muted-foreground" size={48} />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop a file here, or click to browse
              </p>
              <Button onClick={handleFileImport} variant="outline">
                Choose File
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Supported formats: .docx, .doc, .txt, .rtf
            </div>

            <Button onClick={onClose} variant="ghost" className="w-full">
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <Button 
            onClick={() => setStep('method')} 
            variant="ghost" 
            size="sm"
            className="w-fit mb-2"
          >
            <ArrowLeftIcon size={16} className="mr-2" />
            Back
          </Button>
          <CardTitle>New Manuscript Details</CardTitle>
          <CardDescription>
            Enter the basic information for your manuscript
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your manuscript title"
                required
              />
            </div>

            <div>
              <label htmlFor="genre" className="block text-sm font-medium mb-2">
                Genre
              </label>
              <input
                id="genre"
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Literary Fiction, Mystery, Romance"
              />
            </div>

            <div>
              <label htmlFor="audience" className="block text-sm font-medium mb-2">
                Target Audience
              </label>
              <input
                id="audience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Adult, Young Adult, Middle Grade"
              />
            </div>

            <div>
              <label htmlFor="text" className="block text-sm font-medium mb-2">
                Initial Text (Optional)
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Start writing your first scene, or leave blank to begin later..."
              />
            </div>

            {error && (
              <div className="text-destructive text-sm">{error}</div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={!title.trim() || isLoading}
                className="flex-1"
              >
                {isLoading ? 'Creating...' : 'Create Manuscript'}
              </Button>
              <Button 
                type="button" 
                onClick={onClose} 
                variant="ghost"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}