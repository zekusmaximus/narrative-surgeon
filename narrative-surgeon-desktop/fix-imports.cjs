#!/usr/bin/env node

/**
 * NARRATIVE SURGEON - IMPORT FIXING SYSTEM
 * Intelligently fixes broken imports after multi-manuscript cleanup
 */

const fs = require('fs').promises;
const path = require('path');

class ImportFixer {
  constructor() {
    this.logFile = `import-fixes-${Date.now()}.log`;
    this.fixes = [];
    this.stubs = new Map(); // Track created stub components
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
    await fs.appendFile(this.logFile, logEntry + '\n').catch(() => {});
  }

  // Define how to handle each removed component
  getComponentStrategy(componentName) {
    const strategies = {
      'ManuscriptsList': {
        action: 'remove_usage',
        reason: 'Multi-manuscript listing no longer needed',
        replacement: null
      },
      'CreateManuscriptDialog': {
        action: 'remove_usage', 
        reason: 'Single manuscript - no creation dialog needed',
        replacement: null
      },
      'BatchImportDialog': {
        action: 'remove_usage',
        reason: 'Single manuscript - no batch import needed', 
        replacement: null
      },
      'manuscriptStore': {
        action: 'replace_import',
        reason: 'Replacing with single manuscript store',
        replacement: './singleManuscriptStore'
      },
      'SubmissionTracker': {
        action: 'create_stub',
        reason: 'Will rebuild submission features later',
        replacement: 'SubmissionTrackerStub'
      },
      'QueryLetterGenerator': {
        action: 'create_stub',
        reason: 'Will rebuild query features later',
        replacement: 'QueryLetterGeneratorStub'
      },
      'AgentResearch': {
        action: 'create_stub',
        reason: 'Will rebuild agent research later',
        replacement: 'AgentResearchStub'
      },
      'MarketResearch': {
        action: 'create_stub',
        reason: 'Will rebuild market research later',
        replacement: 'MarketResearchStub'
      }
    };

    return strategies[componentName] || {
      action: 'remove_usage',
      reason: 'Component removed during cleanup',
      replacement: null
    };
  }

  async createStubComponent(componentName, outputPath) {
    const stubContent = `// STUB COMPONENT - TODO: Rebuild for single manuscript use
import React from 'react';

interface ${componentName}Props {
  [key: string]: any; // Accept any props for compatibility
}

export function ${componentName}({ ...props }: ${componentName}Props) {
  return (
    <div className="p-4 border border-dashed border-gray-300 rounded-md">
      <div className="text-center text-gray-500">
        <h3 className="font-medium">${componentName}</h3>
        <p className="text-sm">This feature will be rebuilt for single manuscript use.</p>
        <p className="text-xs mt-2">TODO: Implement in Phase 2</p>
      </div>
    </div>
  );
}

export default ${componentName};
`;

    await fs.writeFile(outputPath, stubContent);
    await this.log(`✓ Created stub component: ${outputPath}`);
    this.stubs.set(componentName, outputPath);
  }

  async fixImportsInFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      let modified = false;
      const fixes = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Find commented out imports
        if (line.trim().startsWith('// REMOVED:') && line.includes('Multi-manuscript feature removed')) {
          const originalImport = line.match(/\/\/ REMOVED: (.+) \/\/ Multi-manuscript feature removed/)?.[1];
          
          if (originalImport) {
            await this.log(`Processing broken import in ${filePath}:${i + 1}: ${originalImport}`);
            
            // Extract component name from import
            const componentMatch = originalImport.match(/import\s+(?:\{([^}]+)\}|(\w+))/);
            if (componentMatch) {
              const componentName = componentMatch[1] || componentMatch[2];
              const cleanComponentName = componentName.replace(/\s+as\s+\w+/g, '').trim();
              
              const strategy = this.getComponentStrategy(cleanComponentName);
              await this.log(`  Strategy for ${cleanComponentName}: ${strategy.action}`);
              
              switch (strategy.action) {
                case 'remove_usage':
                  // Remove the import line entirely
                  lines[i] = `// Import removed: ${cleanComponentName} (${strategy.reason})`;
                  modified = true;
                  fixes.push({
                    type: 'removed_import',
                    component: cleanComponentName,
                    reason: strategy.reason
                  });
                  break;
                  
                case 'replace_import':
                  // Replace with new import path
                  const newImport = originalImport.replace(/from\s+['"][^'"]+['"]/, `from '${strategy.replacement}'`);
                  lines[i] = newImport;
                  modified = true;
                  fixes.push({
                    type: 'replaced_import',
                    component: cleanComponentName,
                    newPath: strategy.replacement
                  });
                  break;
                  
                case 'create_stub':
                  // Create stub component and update import
                  const stubDir = path.join('src/components/stubs');
                  await fs.mkdir(stubDir, { recursive: true });
                  const stubPath = path.join(stubDir, `${strategy.replacement}.tsx`);
                  
                  if (!this.stubs.has(strategy.replacement)) {
                    await this.createStubComponent(strategy.replacement, stubPath);
                  }
                  
                  // Update import to use stub
                  const stubImport = originalImport.replace(/from\s+['"][^'"]+['"]/, `from '@/components/stubs/${strategy.replacement}'`);
                  lines[i] = stubImport;
                  modified = true;
                  fixes.push({
                    type: 'stub_import',
                    component: cleanComponentName,
                    stubPath: stubPath
                  });
                  break;
              }
            }
          }
        }
      }

      // Also scan for usage of removed components
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for JSX usage of removed components
        const removedComponents = ['ManuscriptsList', 'CreateManuscriptDialog', 'BatchImportDialog'];
        for (const component of removedComponents) {
          if (line.includes(`<${component}`) && !line.trim().startsWith('//')) {
            lines[i] = `    {/* Removed ${component} - multi-manuscript feature no longer needed */}`;
            modified = true;
            fixes.push({
              type: 'removed_usage',
              component: component,
              line: i + 1
            });
          }
        }
      }

      if (modified) {
        await fs.writeFile(filePath, lines.join('\n'));
        await this.log(`✓ Fixed imports in: ${filePath}`);
        this.fixes.push({
          file: filePath,
          fixes: fixes
        });
      }

    } catch (error) {
      await this.log(`Error fixing imports in ${filePath}: ${error.message}`, 'error');
    }
  }

  async findFilesWithBrokenImports() {
    const files = [];
    
    try {
      const allFiles = await this.getAllTypeScriptFiles('src');
      
      for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf8');
        if (content.includes('// REMOVED:') && content.includes('Multi-manuscript feature removed')) {
          files.push(file);
        }
      }
    } catch (error) {
      await this.log(`Error scanning for broken imports: ${error.message}`, 'error');
    }

    return files;
  }

  async getAllTypeScriptFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && 
            !entry.name.startsWith('.') && 
            entry.name !== 'node_modules' &&
            entry.name !== 'deleted-backup') {
          files.push(...await this.getAllTypeScriptFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      await this.log(`Error reading directory ${dir}: ${error.message}`, 'warning');
    }
    
    return files;
  }

  async updateBarrelExports() {
    // Common locations for barrel exports
    const barrelFiles = [
      'src/components/index.ts',
      'src/components/index.tsx', 
      'src/lib/index.ts',
      'src/store/index.ts'
    ];

    for (const barrelFile of barrelFiles) {
      try {
        await fs.access(barrelFile);
        await this.log(`Updating barrel export: ${barrelFile}`);
        
        const content = await fs.readFile(barrelFile, 'utf8');
        const lines = content.split('\n');
        let modified = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Remove exports for deleted components
          if (line.includes('ManuscriptsList') || 
              line.includes('CreateManuscriptDialog') ||
              line.includes('BatchImportDialog') ||
              line.includes('manuscriptStore')) {
            lines[i] = `// ${line} // Removed during multi-manuscript cleanup`;
            modified = true;
          }
        }

        if (modified) {
          await fs.writeFile(barrelFile, lines.join('\n'));
          await this.log(`✓ Updated barrel export: ${barrelFile}`);
        }

      } catch (error) {
        // File doesn't exist or not accessible - skip
        continue;
      }
    }
  }

  async execute() {
    try {
      await this.log('🔧 Starting import fixes...');
      
      // Step 1: Find all files with broken imports
      const brokenFiles = await this.findFilesWithBrokenImports();
      await this.log(`Found ${brokenFiles.length} files with broken imports`);

      if (brokenFiles.length === 0) {
        await this.log('No broken imports found - cleanup was already complete');
        return true;
      }

      // Step 2: Fix imports in each file
      for (const file of brokenFiles) {
        await this.fixImportsInFile(file);
      }

      // Step 3: Update barrel exports
      await this.updateBarrelExports();

      // Step 4: Generate report
      const report = {
        timestamp: new Date().toISOString(),
        processedFiles: brokenFiles.length,
        totalFixes: this.fixes.length,
        stubsCreated: Array.from(this.stubs.entries()),
        fixes: this.fixes,
        logFile: this.logFile
      };

      await fs.writeFile('import-fixes-report.json', JSON.stringify(report, null, 2));

      await this.log('🎉 Import fixing completed!');
      await this.log(`📊 Fixed imports in ${brokenFiles.length} files`);
      await this.log(`📄 Report: import-fixes-report.json`);
      await this.log(`📁 Stubs created: ${this.stubs.size}`);

      return true;

    } catch (error) {
      await this.log(`💥 Critical failure: ${error.message}`, 'error');
      return false;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const fixer = new ImportFixer();
  fixer.execute().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = ImportFixer;