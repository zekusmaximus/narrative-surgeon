'use client'

import { useAppStore } from '../../lib/store'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { editorSettings, updateEditorSettings } = useAppStore()

  const handleFontSizeChange = (size: number) => {
    updateEditorSettings({ fontSize: size })
  }

  const handleThemeChange = (theme: 'light' | 'dark') => {
    updateEditorSettings({ theme })
  }

  const handleToggleFocusMode = () => {
    updateEditorSettings({ focusMode: !editorSettings.focusMode })
  }

  const handleToggleTypewriterMode = () => {
    updateEditorSettings({ typewriterMode: !editorSettings.typewriterMode })
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-muted-foreground hover:text-foreground mb-2 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your writing environment and preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Editor Settings</h2>
          
          <div className="space-y-6">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium mb-2">Font Size</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  value={editorSettings.fontSize}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-[3rem]">
                  {editorSettings.fontSize}px
                </span>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <div className="flex gap-2">
                <Button
                  variant={editorSettings.theme === 'light' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('light')}
                >
                  Light
                </Button>
                <Button
                  variant={editorSettings.theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('dark')}
                >
                  Dark
                </Button>
              </div>
            </div>

            {/* Focus Mode */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Focus Mode</label>
                <p className="text-sm text-muted-foreground">
                  Dim surrounding paragraphs while writing
                </p>
              </div>
              <Button
                variant={editorSettings.focusMode ? 'default' : 'outline'}
                onClick={handleToggleFocusMode}
              >
                {editorSettings.focusMode ? 'On' : 'Off'}
              </Button>
            </div>

            {/* Typewriter Mode */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Typewriter Mode</label>
                <p className="text-sm text-muted-foreground">
                  Keep current line centered on screen
                </p>
              </div>
              <Button
                variant={editorSettings.typewriterMode ? 'default' : 'outline'}
                onClick={handleToggleTypewriterMode}
              >
                {editorSettings.typewriterMode ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Application Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Application Settings</h2>
          
          <div className="space-y-6">
            {/* Auto-save */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Auto-save</label>
                <p className="text-sm text-muted-foreground">
                  Automatically save changes while writing
                </p>
              </div>
              <Button variant="default">
                On
              </Button>
            </div>

            {/* Backup Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Backup Location</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="~/Documents/NarrativeSurgeon/Backups"
                  readOnly
                  className="flex-1 p-2 border border-input rounded-md bg-muted"
                />
                <Button variant="outline">Browse</Button>
              </div>
            </div>

            {/* AI Settings */}
            <div>
              <label className="block text-sm font-medium mb-2">AI Provider</label>
              <select className="w-full p-2 border border-input rounded-md bg-background">
                <option>OpenAI GPT-4</option>
                <option>Claude</option>
                <option>Local Model</option>
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter your API key"
                  className="flex-1 p-2 border border-input rounded-md bg-background"
                />
                <Button variant="outline">Test</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Data & Privacy */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Data & Privacy</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Analytics</label>
                <p className="text-sm text-muted-foreground">
                  Help improve the app by sharing anonymous usage data
                </p>
              </div>
              <Button variant="outline">
                Off
              </Button>
            </div>

            <div>
              <Button variant="outline" className="w-full">
                Export All Data
              </Button>
            </div>

            <div>
              <Button variant="destructive" className="w-full">
                Reset All Settings
              </Button>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">About</h2>
          
          <div className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Version:</span>
              <span className="ml-2">1.0.0</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Build:</span>
              <span className="ml-2">Desktop Edition</span>
            </div>
            <div>
              <Button variant="outline" className="w-full">
                Check for Updates
              </Button>
            </div>
            <div>
              <Button variant="outline" className="w-full">
                View Changelog
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}