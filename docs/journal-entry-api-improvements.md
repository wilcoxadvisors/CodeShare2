# Journal Entry API Improvements

This document outlines the planned improvements to the Journal Entry API based on the identified roadmap requirements.

## Current Status

The Journal Entry API currently has the following endpoints:

### GET Endpoints
- `GET /api/entities/:entityId/journal-entries` - List journal entries with filtering
- `GET /api/entities/:entityId/journal-entries/:id` - Get a specific journal entry with lines
- `GET /api/entities/:entityId/journal-entries/:id/lines` - Get lines for a journal entry
- `GET /api/entities/:entityId/journal-entries/:id/files` - Get files associated with a journal entry

### POST Endpoints
- `POST /api/entities/:entityId/journal-entries` - Create a new journal entry
- `POST /api/entities/:entityId/journal-entries/:id/request-approval` - Request approval
- `POST /api/entities/:entityId/journal-entries/:id/approve` - Approve entry
- `POST /api/entities/:entityId/journal-entries/:id/reject` - Reject entry
- `POST /api/entities/:entityId/journal-entries/:id/post` - Post entry
- `POST /api/entities/:entityId/journal-entries/:id/void` - Void entry
- `POST /api/entities/:entityId/journal-entries/:id/duplicate` - Duplicate entry
- `POST /api/entities/:entityId/journal-entries/:id/files` - Upload files

### PUT Endpoints
- `PUT /api/entities/:entityId/journal-entries/:id` - Update a journal entry

### DELETE Endpoints
- **Missing:** `DELETE /api/entities/:entityId/journal-entries/:id` - Delete/void a journal entry

## Identified Issues

1. **Missing DELETE endpoint** - There is no proper DELETE endpoint for journal entries
2. **Inconsistent validation** - The validation on POST and PUT endpoints doesn't use the enhanced schemas with cross-field validation
3. **Intercompany validation** - The API doesn't properly validate intercompany transactions to ensure each entity code's debits and credits balance

## Implementation Plan

### 1. Add DELETE Endpoint

Implement a new endpoint at `DELETE /api/entities/:entityId/journal-entries/:id` that handles journal entry deletion with the following behavior:

- For `draft` entries: Permanently delete the journal entry and its lines
- For `posted` entries: Void the journal entry (admin only)
- For other statuses: Return an appropriate error

#### Authentication & Authorization
- Require authentication for all users
- Require admin role for voiding posted entries

#### Implementation Details

```typescript
app.delete("/api/entities/:entityId/journal-entries/:id", isAuthenticated, async (req, res) => {
  try {
    const entityId = parseInt(req.params.entityId);
    const entryId = parseInt(req.params.id);
    const userId = (req.user as AuthUser).id;
    
    // Get existing entry
    const entry = await storage.journalEntry.getJournalEntry(entryId);
    if (!entry || entry.entityId !== entityId) {
      return res.status(404).json({ message: "Journal entry not found" });
    }
    
    // Handle based on status
    if (entry.status === "posted") {
      // Admin can void posted entries
      const userRole = (req.user as AuthUser).role;
      if (userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can void posted journal entries" });
      }
      
      const { voidReason } = req.body;
      if (!voidReason) {
        return res.status(400).json({ message: "Void reason is required for posted entries" });
      }
      
      // Void instead of delete
      const updatedEntry = await storage.journalEntry.updateJournalEntry(entryId, {
        status: "void",
        voidedBy: userId,
        voidedAt: new Date(),
        voidReason: voidReason,
        updatedAt: new Date()
      });
      
      return res.json({
        message: "Journal entry voided successfully",
        entry: updatedEntry
      });
    } else if (entry.status === "draft") {
      // Actually delete draft entries
      await storage.journalEntry.deleteJournalEntry(entryId);
      return res.json({ message: "Journal entry deleted successfully" });
    } else {
      // Other statuses can't be deleted
      return res.status(400).json({ 
        message: `Journal entries with status '${entry.status}' cannot be deleted` 
      });
    }
  } catch (error) {
    console.error("Error deleting/voiding journal entry:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
```

### 2. Improve POST and PUT Validation

Update the validation on the existing endpoints to use our enhanced schemas with proper cross-field validation:

#### POST Endpoint
- Use `createJournalEntrySchema` which includes:
  - Field validation for required fields
  - Cross-field validation to ensure debits equal credits
  - Entity code validation for intercompany transactions

#### PUT Endpoint
- Use `updateJournalEntrySchema` with the same cross-field validations
- Add validation to ensure an entry can only be updated if it's in `draft` status

### 3. Standardize API Design

- Ensure all Journal Entry API endpoints use the pattern `/api/entities/:entityId/journal-entries/...`
- Update any references in the frontend to match this pattern

## Testing Strategy

### Unit Tests
- Create unit tests for the new DELETE endpoint
- Update unit tests for POST and PUT endpoints to include intercompany validation

### Integration Tests
- Create test cases with both valid and invalid inputs
- Test each endpoint with different user roles
- Test the workflow transitions with proper sequencing

### Test Script
- Create a test script to verify all endpoints using axios
- Include test cases for intercompany transactions

## Rollout Plan

1. Implement the changes in development environment
2. Run comprehensive tests on all affected endpoints
3. Deploy to staging for QA testing
4. Deploy to production with appropriate monitoring