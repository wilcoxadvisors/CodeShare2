# Test Directory Structure

This directory contains test files organized by feature/domain.

## Directory Structure

- `chart-of-accounts/`: Tests for Chart of Accounts functionality
- `coa-import-export/`: Tests for CoA import/export functionality
   - `test-files/`: Sample CSV and Excel files for testing imports
- `journal-entries/`: Tests for journal entry functionality
- `location-management/`: Tests for location filtering and management

## Running Tests

Tests can be run using Node.js:

```bash
node test/coa-import-export/test-coa-import-export.js
```

## Test Files

Most test files are self-contained, with setup and teardown functionality to create test clients and clean up after testing.