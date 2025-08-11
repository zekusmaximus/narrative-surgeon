import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TypeIcon, ClockIcon, TargetIcon, TrendingUpIcon } from 'lucide-react';
import type { Scene } from '../types';

interface WritingStatsProps {
  currentWordCount: number;
  currentCharacterCount: number;
  totalWordCount: number;
  scenes: Scene[];
  targetWordCount?: number;
}

export function WritingStats({
  currentWordCount,
  currentCharacterCount,
  totalWordCount,
  scenes,
  targetWordCount = 80000,
}: WritingStatsProps) {
  const averageWordsPerScene = scenes.length > 0 
    ? Math.round(totalWordCount / scenes.length) 
    : 0;
  
  const completionPercentage = targetWordCount > 0 
    ? Math.round((totalWordCount / targetWordCount) * 100) 
    : 0;

  const estimatedReadingTime = Math.round(totalWordCount / 200); // ~200 words per minute

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TypeIcon size={18} />
          Writing Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Scene Stats */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Current Scene</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Words:</span>
              <span className="font-medium ml-2">{currentWordCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Characters:</span>
              <span className="font-medium ml-2">{currentCharacterCount}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-3 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Manuscript Totals</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Words:</span>
              <span className="font-medium">{totalWordCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Scenes:</span>
              <span className="font-medium">{scenes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Words/Scene:</span>
              <span className="font-medium">{averageWordsPerScene.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="border-t pt-3 space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Progress</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <TargetIcon size={12} className="text-muted-foreground" />
                <span className="text-muted-foreground">Target Progress:</span>
              </div>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(completionPercentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {(targetWordCount - totalWordCount).toLocaleString()} words remaining
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <ClockIcon size={12} className="text-muted-foreground" />
              <span className="text-muted-foreground">Reading Time:</span>
            </div>
            <span className="font-medium">~{estimatedReadingTime} min</span>
          </div>
        </div>

        {/* Writing Pace Indicator */}
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUpIcon size={12} />
            <span>Writing Pace</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {averageWordsPerScene > 1000 
              ? "Strong scene development" 
              : averageWordsPerScene > 500 
              ? "Good pacing" 
              : "Consider expanding scenes"
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}