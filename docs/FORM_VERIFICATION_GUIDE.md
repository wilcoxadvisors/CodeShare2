# Form Fields Verification and Entity Status Testing Guide

## Introduction

This guide provides step-by-step instructions for manually verifying that all client and entity form fields are properly saved, persisted, and retrievable in the system. It also includes tests to verify the distinction between inactive entities and soft-deleted entities.

## Prerequisites

1. An admin user account with full access to the system
2. Access to the web application interface
3. Permission to create test clients and entities
4. Modern web browser with developer tools (Chrome, Firefox, Safari, or Edge)

## 1. Client Form Fields Verification

### 1.1 Create a New Client

1. Log in to the application using your admin credentials
2. Navigate to the Clients section
3. Click "Add Client" or equivalent button
4. Fill in all available fields in the form:
   - **Name**: "Verification Test Client"
   - **Legal Name**: "Verification Test Client LLC"
   - **Contact Name**: "John Tester"
   - **Contact Email**: "john@test.com"
   - **Contact Phone**: "123-456-7890"
   - **Industry**: "Technology"
   - **Address**: "123 Test Street"
   - **City**: "Test City"
   - **State**: "Test State"
   - **Country**: "Test Country"
   - **Postal Code**: "12345"
   - **Website**: "https://test.com"
   - **Notes**: "This is a test client for verification"
   - **Tax ID**: "12-3456789"
   - **Referral Source**: "Internal Testing"
5. Submit the form by clicking "Create Client" or equivalent button
6. Record the newly created client ID for reference (visible in URL or on the page)

### 1.2 Verify Created Client Data

1. Navigate to view the newly created client (if not already there)
2. Verify that all form fields display the values you entered
3. Open browser developer tools (F12 or right-click → Inspect)
4. Go to the Network tab
5. Refresh the page to capture the client data request
6. Find the API request for the client data (typically `/api/clients/{id}`)
7. Examine the response to verify all fields are present and have correct values
8. Complete the Client Field Verification Checklist (at the end of this document)

### 1.3 Update Client Data

1. Navigate to edit the client (click "Edit" or equivalent button)
2. Update all fields with new values:
   - **Name**: "Updated Verification Client"
   - **Legal Name**: "Updated Verification Client LLC"
   - **Contact Name**: "Jane Updated"
   - **Contact Email**: "jane@updated.com"
   - **Contact Phone**: "999-888-7777"
   - **Industry**: "Updated Industry"
   - **Address**: "Updated Address"
   - **City**: "Updated City"
   - **State**: "Updated State"
   - **Country**: "Updated Country"
   - **Postal Code**: "U1234"
   - **Website**: "https://updated.com"
   - **Notes**: "This client has been updated for verification"
   - **Tax ID**: "98-7654321"
   - **Referral Source**: "Updated Source"
3. Submit the form by clicking "Update Client" or equivalent button

### 1.4 Verify Updated Client Data

1. Refresh the page or navigate away and back to the client view
2. Verify that all form fields display the updated values
3. Open browser developer tools (F12 or right-click → Inspect)
4. Go to the Network tab
5. Refresh the page to capture the client data request
6. Find the API request for the client data (typically `/api/clients/{id}`)
7. Examine the response to verify all fields are present and have updated values
8. Complete the Updated Client Field Verification Checklist (at the end of this document)

## 2. Entity Form Fields Verification

### 2.1 Create a New Entity

1. Navigate to the Entities section or the client's entity list
2. Click "Add Entity" or equivalent button
3. Fill in all available fields in the form:
   - **Name**: "Verification Test Entity"
   - **Legal Name**: "Verification Test Entity Inc"
   - **Tax ID**: "98-7654321"
   - **Entity Type**: "Corporation"
   - **Industry**: "Finance"
   - **Fiscal Year End**: "12/31"
   - **Address**: "456 Entity Road"
   - **City**: "Entity City"
   - **State**: "Entity State"
   - **Country**: "Entity Country"
   - **Postal Code**: "54321"
   - **Phone**: "987-654-3210"
   - **Email**: "entity@test.com"
   - **Website**: "https://entity-test.com"
   - **Notes**: "This is a test entity for verification"
4. Submit the form by clicking "Create Entity" or equivalent button
5. Record the newly created entity ID for reference (visible in URL or on the page)

### 2.2 Verify Created Entity Data

1. Navigate to view the newly created entity (if not already there)
2. Verify that all form fields display the values you entered
3. Open browser developer tools (F12 or right-click → Inspect)
4. Go to the Network tab
5. Refresh the page to capture the entity data request
6. Find the API request for the entity data (typically `/api/entities/{id}`)
7. Examine the response to verify all fields are present and have correct values
8. Complete the Entity Field Verification Checklist (at the end of this document)

### 2.3 Update Entity Data

1. Navigate to edit the entity (click "Edit" or equivalent button)
2. Update all fields with new values:
   - **Name**: "Updated Verification Entity"
   - **Legal Name**: "Updated Verification Entity Inc"
   - **Tax ID**: "12-3456789"
   - **Entity Type**: "Updated Type"
   - **Industry**: "Updated Industry"
   - **Fiscal Year End**: "06/30"
   - **Address**: "Updated Entity Address"
   - **City**: "Updated Entity City"
   - **State**: "Updated Entity State"
   - **Country**: "Updated Entity Country"
   - **Postal Code**: "E5432"
   - **Phone**: "111-222-3333"
   - **Email**: "updated-entity@test.com"
   - **Website**: "https://updated-entity.com"
   - **Notes**: "This entity has been updated for verification"
3. Submit the form by clicking "Update Entity" or equivalent button

### 2.4 Verify Updated Entity Data

1. Refresh the page or navigate away and back to the entity view
2. Verify that all form fields display the updated values
3. Open browser developer tools (F12 or right-click → Inspect)
4. Go to the Network tab
5. Refresh the page to capture the entity data request
6. Find the API request for the entity data (typically `/api/entities/{id}`)
7. Examine the response to verify all fields are present and have updated values
8. Complete the Updated Entity Field Verification Checklist (at the end of this document)

## 3. Entity Status Verification (Inactive vs. Soft-Deleted)

### 3.1 Create Two Test Entities

1. Create two new entities following the procedure in Section 2.1
   - Name the first entity "Inactive Test Entity"
   - Name the second entity "Soft Delete Test Entity"
2. Record both entity IDs for reference

### 3.2 Set First Entity to Inactive

1. Navigate to the "Inactive Test Entity" view
2. Click on "Set Inactive" or equivalent button/option
3. Confirm the action if prompted
4. Verify the entity is marked as inactive in the UI
5. Using browser developer tools, examine the request and response:
   - The entity should have `active: false`
   - The entity should NOT have a `deletedAt` timestamp (it should be null)

### 3.3 Soft Delete Second Entity

1. Navigate to the "Soft Delete Test Entity" view
2. Click on "Delete" or equivalent button/option
3. Confirm the action if prompted
4. Verify the entity is marked as deleted in the UI
5. Using browser developer tools, examine the request and response:
   - The entity should have `active: false`
   - The entity should have a `deletedAt` timestamp with the current date/time

### 3.4 Test Restoring Soft-Deleted Entity

1. Navigate to where deleted entities can be viewed (Archive, Trash, or similar)
2. Find "Soft Delete Test Entity" in the list
3. Click "Restore" or equivalent button/option
4. Verify the entity is restored and active in the UI
5. Using browser developer tools, examine the request and response:
   - The entity should have `active: true`
   - The entity should NOT have a `deletedAt` timestamp (it should be null)

## Verification Checklists

### Client Field Verification Checklist

| Field | Created Value | Value Saved Correctly | Updated Value | Update Saved Correctly |
|-------|---------------|----------------------|---------------|------------------------|
| Name | Verification Test Client | □ Yes □ No | Updated Verification Client | □ Yes □ No |
| Legal Name | Verification Test Client LLC | □ Yes □ No | Updated Verification Client LLC | □ Yes □ No |
| Contact Name | John Tester | □ Yes □ No | Jane Updated | □ Yes □ No |
| Contact Email | john@test.com | □ Yes □ No | jane@updated.com | □ Yes □ No |
| Contact Phone | 123-456-7890 | □ Yes □ No | 999-888-7777 | □ Yes □ No |
| Industry | Technology | □ Yes □ No | Updated Industry | □ Yes □ No |
| Address | 123 Test Street | □ Yes □ No | Updated Address | □ Yes □ No |
| City | Test City | □ Yes □ No | Updated City | □ Yes □ No |
| State | Test State | □ Yes □ No | Updated State | □ Yes □ No |
| Country | Test Country | □ Yes □ No | Updated Country | □ Yes □ No |
| Postal Code | 12345 | □ Yes □ No | U1234 | □ Yes □ No |
| Website | https://test.com | □ Yes □ No | https://updated.com | □ Yes □ No |
| Notes | This is a test client for verification | □ Yes □ No | This client has been updated for verification | □ Yes □ No |
| Tax ID | 12-3456789 | □ Yes □ No | 98-7654321 | □ Yes □ No |
| Referral Source | Internal Testing | □ Yes □ No | Updated Source | □ Yes □ No |

### Entity Field Verification Checklist

| Field | Created Value | Value Saved Correctly | Updated Value | Update Saved Correctly |
|-------|---------------|----------------------|---------------|------------------------|
| Name | Verification Test Entity | □ Yes □ No | Updated Verification Entity | □ Yes □ No |
| Legal Name | Verification Test Entity Inc | □ Yes □ No | Updated Verification Entity Inc | □ Yes □ No |
| Tax ID | 98-7654321 | □ Yes □ No | 12-3456789 | □ Yes □ No |
| Entity Type | Corporation | □ Yes □ No | Updated Type | □ Yes □ No |
| Industry | Finance | □ Yes □ No | Updated Industry | □ Yes □ No |
| Fiscal Year End | 12/31 | □ Yes □ No | 06/30 | □ Yes □ No |
| Address | 456 Entity Road | □ Yes □ No | Updated Entity Address | □ Yes □ No |
| City | Entity City | □ Yes □ No | Updated Entity City | □ Yes □ No |
| State | Entity State | □ Yes □ No | Updated Entity State | □ Yes □ No |
| Country | Entity Country | □ Yes □ No | Updated Entity Country | □ Yes □ No |
| Postal Code | 54321 | □ Yes □ No | E5432 | □ Yes □ No |
| Phone | 987-654-3210 | □ Yes □ No | 111-222-3333 | □ Yes □ No |
| Email | entity@test.com | □ Yes □ No | updated-entity@test.com | □ Yes □ No |
| Website | https://entity-test.com | □ Yes □ No | https://updated-entity.com | □ Yes □ No |
| Notes | This is a test entity for verification | □ Yes □ No | This entity has been updated for verification | □ Yes □ No |

### Entity Status Verification Checklist

| Test | Expected Result | Actual Result |
|------|----------------|--------------|
| Set entity to inactive | active=false, deletedAt=null | □ Pass □ Fail |
| Soft delete entity | active=false, deletedAt=timestamp | □ Pass □ Fail |
| Restore soft-deleted entity | active=true, deletedAt=null | □ Pass □ Fail |

## Final Verification Summary

| Test Area | Pass/Fail | Notes |
|-----------|-----------|-------|
| Client Form Fields | □ Pass □ Fail | |
| Entity Form Fields | □ Pass □ Fail | |
| Entity Status | □ Pass □ Fail | |
| Overall Verification | □ Pass □ Fail | |

## Additional Notes

[Add any additional observations or findings here]