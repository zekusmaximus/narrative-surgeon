#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

async function verifyBuild() {
  console.log('🔍 Verifying production build...')
  
  const checks = []
  
  // Check if build directory exists
  if (fs.existsSync('./out')) {
    checks.push('✅ Build directory exists')
  } else {
    checks.push('❌ Build directory missing')
    return false
  }
  
  // Check for essential files
  const essentialFiles = [
    './out/index.html',
    './out/_next/static',
    './out/manuscripts',
    './out/settings'
  ]
  
  essentialFiles.forEach(file => {
    if (fs.existsSync(file)) {
      checks.push(`✅ Essential file/directory exists: ${file}`)
    } else {
      checks.push(`❌ Missing essential file/directory: ${file}`)
    }
  })
  
  // Check bundle sizes
  const staticDir = './out/_next/static'
  if (fs.existsSync(staticDir)) {
    const chunks = fs.readdirSync(path.join(staticDir, 'chunks'))
    const mainChunk = chunks.find(chunk => chunk.startsWith('main'))
    
    if (mainChunk) {
      const mainChunkPath = path.join(staticDir, 'chunks', mainChunk)
      const stats = fs.statSync(mainChunkPath)
      const sizeKB = Math.round(stats.size / 1024)
      
      if (sizeKB < 500) {
        checks.push(`✅ Main chunk size acceptable: ${sizeKB}KB`)
      } else {
        checks.push(`⚠️  Main chunk size large: ${sizeKB}KB`)
      }
    }
  }
  
  // Check for source maps in production
  const hasSourceMaps = fs.existsSync('./out/_next/static/chunks') && 
    fs.readdirSync('./out/_next/static/chunks').some(file => file.endsWith('.map'))
  
  if (!hasSourceMaps) {
    checks.push('✅ No source maps in production build')
  } else {
    checks.push('⚠️  Source maps present in production build')
  }
  
  console.log('\nBuild Verification Results:')
  checks.forEach(check => console.log(check))
  
  const passed = checks.filter(check => check.startsWith('✅')).length
  const failed = checks.filter(check => check.startsWith('❌')).length
  const warnings = checks.filter(check => check.startsWith('⚠️')).length
  
  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`)
  
  return failed === 0
}

verifyBuild().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Build verification failed:', error)
  process.exit(1)
})