'use client'

import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  Info, 
  XCircle, 
  Lightbulb,
  ChevronRight,
  CheckCircle
} from 'lucide-react'
import type { ConsistencyCheck } from '@/types/single-manuscript'

interface ChapterDependencyWarningsProps {
  warnings: ConsistencyCheck[]
}

export function ChapterDependencyWarnings({ warnings }: ChapterDependencyWarningsProps) {
  const errors = warnings.filter(w => w.severity === 'error')
  const warningItems = warnings.filter(w => w.severity === 'warning')
  const infoItems = warnings.filter(w => w.severity === 'info')
  
  const getSeverityIcon = (severity: ConsistencyCheck['severity']) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }
  
  const getSeverityColor = (severity: ConsistencyCheck['severity']) => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-orange-200 bg-orange-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
    }
  }
  
  if (warnings.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-medium text-green-800 mb-1">All Clear!</h3>
          <p className="text-sm text-green-600">
            No consistency issues detected with this chapter order.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-medium mb-2">Consistency Analysis</h3>
        <div className="flex items-center gap-4 text-sm">
          {errors.length > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span>{errors.length} errors</span>
            </div>
          )}
          {warningItems.length > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{warningItems.length} warnings</span>
            </div>
          )}
          {infoItems.length > 0 && (
            <div className="flex items-center gap-1 text-blue-600">
              <Info className="h-4 w-4" />
              <span>{infoItems.length} suggestions</span>
            </div>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {warnings.map((warning, index) => (
            <Card 
              key={index}
              className={`p-3 ${getSeverityColor(warning.severity)}`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(warning.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs font-mono"
                    >
                      {warning.type}
                    </Badge>
                    {warning.chapterIds.length > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {warning.chapterIds.length} chapters
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm font-medium mb-2">
                    {warning.message}
                  </p>
                  
                  {warning.suggestion && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-white/50 rounded p-2">
                      <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{warning.suggestion}</span>
                    </div>
                  )}
                  
                  {warning.chapterIds.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">
                        Affects chapters: {warning.chapterIds.join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {warning.autoFixable && (
                    <div className="mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => console.log('Auto-fix:', warning.id)}
                      >
                        <ChevronRight className="h-3 w-3 mr-1" />
                        Auto-fix
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default ChapterDependencyWarnings