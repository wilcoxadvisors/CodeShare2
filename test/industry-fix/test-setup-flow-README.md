# Setup Flow Test Script

This script provides end-to-end testing of the client setup workflow. It verifies that:

1. Client creation works properly
2. Entity creation works with proper client association
3. Dashboard refresh works after the setup is completed

## Usage

To run the test:

```bash
node test-setup-flow.js
```

This will run the test and leave the created test data in the database.

## Cleanup Mode

To automatically delete the test data after a successful test run:

```bash
CLEANUP=true node test-setup-flow.js
```

This will clean up all entities and the client created during the test.

## Customizing Test Data

The test client and entity data is defined at the top of the script. You can modify these variables to test with different data:

- `testClientData`: Contains the client information
- `testEntities`: Array of entity data to be created

## Authentication

The script authenticates as the admin user. The default credentials are:
- Username: admin
- Password: password123

## Implementation Details

1. The script uses axios with cookie jar support to maintain session state across requests
2. It first creates a client
3. Then creates entities associated with that client
4. Fetches the dashboard data to verify the client is present
5. Optionally cleans up by deleting entities and the client