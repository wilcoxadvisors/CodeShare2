#!/bin/bash
# Runs the script to DELETE test clients/entities.

echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "!!! WARNING: THIS SCRIPT WILL PERMANENTLY DELETE TEST DATA !!!"
echo "!!!          (Excluding Client IDs defined in cleanup-test-data.ts, likely 1, 2, 7)          !!!"
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