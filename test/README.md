# Test Directory

This directory contains test scripts organized by feature area for testing various aspects of the application.

## Directory Structure

- **scripts/** - General test utility scripts for the app
- **industry-fix/** - Scripts for diagnosing and verifying fixes for industry value handling
- Other files in the root are related to consolidation groups feature testing

## Running Tests

Most test files can be run directly with Node.js:

```bash
# Run a JavaScript test
node test/industry-fix/test-industry-direct-db-check.cjs

# Run a TypeScript test
tsx test/consolidation-test.ts
```

## Test Directories

### industry-fix/

Contains tests for the industry value handling in entity creation and updates. These tests were created to troubleshoot an issue where industry values were not being saved correctly in the database.

Key files:
- `test-industry-direct-db-check.cjs` - Database schema inspection
- `test-industry-numeric-fix.cjs` - Direct SQL approach test
- `test-entity-update.js` - Entity update testing

### scripts/

Contains specialized test scripts for the consolidation groups feature:
- `test-consolidation-groups.ts` - Tests for consolidation group creation and management
- `test-consolidation-isolated.ts` - Isolated tests for consolidation functions

### Root Directory

Contains tests for consolidation groups feature:
- `consolidation-test.ts` - Basic consolidation functionality tests
- `enhanced-consolidation-tests.ts` - Advanced consolidation scenarios
- `test-junction-table.ts` - Tests for the junction table implementation