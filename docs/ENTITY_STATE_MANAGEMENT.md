# Entity State Management

This document outlines the implementation of entity state management in the financial management platform.

## Entity States

Entities in the system can be in one of three states:

1. **Active**: 
   - `active = true` 
   - `deletedAt = null`
   - Fully functional and visible throughout the application

2. **Inactive**: 
   - `active = false` 
   - `deletedAt = null`
   - Visible but may be filtered out in some contexts; not fully operational

3. **Soft-Deleted**: 
   - `active = false` 
   - `deletedAt = <timestamp>`
   - Hidden in most contexts but recoverable

## API Endpoints

The following API endpoints handle entity state transitions:

| Endpoint | Method | Description | State Change |
|----------|--------|-------------|-------------|
| `/api/entities/:id/set-inactive` | POST | Sets an entity to inactive | Active → Inactive |
| `/api/entities/:id` | DELETE | Soft-deletes an entity | Any → Soft-Deleted |
| `/api/entities/:id/restore` | POST | Restores a soft-deleted entity | Soft-Deleted → Active |

## Implementation Details

### Storage Layer

The `EntityStorage` and `MemEntityStorage` classes implement the following methods:

- `setEntityInactive(id)`: Sets an entity to inactive (active=false, deletedAt=null)
- `setEntityActive(id)`: Sets an entity to active (active=true, deletedAt=null)
- `deleteEntity(id)`: Soft-deletes an entity (active=false, deletedAt=timestamp)
- `restoreEntity(id)`: Restores a soft-deleted entity (active=true, deletedAt=null)

Entity filtering methods like `getEntities()`, `getEntitiesByUser()`, and `getEntitiesByClient()` all accept parameters to control whether inactive or deleted entities are included in results.

### Frontend Components

The frontend implements comprehensive UI controls for managing entity states:

#### EntityEditModal Component

The EntityEditModal provides buttons for:
- Setting an active entity to inactive
- Soft-deleting an entity
- Restoring a soft-deleted entity

All destructive actions include confirmation dialogs with clear explanations of the consequences.

#### ClientEditModal Component 

The ClientEditModal displays a list of entities with:
- Visual indicators of entity state (badges showing Active/Inactive/Deleted)
- Context-appropriate action buttons based on current entity state
- Confirmation dialogs for all state transitions

## Verification

The entity state management implementation has been verified through:

1. Automated tests that verify proper handling of all three entity states
2. API endpoint tests that confirm correct transitions between states
3. Manual UI testing to ensure the frontend correctly displays entity states and enables appropriate actions

## Best Practices

- Always use the dedicated methods for state transitions rather than direct property updates
- Include proper error handling for edge cases (e.g., attempting to restore an entity that isn't deleted)
- Maintain clear UI feedback about entity states to prevent user confusion
- Use confirmation dialogs for potentially destructive actions
