import React, { useEffect } from 'react';
import { useManuscriptStore } from '../store/manuscriptStore';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PlusIcon, BookOpenIcon, CalendarIcon, FileTextIcon } from 'lucide-react';
import type { Manuscript } from '../types';

interface ManuscriptsListProps {
  onManuscriptSelect: (manuscript: Manuscript) => void;
  onCreateNew: () => void;
}

export function ManuscriptsList({ onManuscriptSelect, onCreateNew }: ManuscriptsListProps) {
  const { 
    manuscripts, 
    isLoading, 
    error, 
    initialize, 
    deleteManuscript 
  } = useManuscriptStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k words`;
    }
    return `${count} words`;
  };

  const handleDelete = async (e: React.MouseEvent, manuscriptId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this manuscript? This action cannot be undone.')) {
      try {
        await deleteManuscript(manuscriptId);
      } catch (error) {
        console.error('Failed to delete manuscript:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-destructive mb-2">Error loading manuscripts</div>
        <div className="text-sm text-muted-foreground mb-4">{error}</div>
        <Button onClick={initialize} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manuscripts</h1>
          <p className="text-muted-foreground">
            Manage and edit your manuscript projects
          </p>
        </div>
        <Button onClick={onCreateNew} className="flex items-center gap-2">
          <PlusIcon size={16} />
          New Manuscript
        </Button>
      </div>

      {manuscripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpenIcon size={64} className="text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No manuscripts yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Start your writing journey by creating your first manuscript. Import an existing document or start from scratch.
          </p>
          <Button onClick={onCreateNew} className="flex items-center gap-2">
            <PlusIcon size={16} />
            Create Your First Manuscript
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {manuscripts.map((manuscript) => (
            <Card 
              key={manuscript.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onManuscriptSelect(manuscript)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between">
                  <span className="line-clamp-2">{manuscript.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(e, manuscript.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  >
                    ×
                  </Button>
                </CardTitle>
                {manuscript.genre && (
                  <CardDescription className="text-xs">
                    {manuscript.genre}
                    {manuscript.targetAudience && ` • ${manuscript.targetAudience}`}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileTextIcon size={14} />
                  {formatWordCount(manuscript.totalWordCount)}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon size={14} />
                  Updated {formatDate(manuscript.updatedAt)}
                </div>

                {manuscript.openingStrengthScore && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Opening Strength: </span>
                    <span className="font-medium">
                      {manuscript.openingStrengthScore}/10
                    </span>
                  </div>
                )}

                {manuscript.compTitles && manuscript.compTitles.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Comp titles: {manuscript.compTitles.slice(0, 2).join(', ')}
                    {manuscript.compTitles.length > 2 && ` +${manuscript.compTitles.length - 2} more`}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}