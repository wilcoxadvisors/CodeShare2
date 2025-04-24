import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function addJournalEntryFileBlobs() {
  console.log('Running migration to add journal_entry_file_blobs table...');
  
  // Create the journal_entry_file_blobs table
  await sql`
    CREATE TABLE IF NOT EXISTS journal_entry_file_blobs (
      id SERIAL PRIMARY KEY,
      data BYTEA NOT NULL
    )
  `.execute(db);
  
  // Add storageKey column to journal_entry_files table
  const columns = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'journal_entry_files' AND column_name = 'storage_key'
  `.execute(db);
  
  if (columns.rows.length === 0) {
    await sql`
      ALTER TABLE journal_entry_files 
      ADD COLUMN storage_key INTEGER REFERENCES journal_entry_file_blobs(id)
    `.execute(db);
  }
  
  console.log('✅ Successfully added journal_entry_file_blobs table and storage_key column');
}