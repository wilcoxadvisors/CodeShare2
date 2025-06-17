# Quick Start Guide

This is a quick-start guide for running the Financial Management Platform locally.

## Requirements

- Node.js v18+
- Python 3.10+
- PostgreSQL 14+
- NPM or Yarn
- (Optional) direnv for environment management

## Setup in 5 Steps

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd python_service
pip install -r requirements.txt
cd ..
```

### 2. Set Up Environment Variables

Either copy the example `.envrc` file or create a `.env` file with:

```
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/financial_db
PGDATABASE=financial_db
PGHOST=localhost
PGPORT=5432
PGUSER=username
PGPASSWORD=password

# AI Integration
XAI_API_KEY=your-xai-api-key

# Session secret
SESSION_SECRET=your-random-secret

# Email Configuration
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
NOTIFICATION_EMAIL=notifications@example.com
```

### 3. Setup Database

```bash
# Create database
createdb financial_db

# Run migrations
npm run db:push
```

### 4. Start the Application

```bash
# In one terminal window - Start the main application
npm run dev

# In another terminal window - Start Python ML service
cd python_service
python start_service.py
```

### 5. Access the Application

Open your browser and navigate to: http://localhost:5000

## Useful Commands

```bash
# Run all tests
./scripts/run-tests.sh --all

# Run just unit tests
./scripts/run-unit-tests.sh

# Build for production
npm run build

# Start in production mode
npm start
```

For more detailed setup instructions, see [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md).
For testing information, see [docs/TESTING.md](docs/TESTING.md).