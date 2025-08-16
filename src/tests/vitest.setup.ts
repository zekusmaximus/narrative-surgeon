import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Polyfills for Node/JSDOM
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder as any;

// matchMedia mock for components using responsive checks
if (!('matchMedia' in window)) {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  });
}

// ResizeObserver mock used by some UI libs
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

// IntersectionObserver mock
class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
(global as any).IntersectionObserver = IntersectionObserver;

// Blob polyfill with text() method for JSDOM
class BlobPolyfill {
  public type: string;
  public size: number;
  private chunks: (string | ArrayBuffer | ArrayBufferView)[];

  constructor(chunks: (string | ArrayBuffer | ArrayBufferView)[], options: { type?: string } = {}) {
    this.chunks = chunks;
    this.type = options.type || '';
    this.size = this.chunks.reduce((total, chunk) => {
      if (typeof chunk === 'string') return total + chunk.length;
      if (chunk instanceof ArrayBuffer) return total + chunk.byteLength;
      return total + (chunk as ArrayBufferView).byteLength;
    }, 0);
  }
  
  async text(): Promise<string> {
    return this.chunks.map(chunk => {
      if (typeof chunk === 'string') return chunk;
      if (chunk instanceof ArrayBuffer) return new TextDecoder().decode(chunk);
      return new TextDecoder().decode((chunk as ArrayBufferView).buffer);
    }).join('');
  }
  
  async arrayBuffer(): Promise<ArrayBuffer> {
    const text = await this.text();
    return new TextEncoder().encode(text).buffer;
  }
}

// Override the global Blob to ensure our polyfill is used
(global as any).Blob = BlobPolyfill;
(globalThis as any).Blob = BlobPolyfill;

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-sql', () => ({
  open: vi.fn(async () => ({ 
    execute: vi.fn(), 
    select: vi.fn() 
  }))
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn().mockResolvedValue({})
}));

vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  message: vi.fn().mockResolvedValue(undefined),
  ask: vi.fn().mockResolvedValue(true),
  confirm: vi.fn().mockResolvedValue(true)
}));

vi.mock('@tauri-apps/api/fs', () => ({
  readTextFile: vi.fn().mockResolvedValue(''),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(new Uint8Array()),
  writeFile: vi.fn().mockResolvedValue(undefined)
}));

// Next.js app router mock
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    pathname: '/'
  })
}));