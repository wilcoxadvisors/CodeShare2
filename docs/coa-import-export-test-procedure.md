# Chart of Accounts Import/Export Test Procedure

This document outlines the procedures for testing the Chart of Accounts (CoA) import and export functionality. The tests can be performed either manually or using the automated test scripts.

## Prerequisites

- Ensure the application server is running on port 5000
- Ensure you have an admin user account with credentials username=admin, password=password123
- Both manual and automated tests require the application to be running

## Manual Testing Procedure

To set up for manual testing, run the `test-coa-manual.js` script:

```bash
node scripts/test-coa-manual.js
```

This script will:
1. Create a test client with the prefix `COA_MANUAL_TEST_`
2. Seed the client with standard accounts
3. Display the client ID for reference during testing

### Manual Testing Steps

Once the test client is created, follow these steps:

1. **Login and Navigation**
   - Login to the application as admin
   - Navigate to the Chart of Accounts page
   - Select the test client from the header/context selector

2. **Export Testing**
   - Test CSV Export:
     - Click the "Export" button
     - Select CSV format
     - Verify the downloaded file contains all accounts with correct relationships
   
   - Test Excel Export:
     - Click the "Export" button
     - Select Excel format
     - Verify the downloaded file contains all accounts with correct relationships

3. **Import Testing - Valid Data**
   - Create a valid CSV file with new accounts or modifications to existing ones
   - Click the "Import" button
   - Select the CSV file
   - Verify the preview dialog shows the changes that will be made
   - Check the accuracy of accounts categorized as new, modified, or missing
   - Proceed with the import and verify changes are applied correctly
   - Repeat with an Excel file

4. **Import Testing - Invalid Data**
   - Create an invalid CSV file (e.g., with duplicate codes, missing required fields)
   - Click the "Import" button
   - Select the invalid CSV file
   - Verify the system displays appropriate validation errors
   - Repeat with an invalid Excel file

5. **Verification Testing**
   - Export the accounts after import
   - Compare with the original export
   - Verify all changes were correctly applied

## Automated Testing Procedure

To run the automated test suite, execute the `coa-test-suite.js` script:

```bash
node scripts/coa-test-suite.js
```

This script will:
1. Create a test client with the prefix `COA_TEST_`
2. Seed the client with standard accounts
3. Run CSV export/import tests
4. Run Excel export/import tests
5. Clean up by deleting temporary files and test clients
6. Generate a summary of test results

### Test Cases in Automated Suite

The automated test suite covers the following test cases:

1. **CSV Export Test**
   - Exports accounts to CSV
   - Verifies file contains expected content

2. **CSV Import - Valid Data**
   - Creates a valid CSV file with new accounts
   - Imports the file
   - Verifies accounts are correctly added

3. **CSV Import - Modified Data**
   - Creates a CSV with modifications to existing accounts
   - Imports the file
   - Verifies changes are correctly applied

4. **CSV Import - Invalid Data**
   - Creates an invalid CSV file
   - Attempts to import it
   - Verifies appropriate errors are returned

5. **Excel Export Test**
   - Exports accounts to Excel
   - Verifies file contains expected content

6. **Excel Import - Valid Data**
   - Creates a valid Excel file with new accounts
   - Imports the file
   - Verifies accounts are correctly added

7. **Excel Import - Modified Data**
   - Creates an Excel file with modifications to existing accounts
   - Imports the file
   - Verifies changes are correctly applied

8. **Excel Import - Invalid Data**
   - Creates an invalid Excel file
   - Attempts to import it
   - Verifies appropriate errors are returned

## Test Data Cleanup

After testing, you may want to clean up the test data. The automated test suite will attempt to do this automatically, but you may also want to manually clean up if needed:

```bash
node scripts/cleanup-test-data.js
```

This script will:
1. Delete any client with name starting with `COA_TEST_` or `COA_MANUAL_TEST_`
2. Delete any temporary files created during testing

## Troubleshooting

1. **Authentication Issues**
   - Ensure the cookies.txt file is being correctly created and used
   - Verify admin credentials are correct

2. **API Connection Issues**
   - Ensure the application is running on port 5000
   - Check for any CORS or network issues

3. **File Creation Issues**
   - Ensure the temp directory exists and is writable
   - Check for file permission issues

4. **Import/Export Failures**
   - Inspect network requests for error details
   - Check server logs for backend errors

## Important Notes

- The test scripts use the actual API endpoints, providing end-to-end testing
- Each test client created will have a timestamp appended to its name to ensure uniqueness
- The automated test suite will log detailed results to the console
- Both manual and automated tests validate the two-pass approach for handling hierarchical data
- Tests verify that parent-child relationships are correctly preserved during import/export
- The import UI has been simplified, removing explicit update strategy options in favor of default behaviors
- The import process now shows a clearer preview of changes with case-insensitive account code matching
- The "Cancel Import" button properly resets the import process