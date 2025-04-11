#!/bin/bash
# Lint and static code analysis script
# This script runs TypeScript type checking and other linting tools

echo "🔍 Running code quality checks..."
echo "===================================="

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

GLOBAL_ERROR=0

# Check TypeScript types
echo -e "${YELLOW}Checking TypeScript types...${NC}"
npm run check
report_status $? "TypeScript type checking"

# Check for unused dependencies with Knip
if command -v npx &> /dev/null; then
  echo -e "${YELLOW}Checking for unused dependencies with Knip...${NC}"
  npx knip
  report_status $? "Knip dependency check"
fi

# Check for unused exports (ts-prune)
if command -v npx &> /dev/null && npm list | grep -q ts-prune; then
  echo -e "${YELLOW}Checking for unused exports with ts-prune...${NC}"
  npx ts-prune
  report_status $? "ts-prune unused exports check"
fi

# Run tests if Jest is available
if [ -f "config/jest.config.js" ]; then
  echo -e "${YELLOW}Running tests...${NC}"
  NODE_OPTIONS=--experimental-vm-modules npx jest --config=config/jest.config.js
  report_status $? "Jest tests"
fi

# Summary
echo "===================================="
if [ $GLOBAL_ERROR -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Please fix the issues above before committing.${NC}"
  exit 1
fi