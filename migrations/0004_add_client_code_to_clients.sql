-- Migration to add client_code field to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE;
