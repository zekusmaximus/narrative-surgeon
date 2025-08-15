const fs = require('fs').promises
const path = require('path')

async function migrateToSingleManuscript() {
  console.log('🔄 Migrating to single manuscript architecture...\n')
  
  const results = {
    timestamp: new Date().toISOString(),
    backups: [],
    updates: [],
    errors: [],
    summary: {
      filesBackedUp: 0,
      filesUpdated: 0,
      errors: 0
    }
  }
  
  try {
    // Check if old store exists
    const oldStorePath = './src/store/manuscriptStore.ts'
    const newStorePath = './src/store/singleManuscriptStore.ts'
    
    const oldStoreExists = await fs.access(oldStorePath).then(() => true).catch(() => false)
    
    if (oldStoreExists) {
      // Backup old store
      const backupPath = `${oldStorePath}.backup`
      await fs.copyFile(oldStorePath, backupPath)
      results.backups.push({ original: oldStorePath, backup: backupPath })
      results.summary.filesBackedUp++
      console.log('✓ Backed up old manuscript store')
      
      // Check if old store has content we need to preserve
      try {
        const oldStoreContent = await fs.readFile(oldStorePath, 'utf8')
        if (oldStoreContent.includes('manuscripts:') || oldStoreContent.includes('activeManuscript')) {
          console.log('⚠  Old store contains manuscript data - manually review for migration')
        }
      } catch (error) {
        console.log('⚠  Could not analyze old store content')
      }
    }
    
    // Update imports in key files
    const filesToUpdate = [
      './src/app/manuscripts/[id]/editor/page.tsx',
      './src/components/editor/ProfessionalEditor.tsx',
      './src/components/layout/MenuBar.tsx'
    ]
    
    for (const filePath of filesToUpdate) {
      try {
        // Check if file exists
        await fs.access(filePath)
        
        let content = await fs.readFile(filePath, 'utf8')
        let originalContent = content
        let modified = false
        
        // Replace old store imports
        const oldImportPatterns = [
          /import.*useManuscriptStore.*from.*['"]@\/store\/manuscriptStore['"].*\n/g,
          /import.*useAppStore.*from.*['"]@\/lib\/store['"].*\n/g,
          /import.*manuscriptStore.*from.*['"]@\/store\/manuscriptStore['"].*\n/g
        ]
        
        oldImportPatterns.forEach(pattern => {
          if (content.match(pattern)) {
            content = content.replace(pattern, '')
            modified = true
          }
        })
        
        // Add new store import if not present
        if (!content.includes('useSingleManuscriptStore') && !content.includes('single-manuscript')) {
          // Find where to insert the import
          const importInsertPoint = content.indexOf('import React') !== -1 
            ? content.indexOf('import React')
            : content.indexOf('import')
          
          if (importInsertPoint !== -1) {
            const beforeImport = content.substring(0, importInsertPoint)
            const afterImport = content.substring(importInsertPoint)
            content = beforeImport + "import { useSingleManuscriptStore } from '@/store/singleManuscriptStore'\n" + afterImport
            modified = true
          }
        }
        
        // Replace store usage patterns
        const replacements = [
          { from: /useManuscriptStore/g, to: 'useSingleManuscriptStore' },
          { from: /useAppStore/g, to: 'useSingleManuscriptStore' },
          { from: /manuscriptStore/g, to: 'singleManuscriptStore' },
          { from: /activeSceneId/g, to: 'activeChapterId' },
          { from: /setActiveScene/g, to: 'setActiveChapter' },
          { from: /saveCurrentScene/g, to: 'saveManuscript' }
        ]
        
        replacements.forEach(({ from, to }) => {
          if (content.match(from)) {
            content = content.replace(from, to)
            modified = true
          }
        })
        
        if (modified) {
          await fs.writeFile(filePath, content, 'utf8')
          results.updates.push({
            file: filePath,
            changes: 'Updated store imports and usage'
          })
          results.summary.filesUpdated++
          console.log(`✓ Updated imports in ${filePath}`)
        } else {
          console.log(`➖ No changes needed in ${filePath}`)
        }
        
      } catch (error) {
        const errorMsg = `Could not update ${filePath}: ${error.message}`
        console.log(`❌ ${errorMsg}`)
        results.errors.push({ file: filePath, error: error.message })
        results.summary.errors++
      }
    }
    
    // Check if new architecture files exist
    const newArchitectureFiles = [
      './src/types/single-manuscript.ts',
      './src/store/singleManuscriptStore.ts',
      './src/lib/manuscript-loader.ts'
    ]
    
    let newFilesExist = 0
    for (const filePath of newArchitectureFiles) {
      try {
        await fs.access(filePath)
        newFilesExist++
        console.log(`✓ New architecture file exists: ${filePath}`)
      } catch (error) {
        console.log(`❌ Missing new architecture file: ${filePath}`)
        results.errors.push({ file: filePath, error: 'File not found' })
        results.summary.errors++
      }
    }
    
    // Write migration report
    await fs.writeFile('./migration-report.json', JSON.stringify(results, null, 2))
    
    console.log('\n📊 MIGRATION SUMMARY')
    console.log('====================')
    console.log(`📁 Files backed up: ${results.summary.filesBackedUp}`)
    console.log(`🔧 Files updated: ${results.summary.filesUpdated}`)
    console.log(`❌ Errors: ${results.summary.errors}`)
    console.log(`📋 New architecture files: ${newFilesExist}/${newArchitectureFiles.length}`)
    
    if (results.summary.errors === 0 && newFilesExist === newArchitectureFiles.length) {
      console.log('\n🎉 Migration completed successfully!')
    } else {
      console.log('\n⚠️  Migration completed with issues - review the details above')
    }
    
    console.log('\n📋 Next steps:')
    console.log('1. Replace sample data in manuscript-loader.ts with your content')
    console.log('2. Test the new store with npm run dev')
    console.log('3. Verify chapter editing functionality')
    console.log('4. Check console for any remaining store-related errors')
    console.log('\n📄 Detailed report saved to: migration-report.json')
    
    return results.summary.errors === 0
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    results.errors.push({ file: 'migration', error: error.message })
    return false
  }
}

if (require.main === module) {
  migrateToSingleManuscript().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Fatal migration error:', error)
    process.exit(1)
  })
}

module.exports = { migrateToSingleManuscript }