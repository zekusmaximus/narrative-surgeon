const fs = require('fs').promises
const path = require('path')

async function fixImports() {
  console.log('🔧 Starting automated import cleanup...\n')
  
  // Files that likely need fixing based on typical Next.js structure
  const potentialFilesToFix = [
    'src/app/page.tsx',
    'src/app/layout.tsx', 
    'src/components/layout/MenuBar.tsx',
    'src/components/layout/MainLayout.tsx',
    'src/app/manuscripts/[id]/editor/page.tsx',
    'src/app/manuscripts/page.tsx',
    'src/lib/store.ts',
    'src/store/manuscript-store.ts'
  ]
  
  const deletedComponents = [
    'ManuscriptsList',
    'CreateManuscriptDialog',
    'BatchImportDialog', 
    'SubmissionTracker',
    'QueryLetterGenerator',
    'MarketResearch',
    'AgentDatabase',
    'PerformanceDashboard',
    'AgentResearch',
    'PerformanceAnalytics',
    'PublisherExports',
    'SubmissionDashboard'
  ]
  
  const deletedPaths = [
    '/manuscripts/page',
    '/submissions/',
    '/analysis/',
    '/import/',
    'manuscriptStore',
    'ManuscriptsList'
  ]
  
  const fixedFiles = []
  const errors = []
  
  for (const filePath of potentialFilesToFix) {
    try {
      // Check if file exists first
      await fs.access(filePath)
      
      let content = await fs.readFile(filePath, 'utf8')
      let modified = false
      const originalContent = content
      
      console.log(`\n🔍 Checking: ${filePath}`)
      
      // Remove import statements for deleted components
      deletedComponents.forEach(component => {
        // Match various import patterns
        const patterns = [
          new RegExp(`import\\s+\\{[^}]*\\b${component}\\b[^}]*\\}\\s+from\\s+['"][^'"]*['"]\\s*;?\\s*\\n?`, 'g'),
          new RegExp(`import\\s+${component}\\s+from\\s+['"][^'"]*['"]\\s*;?\\s*\\n?`, 'g'),
          new RegExp(`import\\s*\\{[^}]*\\}\\s+from\\s+['"][^'"]*${component}[^'"]*['"]\\s*;?\\s*\\n?`, 'g'),
          new RegExp(`^.*import.*${component}.*\\n`, 'gm')
        ]
        
        patterns.forEach(pattern => {
          const matches = content.match(pattern)
          if (matches) {
            console.log(`  📝 Removing import for: ${component}`)
            content = content.replace(pattern, '')
            modified = true
          }
        })
      })
      
      // Remove imports with deleted paths
      deletedPaths.forEach(deletedPath => {
        const pathPattern = new RegExp(`import\\s+.*from\\s+['"][^'"]*${deletedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^'"]*['"]\\s*;?\\s*\\n?`, 'g')
        const matches = content.match(pathPattern)
        if (matches) {
          console.log(`  📝 Removing import for path: ${deletedPath}`)
          content = content.replace(pathPattern, '')
          modified = true
        }
      })
      
      // Remove component usage (JSX tags)
      deletedComponents.forEach(component => {
        // Self-closing tags
        const selfClosingPattern = new RegExp(`<${component}[^>]*/>`, 'g')
        if (content.match(selfClosingPattern)) {
          console.log(`  🗑️  Removing JSX usage: <${component} />`)
          content = content.replace(selfClosingPattern, '')
          modified = true
        }
        
        // Opening and closing tags
        const tagPattern = new RegExp(`<${component}[^>]*>.*?</${component}>`, 'gs')
        if (content.match(tagPattern)) {
          console.log(`  🗑️  Removing JSX usage: <${component}>...</${component}>`)
          content = content.replace(tagPattern, '')
          modified = true
        }
        
        // Function calls
        const functionPattern = new RegExp(`\\b${component}\\s*\\([^)]*\\)`, 'g')
        if (content.match(functionPattern)) {
          console.log(`  🗑️  Removing function call: ${component}()`)
          content = content.replace(functionPattern, '')
          modified = true
        }
      })
      
      // Clean up empty lines and normalize spacing
      if (modified) {
        // Remove multiple consecutive empty lines
        content = content.replace(/\\n\\s*\\n\\s*\\n/g, '\\n\\n')
        // Remove trailing whitespace
        content = content.replace(/[ \\t]+$/gm, '')
        // Ensure file ends with single newline
        content = content.replace(/\\n*$/, '\\n')
        
        await fs.writeFile(filePath, content, 'utf8')
        fixedFiles.push({
          file: filePath,
          changes: originalContent !== content ? 'Modified' : 'No changes needed'
        })
        console.log(`  ✅ Fixed: ${filePath}`)
      } else {
        console.log(`  ✅ No changes needed: ${filePath}`)
      }
      
    } catch (error) {
      const errorMsg = `Could not fix ${filePath}: ${error.message}`
      console.log(`  ❌ ${errorMsg}`)
      errors.push({ file: filePath, error: error.message })
    }
  }
  
  // Generate fix report
  const report = {
    timestamp: new Date().toISOString(),
    fixedFiles: fixedFiles.filter(f => f.changes === 'Modified'),
    unchangedFiles: fixedFiles.filter(f => f.changes === 'No changes needed'),
    errors,
    summary: {
      totalFilesProcessed: potentialFilesToFix.length,
      filesFixed: fixedFiles.filter(f => f.changes === 'Modified').length,
      filesUnchanged: fixedFiles.filter(f => f.changes === 'No changes needed').length,
      errors: errors.length
    }
  }
  
  await fs.writeFile('./import-fixes-report.json', JSON.stringify(report, null, 2))
  
  console.log('\\n📊 CLEANUP SUMMARY')
  console.log('==================')
  console.log(`✅ Files processed: ${report.summary.totalFilesProcessed}`)
  console.log(`🔧 Files modified: ${report.summary.filesFixed}`)
  console.log(`➖ Files unchanged: ${report.summary.filesUnchanged}`)
  console.log(`❌ Errors: ${report.summary.errors}`)
  console.log('\\n📄 Detailed report saved to: import-fixes-report.json')
  
  return report
}

if (require.main === module) {
  fixImports().catch(console.error)
}

module.exports = { fixImports }