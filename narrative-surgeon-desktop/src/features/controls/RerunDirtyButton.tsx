import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { rerunDirty } from '@/lib/reprocess';
import { toast } from '@/components/ui/use-toast';

interface RerunDirtyButtonProps {
  modules?: ('events' | 'plants' | 'state' | 'beats')[];
  sceneId?: string;
  onComplete?: (results: Map<string, any[]>) => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RerunDirtyButton({ 
  modules, 
  sceneId,
  onComplete,
  variant = 'outline',
  size = 'sm',
  className
}: RerunDirtyButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number; currentScene?: string }>({ completed: 0, total: 0 });
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);
  
  const handleRerun = async () => {
    setIsProcessing(true);
    setProgress({ completed: 0, total: 0 });
    setLastResult(null);
    
    try {
      const results = await rerunDirty({ 
        modules,
        sceneId,
        onProgress: (progressUpdate) => {
          setProgress(progressUpdate);
        }
      });
      
      setLastResult('success');
      
      // Calculate success statistics
      const totalScenes = results.size;
      const successfulScenes = Array.from(results.values()).filter(sceneResults => 
        sceneResults.some(result => result.success)
      ).length;
      
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${successfulScenes}/${totalScenes} scenes`,
      });
      
      onComplete?.(results);
      
    } catch (error) {
      setLastResult('error');
      console.error('Failed to rerun dirty modules:', error);
      
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress({ completed: 0, total: 0 });
    }
  };
  
  const getProgressPercentage = () => {
    if (progress.total === 0) return 0;
    return Math.round((progress.completed / progress.total) * 100);
  };
  
  const getButtonText = () => {
    if (isProcessing) {
      if (progress.total > 0) {
        return `Processing... ${getProgressPercentage()}%`;
      }
      return 'Processing...';
    }
    
    if (sceneId) {
      return 'Re-run Scene Analysis';
    }
    
    return 'Re-run Dirty Modules';
  };
  
  const getIcon = () => {
    if (isProcessing) {
      return <RefreshCw className="w-4 h-4 mr-2 animate-spin" />;
    }
    
    if (lastResult === 'success') {
      return <CheckCircle className="w-4 h-4 mr-2 text-green-500" />;
    }
    
    if (lastResult === 'error') {
      return <AlertCircle className="w-4 h-4 mr-2 text-red-500" />;
    }
    
    return <RefreshCw className="w-4 h-4 mr-2" />;
  };
  
  return (
    <div className="flex flex-col gap-2">
      <Button 
        onClick={handleRerun}
        disabled={isProcessing}
        variant={variant}
        size={size}
        className={className}
      >
        {getIcon()}
        {getButtonText()}
      </Button>
      
      {isProcessing && progress.total > 0 && (
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Progress:</span>
            <span>{progress.completed}/{progress.total} scenes</span>
          </div>
          
          {progress.currentScene && (
            <div className="text-xs truncate">
              Current: {progress.currentScene}
            </div>
          )}
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      )}
      
      {modules && modules.length > 0 && !isProcessing && (
        <div className="text-xs text-muted-foreground">
          Modules: {modules.join(', ')}
        </div>
      )}
    </div>
  );
}

export default RerunDirtyButton;