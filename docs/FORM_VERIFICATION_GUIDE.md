# Form Verification Guide

## Overview

This guide provides step-by-step instructions for manually verifying that all form fields for Clients and Entities are properly persisted throughout the system.

## Industry Field Standardization

All industry fields in the system now use a centralized approach for consistency:

1. Industry options are defined in a single source file: `client/src/lib/industryUtils.ts`
2. All components import the standardized `INDUSTRY_OPTIONS` constant from this file
3. Standard validation is performed using the `ensureIndustryValue` helper function
4. This ensures consistent industry options across:
   - ClientSetupCard
   - EntityManagementCard
   - EntityForm
   - ClientOnboardingForm
   - EntityAddModal

When testing industry fields, verify that the same options appear consistently throughout the application.

## Client Form Field Verification Steps

### 1. Create a New Client

1. Navigate to the Clients section
2. Click "Create New Client"
3. Fill in ALL fields with the following test data:
   - Name: "Manual Test Client"
   - Legal Name: "Manual Test Client LLC"
   - Contact Name: "Jane Doe"
   - Contact Email: "jane@example.com"
   - Contact Phone: "555-123-4567"
   - Industry: "Technology"
   - Address: "123 Main Street"
   - City: "Testville"
   - State: "Test State"
   - Country: "Test Country"
   - Postal Code: "12345"
   - Website: "https://example.com"
   - Notes: "This is a test client for manual verification"
   - Tax ID: "12-3456789"
   - Referral Source: "Manual Testing"
4. Click "Save" to create the client
5. Verify that a success message appears

### 2. Verify Client Retrieval

1. After saving, verify that you are redirected to the client details view
2. Check that ALL fields display the values entered during creation
3. Note any discrepancies in the verification status report

### 3. Verify Persistence After Refresh

1. Refresh the browser page
2. Verify that ALL client fields still display the values entered during creation
3. Note any discrepancies in the verification status report

### 4. Verify Client Update

1. Click "Edit" on the client details view
2. Change SEVERAL fields to new values:
   - Name: "Updated Test Client"
   - Contact Name: "John Smith"
   - Contact Email: "john@example.com"
   - Industry: "Finance"
   - Notes: "This client has been updated for verification"
2. Click "Save" to update the client
3. Verify that a success message appears
4. Check that ALL fields display the updated values
5. Refresh the page and verify the changes persist
6. Note any discrepancies in the verification status report

## Entity Form Field Verification Steps

### 1. Create a New Entity

1. Navigate to the client created in the previous steps
2. Click "Create New Entity"
3. Fill in ALL fields with the following test data:
   - Name: "Manual Test Entity"
   - Legal Name: "Manual Test Entity Inc"
   - Tax ID: "98-7654321"
   - Entity Type: "Corporation"
   - Industry: "Finance"
   - Fiscal Year End: "12/31"
   - Address: "456 Entity Road"
   - City: "Entity City"
   - State: "Entity State"
   - Country: "Entity Country"
   - Postal Code: "54321"
   - Phone: "555-987-6543"
   - Email: "entity@example.com"
   - Website: "https://entity-example.com"
   - Notes: "This is a test entity for manual verification"
4. Click "Save" to create the entity
5. Verify that a success message appears

### 2. Verify Entity Retrieval

1. After saving, verify that you are redirected to the entity details view
2. Check that ALL fields display the values entered during creation
3. Note any discrepancies in the verification status report

### 3. Verify Persistence After Refresh

1. Refresh the browser page
2. Verify that ALL entity fields still display the values entered during creation
3. Note any discrepancies in the verification status report

### 4. Verify Entity Update

1. Click "Edit" on the entity details view
2. Change SEVERAL fields to new values:
   - Name: "Updated Test Entity"
   - Legal Name: "Updated Test Entity Inc"
   - Industry: "Technology"
   - Notes: "This entity has been updated for verification"
2. Click "Save" to update the entity
3. Verify that a success message appears
4. Check that ALL fields display the updated values
5. Refresh the page and verify the changes persist
6. Note any discrepancies in the verification status report

## Inactive vs Soft-Deleted Entity Verification

### 1. Set Entity to Inactive

1. Navigate to the entity created in the previous steps
2. Click "Mark Inactive"
3. Confirm the action
4. Verify that the entity status shows as "Inactive"
5. Note that the entity should still be visible in the entities list
6. Note any discrepancies in the verification status report

### 2. Soft Delete the Entity

1. Navigate to the inactive entity
2. Click "Delete Entity"
3. Confirm the deletion
4. Verify that the entity disappears from the primary entity list
5. Navigate to "Deleted Entities" section (if available)
6. Verify that the entity appears in the deleted entities list
7. Note any discrepancies in the verification status report

### 3. Restore the Soft-Deleted Entity

1. In the "Deleted Entities" section, find the deleted entity
2. Click "Restore Entity"
3. Confirm the restoration
4. Verify that the entity reappears in the main entities list
5. Verify that the entity status shows as "Active"
6. Note any discrepancies in the verification status report

## Special Edge Cases Verification

### 1. Empty Fields

1. Create a new client with only required fields (Name) and leave all other fields empty
2. Save the client and verify that empty fields are preserved as empty strings, not null
3. Note any discrepancies in the verification status report

### 2. Special Characters

1. Create a new entity with special characters in fields:
   - Name: "Special & Chars Entity"
   - Notes: "Special characters: <script>alert(1)</script>, Line 1\nLine 2"
   - Email: "special+chars@example.com"
2. Save and verify that special characters are preserved correctly
3. Note any discrepancies in the verification status report

## Completing the Verification

1. Document all findings in the VERIFICATION_STATUS.md file
2. Include screenshots of any issues encountered
3. Provide clear pass/fail status for each verification step
