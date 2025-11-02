/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        sourceMaps: true,
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: {
            react: {
              // no need in "import React"
              runtime: 'automatic',
              // import { jsx } from '<...this...>';
              importSource: 'faiwer-react',
              development: true,
            },
          },
          target: 'es2022',
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  moduleNameMapper: {
    '^faiwer-react/jsx-runtime$': '<rootDir>/src/jsx-runtime.ts',
    '^faiwer-react/jsx-dev-runtime$': '<rootDir>/src/jsx-dev-runtime.ts',
    '^faiwer-react$': '<rootDir>/src/index.ts',
    '^faiwer-react/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  // code coverage
  coverageProvider: 'v8',
  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage',
};
