/**
 * Migration to add journal_entry_file_blobs table and modify journal_entry_files
 * This migration moves file storage from direct database storage to blob-based storage
 */
import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function runMigration() {
  console.log('Running migration to add journal_entry_file_blobs table...');

  try {
    // Check if the journal_entry_file_blobs table already exists
    const blobsTableExists = await checkTableExists('journal_entry_file_blobs');
    
    if (!blobsTableExists) {
      // Create the journal_entry_file_blobs table
      await db.execute(sql`
        CREATE TABLE journal_entry_file_blobs (
          id SERIAL PRIMARY KEY,
          data TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        )
      `);
      console.log('✅ Created journal_entry_file_blobs table');

      // Check if storage_key column exists in journal_entry_files
      const hasStorageKeyColumn = await checkColumnExists('journal_entry_files', 'storage_key');

      if (!hasStorageKeyColumn) {
        // Add the storage_key column to journal_entry_files table
        await db.execute(sql`
          ALTER TABLE journal_entry_files 
          ADD COLUMN storage_key INTEGER REFERENCES journal_entry_file_blobs(id)
        `);
        console.log('✅ Added storage_key column to journal_entry_files table');
      } else {
        console.log('✅ storage_key column already exists in journal_entry_files table');
      }

      // Check if data column exists
      const hasDataColumn = await checkColumnExists('journal_entry_files', 'data');
      
      // Migrate existing data to blob storage if applicable
      if (hasDataColumn) {
        console.log('Starting migration of existing file data to blob storage...');
        const files = await db.execute(sql`
          SELECT id, data FROM journal_entry_files 
          WHERE data IS NOT NULL AND storage_key IS NULL
        `);
        
        let fileCount = 0;
        for (const file of files.rows) {
          // Skip if data is null
          if (!file.data) continue;
          
          // Insert into blob storage
          const result = await db.execute(sql`
            INSERT INTO journal_entry_file_blobs (data)
            VALUES (${file.data})
            RETURNING id
          `);
          
          if (result.rows.length > 0) {
            const blobId = result.rows[0].id;
            
            // Update the file record to reference the blob
            await db.execute(sql`
              UPDATE journal_entry_files
              SET storage_key = ${blobId}
              WHERE id = ${file.id}
            `);
            
            fileCount++;
          }
        }
        
        console.log(`✅ Migrated ${fileCount} files to blob storage`);
      }
      
      console.log('✅ Successfully completed file blob storage migration');
    } else {
      console.log('✅ journal_entry_file_blobs table already exists, skipping migration');
    }
    
    return true;
  } catch (error) {
    console.error('Error in file blob storage migration:', error);
    throw error;
  }
}

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    )
  `);
  
  return result.rows.length > 0 && result.rows[0].exists === true;
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName} 
      AND column_name = ${columnName}
    )
  `);
  
  return result.rows.length > 0 && result.rows[0].exists === true;
}