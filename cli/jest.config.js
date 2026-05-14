export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^src/(.*)\\.js$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/cli.tsx'],
  coverageThreshold: {
    global: {
      branches: 8,
      functions: 5,
      lines: 7,
      statements: 7,
    },
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.claude/context/',
    '/.claude/worktrees/.*\\.claude/',
  ],
};
