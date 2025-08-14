import { test, expect } from '@playwright/test'

test('mocked Tauri command resolves', async () => {
  const invoke = (command: string) => {
    if (command === 'ping') return 'pong'
    throw new Error('unknown command')
  }

  const result = invoke('ping')
  expect(result).toBe('pong')
})
