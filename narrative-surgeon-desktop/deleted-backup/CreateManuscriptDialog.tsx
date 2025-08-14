import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useManuscriptStore } from '../store/manuscriptStore';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BatchImportDialog } from './BatchImportDialog';
import { ArrowLeftIcon, FileIcon, UploadIcon, FolderOpenIcon } from 'lucide-react';

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
  const [importProgress, setImportProgress] = useState<{stage: string, progress: number, message: string} | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);

  const { createManuscript } = useManuscriptStore();

  const handleCreateFromScratch = () => {
    setStep('details');
  };

  const handleImportFile = () => {
    setStep('import');
  };

  const handleBatchImport = () => {
    setShowBatchImport(true);
  };

  const handleBatchComplete = (_count: number) => {
    setShowBatchImport(false);
    onClose();
    // Could show a success message here
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
      setIsLoading(true);
      setError(null);
      setImportProgress({ stage: 'opening', progress: 10, message: 'Opening file dialog...' });

      // Open file dialog
      const filePath = await invoke<string | null>('open_file_dialog');
      if (!filePath) {
        setIsLoading(false);
        setImportProgress(null);
        return;
      }

      await importFile(filePath);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import file');
    } finally {
      setIsLoading(false);
      setImportProgress(null);
    }
  };

  const importFile = async (filePath: string) => {
    setImportProgress({ stage: 'reading', progress: 30, message: 'Reading file...' });

    // Import the selected file
    const result = await invoke<any>('import_manuscript_file', { filePath });
    
    setImportProgress({ stage: 'processing', progress: 60, message: 'Processing content...' });
    
    // Extract title from filename or metadata
    const manuscriptTitle = result.metadata?.title || 
                           result.filename.replace(/\.[^/.]+$/, ''); // Remove extension from filename
    
    setImportProgress({ stage: 'creating', progress: 80, message: 'Creating manuscript...' });
    
    // Create manuscript with imported content
    const manuscript = await createManuscript(
      manuscriptTitle,
      result.content,
      {
        genre: undefined, // Could be extracted from metadata in the future
        targetAudience: undefined,
      }
    );
    
    setImportProgress({ stage: 'complete', progress: 100, message: 'Import complete!' });
    
    // Small delay to show completion
    setTimeout(() => {
      onManuscriptCreated(manuscript);
    }, 500);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const supportedTypes = ['.txt', '.docx', '.doc', '.rtf', '.md', '.markdown'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!supportedTypes.includes(fileExtension)) {
      setError(`Unsupported file type: ${fileExtension}. Supported: ${supportedTypes.join(', ')}`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // For drag & drop, we would normally handle file reading differently
      // This is a simplified approach - for now, show an error message
      setError('Drag & drop is not fully implemented yet. Please use the file browser instead.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import dropped file');
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

            <Button 
              onClick={handleBatchImport}
              variant="outline"
              className="w-full justify-start text-left h-auto p-4"
            >
              <FolderOpenIcon className="mr-3" size={20} />
              <div>
                <div className="font-medium">Import multiple files</div>
                <div className="text-sm text-muted-foreground">
                  Select and import multiple manuscripts at once
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
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadIcon className="mx-auto mb-4 text-muted-foreground" size={48} />
              <p className="text-sm text-muted-foreground mb-4">
                {isDragOver 
                  ? 'Drop your file here' 
                  : 'Drag and drop a file here, or click to browse'
                }
              </p>
              <Button 
                onClick={handleFileImport} 
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? 'Importing...' : 'Choose File'}
              </Button>
            </div>
            
            {importProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{importProgress.message}</span>
                  <span className="text-muted-foreground">{Math.round(importProgress.progress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${importProgress.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Supported formats: .docx, .doc, .txt, .rtf, .md, .markdown
            </div>

            {!isLoading && (
              <Button onClick={onClose} variant="ghost" className="w-full">
                Cancel
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showBatchImport) {
    return (
      <BatchImportDialog
        onClose={() => setShowBatchImport(false)}
        onComplete={handleBatchComplete}
      />
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