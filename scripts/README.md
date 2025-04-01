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
```