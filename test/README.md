# Test Directory

This directory contains test scripts organized by feature area for testing various aspects of the application.

## Directory Structure

- **chart-of-accounts/** - Tests for the Chart of Accounts functionality, including client-specific and hierarchical features
- **consolidation/** - Tests and archived files related to the consolidation group functionality
- **industry-fix/** - Scripts for diagnosing and verifying fixes for industry value handling
- **scripts/** - General test utility scripts for the app
- Other files in the root are related to various feature tests

## Running Tests

Most test files can be run directly with Node.js or as shell scripts:

```bash
# Run a JavaScript test
node test/industry-fix/test-industry-direct-db-check.cjs

# Run a TypeScript test
tsx test/consolidation/consolidation-test.ts

# Run a shell script test
./test/chart-of-accounts/test-accounts-api.sh
```

## Test Directories

### chart-of-accounts/

Contains tests for the Chart of Accounts functionality including client-specific and hierarchical features.

Key files:
- `test-accounts-api.sh` - Tests for client-specific Chart of Accounts API endpoints
- `test-accounts-tree-api.sh` - Tests for hierarchical account tree API endpoints
- `test-account-hierarchy.sh` - Comprehensive tests for account hierarchy operations

See the [chart-of-accounts/README.md](./chart-of-accounts/README.md) for more details.

### consolidation/

Contains tests and archived files related to the consolidation group functionality.

Key files:
- `consolidation-test.ts` - Basic consolidation functionality tests
- `enhanced-consolidation-tests.ts` - Advanced consolidation scenarios
- `test-consolidation-db.ts` - Database-specific consolidation tests
- `test-consolidation-fix.ts` - Test for consolidation fixes
- `verify-consolidation-methods.ts` - Verification tests for consolidation methods
- `consolidation-group-methods-old.ts` - Archive of older implementation of consolidation methods
- `scripts/` - Specialized consolidation test scripts

See the [consolidation/README.md](./consolidation/README.md) for more details.

### industry-fix/

Contains tests for the industry value handling in entity creation and updates. These tests were created to troubleshoot an issue where industry values were not being saved correctly in the database.

Key files:
- `test-industry-direct-db-check.cjs` - Database schema inspection
- `test-industry-numeric-fix.cjs` - Direct SQL approach test
- `test-entity-update.js` - Entity update testing

### scripts/

Contains utility scripts and specialized test scripts:
- Various test utilities that aren't feature-specific

Note: Consolidation-specific scripts have been moved to the consolidation/scripts directory.

### Root Directory

Contains additional tests for various features:
- `test-junction-table.ts` - Tests for the junction table implementation
- `dashboard-client-actions.js` - Tests for client actions on the dashboard

Note: Most feature-specific tests have been moved to their respective directories.