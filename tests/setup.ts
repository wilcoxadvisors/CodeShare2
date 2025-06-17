/**
 * Jest Test Setup File
 * Configures test environment for database connections and global test utilities
 */

import { beforeAll, afterAll, beforeEach } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
  
  // Increase timeout for database operations
  jest.setTimeout(30000);
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(async () => {
  // Reset state before each test if needed
});

// Global test utilities
global.testTimeout = 30000;