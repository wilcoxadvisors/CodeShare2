#!/bin/bash
# Post-Pull Script
# This script should be run after git pull to ensure your environment is up to date

echo "🔄 Running post-pull updates..."
echo "------------------------------------"

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Update dependencies
echo -e "${YELLOW}Updating dependencies...${NC}"
./scripts/update-dependencies.sh

# Update environment if needed
echo -e "${YELLOW}Checking environment variables...${NC}"
if [ -f .envrc ]; then
  echo ".envrc file found."
  if command -v direnv >/dev/null 2>&1; then
    direnv allow
    echo -e "${GREEN}✅ Environment variables loaded with direnv${NC}"
  else
    echo -e "${RED}❌ direnv not found. Please install direnv to automatically load environment variables.${NC}"
    echo "   You can manually load the environment variables by running:"
    echo "   source .envrc"
  fi
else
  echo -e "${YELLOW}⚠️ No .envrc file found. You may need to set up environment variables.${NC}"
fi

# Restart the application if it's running
echo -e "${YELLOW}Checking if application is running...${NC}"
if pgrep -f "npm run dev" > /dev/null; then
  echo "Application is running, restarting..."
  echo -e "${YELLOW}⚠️ Note: You will need to restart the application manually.${NC}"
  echo "   You can do this by running: npm run dev"
else
  echo "Application not running. No restart needed."
  echo "You can start the application by running: npm run dev"
fi

echo -e "${GREEN}------------------------------------${NC}"
echo -e "${GREEN}✅ Post-pull update complete!${NC}"
echo -e "${GREEN}Your environment is now up to date.${NC}"