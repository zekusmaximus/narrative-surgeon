import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useManuscriptStore } from '../store/manuscriptStore';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeftIcon, FolderOpenIcon, CheckIcon, XIcon, FileIcon } from 'lucide-react';

interface BatchImportDialogProps {
  onClose: () => void;
  onComplete: (count: number) => void;
}

interface ImportedFile {
  filename: string;
  status: 'pending' | 'importing' | 'success' | 'error';
  error?: string;
  manuscriptId?: string;
}

export function BatchImportDialog({ onClose, onComplete }: BatchImportDialogProps) {
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);

  const { createManuscript } = useManuscriptStore();

  const handleSelectFiles = async () => {
    try {
      const importResults = await invoke<any[]>('batch_import_files');
      
      if (importResults.length === 0) {
        return; // User cancelled dialog
      }

      const fileList: ImportedFile[] = importResults.map(result => ({
        filename: result.filename,
        status: 'pending',
      }));

      setFiles(fileList);
      
      // Start importing automatically
      await startImport(importResults, fileList);
    } catch (error) {
      console.error('Failed to select files:', error);
    }
  };

  const startImport = async (importResults: any[], fileList: ImportedFile[]) => {
    setIsImporting(true);
    let successCount = 0;

    for (let i = 0; i < importResults.length; i++) {
      setCurrentFileIndex(i);
      const result = importResults[i];
      const updatedFiles = [...fileList];
      
      updatedFiles[i].status = 'importing';
      setFiles([...updatedFiles]);

      try {
        // Extract title from filename or metadata
        const manuscriptTitle = result.metadata?.title || 
                               result.filename.replace(/\.[^/.]+$/, '');
        
        // Create manuscript with imported content
        const manuscript = await createManuscript(
          manuscriptTitle,
          result.content,
          {
            genre: undefined,
            targetAudience: undefined,
          }
        );

        updatedFiles[i].status = 'success';
        updatedFiles[i].manuscriptId = manuscript.id;
        successCount++;
      } catch (error) {
        updatedFiles[i].status = 'error';
        updatedFiles[i].error = error instanceof Error ? error.message : 'Unknown error';
      }

      setFiles([...updatedFiles]);
    }

    setIsImporting(false);
    setCurrentFileIndex(-1);
    
    // Auto-close after successful import
    setTimeout(() => {
      onComplete(successCount);
    }, 1500);
  };

  const getStatusIcon = (status: ImportedFile['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />;
      case 'importing':
        return <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />;
      case 'success':
        return <CheckIcon className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XIcon className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusColor = (status: ImportedFile['status']) => {
    switch (status) {
      case 'pending':
        return 'text-muted-foreground';
      case 'importing':
        return 'text-primary';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-destructive';
    }
  };

  if (files.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpenIcon size={20} />
              Import Multiple Manuscripts
            </CardTitle>
            <CardDescription>
              Select multiple manuscript files to import at once
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <FolderOpenIcon className="mx-auto mb-4 text-muted-foreground" size={48} />
              <p className="text-muted-foreground mb-4">
                Choose multiple manuscript files to import simultaneously
              </p>
              <Button onClick={handleSelectFiles} className="mb-2">
                Select Files
              </Button>
              <div className="text-xs text-muted-foreground">
                Supported: .txt, .docx, .doc, .rtf, .md, .markdown
              </div>
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
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            {!isImporting && (
              <Button 
                onClick={() => setFiles([])} 
                variant="ghost" 
                size="sm"
              >
                <ArrowLeftIcon size={16} className="mr-2" />
                Back
              </Button>
            )}
            <div>
              <CardTitle>Importing Manuscripts</CardTitle>
              <CardDescription>
                {isImporting 
                  ? `Importing ${currentFileIndex + 1} of ${files.length} files...`
                  : `Ready to import ${files.length} files`
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {files.map((file, index) => (
              <div 
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  index === currentFileIndex ? 'bg-primary/5 border-primary' : 'bg-muted/50'
                }`}
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(file.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileIcon size={16} className="text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{file.filename}</span>
                  </div>
                  
                  {file.status === 'error' && file.error && (
                    <div className="text-xs text-destructive mt-1">
                      {file.error}
                    </div>
                  )}
                  
                  {file.status === 'success' && (
                    <div className="text-xs text-green-600 mt-1">
                      Successfully imported
                    </div>
                  )}
                </div>
                
                <div className={`text-sm font-medium ${getStatusColor(file.status)}`}>
                  {file.status === 'pending' && 'Waiting'}
                  {file.status === 'importing' && 'Importing...'}
                  {file.status === 'success' && 'Complete'}
                  {file.status === 'error' && 'Failed'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        {!isImporting && (
          <div className="flex-shrink-0 p-6 pt-0">
            <div className="flex gap-2">
              <Button onClick={onClose} variant="ghost" className="flex-1">
                {files.some(f => f.status === 'success') ? 'Done' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}