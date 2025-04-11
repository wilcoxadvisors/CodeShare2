# Testing Guide

This document provides instructions for running tests on the Financial Management Platform.

## Test Structure

The project uses Jest for testing and has tests organized in several locations:

- `server/**/*.test.ts` - Backend unit tests
- `shared/**/*.test.ts` - Shared module tests
- `testing/tests/test/` - Integration and functional tests
- `testing/tests/test/unit/` - Additional unit tests
- `testing/tests/test/storage/` - Storage/database-specific tests
- `testing/tests/test-coa/` - Chart of Accounts specific tests

## Available Testing Commands

The following scripts are available to run tests:

### Run All Tests

To run all tests across the entire project:

```bash
./scripts/run-tests.sh --all
```

### Run Unit Tests

To run only unit tests:

```bash
./scripts/run-unit-tests.sh
```

### Run Integration Tests

To run only integration tests:

```bash
./scripts/run-integration-tests.sh
```

### Run Storage Tests

To run only database/storage-related tests:

```bash
./scripts/run-storage-tests.sh
```

### Run Chart of Accounts Tests

To run only Chart of Accounts (COA) tests:

```bash
./scripts/run-coa-tests.sh
```

### Run API Tests

To run only API endpoint tests:

```bash
./scripts/run-api-tests.sh
```

## Additional Options

You can add these options to any test command:

### Generate Coverage Report

To generate a test coverage report:

```bash
./scripts/run-tests.sh --all --coverage
```

or

```bash
./scripts/run-unit-tests.sh --coverage
```

The coverage report will be available in the `coverage` directory.

### Watch Mode

To run tests in watch mode (tests will rerun when files change):

```bash
./scripts/run-tests.sh --all --watch
```

or

```bash
./scripts/run-unit-tests.sh --watch
```

## Test Database Setup

Many tests require a database connection. The test configuration uses:

1. An in-memory database for most tests
2. A test database for integration tests

For integration tests, make sure that the test database environment variables are set correctly:

- `TEST_DATABASE_URL` - Connection string for the test database
- `TEST_PGUSER`, `TEST_PGPASSWORD`, etc. - Individual connection parameters

## Mocking

The project uses Jest's mocking capabilities. Common patterns include:

- Mocking database queries
- Mocking external API calls
- Mocking authentication

Example from a test file:

```javascript
// Mock the database functions
jest.mock('../../server/db', () => ({
  db: {
    query: jest.fn().mockResolvedValue([]),
    transaction: jest.fn().mockImplementation(callback => callback({
      query: jest.fn().mockResolvedValue([]),
    })),
  },
  eq: jest.fn(),
  inArray: jest.fn(),
  sql: jest.fn(x => x),
  and: jest.fn(),
}));
```

## Writing New Tests

When writing new tests, follow these guidelines:

1. Place unit tests next to the file being tested with the `.test.ts` extension
2. Place integration tests in the appropriate directory under `testing/tests/test/`
3. Use descriptive `describe` and `test` names
4. Mock external dependencies appropriately
5. Clean up after tests (especially if modifying the database)

Example test structure:

```javascript
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Feature being tested', () => {
  beforeAll(() => {
    // Setup code here
  });

  afterAll(() => {
    // Cleanup code here
  });

  test('specific functionality works correctly', () => {
    // Test code here
    expect(result).toBe(expectedValue);
  });
});
```

## Debugging Tests

If tests are failing, you can:

1. Run a single test file:
   ```bash
   NODE_OPTIONS=--experimental-vm-modules npx jest path/to/test/file.test.ts
   ```

2. Add debugging output:
   ```javascript
   console.log('Debug value:', value);
   ```

3. Run with verbose output:
   ```bash
   ./scripts/run-tests.sh --all --verbose
   ```

## Test Environment

The test environment is set up in the Jest configuration files:

- `config/jest.config.js` - Main Jest configuration
- `testing/jest.config.js` - Configuration for the testing directory

## Continuous Integration

Tests are run automatically on CI/CD pipelines. The pipeline will fail if any tests fail, so make sure to run tests locally before pushing changes.