import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // setupFilesAfterEnv (NOT setupFilesAfterFramework — that key is silently ignored by Jest)
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    // allow imports from src without dist
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json',
      diagnostics: false,  // type checking done separately by tsc --noEmit in CI
    }],
  },
  // Increase timeout for integration tests that hit the real DB
  testTimeout: 30000,
  // Force exit after all tests — prevents hanging on open pg.Pool handles
  // (db.ts creates a Pool at module load; closing it in afterAll is not reliable
  // across all mocking configurations, so forceExit is the pragmatic fix)
  forceExit: true,
};

export default config;
