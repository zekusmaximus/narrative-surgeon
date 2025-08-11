import { MMKV } from 'react-native-mmkv';
import { Scene, Manuscript } from '../types';
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';

export interface VersionSnapshot {
  id: string;
  manuscriptId: string;
  timestamp: number;
  type: 'auto' | 'manual' | 'branch' | 'merge';
  description?: string;
  branchName?: string;
  parentVersionId?: string;
  scenes: Scene[];
  metadata: {
    totalWordCount: number;
    sceneCount: number;
    lastModifiedSceneId?: string;
    userDescription?: string;
  };
  hash: string; // Content hash for deduplication
}

export interface VersionBranch {
  id: string;
  name: string;
  manuscriptId: string;
  createdAt: number;
  description: string;
  currentVersionId: string;
  parentVersionId: string;
  isActive: boolean;
}

export interface ConflictResolution {
  sceneId: string;
  conflictType: 'content' | 'order' | 'metadata';
  localVersion: Scene;
  remoteVersion: Scene;
  resolvedVersion: Scene;
  resolution: 'local' | 'remote' | 'merged';
}

export interface DiffResult {
  sceneId: string;
  sceneName: string;
  changes: DiffChange[];
  changeCount: number;
  addedWords: number;
  removedWords: number;
}

export interface DiffChange {
  type: 'equal' | 'insert' | 'delete';
  text: string;
  position: number;
}

export interface MergeResult {
  success: boolean;
  conflicts: ConflictResolution[];
  mergedVersionId?: string;
  errors: string[];
}

// Create storage instance for version control
const versionStorage = new MMKV({
  id: 'narrative-surgeon-versions',
  encryptionKey: 'version-control-key'
});

export class VersionControlService {
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private dmp = new diff_match_patch();
  private readonly AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.dmp.Diff_Timeout = 1.0; // 1 second timeout for diff computation
    this.dmp.Diff_EditCost = 4; // Cost of empty edit
  }

  // Initialize auto-save for a manuscript
  initializeAutoSave(manuscriptId: string, getCurrentScenes: () => Scene[]): void {
    this.stopAutoSave();
    
    this.autoSaveInterval = setInterval(() => {
      try {
        const scenes = getCurrentScenes();
        this.createAutoSnapshot(manuscriptId, scenes);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  // Stop auto-save
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Create automatic snapshot
  async createAutoSnapshot(manuscriptId: string, scenes: Scene[]): Promise<string | null> {
    const hash = this.generateContentHash(scenes);
    const lastSnapshot = this.getLatestSnapshot(manuscriptId);
    
    // Skip if content hasn't changed
    if (lastSnapshot && lastSnapshot.hash === hash) {
      return null;
    }

    const snapshot: VersionSnapshot = {
      id: this.generateId(),
      manuscriptId,
      timestamp: Date.now(),
      type: 'auto',
      scenes: this.deepCloneScenes(scenes),
      metadata: {
        totalWordCount: scenes.reduce((sum, s) => sum + s.wordCount, 0),
        sceneCount: scenes.length,
        lastModifiedSceneId: this.findLastModifiedScene(scenes, lastSnapshot?.scenes)?.id,
      },
      hash
    };

    this.saveSnapshot(snapshot);
    this.cleanupOldAutoSnapshots(manuscriptId);
    
    return snapshot.id;
  }

  // Create manual save point
  async createSavePoint(
    manuscriptId: string, 
    scenes: Scene[], 
    description: string
  ): Promise<string> {
    const snapshot: VersionSnapshot = {
      id: this.generateId(),
      manuscriptId,
      timestamp: Date.now(),
      type: 'manual',
      description,
      scenes: this.deepCloneScenes(scenes),
      metadata: {
        totalWordCount: scenes.reduce((sum, s) => sum + s.wordCount, 0),
        sceneCount: scenes.length,
        userDescription: description,
      },
      hash: this.generateContentHash(scenes)
    };

    this.saveSnapshot(snapshot);
    return snapshot.id;
  }

  // Create a new branch
  async createBranch(
    manuscriptId: string,
    scenes: Scene[],
    branchName: string,
    description: string,
    parentVersionId?: string
  ): Promise<string> {
    // Create initial snapshot for the branch
    const branchSnapshot: VersionSnapshot = {
      id: this.generateId(),
      manuscriptId,
      timestamp: Date.now(),
      type: 'branch',
      description: `Branch created: ${branchName}`,
      branchName,
      parentVersionId,
      scenes: this.deepCloneScenes(scenes),
      metadata: {
        totalWordCount: scenes.reduce((sum, s) => sum + s.wordCount, 0),
        sceneCount: scenes.length,
        userDescription: description,
      },
      hash: this.generateContentHash(scenes)
    };

    // Create branch record
    const branch: VersionBranch = {
      id: this.generateId(),
      name: branchName,
      manuscriptId,
      createdAt: Date.now(),
      description,
      currentVersionId: branchSnapshot.id,
      parentVersionId: parentVersionId || this.getLatestSnapshot(manuscriptId)?.id || '',
      isActive: false
    };

    this.saveSnapshot(branchSnapshot);
    this.saveBranch(branch);
    
    return branch.id;
  }

  // Switch to a branch
  switchToBranch(manuscriptId: string, branchId: string): Scene[] | null {
    const branch = this.getBranch(branchId);
    if (!branch || branch.manuscriptId !== manuscriptId) {
      return null;
    }

    // Deactivate other branches
    const branches = this.getBranches(manuscriptId);
    branches.forEach(b => {
      if (b.id !== branchId) {
        b.isActive = false;
        this.saveBranch(b);
      }
    });

    // Activate target branch
    branch.isActive = true;
    this.saveBranch(branch);

    // Return scenes from branch's current version
    const snapshot = this.getSnapshot(branch.currentVersionId);
    return snapshot ? snapshot.scenes : null;
  }

  // Merge branches with conflict detection
  async mergeBranches(
    manuscriptId: string,
    sourceBranchId: string,
    targetBranchId: string,
    description: string
  ): Promise<MergeResult> {
    const sourceBranch = this.getBranch(sourceBranchId);
    const targetBranch = this.getBranch(targetBranchId);
    
    if (!sourceBranch || !targetBranch) {
      return { success: false, conflicts: [], errors: ['Branch not found'] };
    }

    const sourceSnapshot = this.getSnapshot(sourceBranch.currentVersionId);
    const targetSnapshot = this.getSnapshot(targetBranch.currentVersionId);
    
    if (!sourceSnapshot || !targetSnapshot) {
      return { success: false, conflicts: [], errors: ['Snapshot not found'] };
    }

    // Detect conflicts
    const conflicts = this.detectConflicts(sourceSnapshot.scenes, targetSnapshot.scenes);
    
    if (conflicts.length > 0) {
      return { success: false, conflicts, errors: [] };
    }

    // Perform merge
    const mergedScenes = this.mergeScenes(sourceSnapshot.scenes, targetSnapshot.scenes);
    
    // Create merge snapshot
    const mergeSnapshot: VersionSnapshot = {
      id: this.generateId(),
      manuscriptId,
      timestamp: Date.now(),
      type: 'merge',
      description: `Merged ${sourceBranch.name} into ${targetBranch.name}: ${description}`,
      scenes: mergedScenes,
      parentVersionId: targetSnapshot.id,
      metadata: {
        totalWordCount: mergedScenes.reduce((sum, s) => sum + s.wordCount, 0),
        sceneCount: mergedScenes.length,
        userDescription: description,
      },
      hash: this.generateContentHash(mergedScenes)
    };

    this.saveSnapshot(mergeSnapshot);
    
    // Update target branch
    targetBranch.currentVersionId = mergeSnapshot.id;
    this.saveBranch(targetBranch);

    return { 
      success: true, 
      conflicts: [], 
      mergedVersionId: mergeSnapshot.id,
      errors: [] 
    };
  }

  // Generate visual diff between versions
  generateDiff(versionId1: string, versionId2: string): DiffResult[] {
    const snapshot1 = this.getSnapshot(versionId1);
    const snapshot2 = this.getSnapshot(versionId2);
    
    if (!snapshot1 || !snapshot2) {
      return [];
    }

    const results: DiffResult[] = [];
    const sceneMap1 = new Map(snapshot1.scenes.map(s => [s.id, s]));
    const sceneMap2 = new Map(snapshot2.scenes.map(s => [s.id, s]));
    
    // Get all unique scene IDs
    const allSceneIds = new Set([...sceneMap1.keys(), ...sceneMap2.keys()]);
    
    for (const sceneId of allSceneIds) {
      const scene1 = sceneMap1.get(sceneId);
      const scene2 = sceneMap2.get(sceneId);
      
      if (!scene1 && scene2) {
        // Scene was added
        results.push({
          sceneId,
          sceneName: scene2.title || `Scene ${scene2.indexInManuscript + 1}`,
          changes: [{
            type: 'insert',
            text: scene2.rawText,
            position: 0
          }],
          changeCount: 1,
          addedWords: scene2.wordCount,
          removedWords: 0
        });
      } else if (scene1 && !scene2) {
        // Scene was deleted
        results.push({
          sceneId,
          sceneName: scene1.title || `Scene ${scene1.indexInManuscript + 1}`,
          changes: [{
            type: 'delete',
            text: scene1.rawText,
            position: 0
          }],
          changeCount: 1,
          addedWords: 0,
          removedWords: scene1.wordCount
        });
      } else if (scene1 && scene2) {
        // Scene was modified
        const diffs = this.dmp.diff_main(scene1.rawText, scene2.rawText);
        this.dmp.diff_cleanupSemantic(diffs);
        
        const changes: DiffChange[] = [];
        let addedWords = 0;
        let removedWords = 0;
        let position = 0;
        
        for (const [type, text] of diffs) {
          const diffType = type === DIFF_DELETE ? 'delete' : 
                          type === DIFF_INSERT ? 'insert' : 'equal';
          
          changes.push({
            type: diffType,
            text,
            position
          });
          
          if (type === DIFF_DELETE) {
            removedWords += this.countWords(text);
          } else if (type === DIFF_INSERT) {
            addedWords += this.countWords(text);
          }
          
          if (type !== DIFF_DELETE) {
            position += text.length;
          }
        }
        
        if (changes.some(c => c.type !== 'equal')) {
          results.push({
            sceneId,
            sceneName: scene2.title || `Scene ${scene2.indexInManuscript + 1}`,
            changes,
            changeCount: changes.filter(c => c.type !== 'equal').length,
            addedWords,
            removedWords
          });
        }
      }
    }
    
    return results;
  }

  // Restore to a specific version
  restoreToVersion(versionId: string): Scene[] | null {
    const snapshot = this.getSnapshot(versionId);
    return snapshot ? this.deepCloneScenes(snapshot.scenes) : null;
  }

  // Get all versions for a manuscript
  getVersionHistory(manuscriptId: string): VersionSnapshot[] {
    const keys = versionStorage.getAllKeys();
    const versions: VersionSnapshot[] = [];
    
    for (const key of keys) {
      if (key.startsWith(`snapshot_${manuscriptId}_`)) {
        const snapshot = versionStorage.getString(key);
        if (snapshot) {
          versions.push(JSON.parse(snapshot));
        }
      }
    }
    
    return versions.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get all branches for a manuscript
  getBranches(manuscriptId: string): VersionBranch[] {
    const keys = versionStorage.getAllKeys();
    const branches: VersionBranch[] = [];
    
    for (const key of keys) {
      if (key.startsWith(`branch_${manuscriptId}_`)) {
        const branch = versionStorage.getString(key);
        if (branch) {
          branches.push(JSON.parse(branch));
        }
      }
    }
    
    return branches.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get active branch
  getActiveBranch(manuscriptId: string): VersionBranch | null {
    const branches = this.getBranches(manuscriptId);
    return branches.find(b => b.isActive) || null;
  }

  // Delete old versions (keep only recent ones)
  cleanup(manuscriptId: string, keepCount: number = 50): void {
    const versions = this.getVersionHistory(manuscriptId);
    const autoVersions = versions.filter(v => v.type === 'auto');
    const manualVersions = versions.filter(v => v.type !== 'auto');
    
    // Keep recent manual versions and only some auto versions
    const versionsToDelete = [
      ...autoVersions.slice(keepCount / 2),
      ...manualVersions.slice(keepCount / 2)
    ];
    
    for (const version of versionsToDelete) {
      versionStorage.delete(`snapshot_${manuscriptId}_${version.id}`);
    }
  }

  // Private helper methods
  private saveSnapshot(snapshot: VersionSnapshot): void {
    const key = `snapshot_${snapshot.manuscriptId}_${snapshot.id}`;
    versionStorage.set(key, JSON.stringify(snapshot));
  }

  private getSnapshot(versionId: string): VersionSnapshot | null {
    const keys = versionStorage.getAllKeys();
    for (const key of keys) {
      if (key.endsWith(`_${versionId}`)) {
        const snapshot = versionStorage.getString(key);
        return snapshot ? JSON.parse(snapshot) : null;
      }
    }
    return null;
  }

  private saveBranch(branch: VersionBranch): void {
    const key = `branch_${branch.manuscriptId}_${branch.id}`;
    versionStorage.set(key, JSON.stringify(branch));
  }

  private getBranch(branchId: string): VersionBranch | null {
    const keys = versionStorage.getAllKeys();
    for (const key of keys) {
      if (key.endsWith(`_${branchId}`)) {
        const branch = versionStorage.getString(key);
        return branch ? JSON.parse(branch) : null;
      }
    }
    return null;
  }

  private getLatestSnapshot(manuscriptId: string): VersionSnapshot | null {
    const versions = this.getVersionHistory(manuscriptId);
    return versions.length > 0 ? versions[0] : null;
  }

  private generateContentHash(scenes: Scene[]): string {
    const content = scenes.map(s => `${s.id}:${s.rawText}:${s.indexInManuscript}`).join('|');
    return this.simpleHash(content);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private deepCloneScenes(scenes: Scene[]): Scene[] {
    return scenes.map(scene => ({ ...scene }));
  }

  private findLastModifiedScene(currentScenes: Scene[], previousScenes?: Scene[]): Scene | undefined {
    if (!previousScenes) return currentScenes[0];
    
    const prevMap = new Map(previousScenes.map(s => [s.id, s]));
    
    for (const scene of currentScenes) {
      const prevScene = prevMap.get(scene.id);
      if (!prevScene || prevScene.updatedAt < scene.updatedAt) {
        return scene;
      }
    }
    
    return undefined;
  }

  private cleanupOldAutoSnapshots(manuscriptId: string, keepCount: number = 10): void {
    const versions = this.getVersionHistory(manuscriptId);
    const autoVersions = versions.filter(v => v.type === 'auto');
    
    if (autoVersions.length > keepCount) {
      const versionsToDelete = autoVersions.slice(keepCount);
      for (const version of versionsToDelete) {
        versionStorage.delete(`snapshot_${manuscriptId}_${version.id}`);
      }
    }
  }

  private detectConflicts(sourceScenes: Scene[], targetScenes: Scene[]): ConflictResolution[] {
    const conflicts: ConflictResolution[] = [];
    const sourceMap = new Map(sourceScenes.map(s => [s.id, s]));
    const targetMap = new Map(targetScenes.map(s => [s.id, s]));
    
    // Check for content conflicts
    for (const [sceneId, sourceScene] of sourceMap) {
      const targetScene = targetMap.get(sceneId);
      if (targetScene && sourceScene.rawText !== targetScene.rawText) {
        conflicts.push({
          sceneId,
          conflictType: 'content',
          localVersion: targetScene,
          remoteVersion: sourceScene,
          resolvedVersion: targetScene, // Default to local
          resolution: 'local'
        });
      }
    }
    
    return conflicts;
  }

  private mergeScenes(sourceScenes: Scene[], targetScenes: Scene[]): Scene[] {
    const targetMap = new Map(targetScenes.map(s => [s.id, s]));
    const result: Scene[] = [...targetScenes];
    
    // Add new scenes from source
    for (const sourceScene of sourceScenes) {
      if (!targetMap.has(sourceScene.id)) {
        result.push(sourceScene);
      }
    }
    
    // Sort by index
    return result.sort((a, b) => a.indexInManuscript - b.indexInManuscript);
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

// Export singleton instance
export const versionControlService = new VersionControlService();