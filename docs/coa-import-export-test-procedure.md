# Chart of Accounts Import/Export Test Procedure

This document outlines the manual test procedure for verifying the Chart of Accounts (CoA) import and export functionality works correctly.

## Prerequisites

1. Admin access to the application
2. A test client with an existing Chart of Accounts
3. Test CSV and Excel files (located in `/test/coa-import-export/`)

## Test Procedure

### A. Export Functionality Tests

#### A1. CSV Export Test

1. Log in as an Admin user
2. Navigate to a client's Chart of Accounts page
3. Click the "Export" button
4. Select "CSV" format
5. Verify the CSV file downloads correctly
6. Open the CSV file and confirm:
   - All accounts are included
   - Column headers are correct (Code, Name, Type, Subtype, etc.)
   - Parent-child relationships are correctly represented
   - Data integrity is maintained (no corrupted characters, etc.)

#### A2. Excel Export Test

1. Log in as an Admin user
2. Navigate to a client's Chart of Accounts page
3. Click the "Export" button
4. Select "Excel" format
5. Verify the Excel file downloads correctly
6. Open the Excel file and confirm:
   - All accounts are included
   - Column headers are correct (Code, Name, Type, Subtype, etc.)
   - Parent-child relationships are correctly represented
   - Formatting is clean and readable

### B. Import Functionality Tests

#### B1. Valid CSV Import Test

1. Log in as an Admin user
2. Navigate to a client's Chart of Accounts page
3. Click the "Import" button
4. Select "CSV" format
5. Upload the valid test file (`valid_import.csv`)
6. Verify the import preview shows correctly
7. Confirm the import
8. Verify:
   - New accounts are added correctly
   - Parent-child relationships are established
   - No duplicate accounts are created
   - Import summary shows correct counts (added, updated, skipped)

#### B2. Valid Excel Import Test

1. Log in as an Admin user
2. Navigate to a client's Chart of Accounts page
3. Click the "Import" button
4. Select "Excel" format
5. Upload the valid test file (`valid_import.xlsx`)
6. Verify the import preview shows correctly
7. Confirm the import
8. Verify:
   - New accounts are added correctly
   - Parent-child relationships are established
   - No duplicate accounts are created
   - Import summary shows correct counts (added, updated, skipped)

#### B3. Invalid Import Rejection Test

1. Log in as an Admin user
2. Navigate to a client's Chart of Accounts page
3. Click the "Import" button
4. Upload the invalid test file (`invalid_import.csv`)
5. Verify:
   - Validation errors are shown clearly
   - The import is rejected (no data is changed)
   - Error messages are specific and actionable
   - User can return to the CoA view without data corruption

### C. Data Integrity Tests

#### C1. Transaction Protection Test

1. Create a test account and add a transaction using that account
2. Attempt to delete this account via import (by excluding it from import file)
3. Verify:
   - The account with transaction history cannot be deleted
   - The import process continues without error
   - Import summary shows account was skipped with appropriate reason

#### C2. Field Modification Test

1. Identify an account with transaction history
2. Prepare an import file that modifies:
   - Non-financial fields (name, description) - should succeed
   - Financial fields (type, code) - should be rejected
3. Import the file and verify correct behavior on both types of modifications

#### C3. Duplicate Detection Test

1. Prepare an import file with duplicate account codes
2. Import the file
3. Verify:
   - Validation catches the duplicates
   - Appropriate error messages are shown
   - No partial import occurs (all or nothing)

## Test Scenarios (Combined)

### Full End-to-End Test

1. Export existing accounts to both CSV and Excel
2. Make controlled changes to both exported files:
   - Add new accounts
   - Modify existing accounts
   - Add parent-child relationships
3. Import the modified files one at a time
4. Verify all changes are applied correctly
5. Export again and verify the new exports match the expected state

## Reporting Results

For each test case, document:
- Test date and tester name
- Pass/Fail status
- Any unexpected behavior or errors
- Browser and device used for testing
- Screenshots of any issues encountered

## Clean-Up Procedure

After completing tests:
1. Run the cleanup script to remove test clients:
   ```
   node scripts/cleanup-test-data.js --client-id=<test_client_id>
   ```
2. Verify test clients and their data are completely removed