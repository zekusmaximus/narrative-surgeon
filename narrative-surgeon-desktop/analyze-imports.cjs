const fs = require('fs').promises
const path = require('path')

async function findBrokenImports() {
  const srcDir = './src'
  const brokenImports = []
  const fileUsages = []
  
  // List of components that were deleted (expanded from known deletions)
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
  
  // Store patterns for various import styles
  const importPatterns = [
    /import\s+\{[^}]*{component}[^}]*\}\s+from\s+['"][^'"]*['"]/, // Named imports
    /import\s+{component}\s+from\s+['"][^'"]*['"]/, // Single named import
    /import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]*{component}[^'"]*['"]/, // Namespace imports
    /from\s+['"][^'"]*{component}[^'"]*['"]/, // Dynamic imports
  ]

  async function scanDirectory(dir) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true })
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name)
        
        if (file.isDirectory() && !file.name.includes('node_modules') && !file.name.includes('.git')) {
          await scanDirectory(fullPath)
        } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
          try {
            const content = await fs.readFile(fullPath, 'utf8')
            const lines = content.split('\n')
            
            // Check for imports of deleted components
            deletedComponents.forEach(component => {
              lines.forEach((line, index) => {
                if (line.includes(component)) {
                  // Check if it's an import statement
                  if (line.trim().startsWith('import') || line.includes('from')) {
                    brokenImports.push({
                      file: fullPath.replace(/\\/g, '/'),
                      component,
                      line: index + 1,
                      content: line.trim(),
                      type: 'import'
                    })
                  }
                  // Check if it's component usage
                  else if (line.includes(`<${component}`) || line.includes(`${component}(`)) {
                    fileUsages.push({
                      file: fullPath.replace(/\\/g, '/'),
                      component,
                      line: index + 1,
                      content: line.trim(),
                      type: 'usage'
                    })
                  }
                }
              })
            })
            
            // Also check for references to deleted paths
            const deletedPaths = [
              'manuscripts/page',
              'submissions/',
              'analysis/',
              'import/'
            ]
            
            deletedPaths.forEach(deletedPath => {
              if (content.includes(deletedPath)) {
                const lineIndex = lines.findIndex(line => line.includes(deletedPath))
                if (lineIndex !== -1) {
                  brokenImports.push({
                    file: fullPath.replace(/\\/g, '/'),
                    component: deletedPath,
                    line: lineIndex + 1,
                    content: lines[lineIndex].trim(),
                    type: 'path'
                  })
                }
              }
            })
          } catch (error) {
            console.warn(`Could not read file ${fullPath}:`, error.message)
          }
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dir}:`, error.message)
    }
  }
  
  await scanDirectory(srcDir)
  
  return { brokenImports, fileUsages }
}

async function main() {
  console.log('🔍 Analyzing imports for broken references...\n')
  
  try {
    const { brokenImports, fileUsages } = await findBrokenImports()
    
    console.log('📋 ANALYSIS RESULTS')
    console.log('===================\n')
    
    if (brokenImports.length > 0) {
      console.log(`❌ Found ${brokenImports.length} broken imports:\n`)
      brokenImports.forEach((item, index) => {
        console.log(`${index + 1}. ${item.file}:${item.line}`)
        console.log(`   Component: ${item.component}`)
        console.log(`   Type: ${item.type}`)
        console.log(`   Code: ${item.content}`)
        console.log('')
      })
    } else {
      console.log('✅ No broken imports found!')
    }
    
    if (fileUsages.length > 0) {
      console.log(`⚠️  Found ${fileUsages.length} component usages:\n`)
      fileUsages.forEach((item, index) => {
        console.log(`${index + 1}. ${item.file}:${item.line}`)
        console.log(`   Component: ${item.component}`)
        console.log(`   Code: ${item.content}`)
        console.log('')
      })
    } else {
      console.log('✅ No component usages found!')
    }
    
    // Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      brokenImports,
      fileUsages,
      summary: {
        brokenImportsCount: brokenImports.length,
        fileUsagesCount: fileUsages.length,
        affectedFiles: [...new Set([...brokenImports.map(i => i.file), ...fileUsages.map(u => u.file)])]
      }
    }
    
    await fs.writeFile('./import-analysis-report.json', JSON.stringify(report, null, 2))
    console.log('📄 Detailed report saved to: import-analysis-report.json')
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { findBrokenImports }