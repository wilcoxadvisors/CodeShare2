# Chart of Accounts Test Suite

This directory contains test scripts and data for validating the Chart of Accounts import/export functionality.

## Directory Structure

```
test-coa/
├── direct-test.js         # Helper utilities for making authenticated API requests
├── imports/               # Sample import files for testing
│   ├── test1-add-accounts.csv
│   ├── test1-add-accounts.xlsx
│   └── ...
├── results/               # Test results logs
├── run-import-tests.js    # Main script to run all import tests
├── test-csv-import.js     # CSV import specific tests
└── test-excel-import.js   # Excel import specific tests
```

## Prerequisites

Before running the tests, make sure:

1. The application server is running
2. You have valid admin credentials (username: admin, password: password123)
3. A test client exists (default ID: 236)

## Running Tests

### All Tests

To run all import/export tests:

```bash
node run-import-tests.js
```

### CSV-only Tests

To run only CSV import tests:

```bash
node test-csv-import.js
```

### Excel-only Tests

To run only Excel import tests:

```bash
node test-excel-import.js
```

### Custom Client ID

To run tests against a specific client:

```bash
node run-import-tests.js <clientId>
```

Replace `<clientId>` with the ID of the client you want to test with.

## Test Scenarios

The test suite covers the following scenarios:

1. **Adding new accounts** - Tests importing completely new accounts
2. **Updating existing accounts** - Tests modifying properties of existing accounts
3. **Mixed operations** - Tests simultaneously adding and updating accounts
4. **Error handling** - Tests validation for duplicate account codes and invalid parent references
5. **Export verification** - Verifies export format and field naming consistency

## Troubleshooting

### Authentication Issues

If you encounter authentication errors:

1. Delete the `.auth-cookies` file in the root directory
2. The test will automatically re-authenticate

### Database Connection Issues

If database connection errors occur:

1. Verify the database is running
2. Check database connection environment variables

### Import Failures

If specific imports fail:

1. Check the console output for error details
2. Examine the test file format for inconsistencies
3. Verify that any referenced parent accounts exist

## Test Results

Test results are logged to:

1. The console output
2. The `results/` directory with timestamped log files

## Extending the Tests

To add new test cases:

1. Create a new import file in the `imports/` directory
2. Add a test case in `test-csv-import.js` or `test-excel-import.js`
3. Run the tests to verify the new case

## Test Environment Variables

The tests use environment variables for configuration:

- `TEST_CLIENT_ID`: The client ID to use for testing (default: 236)
- `TEST_USERNAME`: The username for authentication (default: admin)
- `TEST_PASSWORD`: The password for authentication (default: password123)
- `BASE_URL`: The base URL for API requests (default: http://localhost:3000)
