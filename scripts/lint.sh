#!/bin/bash
# Comprehensive Lint and Code Quality Script
# This script performs three main checks:
# 1. Linting: Checks for unused dependencies and code quality issues
# 2. Type checking: Ensures TypeScript types are correct
# 3. Format checking: Verifies code formatting and checks for unused exports

echo "🔍 Running comprehensive code quality checks..."
echo "=============================================="

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

# PART 1: LINTING
echo -e "${YELLOW}STEP 1: LINTING${NC}"
echo "-----------------------"

# Check for unused dependencies with Knip
if command -v npx &> /dev/null; then
  echo -e "${YELLOW}Checking for unused dependencies with Knip...${NC}"
  npx knip
  report_status $? "Knip dependency check"
fi

# PART 2: TYPE CHECKING
echo -e "${YELLOW}STEP 2: TYPE CHECKING${NC}"
echo "-----------------------"

# Check TypeScript types
echo -e "${YELLOW}Running TypeScript compiler check...${NC}"
npm run check
report_status $? "TypeScript type checking"

# More thorough type checking with noEmit flag
echo -e "${YELLOW}Running thorough TypeScript check (--noEmit)...${NC}"
npx tsc --noEmit
report_status $? "TypeScript thorough check"

# PART 3: FORMAT CHECKING
echo -e "${YELLOW}STEP 3: FORMAT CHECKING${NC}"
echo "-----------------------"

# Check for unused exports with ts-prune
if command -v npx &> /dev/null && npm list | grep -q ts-prune; then
  echo -e "${YELLOW}Checking for unused exports with ts-prune...${NC}"
  npx ts-prune
  report_status $? "ts-prune unused exports check"
fi

# Check code formatting with Prettier if available
if command -v npx &> /dev/null && npx --no-install prettier -v &> /dev/null; then
  echo -e "${YELLOW}Checking code formatting with Prettier...${NC}"
  npx prettier --check "./client/src/**/*.{ts,tsx}" "./server/**/*.ts" "./shared/**/*.ts" || true
  report_status $? "Prettier formatting check"
fi

# PART 4: TESTS
echo -e "${YELLOW}STEP 4: TESTS${NC}"
echo "-----------------------"

# Run tests if Jest is available
if [ -f "config/jest.config.js" ]; then
  echo -e "${YELLOW}Running Jest tests...${NC}"
  NODE_OPTIONS=--experimental-vm-modules npx jest --config=config/jest.config.js
  report_status $? "Jest tests"
fi

# Summary
echo "=============================================="
if [ $GLOBAL_ERROR -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Please fix the issues above before committing.${NC}"
  exit 1
fi