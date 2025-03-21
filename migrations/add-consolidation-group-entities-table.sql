-- Migration: Add consolidation_group_entities junction table
-- This migration script creates the junction table for the many-to-many relationship
-- between consolidation_groups and entities

-- First, add a migrated_to_junction column to the consolidation_groups table
ALTER TABLE consolidation_groups 
ADD COLUMN migrated_to_junction BOOLEAN DEFAULT FALSE;

-- Create the junction table
CREATE TABLE IF NOT EXISTS consolidation_group_entities (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES consolidation_groups(id),
    entity_id INTEGER NOT NULL REFERENCES entities(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, entity_id)
);

-- Add indexes for performance
CREATE INDEX idx_consolidation_group_entities_group_id 
ON consolidation_group_entities(group_id);

CREATE INDEX idx_consolidation_group_entities_entity_id 
ON consolidation_group_entities(entity_id);

-- Add a comment to the table
COMMENT ON TABLE consolidation_group_entities IS 
'Junction table for many-to-many relationship between consolidation groups and entities';

-- This migration doesn't migrate the data - that will be handled by a separate script
-- After running this migration, execute the data migration script:
-- tsx scripts/migrate-consolidation-entities.ts