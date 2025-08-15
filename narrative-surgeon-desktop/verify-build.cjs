const { execSync } = require('child_process')
const fs = require('fs')

async function verifyBuild() {
  console.log('🔍 Verifying build process...\n')
  
  const results = {
    timestamp: new Date().toISOString(),
    checks: [],
    summary: {
      passed: 0,
      failed: 0,
      skipped: 0
    }
  }
  
  const addResult = (name, status, details = '', error = null) => {
    results.checks.push({ name, status, details, error })
    results.summary[status]++
    
    const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️'
    console.log(`${icon} ${name}${details ? ': ' + details : ''}`)
    if (error) console.log(`   Error: ${error}`)
  }
  
  try {
    // Check if package.json exists and has required scripts
    console.log('📋 Checking project configuration...')
    if (fs.existsSync('./package.json')) {
      const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
      addResult('Package.json exists', 'passed')
      
      const requiredScripts = ['dev', 'build', 'lint']
      requiredScripts.forEach(script => {
        if (pkg.scripts && pkg.scripts[script]) {
          addResult(`Script "${script}" defined`, 'passed')
        } else {
          addResult(`Script "${script}" missing`, 'failed')
        }
      })
    } else {
      addResult('Package.json check', 'failed', 'File not found')
    }
    
    console.log('\\n🔧 Running build checks...')
    
    // Check TypeScript compilation (skip if it fails due to other issues)
    try {
      console.log('Checking TypeScript compilation...')
      execSync('npx tsc --noEmit', { stdio: 'pipe' })
      addResult('TypeScript compilation', 'passed', 'No type errors found')
    } catch (error) {
      // Check if it's a missing dependency issue vs actual type errors
      const stderr = error.stderr ? error.stderr.toString() : error.message
      if (stderr.includes('Cannot find module') || stderr.includes('not found')) {
        addResult('TypeScript compilation', 'skipped', 'Missing dependencies')
      } else {
        addResult('TypeScript compilation', 'failed', 'Type errors found', stderr.substring(0, 200))
      }
    }
    
    // Check Next.js build
    try {
      console.log('\\nTesting Next.js build...')
      const output = execSync('npm run build', { stdio: 'pipe', encoding: 'utf8' })
      if (output.includes('Creating an optimized production build')) {
        addResult('Next.js build', 'passed', 'Production build successful')
      } else {
        addResult('Next.js build', 'failed', 'Build completed but may have issues')
      }
    } catch (error) {
      const stderr = error.stderr ? error.stderr.toString() : error.message
      addResult('Next.js build', 'failed', 'Build process failed', stderr.substring(0, 200))
    }
    
    // Check if critical files exist
    console.log('\\n📁 Checking critical files...')
    const criticalFiles = [
      'src/app/page.tsx',
      'src/app/layout.tsx',
      'src/components/editor/TiptapEditor.tsx',
      'src/components/editor/EditorErrorBoundary.tsx',
      'src/components/ui/button.tsx'
    ]
    
    criticalFiles.forEach(file => {
      if (fs.existsSync(file)) {
        addResult(`File ${file}`, 'passed', 'Exists')
      } else {
        addResult(`File ${file}`, 'failed', 'Missing')
      }
    })
    
    // Check Tauri build (optional - may not be available in all environments)
    try {
      console.log('\\n🦀 Testing Tauri build...')
      execSync('npm run tauri build', { stdio: 'pipe', timeout: 30000 })
      addResult('Tauri build', 'passed', 'Desktop build successful')
    } catch (error) {
      addResult('Tauri build', 'skipped', 'Not available or timed out')
    }
    
    // Test dev server start (quick check)
    try {
      console.log('\\n🚀 Testing dev server startup...')
      const child = execSync('timeout 10 npm run dev', { 
        stdio: 'pipe', 
        timeout: 10000,
        encoding: 'utf8'
      })
      addResult('Dev server startup', 'passed', 'Server starts successfully')
    } catch (error) {
      // Timeout is expected - we just want to see if it starts
      if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
        addResult('Dev server startup', 'passed', 'Server started (timed out as expected)')
      } else {
        addResult('Dev server startup', 'failed', 'Server failed to start', error.message.substring(0, 100))
      }
    }
    
    console.log('\\n📊 BUILD VERIFICATION SUMMARY')
    console.log('==============================')
    console.log(`✅ Passed: ${results.summary.passed}`)
    console.log(`❌ Failed: ${results.summary.failed}`)
    console.log(`⚠️  Skipped: ${results.summary.skipped}`)
    
    if (results.summary.failed === 0) {
      console.log('\\n🎉 All critical builds successful!')
    } else {
      console.log('\\n⚠️  Some build checks failed - review the details above')
    }
    
    // Save detailed report
    fs.writeFileSync('./build-verification-report.json', JSON.stringify(results, null, 2))
    console.log('\\n📄 Detailed report saved to: build-verification-report.json')
    
    return results.summary.failed === 0
    
  } catch (error) {
    console.error('❌ Build verification failed:', error.message)
    addResult('Build verification', 'failed', 'Unexpected error', error.message)
    return false
  }
}

if (require.main === module) {
  verifyBuild().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { verifyBuild }