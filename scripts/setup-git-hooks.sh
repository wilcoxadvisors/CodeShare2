#!/bin/bash
# Git Hooks Setup Script
# This script sets up Git hooks to automatically maintain dependencies

echo "🔄 Setting up Git hooks..."
echo "------------------------------------"

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if the .git directory exists
if [ ! -d ".git" ]; then
  echo -e "${RED}❌ No .git directory found. This doesn't appear to be a Git repository.${NC}"
  exit 1
fi

# Create the post-merge hook
POST_MERGE_HOOK=".git/hooks/post-merge"
echo -e "${YELLOW}Creating post-merge hook...${NC}"

cat > "$POST_MERGE_HOOK" << 'EOF'
#!/bin/bash
# post-merge hook to run post-pull script after git pull

# Check if this is a pull operation (not a local merge)
# git pull triggers a post-merge hook, so we can use this for post-pull actions
if [ -f "scripts/post-pull.sh" ]; then
  echo "Git pull detected, running post-pull script..."
  ./scripts/post-pull.sh
fi
EOF

# Make the hook executable
chmod +x "$POST_MERGE_HOOK"
echo -e "${GREEN}✅ Post-merge hook created and made executable${NC}"

echo -e "${GREEN}------------------------------------${NC}"
echo -e "${GREEN}✅ Git hooks setup complete!${NC}"
echo -e "${YELLOW}Now, ./scripts/post-pull.sh will run automatically after git pull${NC}"