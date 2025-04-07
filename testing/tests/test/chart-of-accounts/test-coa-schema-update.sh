#!/bin/bash

# =============================================================
# Chart of Accounts Schema Update Verification Test Script
# =============================================================

echo "===== Testing Chart of Accounts Schema Updates ====="
echo "Date: $(date)"
echo ""

# Run the JavaScript test file
echo "Running test with node..."
node test/chart-of-accounts/coa-schema-update-verification.js

# Check if the test was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Schema update tests completed successfully"
else
  echo ""
  echo "❌ Schema update tests failed with exit code $?"
  exit 1
fi

# Save the test results to a file
RESULT_FILE="test/chart-of-accounts/schema-update-test-output.txt"
echo "Saving test results to $RESULT_FILE"
node test/chart-of-accounts/coa-schema-update-verification.js > "$RESULT_FILE" 2>&1

echo ""
echo "===== Test Complete ====="