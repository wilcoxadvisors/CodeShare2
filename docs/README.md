# Form Field Verification System

## Overview

This directory contains verification scripts and documentation for ensuring the proper persistence of form fields in the client and entity management system.

## Contents

- **verification-scripts/**: Contains automated scripts for testing form field persistence
  - **setup-admin.js**: Creates a test admin user for verification
  - **complete-form-verification.js**: Comprehensive verification of client/entity forms
  - **logs/**: Directory containing verification logs (created when scripts run)

- **docs/**: Documentation related to verification
  - **FORM_VERIFICATION_GUIDE.md**: Step-by-step manual verification guide
  - **VERIFICATION_STATUS.md**: Template for reporting verification results

## Running the Verification Scripts

### 1. Setup Admin User

```bash
cd verification-scripts
node setup-admin.js
```

### 2. Run Comprehensive Verification

```bash
cd verification-scripts
node complete-form-verification.js
```

### 3. Review Results

After running the scripts, review:
- The console output for immediate results
- The log files in `verification-scripts/logs/` for detailed information
- The `docs/VERIFICATION_STATUS.md` file for a summary of test results

## Manual Verification

Follow the steps in `docs/FORM_VERIFICATION_GUIDE.md` to:
1. Manually verify client form field persistence
2. Manually verify entity form field persistence
3. Test the distinction between inactive and soft-deleted entities

## Issues & Troubleshooting

If you encounter issues during verification:
1. Check the error logs in `verification-scripts/logs/verification_errors.log`
2. Ensure the application server is running
3. Verify that the admin user was correctly set up

## Enhancement Requests

To request enhancements to the verification system, please include:
1. The specific verification test that needs improvement
2. Expected vs. actual behavior
3. Any edge cases that should be considered
