# Chart of Accounts Tests

This directory contains test scripts for the Chart of Accounts functionality, including client-specific account management and hierarchical account structure.

## Test Scripts

### test-accounts-api.sh

A shell script that tests the client-specific Chart of Accounts API endpoints. It performs these operations:

1. Authentication with an admin user
2. Fetching the initial list of accounts for a client
3. Creating a new account
4. Fetching the created account
5. Updating the account
6. Fetching the updated account
7. Deleting the account
8. Verifying the deletion

This test verifies that all basic CRUD operations work with the client-specific Chart of Accounts implementation.

### test-accounts-tree-api.sh

A shell script that specifically tests the hierarchical account tree API endpoint. It:

1. Authenticates with an admin user
2. Fetches the account tree hierarchy for a specific client
3. Verifies that the response contains the expected structure with children references

This test ensures that the tree-based endpoint correctly returns the hierarchy structure of accounts.

### test-account-hierarchy.sh

A comprehensive test script for account hierarchy creation and verification. It:

1. Authenticates with an admin user
2. Creates a parent account
3. Creates multiple child accounts that reference the parent
4. Creates a grandchild account (child of a child)
5. Fetches the account tree hierarchy
6. Verifies that the hierarchy structure is correct:
   - Parent has the expected number of children
   - Child 1 has a grandchild
   - Child 2 has no children
   - Grandchild is in the correct position in the tree

This test ensures that the account hierarchy can be properly created, maintained, and retrieved.

### test-coa-schema-update.sh

A comprehensive test script specifically designed to verify the schema updates made to the accounts table. It tests:

1. Application of the SQL migration if it hasn't been applied yet
2. The unique constraint on accountCode scoped to clientId
3. The foreign key constraint with onDelete: 'restrict' for parentId
4. The new fields (fsliBucket, internalReportingBucket, item)
5. Basic CRUD operations with the updated schema
6. Account hierarchy retrieval to ensure it still works with the schema changes

This test is crucial for validating the schema changes made in Task B.1.

### chart-of-accounts.js

A Node.js script that performs automated testing of the Chart of Accounts API endpoints. It's the JavaScript implementation of what test-accounts-api.sh does, with more detailed verification of field values.

### coa-schema-update-verification.js

A JavaScript test script that performs detailed verification of the schema changes. It's executed by test-coa-schema-update.sh and performs comprehensive testing of all constraints and new fields.

## Running the Tests

```bash
# Run the API test
./test/chart-of-accounts/test-accounts-api.sh

# Run the tree API test
./test/chart-of-accounts/test-accounts-tree-api.sh  

# Run the hierarchy test
./test/chart-of-accounts/test-account-hierarchy.sh

# Run the schema update verification test
./test/chart-of-accounts/test-coa-schema-update.sh
```

## Output Files

The tests generate several output files:

- `test-output.txt` - Contains the output from the chart-of-accounts.js test
- `test-tree-output.txt` - Contains the raw JSON response from the tree API test
- `hierarchy-tree-output.json` - Contains the full tree hierarchy response
- `hierarchy-extract.json` - Contains the extracted parent-child-grandchild test hierarchy

These files are useful for debugging and verifying the test results.