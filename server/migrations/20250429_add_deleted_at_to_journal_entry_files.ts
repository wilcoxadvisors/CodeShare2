import { sql } from 'drizzle-orm';

/**
 * Migration to add deleted_at column to journal_entry_files table
 * This column is required for soft deletion support
 */
export async function up(db: any) {
  // Add the deleted_at column if it doesn't exist
  await db.execute(sql`
    ALTER TABLE journal_entry_files
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
  `);
  
  console.log('✅ Added deleted_at column to journal_entry_files table');
}