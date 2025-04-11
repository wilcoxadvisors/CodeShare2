# Dependency Management Guide

This document provides instructions for managing dependencies in the Financial Management Platform.

## Overview

The project uses:
- **Node.js** with npm for the main application
- **Python** for machine learning services
- **PostgreSQL** for database

## Automated Setup with Git Hooks

To set up automatic dependency updates after git pull operations:

```bash
./scripts/setup-git-hooks.sh
```

This will create a Git hook that automatically runs the post-pull script whenever you perform a `git pull`, ensuring your dependencies stay up to date.

## Maintenance Scripts

The following scripts are available to help maintain dependencies:

### 1. Post-Pull Update Script

Run this after pulling code from the repository to ensure all dependencies are up to date:

```bash
./scripts/post-pull.sh
```

This script will:
- Update Node.js dependencies
- Update Python dependencies
- Check environment variables
- Notify you if the application needs to be restarted

### 2. Dependency Update Script

To manually update all dependencies:

```bash
./scripts/update-dependencies.sh
```

This script will:
- Update Node.js packages
- Update Python packages
- Update database schema if needed
- Check environment variables

### 3. Dependency Check Script

To check for outdated dependencies and security vulnerabilities:

```bash
./scripts/check-outdated.sh
```

This script will:
- Check for outdated Node.js packages
- Run npm security audit
- Check for outdated Python packages

## Adding New Dependencies

### Node.js Dependencies

To add a new Node.js dependency:

```bash
npm install --save package-name
```

For development dependencies:

```bash
npm install --save-dev package-name
```

### Python Dependencies

To add a new Python dependency:

1. Add the package to `python_service/requirements.txt`
2. Run the update script:

```bash
./scripts/update-dependencies.sh
```

## Managing Environment Variables

Environment variables are managed using `direnv`. After pulling code or making changes to the `.envrc` file, run:

```bash
direnv allow
```

## Troubleshooting

If you encounter issues with dependencies:

1. Check logs for error messages
2. Verify that all required dependencies are installed
3. Ensure environment variables are properly set
4. Try running the dependency update script again
5. If problems persist, consult the development team

## Security Updates

Security updates should be applied promptly. The `npm audit` command in the check-outdated script will identify security vulnerabilities in Node.js packages.