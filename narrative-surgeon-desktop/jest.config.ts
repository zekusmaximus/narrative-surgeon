import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  roots: ['<rootDir>/src'],
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  moduleNameMapper: {
    '^@/components/ui/WordCountDisplay$': '<rootDir>/src/components/ui/WordCountDisplay.tsx',
    '^@/components/submissions/QueryLetterGenerator$': '<rootDir>/src/tests/__mocks__/submissions/QueryLetterGenerator.tsx',
    '^@/components/submissions/SubmissionTracker$': '<rootDir>/src/tests/__mocks__/submissions/SubmissionTracker.tsx',
    '^@/components/submissions/PerformanceAnalytics$': '<rootDir>/src/tests/__mocks__/submissions/PerformanceAnalytics.tsx',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tauri-apps/api/tauri$': '@tauri-apps/api/core',
    '\\\\.(css|less|sass|scss)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        transform: {
          react: { runtime: 'automatic' }
        },
        target: 'es2020'
      },
      module: { type: 'es6' }
    }]
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/src/tests/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts'
  ]
}

export default config
