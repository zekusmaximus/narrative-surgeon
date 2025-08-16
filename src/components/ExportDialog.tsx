import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { DownloadIcon, FileTextIcon, FileIcon, CodeIcon } from 'lucide-react';

interface ExportDialogProps {
  manuscriptTitle: string;
  content: string;
  onClose: () => void;
}

export function ExportDialog({ manuscriptTitle, content, onClose }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportFormats = [
    {
      format: 'txt',
      title: 'Plain Text',
      description: 'Simple text file without formatting',
      icon: FileTextIcon,
      extension: 'txt'
    },
    {
      format: 'docx',
      title: 'Microsoft Word',
      description: 'Word document with formatting preserved',
      icon: FileIcon,
      extension: 'docx'
    },
    {
      format: 'md',
      title: 'Markdown',
      description: 'Markdown format for version control',
      icon: CodeIcon,
      extension: 'md'
    },
    {
      format: 'html',
      title: 'HTML',
      description: 'Web page with professional styling',
      icon: CodeIcon,
      extension: 'html'
    }
  ];

  const handleExport = async (format: string, extension: string) => {
    try {
      setIsExporting(true);
      setError(null);

      // Clean manuscript title for filename
      const cleanTitle = manuscriptTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
      const defaultFilename = `${cleanTitle}.${extension}`;

      // Open save dialog
      const filePath = await invoke<string | null>('save_file_dialog', {
        defaultName: defaultFilename,
        format: format
      });

      if (!filePath) {
        setIsExporting(false);
        return;
      }

      // Export the manuscript
      await invoke('export_manuscript', {
        content,
        filePath,
        format
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export manuscript');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DownloadIcon size={20} />
            Export Manuscript
          </CardTitle>
          <CardDescription>
            Choose a format to export "{manuscriptTitle}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportFormats.map(({ format, title, description, icon: Icon, extension }) => (
              <Button
                key={format}
                onClick={() => handleExport(format, extension)}
                disabled={isExporting}
                variant="outline"
                className="h-auto p-4 justify-start text-left"
              >
                <Icon className="mr-3 flex-shrink-0" size={24} />
                <div className="min-w-0">
                  <div className="font-medium">{title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {description}
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {error && (
            <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
              {error}
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <strong>Export Notes:</strong>
            <ul className="mt-1 space-y-1">
              <li>• Plain Text: Removes all formatting, best for simple sharing</li>
              <li>• Word Document: Preserves formatting, compatible with Microsoft Word</li>
              <li>• Markdown: Great for version control and technical writing</li>
              <li>• HTML: Perfect for web publishing with professional styling</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={onClose} 
              variant="ghost" 
              className="flex-1"
              disabled={isExporting}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}