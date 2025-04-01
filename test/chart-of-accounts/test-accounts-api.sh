#!/bin/bash

# Test script for Chart of Accounts API

echo "===== Running Chart of Accounts API Test ====="
echo "Date: $(date)"
echo

# Run the Node.js test script
node test/chart-of-accounts.js

# Check if the test was successful
if [ $? -eq 0 ]; then
  echo
  echo "✅ Test script executed successfully"
else
  echo
  echo "❌ Test script failed with exit code $?"
fi

# Save the test results to a file
echo "Saving test results to test/chart-of-accounts/test-output.txt"
node test/chart-of-accounts/chart-of-accounts.js > test/chart-of-accounts/test-output.txt 2>&1

echo
echo "===== Test Complete ====="