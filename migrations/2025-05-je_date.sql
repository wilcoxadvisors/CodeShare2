-- Migration to change journal_entries.date column to plain DATE type (no timezone)
-- This ensures consistent date handling without timezone shifts

-- Alter the column type to DATE, using an explicit conversion for existing data
ALTER TABLE journal_entries ALTER COLUMN date TYPE DATE USING date::date;

-- Add comment explaining the purpose of this column
COMMENT ON COLUMN journal_entries.date IS 'Journal entry date (stored as plain DATE without timezone)';