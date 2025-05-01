-- Migration to modify journal_entries date column to fix timezone issues
-- We'll store dates as text in YYYY-MM-DD format to ensure consistent behavior

-- First, check if journal_entries table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'journal_entries') THEN
        -- Alter the date column to store as TEXT
        ALTER TABLE journal_entries 
        ALTER COLUMN date TYPE TEXT 
        USING TO_CHAR(date::date, 'YYYY-MM-DD');
        
        RAISE NOTICE 'Successfully altered journal_entries date column to TEXT format';
    ELSE
        RAISE NOTICE 'journal_entries table does not exist, skipping migration';
    END IF;
END;
$$;