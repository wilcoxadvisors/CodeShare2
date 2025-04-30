/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000, // Increase timeout to 60 seconds
  runInBand: true  // Run tests serially
};