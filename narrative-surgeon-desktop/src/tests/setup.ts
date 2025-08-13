/* Test setup for Jest (jsdom) */
// Extend expect with jest-dom matchers
import '@testing-library/jest-dom'

// Polyfills for Node/JSDOM
import { TextEncoder, TextDecoder } from 'util'
;(global as any).TextEncoder = TextEncoder
;(global as any).TextDecoder = TextDecoder as any

// matchMedia mock for components using responsive checks
if (!('matchMedia' in window)) {
  ;(window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
}

// ResizeObserver mock used by some UI libs
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = ResizeObserver

// IntersectionObserver mock
class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}
;(global as any).IntersectionObserver = IntersectionObserver

/* Basic Tauri API mocks (tests can override per-suite) */
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn().mockResolvedValue({})
}), { virtual: true })
// Tauri v2 core invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn().mockResolvedValue({})
}), { virtual: true })
jest.mock('@tauri-apps/api/dialog', () => ({
  open: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  message: jest.fn().mockResolvedValue(undefined),
  ask: jest.fn().mockResolvedValue(true),
  confirm: jest.fn().mockResolvedValue(true)
}), { virtual: true })
jest.mock('@tauri-apps/api/fs', () => ({
  readTextFile: jest.fn().mockResolvedValue(''),
  writeTextFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(new Uint8Array()),
  writeFile: jest.fn().mockResolvedValue(undefined)
}), { virtual: true })

// Next.js app router mock (tests may provide their own)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    pathname: '/'
  })
}), { virtual: true })
