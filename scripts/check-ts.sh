#!/bin/bash
# TypeScript syntax check script
# This script runs a quick TypeScript type check without the full linting process

echo "🔍 Checking TypeScript syntax..."
echo "===================================="

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check TypeScript types
echo -e "${YELLOW}Running TypeScript compiler check...${NC}"
npm run check

# Report status
if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✅ TypeScript syntax check passed!${NC}"
  exit 0
else
  echo -e "\n${RED}❌ TypeScript syntax check failed. Please fix the issues above.${NC}"
  exit 1
fi