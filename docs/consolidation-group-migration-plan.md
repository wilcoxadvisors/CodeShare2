# Consolidation Group Migration Plan

## Current Implementation
The consolidation group feature currently uses an array-based approach to store entity relationships:
- Entities are stored in the `entity_ids` array field in the `consolidation_groups` table
- This approach works but has limitations in terms of data integrity and query efficiency
- Soft deletion is implemented using an `isActive` flag

## Future Implementation (Phase 2)
We will transition to a junction table approach for entity-group relationships:

1. **Junction Table Design**
   - The `consolidation_group_entities` table is already defined in `shared/schema.ts`
   - It establishes a proper many-to-many relationship between consolidation groups and entities
   - It includes foreign key constraints for data integrity

2. **Migration Steps**
   - Run a database migration to create the `consolidation_group_entities` table
   - Write a data migration script to:
     - For each consolidation group, get the `entity_ids` array
     - For each entity ID in the array, create a record in the junction table
     - Verify data integrity after migration

3. **Code Adaptation**
   - The current implementation in `server/consolidation-group-methods.ts` already includes conditional logic to support both approaches
   - After migration, update the code to primarily use the junction table
   - Consider a deprecation period where both approaches are supported

## Benefits of Junction Table Approach
1. **Data Integrity**
   - Foreign key constraints ensure referenced entities and groups exist
   - Prevents orphaned relationships when entities or groups are deleted

2. **Query Efficiency**
   - More efficient queries for complex relationships
   - Indexed lookups for better performance with large datasets

3. **Feature Extensibility**
   - Enables adding metadata to relationships (e.g., entity-specific consolidation rules)
   - Supports more complex group membership scenarios

4. **Maintenance**
   - Easier to maintain and debug
   - Follows database best practices

## Implementation Timeline
1. **Phase 1 (Current)**: Array-based implementation with soft deletion
2. **Phase 2**: Create junction table and migrate data
3. **Phase 3**: Update API to primarily use junction table while maintaining backward compatibility
4. **Phase 4**: Fully transition to junction table approach

## Technical Debt Considerations
- The array-based approach represents technical debt that will be addressed in Phase 2
- The current approach is a pragmatic solution that allows the system to function while planning for a more robust implementation
- Temporary trade-offs made for backward compatibility will be resolved during the full transition