-- Migration: Convert journal_entries.date column to DATE type
-- This fixes timezone issues by using a consistent DATE type without time components
-- Author: Replit Agent, May 1, 2025

-- First check if we need to perform the migration
DO $$ 
BEGIN
    -- Check the current data type of the date column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'journal_entries' 
        AND column_name = 'date' 
        AND data_type = 'timestamp without time zone'
    ) THEN
        -- Alter the column to DATE type
        ALTER TABLE journal_entries 
        ALTER COLUMN date TYPE DATE 
        USING date::DATE;
        
        RAISE NOTICE 'Successfully converted journal_entries.date column to DATE type';
    ELSE
        RAISE NOTICE 'No migration needed - journal_entries.date column is already DATE type';
    END IF;
END $$;

-- Add comment to the column for documentation purposes
COMMENT ON COLUMN journal_entries.date IS 'Date of the journal entry (DATE type, without time component to avoid timezone issues)';