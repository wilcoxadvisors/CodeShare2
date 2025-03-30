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

## Test Data Cleanup Script

### Purpose
The `cleanup-test-data.ts` script safely removes test clients and their associated data (entities, accounts) from the database, while protecting essential core clients.

### When to Use
This script should be run:
- When you need to clean up test data after development or testing cycles
- Before deploying to production to ensure a clean database
- Periodically to maintain database hygiene by removing test data

### ⚠️ WARNINGS ⚠️
- **THIS IS A DESTRUCTIVE OPERATION** that permanently deletes data
- **ALWAYS BACKUP YOUR DATABASE** before running this script
- Verify the `CLIENT_IDS_TO_KEEP` constant in the script to ensure critical clients are protected
- Run in a staging environment first to verify behavior

### How to Run
Run the script using one of these methods:

#### Option 1: Using the Shell Script (Recommended)
```bash
./scripts/cleanup-test-data.sh
```
This includes confirmation prompts and warnings.

#### Option 2: Using npx directly
```bash
npx tsx scripts/cleanup-test-data.ts
```
**CAUTION:** This method skips the confirmation prompts.

### What It Does
1. Identifies all clients with "Test" in their name (case-insensitive)
2. Filters out any clients whose IDs are in the protected list (`CLIENT_IDS_TO_KEEP`)
3. For each remaining test client:
   - Deletes associated user entity access records
   - Deletes accounts linked to the client
   - Deletes entities owned by the client
   - Finally deletes the client record itself
4. Uses database transactions to ensure consistency
5. Provides detailed logs of all operations

### Safety Features
- Uses the `CLIENT_IDS_TO_KEEP` safeguard to prevent deletion of critical clients
- Interactive confirmation prompt in the shell script
- Transaction-based operations ensure all-or-nothing deletion for each client
- Detailed logging for audit purposes

### Output
The script provides detailed console output showing:
- Total number of "Test" clients found
- Clients in the protected list that will be skipped
- Clients selected for deletion
- Number of entities, accounts, and access records deleted for each client
- Success and failure counts
- Summary of operations

### Notes
- This script is intended for manual execution only after careful review
- It should never be run automatically or as part of CI/CD pipelines
- Always verify the `CLIENT_IDS_TO_KEEP` array before running
- The script can be customized to target different naming patterns if needed