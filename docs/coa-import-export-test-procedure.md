# Chart of Accounts Import/Export Test Procedure

This document outlines the procedure for testing the Chart of Accounts import and export functionality, both manually and through automated scripts.

## Prerequisites

1. The application server must be running on `http://localhost:5000`
2. You must have valid admin credentials (default: username `admin`, password `password123`)

## Manual Testing Procedure

### Setup

1. Log in to the application with admin credentials
2. Navigate to the Clients page and create a test client (e.g., "IMPORT_TEST_MANUAL")
3. Select the test client in the header or context selector

### Export Testing

1. Navigate to the Chart of Accounts page
2. Verify that the client has accounts listed (if not, use the seeding script or create some accounts manually)
3. Click the "Export" button and select CSV format
4. Verify that a CSV file downloads with the correct account information
5. Click the "Export" button again and select Excel format
6. Verify that an Excel file downloads with the correct account information
7. Open both files to confirm they contain the same accurate account information

### Import Testing - Valid Data

1. Modify the exported CSV or Excel file to add a few new accounts
   - Ensure you follow proper formatting (Code, Name, Type, Subtype, IsSubledger, SubledgerType, Active, Description)
   - Make sure the account types are valid (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
   - Add parent-child relationships if desired
2. Navigate to the Chart of Accounts page
3. Click the "Import" button and select your modified file
4. Verify that the import succeeds with a success message
5. Check that the new accounts appear in the account list
6. Verify that the parent-child relationships are correctly established

### Import Testing - Invalid Data

1. Create a new CSV or Excel file with deliberate errors:
   - Invalid account types
   - Missing required fields
   - Duplicate account codes
   - Invalid parent codes
   - Type mismatch between parent and child accounts
2. Navigate to the Chart of Accounts page
3. Click the "Import" button and select your invalid file
4. Verify that the import fails with appropriate error messages
5. Check that no changes were made to the account structure

### Data Integrity Testing

1. Create accounts via import that have transactions associated with them (or simulate this)
2. Attempt to delete these accounts via another import
3. Verify that accounts with transactions cannot be deleted
4. Attempt to modify critical fields (like type) for accounts with transactions
5. Verify that only allowed modifications are permitted

## Automated Testing

### Setup and Run Test Suite

1. Ensure the application server is running
2. Open a terminal window and navigate to the project directory
3. Run the login script to set up authentication:
   ```
   node scripts/login.js
   ```
4. Run the CoA import/export test script:
   ```
   node scripts/test-coa-import-export.js
   ```
5. Review the test output in the console to verify all tests passed
   - Test results summary will show total tests, passed tests, failed tests, and success rate
   - Each test result includes detailed metrics when appropriate (e.g., number of accounts added, updated, or skipped)

### Test Cases Covered by the Automated Script

1. **Export to CSV**: Tests exporting the Chart of Accounts to CSV format
   - Verifies file is created successfully
   - Verifies account count matches expected count
   - Validates CSV structure and required headers (code, name, type)
   - Checks column formatting and data integrity

2. **Export to Excel**: Tests exporting the Chart of Accounts to Excel format
   - Verifies file is created successfully
   - Verifies account count matches expected count
   - Validates Excel workbook structure and sheet formatting
   - Confirms data type consistency across cells

3. **Import valid CSV**: Tests importing a valid CSV file with new accounts
   - Tracks number of accounts added, updated, and skipped
   - Verifies data integrity before and after import
   - Validates that hierarchical relationships are preserved
   - Tests handling of special characters and formatting
   - Confirms performance with large datasets

4. **Import valid Excel**: Tests importing a valid Excel file with new accounts
   - Tracks number of accounts added, updated, and skipped
   - Verifies data integrity before and after import
   - Validates that hierarchical relationships are preserved
   - Tests handling of different Excel formats (xlsx, xls)
   - Validates proper cell formatting interpretation

5. **Import invalid data**: Tests that invalid data is properly rejected
   - Verifies proper error handling and validation messages
   - Confirms no partial imports occurred (transaction rollback)
   - Validates that existing data remains unchanged
   - Tests various validation scenarios (missing fields, invalid types)
   - Checks boundary conditions (empty files, oversized data)

6. **Data integrity**: Tests protection of accounts with transaction history
   - Verifies accounts with transactions cannot be deleted
   - Confirms only allowed field modifications are permitted
   - Tests edge cases around account modification restrictions
   - Validates parent-child relationship integrity

### Cleanup

After testing, you can clean up test data using the cleanup script:
```
node scripts/cleanup-test-data.js --all-test
```

This will remove all clients whose names start with "IMPORT_TEST_".

## Expected Results

- Both manual and automated tests should complete without errors
- Export functionality should generate valid, properly formatted files
  - CSV exports should contain all required columns with correct data types
  - CSV files should properly handle special characters and escaping
  - Excel exports should maintain data integrity and proper cell formatting
  - All account relationships and metadata should be correctly exported
- Import functionality should correctly process valid files and reject invalid ones
  - Valid imports should update the database with the correct number of accounts
  - Error handling should prevent partial imports of invalid data (transaction rollback)
  - Detailed metrics should be provided for imported accounts (added, updated, skipped)
  - Performance should remain consistent with large datasets
  - Parent-child relationships should be correctly established
- Data integrity controls should prevent unauthorized modifications to accounts with transactions
  - Accounts with transactions should be protected from deletion
  - Critical fields (type, code) should be protected from modification when transactions exist
  - Modification of non-critical fields should be allowed while maintaining transaction integrity
- The system should handle parent-child relationships correctly during both import and export
  - Hierarchical relationships should be preserved after import/export cycles
  - Parent accounts should be created before child accounts during import
  - Orphaned accounts should be handled properly with appropriate error messages

## Troubleshooting

If tests fail:

1. Check that the application server is running on port 5000
2. Verify that authentication is working (cookies.txt file should exist after running login.js)
3. Check console logs for specific error messages
4. Verify that the database is accessible and properly configured
5. For network-related failures, check firewall settings and ensure the server is reachable
6. Validate test file formats:
   - CSV headers should match expected column names exactly
   - Excel files should be in .xlsx format (not .xls) 
   - Check for special characters or encoding issues in test files
7. For import failures, examine validation errors in detail:
   - Account types must be one of: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
   - Account codes must be unique within a client
   - Parent accounts must exist before child accounts are created
8. For performance issues:
   - Check system resource usage during large imports
   - Verify database connection pool settings
   - Consider breaking large imports into smaller batches
