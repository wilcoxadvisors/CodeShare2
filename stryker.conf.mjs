/**
 * Stryker Mutation Testing Configuration
 * Tests the quality of our tests by introducing bugs and checking if tests catch them
 */

export default {
  // Language and test runner configuration
  testRunner: 'jest',
  packageManager: 'npm',
  
  // Coverage analysis configuration
  coverageAnalysis: 'perTest',
  
  // Files to mutate (focus on journal entry storage layer first)
  mutate: [
    'server/storage/journalEntryStorage.ts',
    'shared/validation.ts',
    'server/journalEntryRoutes.ts'
  ],
  
  // Test files
  testMatch: [
    'tests/**/*.test.ts',
    'tests/**/*.spec.ts'
  ],
  
  // TypeScript configuration
  tsconfigFile: 'tsconfig.json',
  
  // Mutation testing configuration
  mutator: {
    // Enable all available mutators
    plugins: [
      '@stryker-mutator/typescript-checker'
    ]
  },
  
  // Thresholds for mutation score
  thresholds: {
    high: 80,
    low: 60,
    break: 50
  },
  
  // Reporting configuration
  reporters: [
    'html',
    'clear-text',
    'progress',
    'dashboard'
  ],
  
  // HTML report configuration
  htmlReporter: {
    baseDir: 'reports/mutation'
  },
  
  // Performance settings
  concurrency: 4,
  
  // Timeout settings (increase for complex mutations)
  timeoutMS: 60000,
  timeoutFactor: 2,
  
  // Ignore certain files/patterns
  ignore: [
    'node_modules/**/*',
    'dist/**/*',
    'coverage/**/*',
    'reports/**/*',
    '**/*.d.ts',
    'tests/**/*'
  ],
  
  // Plugin configuration
  plugins: [
    '@stryker-mutator/core',
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/typescript-checker'
  ],
  
  // Jest configuration
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.mjs',
    enableFindRelatedTests: true
  },
  
  // TypeScript checker configuration
  typeCheck: true,
  checkers: ['typescript'],
  
  // Logging configuration
  logLevel: 'info',
  fileLogLevel: 'debug',
  
  // Dashboard reporter configuration (optional)
  dashboard: {
    project: 'wilcox-advisors-journal-entry',
    version: 'main'
  },
  
  // Disable certain mutators that might cause infinite loops
  disableTypeChecks: '{test,spec,d}.ts',
  
  // Custom mutator configuration
  mutatorOptions: {
    // Disable certain risky mutations
    excludedMutations: [
      'StringLiteral',  // Avoid mutating SQL strings
      'ObjectLiteral'   // Avoid mutating configuration objects
    ]
  }
};