#!/bin/bash
# Dependency Update Script
# This script updates all dependencies for the Financial Management Platform
# Run this script after git pull to ensure all dependencies are up to date

echo "🔄 Checking and updating dependencies..."
echo "------------------------------------"

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create requirements.txt if it doesn't exist
if [ ! -f python_service/requirements.txt ]; then
  echo -e "${YELLOW}Creating Python requirements.txt file...${NC}"
  cat > python_service/requirements.txt << EOF
flask>=2.0.0
numpy>=1.20.0
pandas>=1.3.0
prophet>=1.1.0
scikit-learn>=1.0.0
gunicorn>=20.1.0
EOF
  echo -e "${GREEN}✅ Created requirements.txt file${NC}"
fi

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check and update Node.js dependencies
echo -e "${YELLOW}Checking Node.js dependencies...${NC}"
if [ -f package.json ]; then
  echo "package.json found, updating dependencies..."
  npm install
  echo -e "${GREEN}✅ Node.js dependencies updated${NC}"
else
  echo -e "${RED}❌ No package.json found. Skipping Node.js dependency update.${NC}"
fi

# Check and update Python dependencies
echo -e "${YELLOW}Checking Python dependencies...${NC}"
if [ -f python_service/requirements.txt ]; then
  echo "Python requirements.txt found, updating dependencies..."
  
  # Make sure Python is installed
  if command_exists python3; then
    python3 -m pip install -r python_service/requirements.txt --upgrade
    echo -e "${GREEN}✅ Python dependencies updated${NC}"
  elif command_exists python; then
    python -m pip install -r python_service/requirements.txt --upgrade
    echo -e "${GREEN}✅ Python dependencies updated${NC}"
  else
    echo -e "${RED}❌ Python not found. Please install Python to update Python dependencies.${NC}"
  fi
else
  echo -e "${RED}❌ No requirements.txt found in python_service directory. Skipping Python dependency update.${NC}"
fi

# Update database schema if needed
echo -e "${YELLOW}Checking for database schema updates...${NC}"
if [ -f drizzle.config.ts ]; then
  echo "Drizzle configuration found, pushing schema updates..."
  npm run db:push
  echo -e "${GREEN}✅ Database schema updated${NC}"
else
  echo -e "${RED}❌ No drizzle.config.ts found. Skipping database schema update.${NC}"
fi

# Check environment variables
echo -e "${YELLOW}Checking environment variables...${NC}"
if [ -f .envrc ]; then
  echo ".envrc file found."
  if command_exists direnv; then
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

echo -e "${GREEN}------------------------------------${NC}"
echo -e "${GREEN}✅ Dependency check and update complete!${NC}"
echo -e "${YELLOW}Note: If the application is already running, you may need to restart it to apply the updates.${NC}"