'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, 
  Download, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Zap,
  Award,
  BookOpen,
  FileVideo,
  Theater,
  Mail,
  Target,
  Briefcase,
  PenTool,
  Calendar,
  Globe
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'

interface ExportFormat {
  id: string
  name: string
  description: string
  category: 'industry' | 'general' | 'digital'
  icon: React.ComponentType<any>
  industry_standard: boolean
  use_cases: string[]
  requirements: string[]
  file_extension: string
}

interface ExportOptions {
  format: string
  include_comments: boolean
  include_notes: boolean
  preserve_formatting: boolean
  chapter_breaks: boolean
  page_numbers: boolean
  font_family: string
  font_size: number
  line_spacing: number
  output_path: string
}

interface ExportPreset {
  id: string
  name: string
  description: string
  formats: string[]
  use_case: string
  options: Partial<ExportOptions>
}

export function PublisherExports({ manuscriptId, className }: { manuscriptId: string; className?: string }) {
  const [availableFormats, setAvailableFormats] = useState<ExportFormat[]>([])
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set())
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: '',
    include_comments: false,
    include_notes: false,
    preserve_formatting: true,
    chapter_breaks: true,
    page_numbers: true,
    font_family: 'Times New Roman',
    font_size: 12,
    line_spacing: 2.0,
    output_path: ''
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportResults, setExportResults] = useState<Map<string, any>>(new Map())
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [viewMode, setViewMode] = useState<'formats' | 'presets' | 'batch'>('presets')

  const industryPresets: ExportPreset[] = [
    {
      id: 'query_submission',
      name: 'Query Submission Package',
      description: 'Complete submission package with query letter, synopsis, and sample pages',
      formats: ['query_package', 'synopsis_short', 'shunn_manuscript'],
      use_case: 'Initial agent/editor submissions',
      options: {
        preserve_formatting: true,
        page_numbers: true,
        font_family: 'Times New Roman',
        font_size: 12,
        line_spacing: 2.0
      }
    },
    {
      id: 'manuscript_review',
      name: 'Manuscript Review Ready',
      description: 'Industry-standard Shunn format for professional review',
      formats: ['shunn_manuscript'],
      use_case: 'Full manuscript requests, professional editing',
      options: {
        preserve_formatting: true,
        page_numbers: true,
        chapter_breaks: true,
        font_family: 'Times New Roman',
        font_size: 12,
        line_spacing: 2.0
      }
    },
    {
      id: 'marketing_package',
      name: 'Marketing & Pitch Materials',
      description: 'Sales-focused materials for publishers and marketing teams',
      formats: ['pitch_sheet', 'synopsis_long', 'book_proposal'],
      use_case: 'Publisher acquisitions, marketing campaigns',
      options: {
        preserve_formatting: true,
        include_notes: true
      }
    },
    {
      id: 'screenwriting_submission',
      name: 'Screenwriting Submission',
      description: 'Professional screenplay and stage play formats',
      formats: ['screenplay_final', 'stage_play_standard'],
      use_case: 'Film/TV/theater submissions',
      options: {
        preserve_formatting: true,
        font_family: 'Courier New',
        font_size: 12,
        line_spacing: 1.0
      }
    },
    {
      id: 'multi_format_package',
      name: 'Complete Publishing Package',
      description: 'All industry formats for comprehensive submission strategy',
      formats: ['shunn_manuscript', 'query_package', 'synopsis_short', 'synopsis_long', 'pitch_sheet'],
      use_case: 'Multiple simultaneous submissions, comprehensive pitching',
      options: {
        preserve_formatting: true,
        page_numbers: true,
        chapter_breaks: true
      }
    }
  ]

  const formatDefinitions: ExportFormat[] = [
    {
      id: 'shunn_manuscript',
      name: 'Shunn Standard Manuscript',
      description: 'Industry-standard manuscript formatting per William Shunn specifications',
      category: 'industry',
      icon: Award,
      industry_standard: true,
      use_cases: ['Full manuscript submissions', 'Professional editing', 'Contest submissions'],
      requirements: ['Times New Roman 12pt', 'Double-spaced', '1-inch margins', 'Header with title/author'],
      file_extension: '.docx'
    },
    {
      id: 'query_package',
      name: 'Query Submission Package',
      description: 'Query letter, synopsis, and sample pages in one formatted document',
      category: 'industry',
      icon: Mail,
      industry_standard: true,
      use_cases: ['Agent queries', 'Editor submissions', 'Contest applications'],
      requirements: ['Professional formatting', 'Clear section breaks', 'Contact information'],
      file_extension: '.docx'
    },
    {
      id: 'synopsis_short',
      name: 'One-Page Synopsis',
      description: 'Concise single-page plot summary for quick evaluation',
      category: 'industry',
      icon: FileText,
      industry_standard: true,
      use_cases: ['Query letters', 'Pitch meetings', 'Agent submissions'],
      requirements: ['Single page', 'Present tense', 'Third person', 'Complete plot arc'],
      file_extension: '.docx'
    },
    {
      id: 'synopsis_long',
      name: 'Extended Synopsis',
      description: 'Detailed 2-5 page synopsis for comprehensive story overview',
      category: 'industry',
      icon: BookOpen,
      industry_standard: true,
      use_cases: ['Publisher submissions', 'Film rights', 'Detailed pitching'],
      requirements: ['2-5 pages', 'Character development', 'Subplot inclusion', 'Market appeal'],
      file_extension: '.docx'
    },
    {
      id: 'pitch_sheet',
      name: 'One-Page Pitch Sheet',
      description: 'Marketing-focused sales sheet with commercial appeal',
      category: 'industry',
      icon: Target,
      industry_standard: true,
      use_cases: ['Publisher acquisitions', 'Marketing materials', 'Sales conferences'],
      requirements: ['Visual appeal', 'Market positioning', 'Commercial hooks', 'Author bio'],
      file_extension: '.pdf'
    },
    {
      id: 'book_proposal',
      name: 'Non-Fiction Book Proposal',
      description: 'Comprehensive proposal format for non-fiction works',
      category: 'industry',
      icon: Briefcase,
      industry_standard: true,
      use_cases: ['Non-fiction submissions', 'Academic publishing', 'Business books'],
      requirements: ['Market analysis', 'Author platform', 'Chapter outlines', 'Sample chapters'],
      file_extension: '.docx'
    },
    {
      id: 'screenplay_final',
      name: 'Final Draft Screenplay',
      description: 'Industry-standard screenplay format for film and television',
      category: 'industry',
      icon: FileVideo,
      industry_standard: true,
      use_cases: ['Film submissions', 'TV pitches', 'Script competitions'],
      requirements: ['Proper scene headings', 'Character names', 'Action lines', 'Dialogue format'],
      file_extension: '.fdx'
    },
    {
      id: 'stage_play_standard',
      name: 'Stage Play Format',
      description: 'Theater industry standard for stage productions',
      category: 'industry',
      icon: Theater,
      industry_standard: true,
      use_cases: ['Theater submissions', 'Playwriting contests', 'Production scripts'],
      requirements: ['Character list', 'Stage directions', 'Act/scene structure', 'Technical notes'],
      file_extension: '.pdf'
    }
  ]

  useEffect(() => {
    loadAvailableFormats()
  }, [])

  const loadAvailableFormats = async () => {
    try {
      const formats = await invoke<string[]>('get_export_formats')
      setAvailableFormats(formatDefinitions.filter(def => formats.includes(def.id)))
    } catch (error) {
      console.error('Failed to load export formats:', error)
      setAvailableFormats(formatDefinitions) // Fallback to all formats
    }
  }

  const applyPreset = (preset: ExportPreset) => {
    setSelectedFormats(new Set(preset.formats))
    setExportOptions(prev => ({
      ...prev,
      ...preset.options
    }))
    setSelectedPreset(preset.id)
  }

  const exportFormat = async (formatId: string) => {
    setIsExporting(true)
    try {
      const result = await invoke('export_manuscript', {
        manuscriptId,
        options: {
          ...exportOptions,
          format: formatId
        }
      })
      
      setExportResults(prev => new Map(prev.set(formatId, result)))
    } catch (error) {
      console.error(`Export failed for ${formatId}:`, error)
      setExportResults(prev => new Map(prev.set(formatId, { error: error.toString() })))
    } finally {
      setIsExporting(false)
    }
  }

  const exportBatch = async () => {
    setIsExporting(true)
    const results = new Map()
    
    for (const formatId of selectedFormats) {
      try {
        const result = await invoke('export_manuscript', {
          manuscriptId,
          options: {
            ...exportOptions,
            format: formatId
          }
        })
        results.set(formatId, result)
      } catch (error) {
        console.error(`Export failed for ${formatId}:`, error)
        results.set(formatId, { error: error.toString() })
      }
    }
    
    setExportResults(results)
    setIsExporting(false)
  }

  const getFormatIcon = (format: ExportFormat) => {
    const IconComponent = format.icon
    return <IconComponent className="w-5 h-5" />
  }

  const renderFormatCard = (format: ExportFormat) => (
    <Card 
      key={format.id} 
      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        selectedFormats.has(format.id) ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      onClick={() => {
        const newSelected = new Set(selectedFormats)
        if (newSelected.has(format.id)) {
          newSelected.delete(format.id)
        } else {
          newSelected.add(format.id)
        }
        setSelectedFormats(newSelected)
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            {getFormatIcon(format)}
          </div>
          <div>
            <h3 className="font-semibold">{format.name}</h3>
            <p className="text-sm text-muted-foreground">{format.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {format.industry_standard && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30">
              <Award className="w-3 h-3 mr-1" />
              Industry Standard
            </Badge>
          )}
          {selectedFormats.has(format.id) && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium mb-1">Use Cases:</div>
          <div className="flex flex-wrap gap-1">
            {format.use_cases.map(useCase => (
              <Badge key={useCase} variant="secondary" className="text-xs">
                {useCase}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-1">Requirements:</div>
          <ul className="text-xs text-muted-foreground">
            {format.requirements.map((req, index) => (
              <li key={index} className="flex items-center gap-2">
                <div className="w-1 h-1 bg-current rounded-full" />
                {req}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            Output: {format.file_extension}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              exportFormat(format.id)
            }}
            disabled={isExporting}
          >
            Export
          </Button>
        </div>
      </div>

      {exportResults.has(format.id) && (
        <div className="mt-3 pt-3 border-t">
          {exportResults.get(format.id).error ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Export failed</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Export successful</span>
            </div>
          )}
        </div>
      )}
    </Card>
  )

  const renderPresetCard = (preset: ExportPreset) => (
    <Card 
      key={preset.id}
      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        selectedPreset === preset.id ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      onClick={() => applyPreset(preset)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{preset.name}</h3>
          <p className="text-sm text-muted-foreground">{preset.description}</p>
        </div>
        {selectedPreset === preset.id && (
          <CheckCircle className="w-5 h-5 text-green-500" />
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium mb-1">Use Case:</div>
          <p className="text-sm text-muted-foreground">{preset.use_case}</p>
        </div>

        <div>
          <div className="text-sm font-medium mb-1">Included Formats:</div>
          <div className="flex flex-wrap gap-1">
            {preset.formats.map(formatId => {
              const format = formatDefinitions.find(f => f.id === formatId)
              return format ? (
                <Badge key={formatId} variant="outline" className="text-xs">
                  {format.name}
                </Badge>
              ) : null
            })}
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            {preset.formats.length} format{preset.formats.length !== 1 ? 's' : ''}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              applyPreset(preset)
              setViewMode('batch')
            }}
          >
            Use Preset
          </Button>
        </div>
      </div>
    </Card>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Publisher-Ready Exports</h2>
            <p className="text-sm text-muted-foreground">
              Generate industry-standard formats for submissions and marketing
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'presets' ? 'default' : 'outline'}
            onClick={() => setViewMode('presets')}
          >
            <Zap className="w-4 h-4 mr-2" />
            Presets
          </Button>
          <Button
            variant={viewMode === 'formats' ? 'default' : 'outline'}
            onClick={() => setViewMode('formats')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Individual
          </Button>
          <Button
            variant={viewMode === 'batch' ? 'default' : 'outline'}
            onClick={() => setViewMode('batch')}
            disabled={selectedFormats.size === 0}
          >
            <Globe className="w-4 h-4 mr-2" />
            Batch Export
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'presets' && (
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Professional Export Presets</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Pre-configured export packages for common publishing industry needs. 
              Each preset includes the appropriate formats and formatting options for specific use cases.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {industryPresets.map(renderPresetCard)}
            </div>
          </Card>
        </div>
      )}

      {viewMode === 'formats' && (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Individual Export Formats</h3>
              <div className="text-sm text-muted-foreground">
                {selectedFormats.size} format{selectedFormats.size !== 1 ? 's' : ''} selected
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {availableFormats.map(renderFormatCard)}
            </div>
          </Card>
        </div>
      )}

      {viewMode === 'batch' && selectedFormats.size > 0 && (
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Batch Export Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Font Family</label>
                <Select 
                  value={exportOptions.font_family} 
                  onValueChange={(value) => setExportOptions(prev => ({ ...prev, font_family: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                    <SelectItem value="Arial">Arial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Font Size</label>
                <Select 
                  value={exportOptions.font_size.toString()} 
                  onValueChange={(value) => setExportOptions(prev => ({ ...prev, font_size: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10pt</SelectItem>
                    <SelectItem value="11">11pt</SelectItem>
                    <SelectItem value="12">12pt</SelectItem>
                    <SelectItem value="14">14pt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="page-numbers"
                  checked={exportOptions.page_numbers}
                  onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, page_numbers: checked as boolean }))}
                />
                <label htmlFor="page-numbers" className="text-sm">Page numbers</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chapter-breaks"
                  checked={exportOptions.chapter_breaks}
                  onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, chapter_breaks: checked as boolean }))}
                />
                <label htmlFor="chapter-breaks" className="text-sm">Chapter breaks</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preserve-formatting"
                  checked={exportOptions.preserve_formatting}
                  onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, preserve_formatting: checked as boolean }))}
                />
                <label htmlFor="preserve-formatting" className="text-sm">Preserve formatting</label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Selected Formats</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Array.from(selectedFormats).map(formatId => {
                    const format = formatDefinitions.find(f => f.id === formatId)
                    return format ? (
                      <Badge key={formatId} variant="secondary">
                        {format.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
              
              <Button 
                onClick={exportBatch} 
                disabled={isExporting}
                size="lg"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export All ({selectedFormats.size})
                  </>
                )}
              </Button>
            </div>
          </Card>

          {exportResults.size > 0 && (
            <Card className="p-4">
              <h4 className="font-medium mb-3">Export Results</h4>
              <div className="space-y-2">
                {Array.from(exportResults.entries()).map(([formatId, result]) => {
                  const format = formatDefinitions.find(f => f.id === formatId)
                  if (!format) return null
                  
                  return (
                    <div key={formatId} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        {getFormatIcon(format)}
                        <span className="font-medium">{format.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.error ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Success
                          </Badge>
                        )}
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default PublisherExports