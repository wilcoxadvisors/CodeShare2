-- Add 'deleted_at' columns for soft deletion
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create Audit Logs table to track admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  performed_by INTEGER NOT NULL REFERENCES users(id),
  details TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);