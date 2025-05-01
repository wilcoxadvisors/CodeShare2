-- Migration to change journal_entries.date from timestamp to DATE type
-- This migration is idempotent and can be safely run multiple times

-- First check if the column needs to be changed
DO $$
DECLARE
    column_type TEXT;
BEGIN
    -- Get the current column type
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'date';
    
    -- Only perform the migration if the column is not already a DATE type
    IF column_type != 'date' THEN
        -- Alter the column type
        EXECUTE 'ALTER TABLE journal_entries 
                 ALTER COLUMN date TYPE DATE USING date::DATE';
                 
        -- Add a comment explaining the column's purpose
        EXECUTE 'COMMENT ON COLUMN journal_entries.date IS 
                ''Date of the journal entry (DATE type, without time component to avoid timezone issues)''';
                
        RAISE NOTICE 'Successfully converted journal_entries.date from % to DATE type', column_type;
    ELSE
        RAISE NOTICE 'journal_entries.date is already DATE type, no conversion needed';
    END IF;
END$$;