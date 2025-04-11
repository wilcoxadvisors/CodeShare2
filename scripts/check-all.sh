#!/bin/bash
# Complete Code Quality Check Script
# Runs lint, typecheck, and format:check in sequence
# Similar to "npm run lint && npm run typecheck && npm run format:check"

echo "🔍 Running complete code quality check..."
echo "==========================================="

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# Step 1: Run linting (Knip for unused dependencies)
echo -e "\n${YELLOW}STEP 1: LINTING${NC}"
echo "-----------------------"
./scripts/lint.sh
LINT_STATUS=$?

if [ $LINT_STATUS -eq 0 ]; then
  echo -e "\n${GREEN}✅ Linting passed${NC}"
else
  echo -e "\n${RED}❌ Linting failed${NC}"
  OVERALL_STATUS=1
fi

# Step 2: Run TypeScript check
echo -e "\n${YELLOW}STEP 2: TYPECHECK${NC}"
echo "-----------------------"
./scripts/check-ts.sh
TYPECHECK_STATUS=$?

if [ $TYPECHECK_STATUS -eq 0 ]; then
  echo -e "\n${GREEN}✅ TypeScript check passed${NC}"
else
  echo -e "\n${RED}❌ TypeScript check failed${NC}"
  OVERALL_STATUS=1
fi

# Step 3: Run format check
echo -e "\n${YELLOW}STEP 3: FORMAT CHECK${NC}"
echo "-----------------------"
./scripts/format-check.sh
FORMAT_STATUS=$?

if [ $FORMAT_STATUS -eq 0 ]; then
  echo -e "\n${GREEN}✅ Format check passed${NC}"
else
  echo -e "\n${RED}❌ Format check failed${NC}"
  OVERALL_STATUS=1
fi

# Final summary
echo -e "\n==========================================="
if [ $OVERALL_STATUS -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME CHECKS FAILED. Please review the issues above.${NC}"
  echo -e "   Lint status: $([ $LINT_STATUS -eq 0 ] && echo "${GREEN}PASS${NC}" || echo "${RED}FAIL${NC}")"
  echo -e "   TypeCheck status: $([ $TYPECHECK_STATUS -eq 0 ] && echo "${GREEN}PASS${NC}" || echo "${RED}FAIL${NC}")"
  echo -e "   Format status: $([ $FORMAT_STATUS -eq 0 ] && echo "${GREEN}PASS${NC}" || echo "${RED}FAIL${NC}")"
  exit 1
fi