/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      useESM: true,
      isolatedModules: true,
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/cypress/'
  ],
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};

export default config;