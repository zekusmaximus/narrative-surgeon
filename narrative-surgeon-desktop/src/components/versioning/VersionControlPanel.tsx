'use client'

import React, { useState } from 'react'
import { useSingleManuscriptStore } from '@/store/singleManuscriptStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Plus, 
  GitBranch, 
  Clock, 
  Eye, 
  Download,
  Star,
  MoreHorizontal
} from 'lucide-react'
import type { ManuscriptVersion } from '@/types/single-manuscript'

export function VersionControlPanel() {
  const { 
    currentVersion, 
    availableVersions, 
    manuscript 
  } = useSingleManuscriptStore()
  
  const { 
    createVersion, 
    switchVersion, 
    compareVersions,
    exportVersion 
  } = useSingleManuscriptStore(state => state.actions)
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newVersionName, setNewVersionName] = useState('')
  const [newVersionDescription, setNewVersionDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) return
    
    setIsCreating(true)
    try {
      await createVersion(newVersionName.trim(), newVersionDescription.trim())
      setNewVersionName('')
      setNewVersionDescription('')
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Failed to create version:', error)
    } finally {
      setIsCreating(false)
    }
  }
  
  const handleSwitchVersion = async (versionId: string) => {
    if (versionId === currentVersion?.id) return
    
    try {
      await switchVersion(versionId)
    } catch (error) {
      console.error('Failed to switch version:', error)
    }
  }
  
  const handleCompareVersions = async (compareVersionId: string) => {
    if (!currentVersion) return
    
    try {
      await compareVersions(currentVersion.id, compareVersionId)
    } catch (error) {
      console.error('Failed to compare versions:', error)
    }
  }
  
  const handleExportVersion = async (versionId: string, format: 'docx' | 'pdf' | 'txt') => {
    try {
      await exportVersion(versionId, format)
    } catch (error) {
      console.error('Failed to export version:', error)
    }
  }
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  
  const getVersionStats = (version: ManuscriptVersion) => {
    if (!manuscript) return { chapters: 0, changes: 0 }
    
    return {
      chapters: version.chapterOrder.length,
      changes: version.changes.length
    }
  }
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Version Control</h2>
            <p className="text-sm text-muted-foreground">
              Manage chapter arrangements
            </p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Version
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Version</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Version Name</label>
                <Input
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder="e.g., Tension-First Order"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newVersionDescription}
                  onChange={(e) => setNewVersionDescription(e.target.value)}
                  placeholder="Describe what this version changes..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateVersion}
                  disabled={!newVersionName.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Version'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Version List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {availableVersions.map((version) => {
            const isActive = version.id === currentVersion?.id
            const stats = getVersionStats(version)
            
            return (
              <Card 
                key={version.id}
                className={`p-4 transition-all duration-200 ${
                  isActive 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'hover:shadow-md cursor-pointer'
                }`}
                onClick={() => !isActive && handleSwitchVersion(version.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{version.name}</h4>
                    {version.isBaseVersion && (
                      <Star className="h-4 w-4 text-yellow-500" />
                    )}
                    {isActive && (
                      <Badge variant="default" className="bg-blue-600">
                        Current
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCompareVersions(version.id)
                      }}
                      disabled={isActive}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExportVersion(version.id, 'docx')
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {version.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {version.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>{stats.chapters} chapters</span>
                    <span>{stats.changes} changes</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(version.created)}</span>
                  </div>
                </div>
                
                {/* Preview of chapter order changes */}
                {!version.isBaseVersion && version.parentVersionId && (
                  <div className="mt-2 text-xs">
                    <span className="text-muted-foreground">
                      Based on: {availableVersions.find(v => v.id === version.parentVersionId)?.name}
                    </span>
                  </div>
                )}
              </Card>
            )
          })}
          
          {availableVersions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No versions available</p>
              <p className="text-sm">Create your first version to get started</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default VersionControlPanel