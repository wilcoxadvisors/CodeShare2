#!/bin/bash
# Main test script for running all tests in the project
# This script allows running different types of tests based on arguments

echo "🧪 Running tests..."
echo "===================================="

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print usage
print_usage() {
  echo -e "Usage: ./scripts/run-tests.sh [options]"
  echo -e "Options:"
  echo -e "  ${YELLOW}--all${NC}                Run all tests"
  echo -e "  ${YELLOW}--unit${NC}               Run unit tests only"
  echo -e "  ${YELLOW}--integration${NC}        Run integration tests only"
  echo -e "  ${YELLOW}--storage${NC}            Run storage tests only"
  echo -e "  ${YELLOW}--coa${NC}                Run Chart of Accounts tests only"
  echo -e "  ${YELLOW}--api${NC}                Run API endpoint tests only"
  echo -e "  ${YELLOW}--coverage${NC}           Generate test coverage report"
  echo -e "  ${YELLOW}--watch${NC}              Run tests in watch mode"
  echo -e "  ${YELLOW}--help${NC}               Display this help message"
  echo -e "\nExamples:"
  echo -e "  ./scripts/run-tests.sh --unit"
  echo -e "  ./scripts/run-tests.sh --all --coverage"
}

# Function to report status
report_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2 passed${NC}"
  else
    echo -e "${RED}❌ $2 failed${NC}"
    GLOBAL_ERROR=1
  fi
  echo ""
}

# Default values
RUN_ALL=false
RUN_UNIT=false
RUN_INTEGRATION=false
RUN_STORAGE=false
RUN_COA=false
RUN_API=false
COVERAGE=false
WATCH=false
GLOBAL_ERROR=0

# Parse arguments
if [ $# -eq 0 ]; then
  print_usage
  exit 1
fi

while [ "$1" != "" ]; do
  case $1 in
    --all )          RUN_ALL=true
                     ;;
    --unit )         RUN_UNIT=true
                     ;;
    --integration )  RUN_INTEGRATION=true
                     ;;
    --storage )      RUN_STORAGE=true
                     ;;
    --coa )          RUN_COA=true
                     ;;
    --api )          RUN_API=true
                     ;;
    --coverage )     COVERAGE=true
                     ;;
    --watch )        WATCH=true
                     ;;
    --help )         print_usage
                     exit 0
                     ;;
    * )              print_usage
                     exit 1
  esac
  shift
done

# Build Jest command based on options
JEST_CMD="NODE_OPTIONS=--experimental-vm-modules npx jest"

# Add coverage if requested
if [ "$COVERAGE" = true ]; then
  JEST_CMD="$JEST_CMD --coverage"
fi

# Add watch mode if requested
if [ "$WATCH" = true ]; then
  JEST_CMD="$JEST_CMD --watch"
fi

# Function to run tests with specific config and pattern
run_tests() {
  local config=$1
  local pattern=$2
  local description=$3
  
  echo -e "\n${BLUE}Running $description...${NC}"
  
  if [ -n "$config" ]; then
    eval "$JEST_CMD --config=$config $pattern"
  else
    eval "$JEST_CMD $pattern"
  fi
  
  report_status $? "$description"
}

# Run tests based on options
if [ "$RUN_ALL" = true ]; then
  # Run main Jest tests
  run_tests "config/jest.config.js" "" "Main Jest tests"
  
  # Run testing directory tests
  run_tests "testing/jest.config.js" "" "Testing directory tests"
  
elif [ "$RUN_UNIT" = true ]; then
  # Run unit tests
  run_tests "config/jest.config.js" "./server/**/*.test.ts ./shared/**/*.test.ts" "Unit tests"
  run_tests "testing/jest.config.js" "./tests/test/unit/**/*.test.js" "Additional unit tests"
  
elif [ "$RUN_INTEGRATION" = true ]; then
  # Run integration tests
  run_tests "testing/jest.config.js" "./tests/test/**/*.test.js" "Integration tests"
  
elif [ "$RUN_STORAGE" = true ]; then
  # Run storage tests
  run_tests "testing/jest.config.js" "./tests/test/storage/**/*.test.ts" "Storage tests"
  
elif [ "$RUN_COA" = true ]; then
  # Run Chart of Accounts tests
  run_tests "testing/jest.config.js" "./coa-import.test.js ./tests/test-coa/**/*.test.js ./tests/test/unit/chartOfAccounts.test.js" "Chart of Accounts tests"
  
elif [ "$RUN_API" = true ]; then
  # Test API endpoints (without running actual tests)
  echo -e "\n${BLUE}Running API endpoint tests...${NC}"
  node scripts/test-entity-api-endpoints.js
  report_status $? "Entity API endpoint tests"
  
  node scripts/test-journal-api.js
  report_status $? "Journal API tests"
  
  node scripts/test-verification-routes.js
  report_status $? "Verification routes tests"
fi

# Summary
echo "===================================="
if [ $GLOBAL_ERROR -eq 0 ]; then
  echo -e "${GREEN}✅ All test suites passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some test suites failed. Please fix the issues above.${NC}"
  exit 1
fi