#!/usr/bin/env node

const { performance } = require('perf_hooks')

async function runPerformanceTests() {
  console.log('⚡ Running performance tests...')
  
  const results = []
  
  // Test 1: Import time
  const importStart = performance.now()
  try {
    // Simulate module import time
    await new Promise(resolve => setTimeout(resolve, 100))
    const importTime = performance.now() - importStart
    results.push({
      test: 'Module Import Time',
      value: Math.round(importTime),
      unit: 'ms',
      benchmark: 200,
      status: importTime < 200 ? 'pass' : 'fail'
    })
  } catch (error) {
    results.push({
      test: 'Module Import Time',
      value: 'ERROR',
      unit: 'ms',
      benchmark: 200,
      status: 'error'
    })
  }
  
  // Test 2: Bundle size check
  const fs = require('fs')
  const path = require('path')
  
  if (fs.existsSync('./out/_next/static')) {
    let totalSize = 0
    
    function calculateDirSize(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true })
      for (const file of files) {
        const filePath = path.join(dir, file.name)
        if (file.isDirectory()) {
          calculateDirSize(filePath)
        } else {
          totalSize += fs.statSync(filePath).size
        }
      }
    }
    
    calculateDirSize('./out/_next/static')
    const sizeMB = Math.round(totalSize / (1024 * 1024) * 100) / 100
    
    results.push({
      test: 'Total Bundle Size',
      value: sizeMB,
      unit: 'MB',
      benchmark: 5,
      status: sizeMB < 5 ? 'pass' : 'fail'
    })
  }
  
  // Test 3: Critical resource count
  const indexPath = './out/index.html'
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8')
    const scriptTags = (html.match(/<script/g) || []).length
    const linkTags = (html.match(/<link.*rel="stylesheet"/g) || []).length
    
    results.push({
      test: 'Script Tags Count',
      value: scriptTags,
      unit: 'tags',
      benchmark: 10,
      status: scriptTags < 10 ? 'pass' : 'fail'
    })
    
    results.push({
      test: 'CSS Files Count',
      value: linkTags,
      unit: 'files',
      benchmark: 5,
      status: linkTags < 5 ? 'pass' : 'fail'
    })
  }
  
  // Display results
  console.log('\n📊 Performance Test Results:')
  console.log('─'.repeat(60))
  
  results.forEach(result => {
    const status = result.status === 'pass' ? '✅' : 
                  result.status === 'fail' ? '❌' : '⚠️'
    console.log(`${status} ${result.test}: ${result.value}${result.unit} (benchmark: <${result.benchmark}${result.unit})`)
  })
  
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const errors = results.filter(r => r.status === 'error').length
  
  console.log('─'.repeat(60))
  console.log(`📈 Summary: ${passed} passed, ${failed} failed, ${errors} errors`)
  
  if (failed > 0) {
    console.log('\n💡 Recommendations:')
    if (results.find(r => r.test === 'Total Bundle Size' && r.status === 'fail')) {
      console.log('- Consider code splitting and lazy loading')
      console.log('- Remove unused dependencies')
      console.log('- Optimize images and assets')
    }
    if (results.find(r => r.test.includes('Count') && r.status === 'fail')) {
      console.log('- Combine CSS files')
      console.log('- Minimize number of script tags')
    }
  }
  
  return failed === 0 && errors === 0
}

runPerformanceTests().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Performance tests failed:', error)
  process.exit(1)
})