/**
 * Example usage of RerunDirtyButton component
 * This file shows how to integrate the component into different parts of the app
 */

import React from 'react';
import { RerunDirtyButton } from './RerunDirtyButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RerunDirtyButtonExample() {
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic rerun all dirty modules */}
          <div>
            <h4 className="font-medium mb-2">Rerun All Dirty Modules</h4>
            <RerunDirtyButton 
              onComplete={(results) => {
                console.log('All modules processed:', results);
              }}
            />
          </div>
          
          {/* Specific modules only */}
          <div>
            <h4 className="font-medium mb-2">Rerun Specific Modules</h4>
            <RerunDirtyButton 
              modules={['events', 'plants']}
              onComplete={(results) => {
                console.log('Events and plants processed:', results);
              }}
            />
          </div>
          
          {/* Single scene processing */}
          <div>
            <h4 className="font-medium mb-2">Rerun Single Scene</h4>
            <RerunDirtyButton 
              sceneId="scene-123"
              modules={['state', 'beats']}
              onComplete={(results) => {
                console.log('Scene processed:', results);
              }}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Different Styles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <RerunDirtyButton variant="default" size="sm" />
            <RerunDirtyButton variant="outline" size="md" />
            <RerunDirtyButton variant="secondary" size="lg" />
            <RerunDirtyButton variant="ghost" size="sm" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Integration with Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This component can be integrated into various parts of the editor:
            </p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Editor toolbar for current scene analysis</li>
              <li>• Scene list for bulk processing</li>
              <li>• Analysis dashboard for selective reprocessing</li>
              <li>• Settings page for maintenance operations</li>
            </ul>
            
            {/* Example integration in an editor context */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Scene: Chapter 1 - The Discovery</span>
                <RerunDirtyButton 
                  sceneId="ch1-discovery"
                  modules={['events', 'plants', 'state']}
                  size="sm"
                  variant="outline"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Last analysis: 2 hours ago • Status: Some modules need updating
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RerunDirtyButtonExample;