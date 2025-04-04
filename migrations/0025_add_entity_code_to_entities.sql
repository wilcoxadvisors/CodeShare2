-- migrations/0025_add_entity_code_to_entities.sql
-- Add entity_code column to entities table

-- First, check if the column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entities'
        AND column_name = 'entity_code'
    ) THEN
        -- Add entity_code column with unique constraint
        ALTER TABLE entities ADD COLUMN entity_code TEXT;
        
        -- Initially allow NULL values while we migrate existing data
    END IF;
END$$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_entities_entity_code ON entities(entity_code);
