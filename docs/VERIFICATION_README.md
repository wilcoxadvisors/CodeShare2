# Form Fields Verification and Inactive vs. Soft Deletion Testing

## Instructions

We've prepared both automated and manual verification methods to ensure all form fields are properly saving and persisting, and to verify the clear distinction between inactive entities and soft-deleted entities.

## Automated Verification

1. First, make sure you have all the dependencies installed:
   ```
   npm install axios fs-extra
   ```

2. Run the verification script:
   ```
   node verification-scripts/complete-form-verification.js
   ```

3. The script will:
   - Create a test client with all available fields
   - Verify all fields persist correctly
   - Update all client fields
   - Verify updated fields persist correctly
   - Create a test entity with all available fields
   - Verify all entity fields persist correctly
   - Update all entity fields
   - Verify updated entity fields persist correctly
   - Test inactive vs. soft-deleted entity functionality
   - Generate a detailed log of all tests

4. Examine the generated `verification_results.log` file to see details about any issues.

## Manual Verification

If you prefer to manually verify the functionality, follow the steps in `docs/FORM_VERIFICATION_GUIDE.md`.

The manual verification guide provides step-by-step instructions to:
1. Create and verify client form fields persistence
2. Create and verify entity form fields persistence
3. Test and verify the distinction between inactive and soft-deleted entities

## Reporting Results

After completing either the automated or manual verification, document your findings using the template provided at the end of the `FORM_VERIFICATION_GUIDE.md` file.

## Key Areas to Verify

1. **Client Form Fields**: Ensure all fields save and persist correctly
2. **Entity Form Fields**: Ensure all fields save and persist correctly
3. **Inactive vs. Soft-Deleted Entities**:
   - Inactive entities have `active = false` and `deletedAt = null`
   - Soft-deleted entities have `active = false` and `deletedAt = timestamp`
   - Restored entities have `active = true` and `deletedAt = null`

## Notes

- Both the automated script and manual verification process test the same functionality
- The automated script provides more detailed logging of field values
- The manual verification allows for visual confirmation of UI/UX elements