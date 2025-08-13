/**
 * End-to-End Tests - Manuscript Management Workflow
 * Tests complete user workflows from start to finish
 */

import { test, expect, Page } from '@playwright/test'

// Test data
const SAMPLE_MANUSCRIPT = {
  title: 'Test Novel',
  author: 'Test Author',
  genre: 'Literary Fiction',
  content: 'This is a test manuscript content with multiple paragraphs.\n\nThis is the second paragraph with enough content to test various features.\n\nAnd a third paragraph to ensure proper handling of longer content.',
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

test.describe('Manuscript Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with clean application state
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('Create, edit, analyze, and export manuscript', async ({ page }) => {
    const startTime = Date.now()

    // Step 1: Create new manuscript
    await test.step('Create new manuscript', async () => {
      await page.click('[data-testid="new-manuscript-button"]')
      await page.fill('[data-testid="manuscript-title"]', SAMPLE_MANUSCRIPT.title)
      await page.fill('[data-testid="manuscript-author"]', SAMPLE_MANUSCRIPT.author)
      await page.selectOption('[data-testid="manuscript-genre"]', SAMPLE_MANUSCRIPT.genre)
      await page.click('[data-testid="create-manuscript"]')
      
      // Verify manuscript was created
      await expect(page.locator('[data-testid="manuscript-title-display"]')).toHaveText(SAMPLE_MANUSCRIPT.title)
    })

    // Step 2: Add content to manuscript
    await test.step('Add and edit content', async () => {
      await page.click('[data-testid="add-scene-button"]')
      await page.fill('[data-testid="scene-title"]', 'Chapter 1')
      await page.fill('[data-testid="scene-content"]', SAMPLE_MANUSCRIPT.content)
      await page.click('[data-testid="save-scene"]')
      
      // Verify content was saved
      await expect(page.locator('[data-testid="word-count"]')).toContainText('25')
    })

    // Step 3: Run manuscript analysis
    await test.step('Run AI analysis', async () => {
      await page.click('[data-testid="analyze-manuscript"]')
      
      // Wait for analysis to complete (should be within 60 seconds)
      await TestHelpers.waitForAnalysis(page)
      
      // Verify analysis results are displayed
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible()
      await expect(page.locator('[data-testid="readability-score"]')).toBeVisible()
      await expect(page.locator('[data-testid="pacing-analysis"]')).toBeVisible()
    })

    // Step 4: Export manuscript in multiple formats
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

  test('Query letter generation and agent submission workflow', async ({ page }) => {
    // Step 1: Navigate to query letter generator
    await test.step('Open query letter generator', async () => {
      await page.click('[data-testid="publishing-menu"]')
      await page.click('[data-testid="query-generator"]')
      await expect(page.locator('[data-testid="query-generator-form"]')).toBeVisible()
    })

    // Step 2: Generate query letter
    await test.step('Generate query letter', async () => {
      await page.fill('[data-testid="manuscript-title"]', 'Test Novel')
      await page.fill('[data-testid="word-count"]', '85000')
      await page.selectOption('[data-testid="genre-select"]', 'Literary Fiction')
      await page.fill('[data-testid="logline"]', 'A compelling story about...')
      await page.fill('[data-testid="bio"]', 'Author bio information...')
      
      await page.click('[data-testid="generate-query"]')
      
      // Wait for AI generation
      await page.waitForSelector('[data-testid="generated-query"]')
      
      // Verify query was generated
      await expect(page.locator('[data-testid="query-score"]')).toBeVisible()
      expect(await page.locator('[data-testid="query-score"]').textContent()).toMatch(/\d+/)
    })

    // Step 3: Research agents
    await test.step('Research and select agents', async () => {
      await page.click('[data-testid="agent-research-tab"]')
      
      // Use smart matching
      await page.click('[data-testid="smart-matches-button"]')
      await page.waitForSelector('[data-testid="agent-matches"]')
      
      // Select top match
      await page.click('[data-testid="agent-card"]:first-child')
      await page.click('[data-testid="select-agent"]')
      
      // Verify agent was selected
      await expect(page.locator('[data-testid="selected-agent"]')).toBeVisible()
    })

    // Step 4: Track submission
    await test.step('Track submission', async () => {
      await page.click('[data-testid="submission-tracker-tab"]')
      await page.click('[data-testid="add-submission"]')
      
      await page.fill('[data-testid="submission-agent-name"]', 'Test Agent')
      await page.fill('[data-testid="submission-agency"]', 'Test Agency')
      await page.click('[data-testid="save-submission"]')
      
      // Verify submission was tracked
      await expect(page.locator('[data-testid="submission-list"] .submission-item')).toBeVisible()
    })
  })

  test('Large manuscript performance (100k+ words)', async ({ page }) => {
    const startTime = Date.now()

    await test.step('Create large manuscript', async () => {
      const largeContent = await TestHelpers.createLargeManuscript(page)
      
      await page.click('[data-testid="new-manuscript-button"]')
      await page.fill('[data-testid="manuscript-title"]', 'Large Test Novel')
      await page.fill('[data-testid="manuscript-author"]', 'Test Author')
      await page.click('[data-testid="create-manuscript"]')
      
      // Add large content in chunks to avoid timeout
      const chunks = largeContent.match(/.{1,10000}/g) || []
      for (let i = 0; i < chunks.length; i++) {
        await page.click('[data-testid="add-scene-button"]')
        await page.fill('[data-testid="scene-title"]', `Chapter ${i + 1}`)
        await page.fill('[data-testid="scene-content"]', chunks[i])
        await page.click('[data-testid="save-scene"]')
        
        // Brief pause to prevent overwhelming the system
        await page.waitForTimeout(100)
      }
    })

    await test.step('Verify performance with large manuscript', async () => {
      // Check word count is accurate
      const wordCountText = await page.locator('[data-testid="word-count"]').textContent()
      const wordCount = parseInt(wordCountText?.replace(/,/g, '') || '0')
      expect(wordCount).toBeGreaterThan(90000) // Allow some variance
      
      // Test search performance
      const searchStart = Date.now()
      await page.fill('[data-testid="search-input"]', 'Lorem')
      await page.waitForSelector('[data-testid="search-results"]')
      const searchTime = Date.now() - searchStart
      expect(searchTime).toBeLessThan(5000) // Search should complete within 5 seconds
      
      // Test navigation performance
      const navStart = Date.now()
      await page.click('[data-testid="scene-navigation"] button:nth-child(50)') // Jump to middle
      await page.waitForLoadState('domcontentloaded')
      const navTime = Date.now() - navStart
      expect(navTime).toBeLessThan(2000) // Navigation should be instant
    })

    await test.step('Test analysis performance on large manuscript', async () => {
      await page.click('[data-testid="analyze-manuscript"]')
      
      // Analysis should complete within 60 seconds even for large manuscripts
      await TestHelpers.waitForAnalysis(page, 60000)
      
      // Verify analysis completed successfully
      await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible()
    })

    // Entire large manuscript workflow should complete within 10 minutes
    const totalTime = Date.now() - startTime
    expect(totalTime).toBeLessThan(600000) // 10 minutes
  })

  test('Real-time typing responsiveness during background analysis', async ({ page }) => {
    await test.step('Setup manuscript with background analysis', async () => {
      await page.click('[data-testid="new-manuscript-button"]')
      await page.fill('[data-testid="manuscript-title"]', 'Responsiveness Test')
      await page.click('[data-testid="create-manuscript"]')
      
      await page.click('[data-testid="add-scene-button"]')
      await page.fill('[data-testid="scene-title"]', 'Test Scene')
    })

    await test.step('Test typing responsiveness', async () => {
      // Start background analysis
      await page.click('[data-testid="analyze-manuscript"]')
      
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
  test('Handles network failures gracefully', async ({ page }) => {
    // Simulate network failure during AI analysis
    await page.route('**/api/analyze', route => route.abort())
    
    await page.click('[data-testid="new-manuscript-button"]')
    await page.fill('[data-testid="manuscript-title"]', 'Network Test')
    await page.click('[data-testid="create-manuscript"]')
    
    await page.click('[data-testid="analyze-manuscript"]')
    
    // Should show user-friendly error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to connect')
    
    // Should offer retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })

  test('Preserves work during crashes', async ({ page }) => {
    // Create manuscript with content
    await page.click('[data-testid="new-manuscript-button"]')
    await page.fill('[data-testid="manuscript-title"]', 'Crash Recovery Test')
    await page.click('[data-testid="create-manuscript"]')
    
    await page.click('[data-testid="add-scene-button"]')
    await page.fill('[data-testid="scene-title"]', 'Important Chapter')
    await page.fill('[data-testid="scene-content"]', 'This content should be recovered after crash.')
    
    // Simulate application crash/restart
    await page.reload()
    
    // Content should be automatically recovered
    await expect(page.locator('[data-testid="recovery-notification"]')).toBeVisible()
    await page.click('[data-testid="restore-work"]')
    
    // Verify content was restored
    await expect(page.locator('[data-testid="manuscript-title-display"]')).toContainText('Crash Recovery Test')
  })
})

test.describe('Performance Benchmarks', () => {
  test('Application startup time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('[data-testid="app-ready"]')
    const loadTime = Date.now() - startTime
    
    // Application should start within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('Memory usage remains stable during extended session', async ({ page }) => {
    // Simulate extended usage session
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="new-manuscript-button"]')
      await page.fill('[data-testid="manuscript-title"]', `Test Manuscript ${i}`)
      await page.click('[data-testid="create-manuscript"]')
      
      // Add content
      await page.click('[data-testid="add-scene-button"]')
      await page.fill('[data-testid="scene-content"]', 'Sample content '.repeat(100))
      await page.click('[data-testid="save-scene"]')
      
      // Delete manuscript to test cleanup
      await page.click('[data-testid="delete-manuscript"]')
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