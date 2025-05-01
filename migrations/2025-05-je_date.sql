-- Migration to fix date column format in journal_entries table
-- Convert timestamptz to DATE to avoid timezone issues

-- First, check if the column is already the proper type
DO $$
DECLARE
    column_type TEXT;
BEGIN
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_name = 'journal_entries' AND column_name = 'date';
    
    IF column_type = 'date' THEN
        RAISE NOTICE 'Column journal_entries.date is already type DATE. No migration needed.';
    ELSIF column_type = 'text' THEN
        RAISE NOTICE 'Column journal_entries.date is already type TEXT. No migration needed.';
    ELSE
        -- Backup the data with timezone info preserved
        RAISE NOTICE 'Creating backup of journal_entries dates...';
        CREATE TEMPORARY TABLE IF NOT EXISTS journal_entries_date_backup AS
        SELECT id, date AS original_date
        FROM journal_entries;
        
        -- Alter the column to date type (will lose timezone information)
        RAISE NOTICE 'Converting date column from % to DATE...', column_type;
        ALTER TABLE journal_entries ALTER COLUMN date TYPE DATE
        USING date::date;
        
        -- Log the backup for reference
        RAISE NOTICE 'Migration completed. Date column converted to DATE type.';
    END IF;
END $$;

-- Verify the change
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'journal_entries' 
    AND column_name = 'date';