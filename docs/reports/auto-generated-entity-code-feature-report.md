# Auto-Generated Entity Codes Report

## Overview
Entities receive an auto-generated code consisting of the client's alphanumeric client code followed by a hyphen and a four-digit sequential number. This ensures uniqueness, readability, scalability, and clear hierarchical relationship between clients and their entities.

## Format Example
- Client Code: `A1B2C3D4E5` (10-character alphanumeric code)
- Entity Codes:
  - `A1B2C3D4E5-0001`
  - `A1B2C3D4E5-0002`
  - `A1B2C3D4E5-0003`
  ...up to
  - `A1B2C3D4E5-9999`

## Technical Details
- Client codes: 10-character alphanumeric strings (0-9, A-Z)
- Entity codes: Client code + hyphen + 4-digit sequential number
- Database column: `VARCHAR(30)` with unique constraint
- Code generation is handled completely by the backend
- Frontend only displays the codes, never modifies them
- Entity codes are hierarchical to clearly show which entities belong to which clients

## Code Generation Logic
1. When creating a new entity, the system retrieves the client code of the associated client
2. It then finds all existing entity codes for that client
3. The system extracts the sequential numbers from those codes
4. The next available number is determined (either max+1 or 1 if none exist)
5. The number is zero-padded to 4 digits for consistent formatting

## Storage and Implementation
- Database: Entity codes are stored in the `entity_code` column of the `entities` table
- Backend: Implemented in `server/storage/entityStorage.ts` in the `generateUniqueEntityCode` function
- Memory Storage: Consistent implementation in `MemEntityStorage.generateEntityCode`

## Migration
- All existing entities have been updated to use the 4-digit format
- Migration process preserved existing sequential numbering
- Migration verified with comprehensive tests

## Benefits
- Clear hierarchical structure shows which entities belong to which clients
- Format supports up to 9,999 entities per client (scalable for all expected client sizes)
- Consistent formatting makes sorting and reporting easier
- Codes are human-readable yet secure (not exposing internal IDs)
- Soft deletion support ensures code uniqueness even across deleted/restored entities

## Front-end Display
Entity codes are displayed in client management screens and detail views. They are displayed as read-only values to ensure consistency and integrity.

```typescript
// Example of entity code display in React component
<p className="text-gray-600">
  Entity Code: <span className="font-mono font-semibold">{entity.entityCode}</span>
</p>
```
