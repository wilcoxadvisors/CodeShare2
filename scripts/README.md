# Scripts Directory

This directory contains utility and administration scripts for the financial management platform.

## Script Categories

### Chart of Accounts (CoA) Scripts

- `seed-coa-simple.js`: Seeds Chart of Accounts for clients that don't have any accounts using a standardized template
- `seed-existing-clients-coa.ts`: TypeScript version of the CoA seeding script with more detailed handling
- `coa-seeder.js`: Core CoA seeding functionality used by other scripts

### Admin & Cleanup Scripts

- `cleanup-admin-entities.ts`: Reduces Admin Client entities to a specified number
- `cleanup-clients.js`: Removes all clients except specified ones (OK, ONE1, Pepper)
- `cleanup-test-clients.js`: Removes test client data
- `cleanup-test-data.js`: Safely removes test clients and their associated Chart of Accounts data
- `cleanup-test-data.ts`: Comprehensive TypeScript cleanup script that safely removes test clients and all their associated data (accounts, journal entries, forecasts, etc.) while preserving specific test clients (IDs 1, 2, 7)

### Utilities

- `login.js`: Creates auth cookie for administrative tasks
- `create-excel-test-file.js`: Creates Excel test files from CSV for CoA import testing
- `verification-test.js`: Runs verification tests for various platform functionalities

## Archive

The `archive` directory contains older scripts that have been replaced by newer versions.

## Usage

Most scripts can be run directly with Node.js:

```bash
node scripts/seed-coa-simple.js
```

TypeScript scripts may need to be transpiled first or run with ts-node:

```bash
npx ts-node scripts/seed-existing-clients-coa.ts
# or 
npx tsx scripts/cleanup-test-data.ts
```

## Cleanup Test Data Script

The `cleanup-test-data.ts` script is designed to safely remove test data from the database. It follows a careful deletion process that respects foreign key constraints and preserves important system data.

### Features

- Identifies and removes test clients based on naming patterns
- Preserves specific test clients by ID (1, 2, 7)
- Handles all related data deletion in the correct order:
  1. User entity access records
  2. Journal entry files
  3. Journal entry lines
  4. Journal entries
  5. Accounts
  6. Locations
  7. Budgets and budget-related data
  8. Forecasts
  9. Fixed Assets
  10. Various reporting and activity data
  11. Entities
  12. Clients

### Usage

```bash
# Run the script
npx tsx scripts/cleanup-test-data.ts
```

### Warning

This script performs permanent deletion operations. Always ensure you have a database backup before running it in production environments.
