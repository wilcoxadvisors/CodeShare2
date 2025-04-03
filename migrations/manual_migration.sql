-- Update journal_entries table
ALTER TABLE journal_entries 
ADD COLUMN client_id INTEGER NOT NULL REFERENCES clients(id), -- Add client_id
ADD COLUMN is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE,
ADD COLUMN is_reversed BOOLEAN DEFAULT FALSE,
ADD COLUMN reversed_entry_id INTEGER,
ADD COLUMN reversed_by_entry_id INTEGER,
RENAME COLUMN reference TO reference_number;

-- Add references after table has been altered
ALTER TABLE journal_entries
ADD CONSTRAINT journal_entries_reversed_entry_id_fkey
FOREIGN KEY (reversed_entry_id) REFERENCES journal_entries(id);

ALTER TABLE journal_entries
ADD CONSTRAINT journal_entries_reversed_by_entry_id_fkey
FOREIGN KEY (reversed_by_entry_id) REFERENCES journal_entries(id);

-- Update journal_entry_lines table
-- First, add new columns
ALTER TABLE journal_entry_lines
ADD COLUMN type TEXT,
ADD COLUMN amount NUMERIC(19, 4),
ADD COLUMN line_no INTEGER,
ADD COLUMN reference TEXT,
ADD COLUMN reconciled BOOLEAN DEFAULT FALSE,
ADD COLUMN reconciled_at TIMESTAMP,
ADD COLUMN reconciled_by INTEGER REFERENCES users(id),
ADD COLUMN updated_at TIMESTAMP DEFAULT now() NOT NULL;

-- Then migrate existing data (convert debit/credit columns to type/amount)
UPDATE journal_entry_lines
SET type = 'debit', amount = debit
WHERE debit > 0;

UPDATE journal_entry_lines
SET type = 'credit', amount = credit
WHERE credit > 0;

-- Make type column not null after data migration
ALTER TABLE journal_entry_lines
ALTER COLUMN type SET NOT NULL,
ALTER COLUMN amount SET NOT NULL;

-- Drop old columns
ALTER TABLE journal_entry_lines
DROP COLUMN debit,
DROP COLUMN credit,
DROP COLUMN entity_id;

-- Add enum constraint to type column
ALTER TABLE journal_entry_lines
ADD CONSTRAINT journal_entry_lines_type_check
CHECK (type IN ('debit', 'credit'));