/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: 'node',
  // REMOVED ts-jest preset
  transform: {
    // ADDED SWC transformation for TS/JS files
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    //
    // ARCHITECT'S FIX: Add the line below to resolve backend path aliases
    //
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/cypress/'
  ],
  testTimeout: 30000,
};

export default config;