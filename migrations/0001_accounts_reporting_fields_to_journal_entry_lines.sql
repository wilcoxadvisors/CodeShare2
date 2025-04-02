-- Migration: Move reporting fields from accounts to journal_entry_lines table

-- Drop columns from accounts table
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "fsli_bucket";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "internal_reporting_bucket";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "item";

-- Create enums if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journal_entry_status') THEN
        CREATE TYPE "journal_entry_status" AS ENUM ('Draft', 'Posted', 'Reversed');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journal_entry_line_type') THEN
        CREATE TYPE "journal_entry_line_type" AS ENUM ('Debit', 'Credit');
    END IF;
END$$;

-- Add columns to journal_entry_lines table
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "fsli_bucket" text;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "internal_reporting_bucket" text;
ALTER TABLE "journal_entry_lines" ADD COLUMN IF NOT EXISTS "item" text;