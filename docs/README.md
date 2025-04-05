# Form Fields Verification Tools

This directory contains documentation and tools for verifying the correct persistence of form fields and entity status management in the system.

## Available Resources

1. [Verification Status Report](./VERIFICATION_STATUS.md) - A comprehensive status report on the verification of form fields persistence and entity status management.
2. [Form Verification Guide](./FORM_VERIFICATION_GUIDE.md) - A step-by-step guide for manually testing form fields and entity status management.
3. [Verification README](./VERIFICATION_README.md) - An overview of the verification process and instructions for running verification scripts.

## Verification Scripts

The following scripts are available in the `verification-scripts` directory:

1. `setup-admin.js` - Creates a test admin user for verification testing.
2. `complete-form-verification.js` - Performs comprehensive testing of form fields persistence and entity status management.

## Running the Verification

### Prerequisites

- Node.js installed
- Access to the running application
- Required dependencies: axios, fs-extra

### Steps to Run Verification

1. Install required dependencies:
   ```
   npm install axios fs-extra
   ```

2. Run the admin setup script:
   ```
   node verification-scripts/setup-admin.js
   ```

3. Run the complete form verification script:
   ```
   node verification-scripts/complete-form-verification.js
   ```

4. Check the generated logs in `verification-scripts/logs/verification_results.log`

## Verification Coverage

The verification process covers:

- Client form fields persistence (creation and update)
- Entity form fields persistence (creation and update)
- Entity status management (inactive vs. soft-deleted vs. restored)

## Issue Resolution

If you encounter any issues during verification, please check:

1. The API endpoints are accessible and properly configured
2. The database connection is working properly
3. The required fields match the expected schema
4. The logs for any specific error messages

## Contact

For any questions or issues related to the verification process, please contact the development team.