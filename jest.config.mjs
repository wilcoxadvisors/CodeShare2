/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
  roots: ['<rootDir>/tests', '<rootDir>/testing'],
  testMatch: [
    '**/tests/**/*.test.[jt]s?(x)',
    '**/testing/**/*.test.[jt]s?(x)',
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'server/**/*.{ts,js}',
    'client/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ]
};