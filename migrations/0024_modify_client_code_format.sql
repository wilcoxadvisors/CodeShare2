-- Migration to modify client_code column to VARCHAR format for alphanumeric codes
-- This supports up to 20 characters to accommodate the current 10-character
-- codes and potential future expansion

-- Modify client_code column to VARCHAR(20)
ALTER TABLE clients 
ALTER COLUMN client_code TYPE VARCHAR(20);

-- Add a UNIQUE constraint to ensure no duplicate client codes
-- (Only if it doesn't already exist - will fail safely if it does)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clients_client_code_unique'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_client_code_unique UNIQUE (client_code);
  END IF;
END $$;
