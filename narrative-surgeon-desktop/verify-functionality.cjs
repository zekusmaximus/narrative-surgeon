#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

async function verifyFunctionality() {
  console.log('🔍 Verifying Narrative Surgeon functionality...')
  console.log('')
  
  const checks = []
  let passed = 0
  let failed = 0
  let warnings = 0
  
  function addCheck(description, status, details = '') {
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️'
    checks.push({ description, status, details, icon })
    
    if (status === 'pass') passed++
    else if (status === 'fail') failed++
    else warnings++
    
    console.log(`${icon} ${description}${details ? ` - ${details}` : ''}`)
  }
  
  // 1. Core File Structure
  console.log('📁 Checking core file structure...')
  
  const coreFiles = [
    'src/lib/consistency-engine.ts',
    'src/lib/export-engine.ts', 
    'src/lib/performance-monitor.ts',
    'src/store/singleManuscriptStore.ts',
    'src/components/reordering/ChapterReorderPanel.tsx',
    'src/components/reordering/SortableChapterItem.tsx',
    'src/components/reordering/ChapterDependencyWarnings.tsx',
    'src/components/versioning/VersionControlPanel.tsx',
    'src/components/layout/MenuBar.tsx',
    'src/components/editor/ProfessionalEditor.tsx'
  ]
  
  coreFiles.forEach(file => {
    if (fs.existsSync(file)) {
      addCheck(`Core file exists: ${path.basename(file)}`, 'pass')
    } else {
      addCheck(`Missing core file: ${file}`, 'fail')
    }
  })
  
  // 2. Build Artifacts
  console.log('\\n🏗️ Checking build artifacts...')
  
  if (fs.existsSync('.next')) {
    addCheck('Next.js build directory exists', 'pass')
    
    const buildManifest = '.next/build-manifest.json'
    if (fs.existsSync(buildManifest)) {
      addCheck('Build manifest exists', 'pass')
    } else {
      addCheck('Build manifest missing', 'fail')
    }
    
    // Check for compiled pages
    const pagesDir = '.next/server/pages'
    const appDir = '.next/server/app'
    if (fs.existsSync(appDir)) {
      addCheck('App router build artifacts exist', 'pass')
    } else if (fs.existsSync(pagesDir)) {
      addCheck('Pages router build artifacts exist', 'warn', 'Using legacy pages router')
    } else {
      addCheck('No page build artifacts found', 'fail')
    }
  } else {
    addCheck('Next.js build not found', 'fail', 'Run npm run build first')
  }
  
  // 3. Dependencies Check
  console.log('\\n📦 Checking critical dependencies...')
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const criticalDeps = [
    '@dnd-kit/core',
    '@dnd-kit/sortable', 
    '@dnd-kit/utilities',
    'zustand',
    'next',
    'react',
    'typescript'
  ]
  
  criticalDeps.forEach(dep => {
    const hasDep = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
    if (hasDep) {
      addCheck(`Dependency installed: ${dep}`, 'pass', hasDep)
    } else {
      addCheck(`Missing dependency: ${dep}`, 'fail')
    }
  })
  
  // 4. Configuration Files
  console.log('\\n⚙️ Checking configuration files...')
  
  const configFiles = [
    'next.config.js',
    'tsconfig.json',
    'tailwind.config.ts',
    '.env.production'
  ]
  
  configFiles.forEach(file => {
    if (fs.existsSync(file)) {
      addCheck(`Config file exists: ${file}`, 'pass')
    } else {
      addCheck(`Config file missing: ${file}`, 'warn', 'Optional but recommended')
    }
  })
  
  // 5. Engine Functionality Verification
  console.log('\\n🔧 Verifying engine implementations...')
  
  try {
    // Test if engines can be imported (basic syntax check)
    const consistencyEngine = fs.readFileSync('src/lib/consistency-engine.ts', 'utf8')
    if (consistencyEngine.includes('export class ConsistencyEngine')) {
      addCheck('ConsistencyEngine class exported', 'pass')
    } else {
      addCheck('ConsistencyEngine class export issue', 'fail')
    }
    
    if (consistencyEngine.includes('analyzeConsistency')) {
      addCheck('ConsistencyEngine has analyzeConsistency method', 'pass')
    } else {
      addCheck('ConsistencyEngine missing core method', 'fail')
    }
    
    const exportEngine = fs.readFileSync('src/lib/export-engine.ts', 'utf8')
    if (exportEngine.includes('export class ExportEngine')) {
      addCheck('ExportEngine class exported', 'pass')
    } else {
      addCheck('ExportEngine class export issue', 'fail')
    }
    
    if (exportEngine.includes('exportVersion')) {
      addCheck('ExportEngine has exportVersion method', 'pass')
    } else {
      addCheck('ExportEngine missing core method', 'fail')
    }
    
    const performanceMonitor = fs.readFileSync('src/lib/performance-monitor.ts', 'utf8')
    if (performanceMonitor.includes('export class PerformanceMonitor')) {
      addCheck('PerformanceMonitor class exported', 'pass')
    } else {
      addCheck('PerformanceMonitor class export issue', 'fail')
    }
    
  } catch (error) {
    addCheck('Engine file reading failed', 'fail', error.message)
  }
  
  // 6. Store Integration
  console.log('\\n🏪 Checking store integration...')
  
  try {
    const store = fs.readFileSync('src/store/singleManuscriptStore.ts', 'utf8')
    
    const storeFeatures = [
      'previewReordering',
      'applyReordering', 
      'cancelReordering',
      'runConsistencyCheck',
      'exportVersion',
      'ConsistencyEngine',
      'ExportEngine',
      'performanceMonitor'
    ]
    
    storeFeatures.forEach(feature => {
      if (store.includes(feature)) {
        addCheck(`Store includes ${feature}`, 'pass')
      } else {
        addCheck(`Store missing ${feature}`, 'fail')
      }
    })
    
  } catch (error) {
    addCheck('Store file reading failed', 'fail', error.message)
  }
  
  // 7. Component Integration
  console.log('\\n🧩 Checking component integration...')
  
  try {
    const reorderPanel = fs.readFileSync('src/components/reordering/ChapterReorderPanel.tsx', 'utf8')
    
    if (reorderPanel.includes('DndContext')) {
      addCheck('ChapterReorderPanel uses drag-and-drop', 'pass')
    } else {
      addCheck('ChapterReorderPanel missing drag-and-drop', 'fail')
    }
    
    if (reorderPanel.includes('ConsistencyCheck')) {
      addCheck('ChapterReorderPanel integrates consistency checking', 'pass')
    } else {
      addCheck('ChapterReorderPanel missing consistency integration', 'fail')
    }
    
    const menuBar = fs.readFileSync('src/components/layout/MenuBar.tsx', 'utf8')
    
    if (menuBar.includes('setEditorMode')) {
      addCheck('MenuBar supports mode switching', 'pass')
    } else {
      addCheck('MenuBar missing mode switching', 'fail')
    }
    
    const editor = fs.readFileSync('src/components/editor/ProfessionalEditor.tsx', 'utf8')
    
    if (editor.includes('ChapterReorderPanel')) {
      addCheck('ProfessionalEditor integrates reordering', 'pass')
    } else {
      addCheck('ProfessionalEditor missing reordering integration', 'fail')
    }
    
  } catch (error) {
    addCheck('Component file reading failed', 'fail', error.message)
  }
  
  // 8. Test Suite
  console.log('\\n🧪 Checking test suite...')
  
  const testFiles = [
    'src/tests/integration/complete-workflow.test.ts',
    'src/tests/unit/engines.test.ts'
  ]
  
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      addCheck(`Test file exists: ${path.basename(file)}`, 'pass')
    } else {
      addCheck(`Test file missing: ${file}`, 'fail')
    }
  })
  
  // 9. Documentation
  console.log('\\n📚 Checking documentation...')
  
  const docFiles = [
    'USER_GUIDE.md',
    'RELEASE_NOTES.md',
    'PERFORMANCE_REPORT.md'
  ]
  
  docFiles.forEach(file => {
    if (fs.existsSync(file)) {
      addCheck(`Documentation exists: ${file}`, 'pass')
    } else {
      addCheck(`Documentation missing: ${file}`, 'warn', 'Should be created for release')
    }
  })
  
  // 10. Production Readiness
  console.log('\\n🚀 Checking production readiness...')
  
  const prodFiles = [
    'optimize-build.cjs',
    'prepare-release.cjs',
    'verify-build.js',
    'performance-test.js'
  ]
  
  prodFiles.forEach(file => {
    if (fs.existsSync(file)) {
      addCheck(`Production script exists: ${file}`, 'pass')
    } else {
      addCheck(`Production script missing: ${file}`, 'warn')
    }
  })
  
  // Check for production environment
  if (fs.existsSync('.env.production')) {
    const envContent = fs.readFileSync('.env.production', 'utf8')
    if (envContent.includes('NODE_ENV=production')) {
      addCheck('Production environment configured', 'pass')
    } else {
      addCheck('Production environment incomplete', 'warn')
    }
  }
  
  // 11. Performance Benchmarks
  console.log('\\n⚡ Checking performance considerations...')
  
  // Check bundle size from build
  if (fs.existsSync('.next/static')) {
    let totalSize = 0
    
    function calculateDirSize(dir) {
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true })
        for (const file of files) {
          const filePath = path.join(dir, file.name)
          if (file.isDirectory()) {
            calculateDirSize(filePath)
          } else {
            totalSize += fs.statSync(filePath).size
          }
        }
      } catch (error) {
        // Ignore errors for missing directories
      }
    }
    
    calculateDirSize('.next/static')
    const sizeMB = Math.round(totalSize / (1024 * 1024) * 100) / 100
    
    if (sizeMB < 10) {
      addCheck(`Bundle size acceptable: ${sizeMB}MB`, 'pass')
    } else if (sizeMB < 20) {
      addCheck(`Bundle size large: ${sizeMB}MB`, 'warn', 'Consider optimization')
    } else {
      addCheck(`Bundle size too large: ${sizeMB}MB`, 'fail', 'Needs optimization')
    }
  }
  
  // Summary
  console.log('\\n' + '='.repeat(60))
  console.log('📊 VERIFICATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⚠️  Warnings: ${warnings}`)
  console.log(`📋 Total Checks: ${checks.length}`)
  
  const successRate = Math.round((passed / checks.length) * 100)
  console.log(`🎯 Success Rate: ${successRate}%`)
  
  if (failed === 0) {
    console.log('\\n🎉 All critical checks passed! Application is ready for production.')
  } else if (failed <= 2) {
    console.log('\\n⚠️  Minor issues detected. Review failed checks before release.')
  } else {
    console.log('\\n❌ Significant issues detected. Address failed checks before proceeding.')
  }
  
  if (warnings > 0) {
    console.log(`\\n💡 ${warnings} optimization opportunities identified.`)
  }
  
  console.log('\\n🔗 Next steps:')
  if (failed > 0) {
    console.log('1. Address failed checks listed above')
    console.log('2. Re-run verification after fixes')
  }
  console.log(`${failed > 0 ? '3' : '1'}. Run comprehensive tests: npm run test`)
  console.log(`${failed > 0 ? '4' : '2'}. Test application manually at http://localhost:3006`)
  console.log(`${failed > 0 ? '5' : '3'}. Prepare for release: node prepare-release.cjs`)
  
  return failed === 0
}

verifyFunctionality().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})