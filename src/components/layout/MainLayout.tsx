'use client'

import React, { useState, useCallback } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Settings, 
  BarChart3,
  MessageSquare,
  Search,
  Bookmark
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { MenuBar } from './MenuBar'
import { Toolbar } from './Toolbar'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [leftPanelSize] = useState(20)
  const [rightPanelSize] = useState(25)
  
  const { 
    manuscripts, 
    activeManuscript, 
    scenes,
    setActiveScene,
    activeSceneId 
  } = useAppStore()

  const handleLeftPanelToggle = useCallback(() => {
    setLeftPanelCollapsed(!leftPanelCollapsed)
  }, [leftPanelCollapsed])

  const handleRightPanelToggle = useCallback(() => {
    setRightPanelCollapsed(!rightPanelCollapsed)
  }, [rightPanelCollapsed])

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Menu Bar */}
      <MenuBar />
      
      {/* Toolbar */}
      <Toolbar />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full w-full"
        >
          {/* Left Sidebar - File Tree & Navigation */}
          <ResizablePanel
            defaultSize={leftPanelSize}
            minSize={leftPanelCollapsed ? 0 : 15}
            maxSize={35}
            collapsible={true}
            onCollapse={() => setLeftPanelCollapsed(true)}
            onExpand={() => setLeftPanelCollapsed(false)}
          >
            <div className="h-full border-r border-border bg-card">
              {/* Panel Header */}
              <div className="flex items-center justify-between p-2 border-b border-border">
                <h2 className="text-sm font-semibold">Project</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLeftPanelToggle}
                  className="h-6 w-6 p-0"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
              </div>

              {/* Panel Content */}
              <Tabs defaultValue="files" className="h-[calc(100%-3rem)]">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="files" className="text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="outline" className="text-xs">
                    <Bookmark className="w-3 h-3 mr-1" />
                    Outline
                  </TabsTrigger>
                  <TabsTrigger value="search" className="text-xs">
                    <Search className="w-3 h-3 mr-1" />
                    Search
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="files" className="h-[calc(100%-2.5rem)] m-0">
                  <ScrollArea className="h-full">
                    <div className="p-2 space-y-2">
                      {/* Manuscript List */}
                      <div className="space-y-1">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                          Manuscripts
                        </h3>
                        {manuscripts?.map((manuscript) => (
                          <div
                            key={manuscript.id}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                              activeManuscript?.id === manuscript.id
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-accent/50'
                            }`}
                          >
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm truncate">{manuscript.title}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Scenes List */}
                      {activeManuscript && scenes.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-1">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                              Scenes
                            </h3>
                            {scenes.map((scene, index) => (
                              <div
                                key={scene.id}
                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                  activeSceneId === scene.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-accent/50'
                                }`}
                                onClick={() => setActiveScene(scene.id)}
                              >
                                <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono">
                                  {index + 1}
                                </span>
                                <span className="text-sm truncate">
                                  {scene.title || `Scene ${index + 1}`}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {scene.word_count || 0}w
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="outline" className="h-[calc(100%-2.5rem)] m-0">
                  <ScrollArea className="h-full p-2">
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-muted-foreground">
                        Document Outline
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Outline view will appear here when analyzing document structure.
                      </p>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="search" className="h-[calc(100%-2.5rem)] m-0">
                  <div className="p-2 space-y-3">
                    <input
                      type="text"
                      placeholder="Search in manuscript..."
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                    />
                    <div className="text-xs text-muted-foreground">
                      Search results will appear here.
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Main Editor Area */}
          <ResizablePanel defaultSize={leftPanelCollapsed ? 75 : 55} minSize={30}>
            <div className="h-full bg-background">
              {children}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Sidebar - Analysis & Properties */}
          <ResizablePanel
            defaultSize={rightPanelSize}
            minSize={rightPanelCollapsed ? 0 : 20}
            maxSize={40}
            collapsible={true}
            onCollapse={() => setRightPanelCollapsed(true)}
            onExpand={() => setRightPanelCollapsed(false)}
          >
            <div className="h-full border-l border-border bg-card">
              {/* Panel Header */}
              <div className="flex items-center justify-between p-2 border-b border-border">
                <h2 className="text-sm font-semibold">Analysis</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRightPanelToggle}
                  className="h-6 w-6 p-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              {/* Panel Content */}
              <Tabs defaultValue="stats" className="h-[calc(100%-3rem)]">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="stats" className="text-xs">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Stats
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Notes
                  </TabsTrigger>
                  <TabsTrigger value="properties" className="text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Props
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="stats" className="h-[calc(100%-2.5rem)] m-0">
                  <ScrollArea className="h-full p-3">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">
                          Writing Statistics
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Words:</span>
                            <span className="font-medium">2,450</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Characters:</span>
                            <span className="font-medium">12,840</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Pages:</span>
                            <span className="font-medium">4.2</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Paragraphs:</span>
                            <span className="font-medium">18</span>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">
                          Reading Time
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Average:</span>
                            <span className="font-medium">9.8 min</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Slow:</span>
                            <span className="font-medium">14.7 min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="comments" className="h-[calc(100%-2.5rem)] m-0">
                  <ScrollArea className="h-full p-3">
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-muted-foreground">
                        Comments & Notes
                      </h3>
                      <div className="text-xs text-muted-foreground">
                        No comments yet. Select text and use Ctrl+Shift+C to add comments.
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="properties" className="h-[calc(100%-2.5rem)] m-0">
                  <ScrollArea className="h-full p-3">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">
                          Document Properties
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <label className="text-xs text-muted-foreground">Title:</label>
                            <div className="mt-1 font-medium">{activeManuscript?.title || 'Untitled'}</div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Genre:</label>
                            <div className="mt-1 text-muted-foreground">Fiction</div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Created:</label>
                            <div className="mt-1 text-muted-foreground">
                              {new Date().toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-muted/50 border-t border-border flex items-center justify-between px-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Line 1, Column 1</span>
          <span>•</span>
          <span>{activeManuscript ? `${scenes.length} scenes` : 'No manuscript'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>•</span>
          <span>Auto-save: On</span>
        </div>
      </div>
    </div>
  )
}

export default MainLayout