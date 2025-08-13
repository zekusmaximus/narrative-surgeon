'use client'

import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Upload, FileText, Download } from 'lucide-react'
import Link from 'next/link'

export default function ImportPage() {
  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/manuscripts" className="text-muted-foreground hover:text-foreground mb-2 inline-block">
          ← Back to Manuscripts
        </Link>
        <h1 className="text-3xl font-bold mb-2">Batch Import</h1>
        <p className="text-muted-foreground">
          Import multiple manuscripts and documents at once
        </p>
      </div>

      {/* Import Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">Text Files</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Import .txt, .rtf, and plain text files
          </p>
          <Button className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Select Files
          </Button>
        </Card>

        <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">Word Documents</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Import .docx and .doc files
          </p>
          <Button className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Select Files
          </Button>
        </Card>

        <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-semibold">Folder Import</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Import all documents from a folder
          </p>
          <Button className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Select Folder
          </Button>
        </Card>
      </div>

      {/* Import Settings */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Import Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Scene Detection</label>
            <select className="w-full p-2 border border-input rounded-md bg-background">
              <option>Automatic (recommended)</option>
              <option>Chapter breaks</option>
              <option>Scene breaks (***)</option>
              <option>No splitting</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Default Genre</label>
            <select className="w-full p-2 border border-input rounded-md bg-background">
              <option>Auto-detect</option>
              <option>Fiction</option>
              <option>Non-fiction</option>
              <option>Poetry</option>
              <option>Screenplay</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Recent Imports */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Imports</h2>
        <div className="text-muted-foreground text-center py-8">
          No recent imports to display
        </div>
      </Card>
    </div>
  )
}