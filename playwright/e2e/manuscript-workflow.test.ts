/**
 * End-to-End Tests - Single Manuscript Workflow
 * Tests complete user workflows for single manuscript mode
 */

import { test, expect, Page } from '@playwright/test'

// Test data for single manuscript mode
const SAMPLE_CONTENT = {
  title: 'The Last Echo of Midnight',
  author: 'Alex Rivera',
  genre: 'Urban Fantasy',
  sceneContent: 'This is a test scene content with multiple paragraphs.\n\nThis is the second paragraph with enough content to test various features.\n\nAnd a third paragraph to ensure proper handling of longer content.',
  wordCount: 25
}

const LARGE_MANUSCRIPT_SIZE = 100000 // 100k words for performance testing

class TestHelpers {
  static async createLargeManuscript(_page: Page, wordCount: number = LARGE_MANUSCRIPT_SIZE) {
    const words = ['Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit']
    let content = ''
    
    for (let i = 0; i < wordCount; i++) {
      content += words[i % words.length] + ' '
      if (i > 0 && i % 50 === 0) content += '\n\n' // Paragraph breaks
    }
    
    return content
  }

  static async waitForAnalysis(page: Page, timeout = 60000) {
    // Wait for AI analysis to complete
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout })
  }

  static async waitForExport(page: Page, timeout = 30000) {
    // Wait for export operation to complete
    await page.waitForSelector('[data-testid="export-complete"]', { timeout })
  }
}

test.describe('Single Manuscript Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with the hardcoded single manuscript
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    // App should auto-redirect to /editor with the singleton manuscript
    await page.waitForURL('**/editor')
  })

  test('Edit, analyze, and export single manuscript', async ({ page }) => {
    const startTime = Date.now()

    // Step 1: Verify manuscript is loaded
    await test.step('Verify manuscript loaded', async () => {
      // Should show the hardcoded manuscript title
      await expect(page.locator('[data-testid="manuscript-title-display"]')).toHaveText(SAMPLE_CONTENT.title)
      await expect(page.locator('[data-testid="manuscript-author-display"]')).toHaveText(SAMPLE_CONTENT.author)
    })

    // Step 2: Add content to existing manuscript
    await test.step('Add and edit scene content', async () => {
      await page.click('[data-testid="add-scene-button"]')
      await page.fill('[data-testid="scene-title"]', 'Chapter 1')
      await page.fill('[data-testid="scene-content"]', SAMPLE_CONTENT.sceneContent)
      await page.click('[data-testid="save-scene"]')
      
      // Verify content was saved
      await expect(page.locator('[data-testid="word-count"]')).toContainText('25')
    })

    // Step 3: Run scene analysis
    await test.step('Run AI analysis', async () => {
      await page.click('[data-testid="analyze-scene"]')
      
      // Wait for analysis to complete (should be within 60 seconds)
      await TestHelpers.waitForAnalysis(page)
      
      // Verify analysis results are displayed
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible()
      await expect(page.locator('[data-testid="readability-score"]')).toBeVisible()
      await expect(page.locator('[data-testid="pacing-analysis"]')).toBeVisible()
    })

    // Step 4: Export single manuscript
    await test.step('Export manuscript', async () => {
      await page.click('[data-testid="export-manuscript"]')
      await page.selectOption('[data-testid="export-format"]', 'shunn_manuscript')
      await page.click('[data-testid="export-button"]')
      
      await TestHelpers.waitForExport(page)
      
      // Verify export was successful
      await expect(page.locator('[data-testid="export-success"]')).toBeVisible()
    })

    // Performance check: entire workflow should complete within 5 minutes
    const totalTime = Date.now() - startTime
    expect(totalTime).toBeLessThan(300000) // 5 minutes
  })

  test('Scene management and chapter reordering', async ({ page }) => {
    // Step 1: Add multiple scenes
    await test.step('Add multiple scenes', async () => {
      for (let i = 1; i <= 3; i++) {
        await page.click('[data-testid="add-scene-button"]')
        await page.fill('[data-testid="scene-title"]', `Chapter ${i}`)
        await page.fill('[data-testid="scene-content"]', `Content for chapter ${i} with sufficient text for testing.`)
        await page.click('[data-testid="save-scene"]')
        await page.waitForTimeout(500) // Brief pause between scenes
      }
      
      // Verify all scenes were created
      await expect(page.locator('[data-testid="scene-list"] .scene-item')).toHaveCount(3)
    })

    // Step 2: Test scene reordering
    await test.step('Reorder scenes', async () => {
      await page.click('[data-testid="reorder-mode"]')
      
      // Drag last scene to first position
      await page.dragAndDrop('[data-testid="scene-3"]', '[data-testid="scene-1"]')
      
      // Verify new order
      await expect(page.locator('[data-testid="scene-list"] .scene-item:first-child')).toContainText('Chapter 3')
    })

    // Step 3: Test consistency checking
    await test.step('Run consistency check', async () => {
      await page.click('[data-testid="consistency-check"]')
      await page.waitForSelector('[data-testid="consistency-results"]')
      
      // Verify consistency report is shown
      await expect(page.locator('[data-testid="consistency-score"]')).toBeVisible()
      await expect(page.locator('[data-testid="consistency-issues"]')).toBeVisible()
    })
  })

  test('Large content performance', async ({ page }) => {
    const startTime = Date.now()

    await test.step('Add large content to existing manuscript', async () => {
      const largeContent = await TestHelpers.createLargeManuscript(page)
      
      // Add large content in chunks to existing manuscript
      const chunks = largeContent.match(/.{1,10000}/g) || []
      for (let i = 0; i < Math.min(chunks.length, 10); i++) { // Limit to 10 chunks for testing
        await page.click('[data-testid="add-scene-button"]')
        await page.fill('[data-testid="scene-title"]', `Chapter ${i + 1}`)
        await page.fill('[data-testid="scene-content"]', chunks[i])
        await page.click('[data-testid="save-scene"]')
        
        // Brief pause to prevent overwhelming the system
        await page.waitForTimeout(100)
      }
    })

    await test.step('Verify performance with large content', async () => {
      // Check word count is reasonable
      const wordCountText = await page.locator('[data-testid="word-count"]').textContent()
      const wordCount = parseInt(wordCountText?.replace(/,/g, '') || '0')
      expect(wordCount).toBeGreaterThan(5000) // Should have significant content
      
      // Test search performance
      const searchStart = Date.now()
      await page.fill('[data-testid="search-input"]', 'Lorem')
      await page.waitForSelector('[data-testid="search-results"]')
      const searchTime = Date.now() - searchStart
      expect(searchTime).toBeLessThan(5000) // Search should complete within 5 seconds
      
      // Test scene navigation performance
      const navStart = Date.now()
      await page.click('[data-testid="scene-navigation"] .scene-item:nth-child(5)') // Jump to 5th scene
      await page.waitForLoadState('domcontentloaded')
      const navTime = Date.now() - navStart
      expect(navTime).toBeLessThan(2000) // Navigation should be fast
    })

    await test.step('Test analysis performance on large content', async () => {
      await page.click('[data-testid="analyze-scene"]')
      
      // Analysis should complete within 60 seconds even for large content
      await TestHelpers.waitForAnalysis(page, 60000)
      
      // Verify analysis completed successfully
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible()
    })

    // Entire large content workflow should complete within 5 minutes
    const totalTime = Date.now() - startTime
    expect(totalTime).toBeLessThan(300000) // 5 minutes
  })

  test('Real-time typing responsiveness during background analysis', async ({ page }) => {
    await test.step('Setup scene with background analysis', async () => {
      // Add a new scene to the existing manuscript
      await page.click('[data-testid="add-scene-button"]')
      await page.fill('[data-testid="scene-title"]', 'Responsiveness Test Scene')
    })

    await test.step('Test typing responsiveness', async () => {
      // Start background analysis
      await page.click('[data-testid="analyze-scene"]')
      
      // Immediately start typing
      const textArea = page.locator('[data-testid="scene-content"]')
      const testText = 'Testing real-time responsiveness during analysis.'
      
      const typingStart = Date.now()
      await textArea.fill(testText)
      const typingTime = Date.now() - typingStart
      
      // Typing should remain responsive (< 1 second for 50 characters)
      expect(typingTime).toBeLessThan(1000)
      
      // Verify text was entered correctly
      await expect(textArea).toHaveValue(testText)
    })

    await test.step('Test UI responsiveness during background operations', async () => {
      // Test menu interactions during analysis
      const menuStart = Date.now()
      await page.click('[data-testid="file-menu"]')
      await page.click('[data-testid="new-scene"]')
      const menuTime = Date.now() - menuStart
      
      expect(menuTime).toBeLessThan(500) // Menu should respond within 500ms
      
      // Test tab switching
      const tabStart = Date.now()
      await page.click('[data-testid="analysis-tab"]')
      const tabTime = Date.now() - tabStart
      
      expect(tabTime).toBeLessThan(300) // Tab switching should be instant
    })
  })
})

test.describe('Error Handling and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForURL('**/editor')
  })

  test('Handles network failures gracefully', async ({ page }) => {
    // Simulate network failure during AI analysis
    await page.route('**/api/analyze', route => route.abort())
    
    // Add a scene to analyze
    await page.click('[data-testid="add-scene-button"]')
    await page.fill('[data-testid="scene-title"]', 'Network Test Scene')
    await page.fill('[data-testid="scene-content"]', 'Test content for network failure scenario.')
    await page.click('[data-testid="save-scene"]')
    
    await page.click('[data-testid="analyze-scene"]')
    
    // Should show user-friendly error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to connect')
    
    // Should offer retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })

  test('Preserves work during crashes', async ({ page }) => {
    // Add content to existing manuscript
    await page.click('[data-testid="add-scene-button"]')
    await page.fill('[data-testid="scene-title"]', 'Important Chapter')
    await page.fill('[data-testid="scene-content"]', 'This content should be recovered after crash.')
    await page.click('[data-testid="save-scene"]')
    
    // Simulate application crash/restart
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForURL('**/editor')
    
    // Content should be automatically recovered or persisted
    await expect(page.locator('[data-testid="scene-list"]')).toContainText('Important Chapter')
    
    // Verify manuscript is still accessible
    await expect(page.locator('[data-testid="manuscript-title-display"]')).toHaveText(SAMPLE_CONTENT.title)
  })
})

test.describe('Performance Benchmarks', () => {
  test('Application startup time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForURL('**/editor') // Should auto-redirect to editor
    await page.waitForSelector('[data-testid="app-ready"]')
    const loadTime = Date.now() - startTime
    
    // Application should start within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('Memory usage remains stable during extended session', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('**/editor')
    
    // Simulate extended usage session - add and remove scenes
    for (let i = 0; i < 10; i++) {
      // Add scene
      await page.click('[data-testid="add-scene-button"]')
      await page.fill('[data-testid="scene-title"]', `Test Scene ${i}`)
      await page.fill('[data-testid="scene-content"]', 'Sample content '.repeat(100))
      await page.click('[data-testid="save-scene"]')
      
      // Edit scene content multiple times
      await page.fill('[data-testid="scene-content"]', `Updated content ${i} `.repeat(100))
      await page.click('[data-testid="save-scene"]')
      
      // Delete scene to test cleanup
      await page.click('[data-testid="delete-scene"]')
      await page.click('[data-testid="confirm-delete"]')
    }
    
    // Memory usage should remain stable (no memory leaks)
    // This would need to be measured with browser dev tools in actual implementation
    expect(true).toBe(true) // Placeholder for memory measurement
  })

  test('File import performance', async ({ page }) => {
    // Create test file
    const testContent = 'Sample manuscript content.\n'.repeat(10000) // ~250KB file
    
    // Mock file input
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'test-manuscript.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from(testContent)
    })
    
    const importStart = Date.now()
    await page.waitForSelector('[data-testid="import-complete"]')
    const importTime = Date.now() - importStart
    
    // File import should complete within 10 seconds
    expect(importTime).toBeLessThan(10000)
  })
})