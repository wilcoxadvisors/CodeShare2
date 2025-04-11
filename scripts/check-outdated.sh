#!/bin/bash
# Dependency Check Script
# This script checks for outdated dependencies and security vulnerabilities

echo "🔍 Checking for outdated dependencies..."
echo "------------------------------------"

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js dependencies
echo -e "${YELLOW}Checking Node.js dependencies...${NC}"
if [ -f package.json ]; then
  echo "Running npm outdated to check for updates..."
  npm outdated
  
  echo -e "\n${YELLOW}Checking for security vulnerabilities...${NC}"
  npm audit
else
  echo -e "${RED}❌ No package.json found. Skipping Node.js dependency check.${NC}"
fi

# Check Python dependencies
echo -e "\n${YELLOW}Checking Python dependencies...${NC}"
if [ -f python_service/requirements.txt ]; then
  echo "Checking for outdated Python packages..."
  
  # Make sure Python is installed
  if command -v python3 >/dev/null 2>&1; then
    python3 -m pip list --outdated
  elif command -v python >/dev/null 2>&1; then
    python -m pip list --outdated
  else
    echo -e "${RED}❌ Python not found. Please install Python to check Python dependencies.${NC}"
  fi
else
  echo -e "${RED}❌ No requirements.txt found in python_service directory. Skipping Python dependency check.${NC}"
fi

echo -e "\n${GREEN}------------------------------------${NC}"
echo -e "${GREEN}✅ Dependency check complete!${NC}"
echo -e "${YELLOW}If you want to update dependencies, run: ./scripts/update-dependencies.sh${NC}"