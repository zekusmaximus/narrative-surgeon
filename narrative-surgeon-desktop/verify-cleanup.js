#!/usr/bin/env node

/**
 * NARRATIVE SURGEON - CLEANUP VERIFICATION SYSTEM
 * Verifies system integrity after dependency cleanup
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class CleanupVerification {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      criticalFiles: { status: 'unknown', details: [] },
      typeScript: { status: 'unknown', details: [] },
      tauriIntegration: { status: 'unknown', details: [] },
      imports: { status: 'unknown', details: [] },
      dependencies: { status: 'unknown', details: [] },
      overall: { status: 'unknown', score: 0 }
    };
    this.logFile = `verification-${Date.now()}.log`;
  }

  async log(message, category = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${category.toUpperCase()}] ${message}`;
    console.log(logEntry);
    await fs.appendFile(this.logFile, logEntry + '\n').catch(() => {});
  }

  async checkCriticalFiles() {
    await this.log('Checking critical files existence...', 'test');
    
    const criticalFiles = [
      'package.json',
      'next.config.js', 
      'tailwind.config.js',
      'tsconfig.json',
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/components/editor/TiptapEditor.tsx',
      'src/store/manuscriptStore.ts',
      'src/lib/tauri.ts',
      'src/types/index.ts',
      'src-tauri/Cargo.toml',
      'src-tauri/src/lib.rs',
      'src-tauri/src/main.rs'
    ];

    let foundFiles = 0;
    const details = [];

    for (const file of criticalFiles) {
      try {
        await fs.access(file);
        foundFiles++;
        details.push({ file, status: 'found' });
        await this.log(`  ✓ ${file}`, 'check');
      } catch (error) {
        details.push({ file, status: 'missing', error: error.message });
        await this.log(`  ✗ ${file} - MISSING`, 'error');
      }
    }

    const percentage = (foundFiles / criticalFiles.length) * 100;
    this.results.criticalFiles = {
      status: percentage === 100 ? 'pass' : percentage >= 80 ? 'warning' : 'fail',
      score: percentage,
      found: foundFiles,
      total: criticalFiles.length,
      details
    };

    await this.log(`Critical files: ${foundFiles}/${criticalFiles.length} (${percentage.toFixed(1)}%)`, 
                   percentage === 100 ? 'success' : 'warning');
  }

  async checkTypeScriptCompilation() {
    await this.log('Testing TypeScript compilation...', 'test');
    
    try {
      // First try basic compilation
      const output = execSync('npx tsc --noEmit --skipLibCheck', { 
        encoding: 'utf8',
        timeout: 120000,
        stdio: 'pipe'
      });
      
      this.results.typeScript = {
        status: 'pass',
        output: 'Compilation successful',
        details: ['TypeScript compilation completed without errors']
      };
      
      await this.log('✓ TypeScript compilation successful', 'success');
      
    } catch (error) {
      // Try to extract useful error information
      const errorOutput = error.stdout || error.stderr || error.message;
      const errors = this.parseTypeScriptErrors(errorOutput);
      
      this.results.typeScript = {
        status: errors.length > 10 ? 'fail' : 'warning',
        errorCount: errors.length,
        output: errorOutput,
        details: errors.slice(0, 10) // Top 10 errors
      };
      
      await this.log(`✗ TypeScript compilation failed: ${errors.length} errors`, 'error');
      errors.slice(0, 5).forEach(err => {
        this.log(`    ${err}`, 'error');
      });
    }
  }

  parseTypeScriptErrors(output) {
    const lines = output.split('\n');
    const errors = [];
    
    for (const line of lines) {
      // Match TypeScript error format: file(line,col): error TS####: message
      if (line.match(/\(\d+,\d+\):\s*(error|warning)\s*TS\d+:/)) {
        errors.push(line.trim());
      }
    }
    
    return errors;
  }

  async checkTauriIntegration() {
    await this.log('Checking Tauri integration...', 'test');
    
    const details = [];
    let score = 0;
    const totalChecks = 4;
    
    // Check 1: Tauri dependencies
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      const hasTauriApi = packageJson.dependencies && packageJson.dependencies['@tauri-apps/api'];
      const hasTauriCli = packageJson.devDependencies && packageJson.devDependencies['@tauri-apps/cli'];
      
      if (hasTauriApi) {
        details.push('✓ @tauri-apps/api dependency present');
        score++;
      } else {
        details.push('✗ @tauri-apps/api dependency missing');
      }
      
      if (hasTauriCli) {
        details.push('✓ @tauri-apps/cli dev dependency present');
        score++;
      } else {
        details.push('✗ @tauri-apps/cli dev dependency missing');
      }
    } catch (error) {
      details.push(`✗ Failed to check Tauri dependencies: ${error.message}`);
    }
    
    // Check 2: Tauri config file
    try {
      await fs.access('src-tauri/tauri.conf.json');
      details.push('✓ Tauri configuration file exists');
      score++;
    } catch (error) {
      details.push('✗ Tauri configuration file missing');
    }
    
    // Check 3: Rust files
    try {
      await fs.access('src-tauri/src/lib.rs');
      await fs.access('src-tauri/src/main.rs');
      details.push('✓ Core Rust files present');
      score++;
    } catch (error) {
      details.push('✗ Core Rust files missing');
    }
    
    const percentage = (score / totalChecks) * 100;
    this.results.tauriIntegration = {
      status: percentage === 100 ? 'pass' : percentage >= 75 ? 'warning' : 'fail',
      score: percentage,
      details
    };
    
    await this.log(`Tauri integration: ${score}/${totalChecks} checks passed`, 
                   percentage === 100 ? 'success' : 'warning');
  }

  async checkImports() {
    await this.log('Analyzing import statements...', 'test');
    
    const sourceFiles = await this.findTypeScriptFiles('src');
    const brokenImports = [];
    const suspiciousImports = [];
    let totalImports = 0;
    
    // Common patterns for dependencies we removed
    const removedDependencies = [
      '@dnd-kit',
      'react-dnd',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      '@playwright/test',
      '@testing-library/user-event'
    ];
    
    for (const filePath of sourceFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const imports = this.extractImports(content);
        totalImports += imports.length;
        
        for (const importLine of imports) {
          // Check for removed dependencies
          for (const removedDep of removedDependencies) {
            if (importLine.includes(removedDep)) {
              brokenImports.push({ file: filePath, import: importLine, reason: `Removed dependency: ${removedDep}` });
            }
          }
          
          // Check for suspicious patterns
          if (importLine.includes('submissions/') || importLine.includes('BatchImport') || importLine.includes('ManuscriptsList')) {
            suspiciousImports.push({ file: filePath, import: importLine, reason: 'References removed component' });
          }
        }
        
      } catch (error) {
        await this.log(`Failed to analyze ${filePath}: ${error.message}`, 'warning');
      }
    }
    
    const status = brokenImports.length === 0 ? 'pass' : brokenImports.length < 5 ? 'warning' : 'fail';
    
    this.results.imports = {
      status,
      totalImports,
      brokenImports: brokenImports.length,
      suspiciousImports: suspiciousImports.length,
      details: {
        broken: brokenImports.slice(0, 10),
        suspicious: suspiciousImports.slice(0, 10)
      }
    };
    
    await this.log(`Import analysis: ${brokenImports.length} broken, ${suspiciousImports.length} suspicious out of ${totalImports} total`, 
                   status === 'pass' ? 'success' : 'warning');
  }

  async findTypeScriptFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...await this.findTypeScriptFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      await this.log(`Failed to scan directory ${dir}: ${error.message}`, 'warning');
    }
    
    return files;
  }

  extractImports(content) {
    const lines = content.split('\n');
    const imports = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') && !trimmed.startsWith('//')) {
        imports.push(trimmed);
      }
    }
    
    return imports;
  }

  async checkDependencies() {
    await this.log('Verifying dependency integrity...', 'test');
    
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      
      // Check essential dependencies are present
      const essential = [
        '@tiptap/react',
        '@tiptap/core',
        '@tauri-apps/api',
        'next',
        'react',
        'zustand'
      ];
      
      const missing = essential.filter(dep => 
        !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
      );
      
      // Check for leftover dependencies that should have been removed
      const shouldBeRemoved = [
        '@dnd-kit/core',
        'react-dnd',
        'class-variance-authority',
        '@playwright/test'
      ];
      
      const leftover = shouldBeRemoved.filter(dep => 
        packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
      );
      
      const status = missing.length === 0 && leftover.length === 0 ? 'pass' : 'warning';
      
      this.results.dependencies = {
        status,
        missing,
        leftover,
        totalDependencies: Object.keys(packageJson.dependencies || {}).length,
        totalDevDependencies: Object.keys(packageJson.devDependencies || {}).length
      };
      
      await this.log(`Dependencies: ${missing.length} missing essential, ${leftover.length} should be removed`, 
                     status === 'pass' ? 'success' : 'warning');
      
    } catch (error) {
      this.results.dependencies = {
        status: 'fail',
        error: error.message
      };
      await this.log(`Failed to verify dependencies: ${error.message}`, 'error');
    }
  }

  calculateOverallScore() {
    const weights = {
      criticalFiles: 30,
      typeScript: 25,
      tauriIntegration: 20,
      imports: 15,
      dependencies: 10
    };
    
    let totalScore = 0;
    let maxScore = 0;
    
    for (const [category, weight] of Object.entries(weights)) {
      const result = this.results[category];
      maxScore += weight;
      
      if (result.status === 'pass') {
        totalScore += weight;
      } else if (result.status === 'warning') {
        totalScore += weight * 0.7; // 70% credit for warnings
      }
      // Fail gets 0 points
    }
    
    const percentage = (totalScore / maxScore) * 100;
    let overallStatus;
    
    if (percentage >= 90) {
      overallStatus = 'excellent';
    } else if (percentage >= 75) {
      overallStatus = 'good';
    } else if (percentage >= 60) {
      overallStatus = 'acceptable';
    } else {
      overallStatus = 'needs-work';
    }
    
    this.results.overall = {
      status: overallStatus,
      score: percentage,
      recommendation: this.getRecommendation(overallStatus)
    };
  }

  getRecommendation(status) {
    switch (status) {
      case 'excellent':
        return 'System is ready for Phase 2 development. All critical components verified.';
      case 'good':
        return 'System is functional with minor issues. Safe to continue development.';
      case 'acceptable':
        return 'System has some issues but core functionality intact. Review warnings before continuing.';
      case 'needs-work':
        return 'Significant issues detected. Address critical problems before continuing.';
      default:
        return 'Unable to determine system status.';
    }
  }

  async generateReport() {
    const report = {
      verification: this.results,
      summary: {
        timestamp: this.results.timestamp,
        overallStatus: this.results.overall.status,
        score: this.results.overall.score,
        recommendation: this.results.overall.recommendation,
        criticalIssues: this.getCriticalIssues(),
        nextSteps: this.getNextSteps()
      }
    };
    
    await fs.writeFile('verification-report.json', JSON.stringify(report, null, 2));
    await this.log('✓ Verification report saved to verification-report.json', 'success');
    
    return report;
  }

  getCriticalIssues() {
    const issues = [];
    
    if (this.results.criticalFiles.status === 'fail') {
      issues.push('Critical files missing - system may not function');
    }
    
    if (this.results.typeScript.status === 'fail') {
      issues.push('TypeScript compilation failing - development will be difficult');
    }
    
    if (this.results.tauriIntegration.status === 'fail') {
      issues.push('Tauri integration broken - desktop app will not work');
    }
    
    return issues;
  }

  getNextSteps() {
    const steps = [];
    
    if (this.results.imports.brokenImports > 0) {
      steps.push('Fix broken imports from removed dependencies');
    }
    
    if (this.results.dependencies.leftover && this.results.dependencies.leftover.length > 0) {
      steps.push('Remove leftover dependencies that should have been cleaned up');
    }
    
    if (this.results.typeScript.status !== 'pass') {
      steps.push('Address TypeScript compilation errors');
    }
    
    if (steps.length === 0) {
      steps.push('System verification passed - ready for Phase 2 development');
    }
    
    return steps;
  }

  async execute() {
    try {
      await this.log('🔍 Starting cleanup verification...', 'info');
      
      await this.checkCriticalFiles();
      await this.checkTypeScriptCompilation();  
      await this.checkTauriIntegration();
      await this.checkImports();
      await this.checkDependencies();
      
      this.calculateOverallScore();
      
      const report = await this.generateReport();
      
      await this.log('📊 Verification completed', 'info');
      await this.log(`Overall score: ${this.results.overall.score.toFixed(1)}% (${this.results.overall.status})`, 
                     this.results.overall.status === 'excellent' || this.results.overall.status === 'good' ? 'success' : 'warning');
      await this.log(`Recommendation: ${this.results.overall.recommendation}`, 'info');
      
      const criticalIssues = this.getCriticalIssues();
      if (criticalIssues.length > 0) {
        await this.log('🚨 Critical issues found:', 'error');
        criticalIssues.forEach(issue => this.log(`  - ${issue}`, 'error'));
      }
      
      await this.log(`📄 Full report: verification-report.json`, 'info');
      await this.log(`📄 Detailed log: ${this.logFile}`, 'info');
      
      return this.results.overall.status === 'excellent' || this.results.overall.status === 'good';
      
    } catch (error) {
      await this.log(`💥 Verification failed: ${error.message}`, 'error');
      return false;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const verification = new CleanupVerification();
  verification.execute().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = CleanupVerification;