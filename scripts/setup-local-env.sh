#!/bin/bash
# Script to automate setting up the local development environment
# for the Financial Management Platform

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Echo with color and prefix
log() {
  echo -e "${BLUE}[SETUP]${NC} $1"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check requirements
check_requirements() {
  log "Checking system requirements..."
  
  # Check Node.js
  if command_exists node; then
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
      success "Node.js v$NODE_VERSION is installed"
    else
      warn "Node.js v$NODE_VERSION is installed, but v18+ is recommended"
    fi
  else
    error "Node.js is not installed. Please install Node.js v18 or later"
    exit 1
  fi
  
  # Check npm
  if command_exists npm; then
    NPM_VERSION=$(npm -v)
    success "npm v$NPM_VERSION is installed"
  else
    error "npm is not installed. Please install npm"
    exit 1
  fi
  
  # Check Python
  if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | cut -d ' ' -f 2)
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d '.' -f 1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d '.' -f 2)
    
    if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 10 ]; then
      success "Python $PYTHON_VERSION is installed"
    else
      warn "Python $PYTHON_VERSION is installed, but v3.10+ is recommended"
    fi
  else
    error "Python 3 is not installed. Please install Python 3.10 or later"
    exit 1
  fi
  
  # Check PostgreSQL
  if command_exists psql; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    success "PostgreSQL $PSQL_VERSION is installed"
  else
    error "PostgreSQL is not installed. Please install PostgreSQL 14 or later"
    exit 1
  fi
  
  # Check direnv (optional)
  if command_exists direnv; then
    success "direnv is installed"
    HAS_DIRENV=true
  else
    warn "direnv is not installed. It's recommended for environment management"
    HAS_DIRENV=false
  fi
}

# Install dependencies
install_dependencies() {
  log "Installing Node.js dependencies..."
  npm install
  success "Node.js dependencies installed"
  
  log "Installing Python dependencies..."
  cd python_service
  pip install -r requirements.txt
  cd ..
  success "Python dependencies installed"
}

# Setup environment variables
setup_env_vars() {
  if [ ! -f .envrc ] && [ ! -f .env ]; then
    log "Setting up environment variables..."
    
    if [ "$HAS_DIRENV" = true ]; then
      if [ -f .envrc.example ]; then
        cp .envrc.example .envrc
        success "Created .envrc from example file"
        echo ""
        warn "Please edit .envrc with your database credentials and API keys"
        warn "Then run 'direnv allow' to load the environment variables"
      else
        echo 'export DATABASE_URL="postgresql://localhost:5432/financial_db"' > .envrc
        echo 'export PGDATABASE="financial_db"' >> .envrc
        echo 'export PGHOST="localhost"' >> .envrc
        echo 'export PGPORT="5432"' >> .envrc
        echo 'export PGUSER="$USER"' >> .envrc
        echo 'export PGPASSWORD=""' >> .envrc
        echo 'export XAI_API_KEY=""' >> .envrc
        echo 'export SESSION_SECRET="development-secret-change-this-in-production"' >> .envrc
        echo 'export EMAIL_USER=""' >> .envrc
        echo 'export EMAIL_PASSWORD=""' >> .envrc
        echo 'export NOTIFICATION_EMAIL=""' >> .envrc
        
        success "Created .envrc file with default values"
        echo ""
        warn "Please edit .envrc with your database credentials and API keys"
        warn "Then run 'direnv allow' to load the environment variables"
      fi
    else
      echo 'DATABASE_URL="postgresql://localhost:5432/financial_db"' > .env
      echo 'PGDATABASE="financial_db"' >> .env
      echo 'PGHOST="localhost"' >> .env
      echo 'PGPORT="5432"' >> .env
      echo 'PGUSER="'$USER'"' >> .env
      echo 'PGPASSWORD=""' >> .env
      echo 'XAI_API_KEY=""' >> .env
      echo 'SESSION_SECRET="development-secret-change-this-in-production"' >> .env
      echo 'EMAIL_USER=""' >> .env
      echo 'EMAIL_PASSWORD=""' >> .env
      echo 'NOTIFICATION_EMAIL=""' >> .env
      
      success "Created .env file with default values"
      echo ""
      warn "Please edit .env with your database credentials and API keys"
    fi
  else
    success "Environment variables already configured."
  fi
}

# Setup database
setup_database() {
  log "Setting up database..."
  
  # Try to get database name from environment
  if [ -n "$PGDATABASE" ]; then
    DB_NAME="$PGDATABASE"
  else
    DB_NAME="financial_db"
  fi
  
  # Check if database exists
  if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    success "Database '$DB_NAME' already exists"
  else
    log "Creating database '$DB_NAME'..."
    createdb "$DB_NAME" || { error "Failed to create database"; exit 1; }
    success "Database created successfully"
  fi
  
  # Run migrations
  log "Running database migrations..."
  npm run db:push || { error "Failed to run migrations"; exit 1; }
  success "Database migrations completed successfully"
}

# Main function
main() {
  echo "==================================================="
  echo "  Financial Management Platform - Local Setup"
  echo "==================================================="
  echo ""
  
  check_requirements
  echo ""
  
  install_dependencies
  echo ""
  
  setup_env_vars
  echo ""
  
  setup_database
  echo ""
  
  echo "==================================================="
  success "Setup completed successfully!"
  echo ""
  log "To start the application:"
  echo "1. Run 'npm run dev' to start the main application"
  echo "2. In another terminal, run 'cd python_service && python start_service.py'"
  echo "3. Visit http://localhost:5000 in your browser"
  echo ""
  log "For more information, see:"
  echo "- docs/LOCAL_SETUP.md for detailed setup instructions"
  echo "- docs/TESTING.md for testing information"
  echo "==================================================="
}

# Run the script
main