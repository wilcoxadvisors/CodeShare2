# Chart of Accounts Import/Export Test Procedure

This document outlines the step-by-step procedure for testing the Chart of Accounts import/export functionality in the Wilcox Advisors Accounting System. It covers both CSV and Excel formats and includes test cases for various scenarios.

## Prerequisites

- Access to the Wilcox Advisors Accounting System (test environment preferred)
- Administrative user credentials
- Test client account with an initialized Chart of Accounts
- Spreadsheet software for editing test files (e.g., Microsoft Excel, Google Sheets)
- Testing credentials: username "admin" with password "password123"

## Test Environment Setup

1. Log in to the system using the admin account credentials
2. Create a test client specifically for import/export testing
3. Note the client ID for use in testing scripts
4. Verify the client has a basic Chart of Accounts seeded

## Export Testing

### CSV Export Testing

1. Navigate to the Chart of Accounts page for the test client
2. Click the "Export" button and select CSV format
3. Save the exported file
4. Open the file in a text editor or spreadsheet application
5. Verify the following:
   - The file contains all accounts from the client's Chart of Accounts
   - The first row contains the correct headers
   - The "AccountCode" field name is present (not "code")
   - All required columns are present
   - Data is correctly formatted

### Excel Export Testing

1. Navigate to the Chart of Accounts page for the test client
2. Click the "Export" button and select Excel format
3. Save the exported file
4. Open the file in a spreadsheet application
5. Verify the following:
   - The file contains all accounts from the client's Chart of Accounts
   - The first row contains the correct headers
   - The "AccountCode" field name is present (not "code")
   - All required columns are present
   - Data is correctly formatted

## Import Testing

### Test Case 1: Adding New Accounts

1. Create a new CSV or Excel file with the following structure:
   ```
   AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
   9100,Test Revenue,REVENUE,sales,FALSE,,TRUE,Test revenue account,
   9110,Test Product Sales,REVENUE,sales,FALSE,,TRUE,Test product sales,9100
   9200,Test Expense,EXPENSE,operating_expense,FALSE,,TRUE,Test expense account,
   ```
2. Save the file as `test1-add-accounts.csv` or `test1-add-accounts.xlsx`
3. Navigate to the Chart of Accounts page for the test client
4. Click the "Import" button and select the appropriate format
5. Upload the test file
6. Confirm the import
7. Verify the following:
   - The three new accounts appear in the Chart of Accounts
   - All fields are correctly imported
   - The parent-child relationship is established

### Test Case 2: Updating Existing Accounts

1. Export the current Chart of Accounts to CSV or Excel
2. Edit the file to modify some existing accounts:
   - Change the name of an account
   - Change the description of an account
   - Change a boolean field (Active, IsSubledger)
3. Save the file as `test2-update-accounts.csv` or `test2-update-accounts.xlsx`
4. Import the modified file
5. Verify the following:
   - The changes to existing accounts are applied
   - No duplicate accounts are created
   - Related accounts and relationships remain intact

### Test Case 3: Mixed Operations (Add & Update)

1. Create a new CSV or Excel file with both new accounts and modifications to existing accounts
2. Save the file as `test3-mixed-operations.csv` or `test3-mixed-operations.xlsx`
3. Import the file
4. Verify the following:
   - New accounts are added
   - Existing accounts are updated
   - No errors occur during the import

### Test Case 4: Error Handling - Duplicate Account Codes

1. Create a CSV or Excel file with duplicate account codes:
   ```
   AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
   9800,Test Account 1,ASSET,current_asset,FALSE,,TRUE,First test account,
   9800,Test Account 2,ASSET,current_asset,FALSE,,TRUE,Second test account with same code,
   ```
2. Attempt to import the file
3. Verify that:
   - The system reports an error about duplicate account codes
   - No accounts from the file are imported
   - The system provides clear error messaging

### Test Case 5: Error Handling - Invalid Parent References

1. Create a CSV or Excel file with invalid parent references:
   ```
   AccountCode,Name,Type,Subtype,IsSubledger,SubledgerType,Active,Description,ParentCode
   9900,Test Parent,ASSET,current_asset,FALSE,,TRUE,Test parent account,
   9910,Test Child,ASSET,current_asset,FALSE,,TRUE,Test child account,99999
   ```
2. Attempt to import the file
3. Verify that:
   - The system reports an error about invalid parent references
   - The system provides clear error messaging about which parent code is invalid

## API Testing

For automated testing, use the following API endpoints:

### Export API

- CSV: `GET /api/clients/:clientId/accounts/export?format=csv`
- Excel: `GET /api/clients/:clientId/accounts/export?format=excel`

### Import API

- `POST /api/clients/:clientId/accounts/import`
- Form data parameters:
  - `file`: The file to import
  - `format`: "csv" or "excel"

## Automated Testing Scripts

Automated testing scripts are available in the `test-coa` directory:

- `direct-test.js`: Helper utilities for API testing with session handling
- `test-csv-import.js`: Tests for CSV import functionality
- `test-excel-import.js`: Tests for Excel import functionality
- `run-import-tests.js`: Runner script that executes all import tests

To run the automated tests:

```bash
cd test-coa
node run-import-tests.js
```

## Test Results Documentation

After completing the tests, document the results in the following format:

| Test Case | CSV Result | Excel Result | Notes |
|-----------|------------|--------------|-------|
| Export Field Names | Pass/Fail | Pass/Fail | |
| Adding New Accounts | Pass/Fail | Pass/Fail | |
| Updating Existing Accounts | Pass/Fail | Pass/Fail | |
| Mixed Operations | Pass/Fail | Pass/Fail | |
| Duplicate Account Codes | Pass/Fail | Pass/Fail | |
| Invalid Parent References | Pass/Fail | Pass/Fail | |

For any failures, include detailed notes on the nature of the failure and steps to reproduce.
