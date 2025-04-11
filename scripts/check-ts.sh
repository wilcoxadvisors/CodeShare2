#!/bin/bash
# Quick TypeScript Syntax Check Script
# Similar to "npm run typecheck" command pattern

echo "🔍 Checking TypeScript syntax..."
echo "===================================="

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variable to track errors
GLOBAL_ERROR=0

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

# Basic TypeScript check (tsc)
echo -e "${YELLOW}Running basic TypeScript check (tsc)...${NC}"
npm run check
report_status $? "Basic TypeScript check"

# Thorough TypeScript check (--noEmit)
echo -e "${YELLOW}Running thorough TypeScript check (--noEmit)...${NC}"
npx tsc --noEmit
report_status $? "Thorough TypeScript check"

# Summary
echo "===================================="
if [ $GLOBAL_ERROR -eq 0 ]; then
  echo -e "${GREEN}✅ TypeScript syntax check passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ TypeScript syntax check failed. Please fix the issues above.${NC}"
  exit 1
fi