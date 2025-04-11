# Local Setup Guide

This guide provides step-by-step instructions for setting up and running the Financial Management Platform locally on your development machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or later)
- **npm** (v8 or later)
- **Python** (v3.10 or later)
- **PostgreSQL** (v14 or later)
- **direnv** (optional, for environment variable management)

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd financial-management-platform
```

### 2. Environment Variables

The application uses environment variables for configuration. You can set these up in two ways:

#### Option A: Using direnv (recommended)

If you have direnv installed:

1. Copy the `.envrc.example` file to `.envrc`:
   ```bash
   cp .envrc.example .envrc
   ```

2. Edit the `.envrc` file with your configuration details:
   ```bash
   # Edit the file with your preferred editor
   nano .envrc
   ```

3. Allow direnv to load the variables:
   ```bash
   direnv allow
   ```

#### Option B: Manual Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/financial_db
PGDATABASE=financial_db
PGHOST=localhost
PGPORT=5432
PGUSER=username
PGPASSWORD=password

# AI Integration Keys
XAI_API_KEY=your-xai-api-key

# Session Secret (for cookie encryption)
SESSION_SECRET=generate-a-random-secret-string

# Email Configuration
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
NOTIFICATION_EMAIL=notifications@example.com
```

### 3. Node.js Dependencies

Install all Node.js dependencies:

```bash
npm install
```

### 4. Python Dependencies

Install the Python dependencies for the ML service:

```bash
cd python_service
pip install -r requirements.txt
cd ..
```

## Database Setup

### 1. Create a PostgreSQL Database

Create a new PostgreSQL database for the application:

```bash
createdb financial_db
```

### 2. Run Database Migrations

Push the database schema using Drizzle:

```bash
npm run db:push
```

## Running the Application

### 1. Start the Node.js Server

Start the Express server with the frontend Vite development server:

```bash
npm run dev
```

This will start the server at http://localhost:5000

### 2. Start the Python ML Service (in a separate terminal)

```bash
cd python_service
python start_service.py
```

This will start the Flask ML service at http://localhost:5001

## Verifying the Setup

1. Open your browser and navigate to http://localhost:5000
2. You should see the Financial Management Platform login page
3. Register or log in with the admin account to access the dashboard

## Running Tests

To run the test suite:

```bash
./scripts/run-tests.sh --all
```

For more testing options, see [TESTING.md](./TESTING.md)

## Troubleshooting

### Database Connection Issues

If you're having trouble connecting to the database:

1. Verify your PostgreSQL server is running:
   ```bash
   pg_isready
   ```

2. Check your database credentials in the environment variables

3. Ensure your database exists:
   ```bash
   psql -l
   ```

### Node.js Server Issues

If the Node.js server fails to start:

1. Check for errors in the terminal output

2. Verify all dependencies are installed:
   ```bash
   npm install
   ```

3. Check that the required ports (5000) are not in use:
   ```bash
   lsof -i :5000
   ```

### Python ML Service Issues

If the Python ML service fails to start:

1. Verify that all Python dependencies are installed:
   ```bash
   pip install -r python_service/requirements.txt
   ```

2. Check for errors in the terminal output

3. Ensure that the required port (5001) is not in use:
   ```bash
   lsof -i :5001
   ```

## Production Deployment

For production deployment, build the application:

```bash
npm run build
```

Then start the production server:

```bash
npm start
```

## Additional Resources

- [TESTING.md](./TESTING.md) - Instructions for running tests
- [DEPENDENCIES.md](./DEPENDENCIES.md) - Details about project dependencies
- [LINTING.md](./LINTING.md) - Code quality and linting information