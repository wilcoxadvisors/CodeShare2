#!/bin/bash
# WARNING: This script permanently deletes test clients and associated data.
# Ensure you have a database backup before running.
# Verify CLIENT_IDS_TO_KEEP in scripts/cleanup-test-data.ts first!

echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "!!! WARNING: DESTRUCTIVE ACTION !!!"
echo "This script will delete clients with 'Test' in their name"
echo "(excluding IDs in CLIENT_IDS_TO_KEEP) and all their related"
echo "entities and accounts from the database."
echo "!!!          Backup your database before running!          !!!"
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo # Move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Executing test data cleanup script..."
    npx tsx ./scripts/cleanup-test-data.ts "$@"
    echo "Cleanup script execution finished."
else
    echo "Cleanup cancelled."
fi