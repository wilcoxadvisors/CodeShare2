# Financial Management Platform with Chart of Accounts

## Project Overview
An advanced AI-powered financial management platform that provides comprehensive client and entity management with intelligent data organization and dynamic user experience.

### Core Technologies
- React.js with TypeScript for frontend architecture
- Tailwind CSS for responsive, animated design
- PostgreSQL with advanced hierarchical schema management
- Multi-user role-based authentication system
- AI-driven business intelligence and workflow optimization
- Real-time state management for dynamic interactions
- Comprehensive Chart of Accounts management with import/export capabilities
- Extensive testing infrastructure for data processes

## Current Status
This project has undergone thorough verification at commit 64447303, focusing specifically on the Chart of Accounts functionality. All core Chart of Accounts features are stable and working as expected, including account viewing, hierarchy management, addition, modification, and proper client deletion.

See [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md) for detailed information on the verification process and current status.

## Repository Structure
- `client/`: Frontend React application with TypeScript
- `server/`: Backend Express API with PostgreSQL integration
- `shared/`: Shared types and utilities used by both frontend and backend
- `scripts/`: Utility scripts for database management and testing
- `verification-scripts/`: Scripts used in the verification process
- `verification-logs/`: Logs and data generated during verification
- `docs/`: Project documentation and guides
- `utils/`: Utility functions and helpers

## Key Features
- Chart of Accounts management with hierarchical structure
- Client and entity management with proper relationships
- Multi-user authentication with role-based access control
- Data import/export capabilities for Chart of Accounts
- Advanced financial data visualization and reporting
- AI-powered business intelligence insights

## Development Guidelines
For detailed development guidelines, refer to [Instructions.md](./Instructions.md).

## Getting Started
1. Clone this repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Access the application at the provided URL

## Verification Process
The verification process included:
1. Template Seeding verification
2. API endpoint testing
3. UI display verification
4. Account creation testing
5. UI/UX button verification

For detailed verification results, see the verification logs in the `verification-logs/` directory and the summary in [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md).