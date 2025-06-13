# Financial Management Platform - Replit Configuration

## Overview

This is a comprehensive financial management platform built for Wilcox Advisors, designed to handle client and entity management, chart of accounts, journal entries, and provide AI-powered business intelligence capabilities. The platform follows a scalable SaaS architecture with a phased approach: Manual First → API Automation → AI/ML Enhancements → Full Automation & ERP Features.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **State Management**: TanStack Query for server state management
- **UI Components**: Shadcn UI with Radix UI primitives
- **Styling**: Tailwind CSS for responsive design
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript for type safety
- **API Design**: RESTful endpoints with structured error handling
- **Authentication**: Session-based authentication with JWT support
- **Email**: Nodemailer integration for notifications
- **File Uploads**: Multer for handling file attachments

### Database Layer
- **Primary Database**: PostgreSQL (Neon.tech hosted)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Neon serverless driver for optimal performance

## Key Components

### 1. Client & Entity Management
- Multi-tenant client setup with industry categorization
- Entity management with hierarchical relationships
- Contact information and metadata tracking
- Active/inactive status and soft-delete functionality

### 2. Chart of Accounts
- Hierarchical account structure with parent-child relationships
- Industry-specific account templates
- Import/export functionality via CSV
- Account types: Assets, Liabilities, Equity, Revenue, Expenses
- Subledger support for detailed tracking

### 3. Journal Entries
- Multi-status workflow: Draft → Pending Approval → Posted → Voided
- File attachment support for supporting documents
- Bulk operations and batch processing
- Audit trail and approval workflow
- Cross-entity transaction support

### 4. File Management
- Secure file upload with type validation
- Support for various file formats (PDF, images, MSG, EML)
- File preview and download capabilities
- Attachment linking to journal entries

### 5. AI Integration
- XAI (Grok API) integration for advanced insights
- Machine learning capabilities with XGBoost and Prophet
- Anomaly detection and forecasting features
- SHAP library for explainable AI

## Data Flow

### Authentication Flow
1. User submits credentials to `/api/auth/login`
2. Server validates against database
3. Session cookie set for authenticated requests
4. Middleware validates session on protected routes

### Client Onboarding Flow
1. Client creation with basic information
2. Automatic default entity creation
3. Chart of accounts seeding with industry-specific templates
4. User access and permissions setup

### Journal Entry Processing
1. Entry creation in draft status
2. Line item validation and balancing checks
3. File attachment processing
4. Approval workflow execution
5. Posting to ledger with audit trail

### Data Import/Export
1. CSV file upload and validation
2. Preview and selection of records to process
3. Batch processing with error handling
4. Audit logging of import operations

## External Dependencies

### Cloud Services
- **Database**: Neon.tech PostgreSQL serverless
- **Hosting**: Configured for Replit deployment
- **Email**: Gmail SMTP for notifications

### AI/ML Services
- **XAI API**: Grok integration for advanced analytics
- **Python Services**: ML models for forecasting and anomaly detection

### Development Tools
- **Testing**: Jest for unit tests, Cypress for E2E testing
- **Linting**: ESLint with TypeScript support
- **Code Quality**: TypeScript strict mode enabled

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server on port 5000
- **Database**: Connected to Neon.tech PostgreSQL instance
- **Hot Reloading**: Enabled for both frontend and backend

### Production Deployment
- **Build Process**: Vite build for frontend, esbuild for backend
- **Server**: Express.js serving both API and static files
- **Environment**: Production mode with optimized builds
- **Database**: Same Neon.tech instance with production configuration

### Environment Configuration
- Environment variables managed via `.envrc` with direnv
- Separate configurations for development and production
- Secure handling of API keys and database credentials

## Changelog
- June 13, 2025. Initial setup
- June 13, 2025. **Dimension Tagging System Completed** - Implemented comprehensive dimension tagging for journal entries with backend SQL joins, frontend data preservation, stable React keys, and view page display
- June 13, 2025. **Automatic Accrual Reversals Architecture Refactored** - Replaced fragile in-memory setTimeout approach with robust cron job-based system. Created processDueAccrualReversals method, scheduled task script, and fixed database schema issues for production-ready daily processing
- June 13, 2025. **Automatic Accrual Reversals - Part 1 Complete** - Database schema verified with all required fields (isAccrual, reversalDate, reversedEntryId) properly configured for automatic accrual reversal functionality

## User Preferences

Preferred communication style: Simple, everyday language.