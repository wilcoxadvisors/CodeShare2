/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: 'node',
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/cypress/'
  ],
  testTimeout: 30000,
};

export default config;