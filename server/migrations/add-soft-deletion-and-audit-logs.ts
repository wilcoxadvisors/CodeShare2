import { db } from '../db';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * This migration adds:
 * 1. deleted_at timestamp column to clients and entities tables for soft deletion
 * 2. audit_logs table to track admin actions
 */
export async function addSoftDeletionAndAuditLogs() {
  console.log("Running migration to add soft deletion and audit logs...");

  try {
    // Add deleted_at columns to clients and entities tables
    await db.execute(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE entities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
    `);
    console.log("✅ Added deleted_at columns to clients and entities tables");

    // Create audit_logs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        performed_by INTEGER NOT NULL REFERENCES users(id),
        details TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ Created audit_logs table");

    console.log("✅ Successfully added soft deletion and audit logs");
    return true;
  } catch (error) {
    console.error("Error adding soft deletion and audit logs:", error);
    return false;
  }
}

// Allow running this migration directly using ES modules
// Check if this file is being run directly
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is the main module
if (import.meta.url === `file://${__filename}`) {
  addSoftDeletionAndAuditLogs()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}