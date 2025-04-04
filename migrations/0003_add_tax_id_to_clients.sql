-- Migration: Add tax_id field to clients table
ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS tax_id TEXT;
