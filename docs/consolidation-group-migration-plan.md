# Consolidation Group Migration Plan

## Overview

This document outlines our plan to migrate consolidation groups from using an array-based approach (`entity_ids`) to a more robust junction table implementation (`consolidation_group_entities`). The migration includes the implementation of soft deletes to enhance our data integrity practices.

## Timeline

The migration will follow a phased approach spanning from Q1 2025 to Q1 2026:

| Phase | Period | Description |
|-------|--------|-------------|
| 1 | Q1-Q2 2025 | Dual storage phase - both approaches used simultaneously |
| 2 | Q3 2025 | Junction table becomes primary with explicit deprecation notices |
| 3 | Q4 2025 | Junction table only, with `entity_ids` becoming hidden |
| 4 | Q1 2026 | Complete removal of `entity_ids` field |

## Implementation Details

### Soft Deletes

Rather than physically removing records from the database, we've implemented soft deletion by:

1. Adding an `isActive` flag to the `consolidation_groups` table
2. Modifying all delete operations to set `isActive = false` rather than removing records
3. Updating queries to filter out inactive records by default
4. Maintaining relationships in the junction table even for inactive groups

This approach preserves historical data and relationships while allowing for logical deletion.

### Junction Table Implementation

We've created a new `consolidation_group_entities` junction table with the following structure:

```sql
CREATE TABLE consolidation_group_entities (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES consolidation_groups(id),
  entity_id INTEGER NOT NULL REFERENCES entities(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, entity_id)
);
```

### Backward Compatibility

During the transition period, we maintain backward compatibility through:

1. Dual writing to both `entity_ids` array and the junction table
2. Implementing both data access methods with primary/fallback logic
3. Detailed logging of all usage of the deprecated `entity_ids` field

## Usage Monitoring

We've implemented a robust monitoring system to track usage of the deprecated `entity_ids` field:

1. Three categories of usage logging:
   - Direct access (highest severity)
   - Fallback use when junction table has no data
   - Compatibility updates when modifying relationships

2. Regular usage reports (available via CLI and admin API)
   - Usage statistics by method and type
   - Trend analysis
   - Actionable recommendations

3. Automatic alerts when usage thresholds are exceeded

## Tools and Utilities

The following tools are available to assist with the migration:

1. Migration script: `scripts/migrate-consolidation-entities.ts`
   - Moves data from `entity_ids` arrays to the junction table
   - Verifies migration integrity
   - Marks records as migrated

2. Usage reporting: `scripts/generate-entity-ids-usage-report.ts`
   - Generates detailed usage reports for any time period
   - Provides actionable insights
   - Tracks progress through the deprecation timeline

3. Admin API endpoint: `/api/admin/entity-ids-usage-report`
   - Provides the same reporting data via API for admin dashboards
   - Supports filtering by time period

## Best Practices During Migration

1. For new code, always use the junction table methods:
   - `getConsolidationGroupEntities()` to get entities in a group
   - `addEntityToConsolidationGroup()` and `removeEntityFromConsolidationGroup()` for modifications

2. Avoid direct access to the `entity_ids` property

3. When maintaining existing code, update to use the new methods rather than accessing `entity_ids` directly

4. Monitor usage reports regularly to identify areas that need attention

## Completion Criteria

The migration will be considered complete when:

1. All code has been updated to use the junction table
2. No direct access to `entity_ids` is detected in monitoring
3. All data has been verified to exist correctly in the junction table
4. The `entity_ids` field has been removed from the schema

## Contacts

For questions about this migration plan, contact:
- Database Team: database@example.com
- API Team: api@example.com