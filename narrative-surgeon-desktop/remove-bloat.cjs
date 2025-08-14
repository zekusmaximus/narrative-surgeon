#!/usr/bin/env node

/**
 * NARRATIVE SURGEON - SAFE MULTI-MANUSCRIPT BLOAT REMOVAL
 * Removes multi-manuscript features while preserving imports safely
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class BloatRemoval {
  constructor() {
    this.backupDir = 'deleted-backup';
    this.logFile = `bloat-removal-${Date.now()}.log`;
    this.deletedFiles = [];
    this.deletedDirs = [];
    this.brokenImports = new Map(); // file -> array of broken import lines
    this.importScanResults = [];
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
    await fs.appendFile(this.logFile, logEntry + '\n').catch(() => {});
  }

  async ensureBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await this.log('✓ Backup directory created');
    } catch (error) {
      await this.log(`Failed to create backup directory: ${error.message}`, 'error');
      throw error;
    }
  }

  async findImportsOfFile(targetFile) {
    await this.log(`Scanning for imports of: ${targetFile}`);
    const srcDir = 'src';
    const importingFiles = [];

    try {
      const files = await this.getAllTypeScriptFiles(srcDir);
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for various import patterns
            const importPatterns = [
              new RegExp(`import.*from\\s+['"]\\.?\\/?.*${path.basename(targetFile, path.extname(targetFile))}['"]`),
              new RegExp(`import.*from\\s+['"]\@/.*${path.basename(targetFile, path.extname(targetFile))}['"]`),
              new RegExp(`import\\s+.*${path.basename(targetFile, path.extname(targetFile))}.*from`),
            ];
            
            if (importPatterns.some(pattern => pattern.test(line))) {
              importingFiles.push({
                file,
                line: i + 1,
                content: line,
                fullLine: line
              });
              break; // Only record first import in each file
            }
          }
        } catch (error) {
          await this.log(`Warning: Could not scan ${file}: ${error.message}`, 'warning');
        }
      }
    } catch (error) {
      await this.log(`Error scanning for imports: ${error.message}`, 'error');
    }

    return importingFiles;
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
            entry.name !== this.backupDir) {
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

  async commentOutImports(importingFiles, targetFileName) {
    for (const importInfo of importingFiles) {
      try {
        const content = await fs.readFile(importInfo.file, 'utf8');
        const lines = content.split('\n');
        
        // Comment out the import line
        if (lines[importInfo.line - 1] && lines[importInfo.line - 1].trim() === importInfo.content) {
          lines[importInfo.line - 1] = `// REMOVED: ${lines[importInfo.line - 1]} // Multi-manuscript feature removed`;
          
          await fs.writeFile(importInfo.file, lines.join('\n'));
          await this.log(`  ✓ Commented out import in: ${importInfo.file}:${importInfo.line}`);
          
          // Track this for later fixing
          if (!this.brokenImports.has(importInfo.file)) {
            this.brokenImports.set(importInfo.file, []);
          }
          this.brokenImports.get(importInfo.file).push({
            originalLine: importInfo.content,
            targetFile: targetFileName,
            lineNumber: importInfo.line
          });
        }
      } catch (error) {
        await this.log(`Failed to comment import in ${importInfo.file}: ${error.message}`, 'error');
      }
    }
  }

  async safelyRemoveFile(filePath) {
    try {
      await fs.access(filePath);
    } catch (error) {
      await this.log(`File not found, skipping: ${filePath}`, 'warning');
      return false;
    }

    const fileName = path.basename(filePath);
    await this.log(`Processing file: ${filePath}`);

    // Find all imports of this file
    const importingFiles = await this.findImportsOfFile(filePath);
    
    if (importingFiles.length > 0) {
      await this.log(`Found ${importingFiles.length} files importing ${fileName}:`);
      for (const imp of importingFiles) {
        await this.log(`  - ${imp.file}:${imp.line} -> ${imp.content}`);
      }
      
      // Comment out the imports
      await this.commentOutImports(importingFiles, fileName);
    }

    // Move file to backup
    const backupPath = path.join(this.backupDir, fileName);
    let backupCounter = 1;
    let finalBackupPath = backupPath;
    
    // Handle naming conflicts
    while (true) {
      try {
        await fs.access(finalBackupPath);
        finalBackupPath = path.join(this.backupDir, `${path.basename(fileName, path.extname(fileName))}_${backupCounter}${path.extname(fileName)}`);
        backupCounter++;
      } catch {
        break;
      }
    }

    try {
      await fs.rename(filePath, finalBackupPath);
      this.deletedFiles.push({
        original: filePath,
        backup: finalBackupPath,
        importingFiles: importingFiles.length
      });
      await this.log(`✓ Moved ${filePath} -> ${finalBackupPath}`);
      return true;
    } catch (error) {
      await this.log(`Failed to move ${filePath}: ${error.message}`, 'error');
      return false;
    }
  }

  async safelyRemoveDirectory(dirPath, exceptions = []) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await this.log(`Directory not found, skipping: ${dirPath}`, 'warning');
      return false;
    }

    await this.log(`Processing directory: ${dirPath}`);

    // First, find all files in the directory
    const allFiles = [];
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile()) {
          // Check if this file should be preserved
          const shouldPreserve = exceptions.some(exception => 
            fullPath.includes(exception) || entry.name === exception
          );
          
          if (!shouldPreserve) {
            allFiles.push(fullPath);
          } else {
            await this.log(`  Preserving: ${fullPath} (matches exception)`);
          }
        } else if (entry.isDirectory()) {
          // Recursively handle subdirectories
          await this.safelyRemoveDirectory(fullPath, exceptions);
        }
      }
    } catch (error) {
      await this.log(`Error reading directory ${dirPath}: ${error.message}`, 'error');
      return false;
    }

    // Remove each file safely
    for (const file of allFiles) {
      await this.safelyRemoveFile(file);
    }

    // Try to remove the directory if it's empty (except for preserved files)
    try {
      const remainingEntries = await fs.readdir(dirPath);
      const hasPreservedFiles = remainingEntries.length > 0;
      
      if (!hasPreservedFiles) {
        await fs.rmdir(dirPath);
        this.deletedDirs.push(dirPath);
        await this.log(`✓ Removed empty directory: ${dirPath}`);
      } else {
        await this.log(`Directory preserved (has remaining files): ${dirPath}`);
      }
    } catch (error) {
      await this.log(`Could not remove directory ${dirPath}: ${error.message}`, 'warning');
    }

    return true;
  }

  async execute() {
    try {
      await this.log('🧹 Starting safe multi-manuscript bloat removal...');
      
      // Step 1: Ensure backup directory exists
      await this.ensureBackupDir();
      
      // Step 2: Define targets for removal
      const targetDirectories = [
        {
          path: 'src/app/manuscripts',
          exceptions: ['editor/page.tsx'] // Preserve the editor page
        },
        {
          path: 'src/components/submissions',
          exceptions: [] // Remove everything - will rebuild later
        }
      ];

      const targetFiles = [
        'src/components/ManuscriptsList.tsx',
        'src/components/CreateManuscriptDialog.tsx', 
        'src/components/BatchImportDialog.tsx',
        'src/store/manuscriptStore.ts' // Will replace with new version
      ];

      // Step 3: Remove directories
      for (const target of targetDirectories) {
        await this.safelyRemoveDirectory(target.path, target.exceptions);
      }

      // Step 4: Remove specific files
      for (const file of targetFiles) {
        await this.safelyRemoveFile(file);
      }

      // Step 5: Generate summary report
      const report = {
        timestamp: new Date().toISOString(),
        deletedFiles: this.deletedFiles,
        deletedDirectories: this.deletedDirs,
        brokenImports: Object.fromEntries(this.brokenImports),
        backupLocation: this.backupDir,
        logFile: this.logFile,
        nextSteps: [
          'Run fix-imports.js to resolve broken imports',
          'Update routing with new minimal layout',
          'Test application functionality',
          'If issues, restore from backup'
        ]
      };

      await fs.writeFile('bloat-removal-report.json', JSON.stringify(report, null, 2));
      
      await this.log('📊 Bloat removal completed!');
      await this.log(`📄 Report: bloat-removal-report.json`);
      await this.log(`📁 Backups: ${this.backupDir}/`);
      await this.log(`📝 Log: ${this.logFile}`);
      
      if (this.brokenImports.size > 0) {
        await this.log(`⚠️  ${this.brokenImports.size} files have commented imports - run fix-imports.js next`);
      }
      
      return true;
      
    } catch (error) {
      await this.log(`💥 Critical failure: ${error.message}`, 'error');
      await this.log('🔄 Check backups and restore if needed');
      return false;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const removal = new BloatRemoval();
  removal.execute().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = BloatRemoval;