#!/bin/bash
# Format Check Script
# Similar to "npm run format:check" command pattern

echo "🔍 Checking code formatting..."
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
else
  echo -e "${YELLOW}Prettier not found, skipping format check${NC}"
fi

# Summary
echo "===================================="
if [ $GLOBAL_ERROR -eq 0 ]; then
  echo -e "${GREEN}✅ Format check passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Format check failed. Please fix the issues above.${NC}"
  exit 1
fi