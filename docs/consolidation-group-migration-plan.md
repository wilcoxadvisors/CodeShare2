# Consolidation Group Migration Plan

## Overview

This document outlines our migration plan for transitioning the entity-group relationship management from the current array-based approach to a more robust junction table implementation. This will ensure data integrity and enable more flexible queries and relationship management.

## Current Implementation

The consolidation group feature currently uses an array-based approach to store entity relationships:
- Entities are stored in the `entity_ids` array field in the `consolidation_groups` table
- Soft deletion is implemented using an `isActive` flag

## New Implementation

We are transitioning to a junction table approach for entity-group relationships:

### Database Schema Changes

1. **Junction Table**
   - The `consolidation_group_entities` table is defined in `shared/schema.ts`
   - Structure:
     ```
     CREATE TABLE consolidation_group_entities (
       group_id INTEGER NOT NULL REFERENCES consolidation_groups(id),
       entity_id INTEGER NOT NULL REFERENCES entities(id),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       PRIMARY KEY (group_id, entity_id)
     )
     ```
   - Proper foreign key constraints ensure data integrity
   - Indexes on both columns improve query performance

2. **Migration Tracking**
   - Added `migrated_to_junction` column to `consolidation_groups` table
   - Used to track which groups have been migrated to the junction table

### Migration Process

1. **Database Migration**
   - Run `add-junction-table.ts` to create the junction table
   - This script also:
     - Adds the `migrated_to_junction` column to the `consolidation_groups` table
     - Creates indexes for performance optimization

2. **Data Migration**
   - Run `migrate-consolidation-entities.ts` to:
     - Identify consolidation groups with entity relationships
     - For each group, insert records into the junction table for each entity
     - Mark groups as migrated by setting `migrated_to_junction = true`
     - Verify migration success with record count checks

### Implementation Strategy

We've implemented a phased approach to ensure backward compatibility:

1. **Phase 1: Dual Storage (Current - Q1-Q2 2025)**
   - All methods support both the junction table and entity_ids array
   - New data is written to both the junction table and entity_ids array
   - Read operations prioritize the junction table, falling back to the array if needed
   - Added comprehensive logging for entity_ids usage to track dependencies

2. **Phase 2: Junction Table Primary with Deprecation Notice (Q3 2025)**
   - Mark entity_ids array as officially deprecated in code and documentation
   - Add deprecation warnings/logs whenever entity_ids array is accessed directly
   - Continue maintaining backward compatibility
   - Audit logs to identify code that still relies on entity_ids array
   - Begin planning database migration to remove the column

3. **Phase 3: Junction Table Only with entity_ids Hidden (Q4 2025)**
   - Remove entity_ids from returned data objects but keep in database
   - Stop writing to entity_ids in all methods while maintaining the column 
   - Update all documentation to only reference junction table approach
   - Perform database query performance optimizations

4. **Phase 4: Complete Removal (Q1 2026)**
   - After verifying zero reliance on entity_ids (min. 3 months with no logs)
   - Execute database migration to remove entity_ids column
   - Remove all legacy code related to entity_ids array

### Deprecation Timeline Milestones

| Milestone | Expected Date | Description |
|-----------|---------------|-------------|
| Initial Implementation | Q1 2025 | Junction table with backward compatibility |
| Migration Completion | Q2 2025 | All data migrated to junction table |
| Deprecation Notice | July 2025 | Official announcement of entity_ids deprecation |
| Monitoring Period | Q3 2025 | Enhanced logging and audit of entity_ids usage |
| Hidden Phase | Q4 2025 | entity_ids removed from API responses |
| Verification Period | Jan-Mar 2026 | 3-month monitoring for zero entity_ids usage |
| Final Removal | April 2026 | Complete removal of entity_ids from database |

## Code Implementation Details

### Updated Methods

All relevant methods in `server/consolidation-group-methods.ts` have been updated to support the dual storage approach:

1. **createConsolidationGroup**
   - Creates entries in the junction table for each entity
   - Also stores entity IDs in the array field for backward compatibility

2. **addEntityToConsolidationGroup**
   - Adds an entity to a group in both the junction table and entity_ids array
   - Uses database transactions to ensure consistency

3. **removeEntityFromConsolidationGroup**
   - Removes an entity from a group in both the junction table and entity_ids array
   - Uses database transactions to ensure consistency

4. **getConsolidationGroupEntities**
   - Retrieves entities for a group from the junction table
   - Falls back to entity_ids array if no records found in junction table

5. **getEntityConsolidationGroups**
   - Retrieves groups for an entity from the junction table
   - Falls back to filtering on entity_ids array if no records found in junction table

6. **generateConsolidatedReport**
   - Gets entity IDs from the junction table
   - Falls back to entity_ids array if needed

7. **deleteConsolidationGroup**
   - Implements soft delete by setting isActive=false
   - Preserves junction table relationships for audit purposes

### Soft Delete Implementation

All operations respect the soft delete status (`isActive` flag):
- Read operations only return active groups
- Delete operations use soft delete by setting isActive=false
- Junction table relationships are preserved even for soft-deleted groups

## Testing the Migration

To verify the migration:

1. Run the migration script:
   ```
   npx tsx scripts/migrate-consolidation-entities.ts
   ```

2. Verify the results:
   - Check the logs for successful migration messages
   - Query the database to compare record counts
   - Run the consolidation group tests to verify functionality

## Benefits of the New Approach

1. **Data Integrity**
   - Foreign key constraints ensure valid relationships
   - Proper database normalization

2. **Performance**
   - More efficient queries with indexed columns
   - Better handling of large numbers of relationships

3. **Flexibility**
   - Ability to add metadata to relationships in the future
   - More robust querying capabilities

4. **Maintenance**
   - Clearer data model
   - Better alignment with database best practices

## Conclusion

This migration significantly improves our data model while maintaining backward compatibility. The dual storage approach ensures a smooth transition with minimal risk to existing functionality.