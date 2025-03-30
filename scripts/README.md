# Utility Scripts

This directory contains utility scripts for database management and maintenance.

## Chart of Accounts Seeder for Existing Clients

### Purpose
The `seed-existing-clients-coa.ts` script identifies clients in the database that don't have any accounts (no Chart of Accounts) and seeds them with the standard Chart of Accounts template defined in `server/coaTemplate.ts`.

### When to Use
This script should be run:
- After migrating from entity-based accounts to client-based accounts
- When you identify clients that don't have a proper Chart of Accounts
- As part of a recovery process if account data is lost

### How to Run
Run the script using one of these methods:

#### Option 1: Using the Shell Script
```bash
./scripts/seed-existing-coa.sh
```

#### Option 2: Using npx directly
```bash
npx tsx scripts/seed-existing-clients-coa.ts
```

### What It Does
1. Scans the database for all clients
2. For each client, checks if they have any accounts
3. For clients without accounts, seeds the standard Chart of Accounts template
4. Maintains proper parent-child relationships in the account hierarchy
5. Includes detailed logging of the process
6. Reports success/failure statistics

### Output
The script will provide detailed console output showing:
- Total number of clients found
- Clients without accounts that need seeding
- Progress of each seeding operation
- Errors encountered during the process
- Summary of successful and failed operations

### Safety Features
- Performs multiple checks to ensure clients exist before attempting to seed
- Double-checks that clients don't have accounts before proceeding with seeding
- Uses database transactions to ensure consistency
- Only targets clients without accounts, leaving existing accounts untouched

### Notes
- This script is intended for administrative use only
- Always back up your database before running maintenance scripts
- The script does not affect any existing account data