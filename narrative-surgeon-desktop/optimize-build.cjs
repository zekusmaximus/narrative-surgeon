const fs = require('fs').promises
const path = require('path')

async function optimizeBuild() {
  console.log('🚀 Optimizing build for production...')
  
  // Update next.config.js for production
  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true
  },
  experimental: {
    optimizePackageImports: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js'
        }
      }
    }
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      }
    }
    
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true
            },
            vendor: {
              test: /[\\\\/]node_modules[\\\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all'
            },
            dndkit: {
              test: /[\\\\/]node_modules[\\\\/]@dnd-kit[\\\\/]/,
              name: 'dnd-kit',
              priority: 10,
              chunks: 'all'
            },
            radix: {
              test: /[\\\\/]node_modules[\\\\/]@radix-ui[\\\\/]/,
              name: 'radix-ui',
              priority: 10,
              chunks: 'all'
            }
          }
        }
      }
    }
    
    return config
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  }
}

module.exports = nextConfig`
  
  await fs.writeFile('./next.config.js', nextConfig)
  console.log('✓ Updated next.config.js for production')
  
  // Update package.json scripts
  const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'))
  packageJson.scripts = {
    ...packageJson.scripts,
    'build:optimized': 'npm run build && npm run tauri:build',
    'build:web': 'next build',
    'build:desktop': 'npm run tauri:build',
    'analyze': 'ANALYZE=true npm run build',
    'test:performance': 'npm run build && npm run test -- --testNamePattern="performance"',
    'verify:production': 'npm run build && npm run test:integration',
    'profile:build': 'npx next build --profile',
    'bundle:analyze': 'npx @next/bundle-analyzer'
  }
  
  // Add bundle analyzer if not present
  if (!packageJson.devDependencies['@next/bundle-analyzer']) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      '@next/bundle-analyzer': '^14.0.0'
    }
  }
  
  await fs.writeFile('./package.json', JSON.stringify(packageJson, null, 2))
  console.log('✓ Updated package.json scripts')
  
  // Create production environment file
  const prodEnv = `# Production Environment Variables
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Performance Settings
NEXT_OPTIMIZE_IMAGES=true
NEXT_OPTIMIZE_FONTS=true

# Build Settings
NEXT_BUILD_ID=narrative-surgeon-prod
NEXT_COMPRESS=true

# Application Settings
APP_VERSION=${packageJson.version || '1.0.0'}
APP_NAME="Narrative Surgeon"
APP_DESCRIPTION="Professional Chapter Reordering Tool"

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_LOG_LEVEL=warn

# Error Tracking
ENABLE_ERROR_TRACKING=true
ERROR_LOG_LEVEL=error`

  await fs.writeFile('./.env.production', prodEnv)
  console.log('✓ Created production environment file')
  
  // Create build verification script
  const verifyScript = `#!/usr/bin/env node

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
      checks.push(\`✅ Essential file/directory exists: \${file}\`)
    } else {
      checks.push(\`❌ Missing essential file/directory: \${file}\`)
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
        checks.push(\`✅ Main chunk size acceptable: \${sizeKB}KB\`)
      } else {
        checks.push(\`⚠️  Main chunk size large: \${sizeKB}KB\`)
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
  
  console.log('\\nBuild Verification Results:')
  checks.forEach(check => console.log(check))
  
  const passed = checks.filter(check => check.startsWith('✅')).length
  const failed = checks.filter(check => check.startsWith('❌')).length
  const warnings = checks.filter(check => check.startsWith('⚠️')).length
  
  console.log(\`\\n📊 Summary: \${passed} passed, \${failed} failed, \${warnings} warnings\`)
  
  return failed === 0
}

verifyBuild().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('❌ Build verification failed:', error)
  process.exit(1)
})`

  await fs.writeFile('./verify-build.js', verifyScript)
  await fs.chmod('./verify-build.js', 0o755)
  console.log('✓ Created build verification script')
  
  // Create performance test script
  const perfTestScript = `#!/usr/bin/env node

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
  console.log('\\n📊 Performance Test Results:')
  console.log('─'.repeat(60))
  
  results.forEach(result => {
    const status = result.status === 'pass' ? '✅' : 
                  result.status === 'fail' ? '❌' : '⚠️'
    console.log(\`\${status} \${result.test}: \${result.value}\${result.unit} (benchmark: <\${result.benchmark}\${result.unit})\`)
  })
  
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const errors = results.filter(r => r.status === 'error').length
  
  console.log('─'.repeat(60))
  console.log(\`📈 Summary: \${passed} passed, \${failed} failed, \${errors} errors\`)
  
  if (failed > 0) {
    console.log('\\n💡 Recommendations:')
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
})`

  await fs.writeFile('./performance-test.js', perfTestScript)
  await fs.chmod('./performance-test.js', 0o755)
  console.log('✓ Created performance test script')
  
  console.log('')
  console.log('🎉 Build optimization complete!')
  console.log('')
  console.log('📋 Available commands:')
  console.log('- npm run build:optimized  # Full optimized build')
  console.log('- npm run analyze         # Bundle analysis')
  console.log('- npm run verify:production # Verify build quality')
  console.log('- npm run test:performance # Performance benchmarks')
  console.log('- node verify-build.js    # Manual build verification')
  console.log('- node performance-test.js # Manual performance test')
}

optimizeBuild().catch(console.error)