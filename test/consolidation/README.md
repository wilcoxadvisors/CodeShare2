# Consolidation Tests

This directory contains test scripts for the consolidation functionality of the financial management platform, which allows consolidating financial data across multiple entities.

## Test Files

### consolidation-test.ts

Basic tests for the consolidation functionality, including:
- Creating consolidation groups
- Adding entities to groups
- Basic consolidation operations

### enhanced-consolidation-tests.ts

More advanced tests for consolidation scenarios:
- Multi-currency consolidation
- Complex elimination entries
- Multi-level consolidation hierarchies

### test-consolidation-db.ts

Tests specifically focused on database operations related to consolidation:
- Storing consolidation groups
- Retrieving consolidated data
- Performance tests for large data sets

### test-consolidation-fix.ts

Tests that verify fixes for specific consolidation issues:
- Handling of rounding errors
- Proper currency translation
- Intercompany transaction elimination

### verify-consolidation-methods.ts

Verification tests for individual consolidation methods:
- Data aggregation
- Elimination entries
- Currency translation
- Minority interest calculation

### verify-consolidation-cleanup.ts

Tests that ensure proper cleanup after consolidation operations:
- Temporary tables
- Working data
- Cache invalidation

### consolidation-group-methods-old.ts

Archive of an older implementation of consolidation methods, kept for reference and comparison.

## Scripts Directory

The `scripts/` subdirectory contains specialized test scripts for consolidation:

### scripts/test-consolidation-groups.ts

Tests specifically for consolidation group management:
- Creating groups
- Updating group settings
- Deleting groups
- Managing group memberships

### scripts/test-consolidation-isolated.ts

Isolated tests for consolidation functions:
- Unit tests for consolidation algorithms
- Edge cases and error handling
- Performance benchmarks

## Running the Tests

```bash
# Run the basic consolidation test
tsx test/consolidation/consolidation-test.ts

# Run the enhanced consolidation tests
tsx test/consolidation/enhanced-consolidation-tests.ts

# Run database-specific tests
tsx test/consolidation/test-consolidation-db.ts

# Run the consolidation group tests
tsx test/consolidation/scripts/test-consolidation-groups.ts
```

Note: These tests typically require a database with test data already loaded. Some tests may modify the database, so it's recommended to run them against a test database, not a production environment.