/**
 * Version control system for manuscript chapter arrangements
 * Supports branching, diffing, and rollback for different chapter orders
 */

import { TechnoThrillerManuscript, Chapter, ReorderingAnalysis } from './manuscript-data'

export interface ManuscriptVersion {
  id: string
  name: string
  description: string
  timestamp: Date
  authorEmail?: string
  
  // Version hierarchy
  parentVersionId?: string
  branchName: string
  isMainBranch: boolean
  
  // Snapshot of manuscript state
  manuscript: TechnoThrillerManuscript
  chapterOrder: number[] // Array of chapter IDs in order
  
  // Version metadata
  changesSummary: string
  impactAnalysis?: ReorderingAnalysis
  isBookmarked: boolean
  tags: string[]
  
  // Statistics
  totalWordCount: number
  chaptersAffected: number
  majorChanges: VersionChange[]
}

export interface VersionChange {
  type: 'chapter-moved' | 'chapter-edited' | 'metadata-updated' | 'dependency-added' | 'dependency-removed'
  description: string
  affectedChapters: number[]
  
  // For move operations
  moveDetails?: {
    chapterId: number
    fromPosition: number
    toPosition: number
    reason?: string
  }
  
  // For edit operations  
  editDetails?: {
    chapterId: number
    wordCountChange: number
    contentSummary: string
  }
  
  // Impact assessment
  impactLevel: 'low' | 'medium' | 'high'
  riskLevel: 'safe' | 'moderate' | 'risky'
}

export interface VersionDiff {
  fromVersionId: string
  toVersionId: string
  timestamp: Date
  
  // Chapter position changes
  chapterMoves: ChapterMove[]
  
  // Content changes
  contentChanges: ContentChange[]
  
  // Metadata changes
  metadataChanges: MetadataChange[]
  
  // Dependency changes
  dependencyChanges: DependencyChange[]
  
  // Summary
  summary: {
    totalChanges: number
    impactScore: number // 1-100
    riskLevel: 'low' | 'medium' | 'high'
    estimatedReadingImpact: string
  }
}

export interface ChapterMove {
  chapterId: number
  chapterTitle: string
  fromPosition: number
  toPosition: number
  positionChange: number // Positive = moved later, negative = moved earlier
  
  // Impact on story flow
  tensionImpact: number // How this affects tension curve
  dependencyImpact: DependencyImpact[]
  plotImpact: string
}

export interface ContentChange {
  chapterId: number
  chapterTitle: string
  changeType: 'major-edit' | 'minor-edit' | 'word-count-change'
  wordCountBefore: number
  wordCountAfter: number
  wordCountChange: number
  
  // Change details
  sectionsChanged: string[]
  changeDescription: string
  estimatedReadingTimeChange: number // in minutes
}

export interface MetadataChange {
  chapterId: number
  field: string
  oldValue: any
  newValue: any
  changeImpact: 'cosmetic' | 'structural' | 'critical'
}

export interface DependencyChange {
  type: 'added' | 'removed' | 'modified'
  fromChapter: number
  toChapter: number
  dependencyType: string
  description: string
  validationImpact: 'positive' | 'negative' | 'neutral'
}

export interface DependencyImpact {
  type: 'broken' | 'improved' | 'new-opportunity'
  description: string
  severity: 'low' | 'medium' | 'high'
  affectedChapters: number[]
  suggestedAction?: string
}

export interface Branch {
  name: string
  id: string
  description: string
  created: Date
  lastModified: Date
  
  // Branch lineage
  parentBranchId?: string
  isMainBranch: boolean
  isActive: boolean
  
  // Version tracking
  headVersionId: string
  versionCount: number
  
  // Branch purpose
  purpose: 'experiment' | 'alternative-ending' | 'pacing-fix' | 'character-arc' | 'other'
  
  // Merge status
  canMergeToMain: boolean
  mergeConflicts?: MergeConflict[]
}

export interface MergeConflict {
  type: 'chapter-order' | 'content-change' | 'dependency-mismatch'
  chapterId: number
  description: string
  
  // Conflict resolution options
  resolutionOptions: {
    keepMain: ConflictResolution
    keepBranch: ConflictResolution
    manual: ConflictResolution
  }
}

export interface ConflictResolution {
  description: string
  impact: string
  riskLevel: 'low' | 'medium' | 'high'
  recommendationScore: number // 1-10
}

/**
 * Version Control Manager
 */
export class ManuscriptVersionControl {
  private versions: Map<string, ManuscriptVersion> = new Map()
  private branches: Map<string, Branch> = new Map()
  private currentVersionId: string | null = null
  private currentBranchId: string = 'main'

  constructor() {
    this.initializeMainBranch()
  }

  /**
   * Initialize the main branch
   */
  private initializeMainBranch(): void {
    const mainBranch: Branch = {
      name: 'main',
      id: 'main',
      description: 'Main manuscript branch',
      created: new Date(),
      lastModified: new Date(),
      isMainBranch: true,
      isActive: true,
      headVersionId: '',
      versionCount: 0,
      purpose: 'other',
      canMergeToMain: true
    }
    
    this.branches.set('main', mainBranch)
  }

  /**
   * Create a new version from current manuscript state
   */
  createVersion(
    manuscript: TechnoThrillerManuscript,
    versionName: string,
    description: string,
    changesSummary: string
  ): ManuscriptVersion {
    const versionId = this.generateVersionId()
    const chapterOrder = manuscript.chapters
      .sort((a, b) => a.currentPosition - b.currentPosition)
      .map(c => c.id)

    const version: ManuscriptVersion = {
      id: versionId,
      name: versionName,
      description,
      timestamp: new Date(),
      parentVersionId: this.currentVersionId || undefined,
      branchName: this.currentBranchId,
      isMainBranch: this.currentBranchId === 'main',
      manuscript: this.deepCloneManuscript(manuscript),
      chapterOrder,
      changesSummary,
      isBookmarked: false,
      tags: [],
      totalWordCount: manuscript.chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
      chaptersAffected: this.calculateAffectedChapters(manuscript),
      majorChanges: this.analyzeMajorChanges(manuscript)
    }

    this.versions.set(versionId, version)
    this.currentVersionId = versionId

    // Update branch head
    const branch = this.branches.get(this.currentBranchId)
    if (branch) {
      branch.headVersionId = versionId
      branch.versionCount++
      branch.lastModified = new Date()
    }

    return version
  }

  /**
   * Create a new branch from current version
   */
  createBranch(
    branchName: string,
    description: string,
    purpose: Branch['purpose'] = 'experiment'
  ): Branch {
    const branchId = this.generateBranchId()
    
    const branch: Branch = {
      name: branchName,
      id: branchId,
      description,
      created: new Date(),
      lastModified: new Date(),
      parentBranchId: this.currentBranchId,
      isMainBranch: false,
      isActive: false,
      headVersionId: this.currentVersionId || '',
      versionCount: 0,
      purpose,
      canMergeToMain: true
    }

    this.branches.set(branchId, branch)
    return branch
  }

  /**
   * Switch to a different branch
   */
  switchToBranch(branchId: string): Branch | null {
    const branch = this.branches.get(branchId)
    if (!branch) return null

    // Mark previous branch as inactive
    const currentBranch = this.branches.get(this.currentBranchId)
    if (currentBranch) {
      currentBranch.isActive = false
    }

    // Activate new branch
    branch.isActive = true
    this.currentBranchId = branchId
    
    // Switch to branch head version
    if (branch.headVersionId) {
      this.currentVersionId = branch.headVersionId
    }

    return branch
  }

  /**
   * Get version diff between two versions
   */
  getVersionDiff(fromVersionId: string, toVersionId: string): VersionDiff | null {
    const fromVersion = this.versions.get(fromVersionId)
    const toVersion = this.versions.get(toVersionId)
    
    if (!fromVersion || !toVersion) return null

    const diff: VersionDiff = {
      fromVersionId,
      toVersionId,
      timestamp: new Date(),
      chapterMoves: this.calculateChapterMoves(fromVersion, toVersion),
      contentChanges: this.calculateContentChanges(fromVersion, toVersion),
      metadataChanges: this.calculateMetadataChanges(fromVersion, toVersion),
      dependencyChanges: this.calculateDependencyChanges(fromVersion, toVersion),
      summary: {
        totalChanges: 0,
        impactScore: 0,
        riskLevel: 'low',
        estimatedReadingImpact: ''
      }
    }

    // Calculate summary
    diff.summary = this.calculateDiffSummary(diff)
    
    return diff
  }

  /**
   * Rollback to a previous version
   */
  rollbackToVersion(versionId: string): ManuscriptVersion | null {
    const version = this.versions.get(versionId)
    if (!version) return null

    // Create new version with rolled back state
    const rollbackVersion = this.createVersion(
      version.manuscript,
      `Rollback to ${version.name}`,
      `Rolled back to version from ${version.timestamp.toLocaleDateString()}`,
      `Rollback operation`
    )

    return rollbackVersion
  }

  /**
   * Export version history
   */
  exportVersionHistory(): {
    branches: Branch[]
    versions: ManuscriptVersion[]
    currentBranch: string
    currentVersion: string | null
  } {
    return {
      branches: Array.from(this.branches.values()),
      versions: Array.from(this.versions.values()),
      currentBranch: this.currentBranchId,
      currentVersion: this.currentVersionId
    }
  }

  /**
   * Import version history (for loading saved state)
   */
  importVersionHistory(data: {
    branches: Branch[]
    versions: ManuscriptVersion[]
    currentBranch: string
    currentVersion: string | null
  }): void {
    this.branches.clear()
    this.versions.clear()
    
    data.branches.forEach(branch => {
      this.branches.set(branch.id, branch)
    })
    
    data.versions.forEach(version => {
      this.versions.set(version.id, version)
    })
    
    this.currentBranchId = data.currentBranch
    this.currentVersionId = data.currentVersion
  }

  /**
   * Get current version
   */
  getCurrentVersion(): ManuscriptVersion | null {
    return this.currentVersionId ? this.versions.get(this.currentVersionId) || null : null
  }

  /**
   * Get all versions for current branch
   */
  getBranchVersions(branchId?: string): ManuscriptVersion[] {
    const targetBranch = branchId || this.currentBranchId
    return Array.from(this.versions.values())
      .filter(v => v.branchName === targetBranch)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // Private helper methods
  private generateVersionId(): string {
    return `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateBranchId(): string {
    return `b${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private deepCloneManuscript(manuscript: TechnoThrillerManuscript): TechnoThrillerManuscript {
    return JSON.parse(JSON.stringify(manuscript))
  }

  private calculateAffectedChapters(manuscript: TechnoThrillerManuscript): number {
    // Simple implementation - count all chapters
    // Could be enhanced to track actual changes
    return manuscript.chapters.length
  }

  private analyzeMajorChanges(manuscript: TechnoThrillerManuscript): VersionChange[] {
    // Placeholder - would analyze changes from previous version
    return []
  }

  private calculateChapterMoves(from: ManuscriptVersion, to: ManuscriptVersion): ChapterMove[] {
    const moves: ChapterMove[] = []
    
    // Compare chapter positions
    from.manuscript.chapters.forEach(fromChapter => {
      const toChapter = to.manuscript.chapters.find(c => c.id === fromChapter.id)
      if (toChapter && fromChapter.currentPosition !== toChapter.currentPosition) {
        moves.push({
          chapterId: fromChapter.id,
          chapterTitle: fromChapter.title,
          fromPosition: fromChapter.currentPosition,
          toPosition: toChapter.currentPosition,
          positionChange: toChapter.currentPosition - fromChapter.currentPosition,
          tensionImpact: 0, // Would calculate tension curve impact
          dependencyImpact: [],
          plotImpact: 'Position change may affect story flow'
        })
      }
    })
    
    return moves
  }

  private calculateContentChanges(from: ManuscriptVersion, to: ManuscriptVersion): ContentChange[] {
    const changes: ContentChange[] = []
    
    from.manuscript.chapters.forEach(fromChapter => {
      const toChapter = to.manuscript.chapters.find(c => c.id === fromChapter.id)
      if (toChapter && fromChapter.wordCount !== toChapter.wordCount) {
        changes.push({
          chapterId: fromChapter.id,
          chapterTitle: fromChapter.title,
          changeType: Math.abs(toChapter.wordCount - fromChapter.wordCount) > 100 ? 'major-edit' : 'minor-edit',
          wordCountBefore: fromChapter.wordCount,
          wordCountAfter: toChapter.wordCount,
          wordCountChange: toChapter.wordCount - fromChapter.wordCount,
          sectionsChanged: [],
          changeDescription: 'Content modified',
          estimatedReadingTimeChange: (toChapter.wordCount - fromChapter.wordCount) / 250 // ~250 words per minute
        })
      }
    })
    
    return changes
  }

  private calculateMetadataChanges(from: ManuscriptVersion, to: ManuscriptVersion): MetadataChange[] {
    // Placeholder implementation
    return []
  }

  private calculateDependencyChanges(from: ManuscriptVersion, to: ManuscriptVersion): DependencyChange[] {
    // Placeholder implementation  
    return []
  }

  private calculateDiffSummary(diff: VersionDiff): VersionDiff['summary'] {
    const totalChanges = diff.chapterMoves.length + diff.contentChanges.length + 
                        diff.metadataChanges.length + diff.dependencyChanges.length

    let impactScore = 0
    let riskLevel: 'low' | 'medium' | 'high' = 'low'

    // Calculate impact based on changes
    impactScore += diff.chapterMoves.length * 10 // Moving chapters has high impact
    impactScore += diff.contentChanges.length * 5
    
    if (impactScore > 50) riskLevel = 'high'
    else if (impactScore > 20) riskLevel = 'medium'

    return {
      totalChanges,
      impactScore: Math.min(impactScore, 100),
      riskLevel,
      estimatedReadingImpact: `${totalChanges} changes affecting reading experience`
    }
  }
}