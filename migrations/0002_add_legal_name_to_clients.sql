-- Migration to add legal_name column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS legal_name TEXT;
