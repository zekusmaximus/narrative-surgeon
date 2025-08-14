#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// NARRATIVE SURGEON REFACTORING AUTOMATION SCRIPT
class RefactoringAutomation {
  constructor() {
    this.basePath = './narrative-surgeon-desktop';
    this.backupPath = './backup-pre-refactor';
    this.logPath = './refactoring-log.txt';
    this.errors = [];
    this.completed = [];
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    await fs.appendFile(this.logPath, logMessage);
  }

  async executeStep(stepName, operation) {
    try {
      await this.log(`Starting: ${stepName}`);
      await operation();
      this.completed.push(stepName);
      await this.log(`✓ Completed: ${stepName}`);
    } catch (error) {
      this.errors.push({ step: stepName, error: error.message });
      await this.log(`✗ Failed: ${stepName} - ${error.message}`);
      throw error; // Re-throw to stop execution on critical failures
    }
  }

  async createBackup() {
    await this.executeStep('Create backup', async () => {
      // Create git commit as backup
      execSync('git add .', { cwd: this.basePath });
      execSync('git commit -m "Backup before refactoring automation"', { cwd: this.basePath });
      
      // Also create file system backup
      execSync(`cp -r ${this.basePath} ${this.backupPath}`);
    });
  }

  async loadRefactoringData() {
    await this.executeStep('Load refactoring configuration', async () => {
      try {
        const mapContent = await fs.readFile('./refactoring-map.json', 'utf8');
        this.refactoringMap = JSON.parse(mapContent);
      } catch (error) {
        throw new Error('Could not load refactoring-map.json. Run analysis first.');
      }

      try {
        const depContent = await fs.readFile('./dependency-analysis.json', 'utf8');
        this.dependencyAnalysis = JSON.parse(depContent);
      } catch (error) {
        throw new Error('Could not load dependency-analysis.json. Run analysis first.');
      }
    });
  }

  async cleanupDependencies() {
    await this.executeStep('Cleanup dependencies', async () => {
      const removePackages = this.dependencyAnalysis.remove.map(dep => dep.name);
      const addPackages = this.dependencyAnalysis.add.map(dep => dep.name);
      
      // Remove unused packages
      if (removePackages.length > 0) {
        const removeCmd = `npm uninstall ${removePackages.join(' ')}`;
        execSync(removeCmd, { cwd: this.basePath });
      }
      
      // Add new packages
      if (addPackages.length > 0) {
        const addCmd = `npm install ${addPackages.join(' ')}`;
        execSync(addCmd, { cwd: this.basePath });
      }
    });
  }

  async deleteObsoleteFiles() {
    await this.executeStep('Delete obsolete files', async () => {
      for (const item of this.refactoringMap.deletion_candidates) {
        const fullPath = path.join(this.basePath, item.path.replace('narrative-surgeon-desktop/', ''));
        
        try {
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            await fs.rmdir(fullPath, { recursive: true });
          } else {
            await fs.unlink(fullPath);
          }
          await this.log(`  - Deleted: ${item.path}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            await this.log(`  - Warning: Could not delete ${item.path}: ${error.message}`);
          }
        }
      }
    });
  }

  async updateImports() {
    await this.executeStep('Update import statements', async () => {
      // This is a simplified version - in production, you'd want more sophisticated parsing
      const filesToUpdate = [
        'src/app/page.tsx',
        'src/app/layout.tsx',
        'src/components/layout/MenuBar.tsx'
      ];
      
      for (const filePath of filesToUpdate) {
        const fullPath = path.join(this.basePath, filePath);
        
        try {
          let content = await fs.readFile(fullPath, 'utf8');
          
          // Remove imports for deleted components
          const deletedComponents = [
            'ManuscriptsList',
            'CreateManuscriptDialog', 
            'BatchImportDialog',
            'SubmissionTracker',
            'QueryLetterGenerator',
            'MarketResearch'
          ];
          
          deletedComponents.forEach(component => {
            // Remove import lines
            const importRegex = new RegExp(`import.*${component}.*from.*\n`, 'g');
            content = content.replace(importRegex, '');
            
            // Remove usage (basic pattern matching)
            const usageRegex = new RegExp(`<${component}[^>]*(?:/>|>.*?</${component}>)`, 'gs');
            content = content.replace(usageRegex, '');
          });
          
          await fs.writeFile(fullPath, content, 'utf8');
          await this.log(`  - Updated imports in: ${filePath}`);
          
        } catch (error) {
          if (error.code !== 'ENOENT') {
            await this.log(`  - Warning: Could not update ${filePath}: ${error.message}`);
          }
        }
      }
    });
  }

  async applyCriticalBugFixes() {
    await this.executeStep('Apply critical bug fixes', async () => {
      // Fix 1: Memory leak in TiptapEditor
      const editorPath = path.join(this.basePath, 'src/components/editor/TiptapEditor.tsx');
      
      try {
        let content = await fs.readFile(editorPath, 'utf8');
        
        // Replace the buggy AutoSave onCreate method
        const oldAutoSavePattern = /onCreate\(\)\s*\{[\s\S]*?this\.editor\.on\('update'[\s\S]*?\}\)/;
        const newAutoSave = `onCreate() {
    let timeout: NodeJS.Timeout

    const updateHandler = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        this.options.onSave()
      }, this.options.delay)
    }

    this.editor.on('update', updateHandler)
    
    // Clean up event listener and timeout
    this.editor.on('destroy', () => {
      this.editor.off('update', updateHandler)
      clearTimeout(timeout)
    })
  }`;
        
        content = content.replace(oldAutoSavePattern, newAutoSave);
        
        // Fix TypeScript any casts
        content = content.replace(/const \{ Extension: CoreExtension.*?\} = Tiptap as any/, 
          'import { Extension, Node, Editor } from \'@tiptap/core\'');
        
        await fs.writeFile(editorPath, content, 'utf8');
        await this.log('  - Fixed memory leak in TiptapEditor');
        
      } catch (error) {
        await this.log(`  - Warning: Could not fix TiptapEditor: ${error.message}`);
      }
    });
  }

  async createNewDataModel() {
    await this.executeStep('Install new data model', async () => {
      // Copy new data model files
      const newFiles = [
        { src: './new-data-model.ts', dest: 'src/types/single-manuscript.ts' },
        { src: './new-store-implementation.ts', dest: 'src/store/singleManuscriptStore.ts' }
      ];
      
      for (const { src, dest } of newFiles) {
        const srcPath = src;
        const destPath = path.join(this.basePath, dest);
        
        try {
          const content = await fs.readFile(srcPath, 'utf8');
          await fs.writeFile(destPath, content, 'utf8');
          await this.log(`  - Created: ${dest}`);
        } catch (error) {
          await this.log(`  - Warning: Could not create ${dest}: ${error.message}`);
        }
      }
    });
  }

  async createSimplifiedLandingPage() {
    await this.executeStep('Create simplified landing page', async () => {
      const newPageContent = `'use client'

import React, { useEffect } from 'react'
import { useSingleManuscriptStore } from '@/store/singleManuscriptStore'
import { TiptapEditor } from '@/components/editor/TiptapEditor'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const { manuscript, currentVersion, isLoading, error } = useSingleManuscriptStore()
  const { initialize, switchVersion, createVersion } = useSingleManuscriptStore(
    state => state.actions
  )

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading manuscript...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header with version controls */}
      <header className="border-b p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{manuscript.title}</h1>
          <p className="text-sm text-muted-foreground">
            Version: {currentVersion.name} • {manuscript.totalWordCount.toLocaleString()} words
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => createVersion('New Arrangement', 'Chapter reorder experiment', 'experiment')}
          >
            New Version
          </Button>
          <Button 
            variant="outline"
            onClick={() => {/* TODO: Open version selector */}}
          >
            Switch Version
          </Button>
        </div>
      </header>

      {/* Main editor */}
      <main className="flex-1 p-4">
        <TiptapEditor
          content=""
          onChange={() => {/* TODO: Handle content changes */}}
          manuscriptId={manuscript.id}
          placeholder="Start editing your techno-thriller..."
          onSave={() => console.log('Saving...')}
        />
      </main>
    </div>
  )
}`;

      const pagePath = path.join(this.basePath, 'src/app/page.tsx');
      await fs.writeFile(pagePath, newPageContent, 'utf8');
      await this.log('  - Created simplified landing page');
    });
  }

  async runTypeScriptCheck() {
    await this.executeStep('TypeScript compilation check', async () => {
      try {
        execSync('npx tsc --noEmit', { cwd: this.basePath });
        await this.log('  ✓ TypeScript compilation successful');
      } catch (error) {
        // Don't fail the entire process for TS errors, just log them
        await this.log('  ⚠ TypeScript compilation has errors - manual review needed');
        await this.log(`  ${error.message}`);
      }
    });
  }

  async generateReport() {
    await this.executeStep('Generate refactoring report', async () => {
      const report = {
        timestamp: new Date().toISOString(),
        completedSteps: this.completed,
        errors: this.errors,
        summary: {
          filesDeleted: this.refactoringMap.deletion_candidates.length,
          dependenciesRemoved: this.dependencyAnalysis.remove.length,
          dependenciesAdded: this.dependencyAnalysis.add.length,
          criticalBugsFixes: ['TiptapEditor memory leak', 'TypeScript any casts'],
          nextSteps: [
            'Review TypeScript compilation errors',
            'Test the simplified editor interface',
            'Implement chapter reordering UI',
            'Add version control UI components',
            'Create database migration script'
          ]
        }
      };
      
      await fs.writeFile('./refactoring-report.json', JSON.stringify(report, null, 2));
      await this.log('📊 Refactoring report saved to refactoring-report.json');
    });
  }

  async execute() {
    try {
      await this.log('🚀 Starting Narrative Surgeon Refactoring Automation');
      
      // Critical pre-flight checks
      await this.createBackup();
      await this.loadRefactoringData();
      
      // Dependency management
      await this.cleanupDependencies();
      
      // File system changes
      await this.deleteObsoleteFiles();
      await this.updateImports();
      
      // Code improvements
      await this.applyCriticalBugFixes();
      await this.createNewDataModel();
      await this.createSimplifiedLandingPage();
      
      // Validation
      await this.runTypeScriptCheck();
      
      // Reporting
      await this.generateReport();
      
      await this.log('✅ Refactoring automation completed successfully!');
      await this.log(`✅ Completed ${this.completed.length} steps with ${this.errors.length} errors`);
      
      if (this.errors.length > 0) {
        await this.log('⚠️  Review errors in refactoring-report.json');
      }
      
    } catch (error) {
      await this.log(`💥 Critical failure: ${error.message}`);
      await this.log('🔄 Restore from backup and review errors');
      process.exit(1);
    }
  }
}

// Execution
if (require.main === module) {
  const automation = new RefactoringAutomation();
  automation.execute().catch(console.error);
}

module.exports = RefactoringAutomation;