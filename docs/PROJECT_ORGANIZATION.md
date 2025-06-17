# Project Organization Summary

## Cleaned Up File Structure

The project has been reorganized for better maintainability and clarity:

### Root Level (Minimal)
```
├── README.md                 # Main project documentation
├── replit.md                 # Project preferences and changelog
├── package.json              # Dependencies and scripts
├── package-lock.json         # Dependency lock file
├── tsconfig.json             # TypeScript configuration
├── eslint.config.js          # ESLint configuration
├── drizzle.config.ts         # Database ORM configuration
├── vite.config.ts            # Vite build configuration
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── theme.json                # UI theme configuration
├── jest.config.mjs           # Jest testing configuration
├── cypress.config.ts         # Cypress E2E testing configuration
└── .replit                   # Replit environment configuration
```

### Core Application Structure
```
├── client/                   # Frontend React application
│   ├── src/
│   └── index.html
├── server/                   # Backend Express application
│   ├── index.ts
│   ├── routes/
│   ├── storage/
│   └── db.ts
├── shared/                   # Shared types and schemas
│   └── schema.ts
```

### Configuration & Tools
```
├── config/                   # All configuration files
│   ├── jest/                 # Jest testing configuration
│   │   └── jest.config.mjs
│   ├── cypress/              # Cypress E2E configuration
│   │   └── cypress.config.ts
│   ├── jest.config.js        # Legacy Jest config
│   ├── postcss.config.js     # PostCSS config
│   ├── tailwind.config.ts    # Tailwind config
│   ├── theme.json            # Theme config
│   ├── vite.config.ts        # Vite config
│   └── stryker.conf.mjs      # Mutation testing config
```

### Scripts & Utilities
```
├── scripts/                  # Project maintenance scripts
│   ├── cleanup/              # Database and file cleanup scripts
│   │   ├── cleanup-admin-entities.ts
│   │   ├── cleanup-clients.js
│   │   ├── cleanup-test-clients.js
│   │   └── cleanup-test-data.js
│   ├── test-data/            # Test data and test runners
│   │   ├── run-basic-tests.js
│   │   ├── run-etl-je.sh
│   │   ├── run-tests.sh
│   │   ├── test_dimension_values.csv
│   │   ├── test_master_upload.csv
│   │   └── test_values.csv
│   └── etl/                  # ETL processing scripts (planned)
```

### Testing Infrastructure
```
├── tests/                    # Backend unit and integration tests
│   ├── unit/
│   ├── api/
│   ├── contract/
│   └── properties/
├── testing/                  # Additional testing utilities
│   ├── coa-import-tests.js
│   ├── coa-import.test.js
│   └── tests/
├── cypress/                  # End-to-end testing
│   ├── e2e/
│   ├── fixtures/
│   └── support/
```

### Data & Models
```
├── migrations/               # Database migration files
├── models/                   # ML/AI model storage
│   ├── anomaly/
│   └── forecast/
├── etl/                      # ETL pipeline scripts
│   └── dask_export.py
├── ml/                       # Machine learning scripts
│   ├── shap_explain.py
│   ├── train_anomaly_xgb.py
│   └── train_forecast_spark.py
```

### Documentation
```
├── docs/                     # All project documentation
│   ├── README.md             # Documentation index
│   ├── ARCHITECTURE.md       # System architecture
│   ├── TESTING.md            # Testing guidelines
│   ├── LOCAL_SETUP.md        # Development setup
│   ├── DEPENDENCIES.md       # Dependency management
│   ├── CHANGELOG.md          # Change history
│   ├── archived_assets/      # Archived architect notes
│   ├── archive/              # Old documentation
│   ├── changelog/            # Detailed changelogs
│   ├── fixes/                # Bug fix documentation
│   └── reports/              # Analysis reports
```

### Support Files
```
├── backend/                  # Backend deployment files
├── python_service/           # ML service implementation
├── public/                   # Static assets
├── reports/                  # Generated reports
├── logs/                     # Application logs
├── pacts/                    # API contract testing
├── templates/                # Email and other templates
└── utils/                    # Utility functions
```

## Key Organizational Improvements

### 1. Configuration Consolidation
- All configuration files moved to `/config/` directory
- Testing configurations properly organized
- Build and development tools centralized

### 2. Script Organization
- Cleanup scripts grouped in `/scripts/cleanup/`
- Test data and runners in `/scripts/test-data/`
- Clear separation of utility scripts

### 3. Documentation Structure
- All documentation consolidated in `/docs/`
- Archived assets properly stored
- Clear hierarchy for different doc types

### 4. Testing Infrastructure
- Backend tests in `/tests/`
- E2E tests in `/cypress/`
- Testing utilities in `/testing/`
- Proper configuration references

### 5. Clean Root Directory
- Minimal files at root level
- No temporary or generated files
- Clear entry points for development

## Configuration Updates

The following configuration references have been updated:
- Jest configuration centralized
- Cypress configuration properly referenced
- Build tools pointing to correct locations
- Testing scripts updated for new structure

This organization follows industry best practices for TypeScript/React projects and provides clear separation of concerns for maintainability.