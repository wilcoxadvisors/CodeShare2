#!/bin/bash

# Print script header
echo "====================================="
echo "Running test suite for accounting app"
echo "====================================="

# Set test types based on arguments or default to all
TEST_TYPE=${1:-"all"}

if [ "$TEST_TYPE" = "unit" ] || [ "$TEST_TYPE" = "all" ]; then
  echo "\n📋 Running unit tests..."
  npx jest --config=jest.config.mjs --detectOpenHandles --runInBand test/*.test.ts
fi

if [ "$TEST_TYPE" = "e2e" ] || [ "$TEST_TYPE" = "all" ]; then
  echo "\n🌐 Running E2E tests..."
  # Make sure the app is running when executing E2E tests
  npx cypress run
fi

echo "\n✅ Tests completed!"