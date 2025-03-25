# Consolidation Migration Archive

This directory contains scripts that were used for the migration from using the `entity_ids` array in the `consolidation_groups` table to using a proper junction table (`consolidation_group_entities`) for entity-group relationships.

## Migration History

1. Originally, the `consolidation_groups` table had an `entity_ids` array column that stored entity IDs
2. We added a junction table `consolidation_group_entities` to properly model the many-to-many relationship
3. We ran the migration scripts to populate the junction table with data from the `entity_ids` array
4. We maintained backward compatibility for some time, updating both the array and junction table
5. Finally, we completely removed the `entity_ids` column when all systems were using the junction table

## Scripts in This Directory

- `execute-entity-ids-removal.ts` - Script to execute the final removal of the entity_ids column
- `execute-remove-entity-ids.ts` - Alternative script for entity_ids column removal
- `generate-entity-ids-usage-report.ts` - Tool to monitor and report on entity_ids usage during the migration
- `migrate-consolidation-entities.ts` - Script to migrate data from entity_ids array to the junction table
- `verify-migration-complete.ts` - Verification tool to ensure it was safe to remove the entity_ids column

## Current Implementation

The current implementation exclusively uses the junction table approach, which provides:

- Better data integrity with foreign key constraints
- More efficient queries
- Proper modeling of many-to-many relationships
- Support for relationship metadata (timestamps, etc.)

These scripts are kept for historical reference only and should not be used in the current system.