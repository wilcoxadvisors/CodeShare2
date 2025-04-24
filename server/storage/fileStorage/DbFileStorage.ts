import { db } from '../../db';
import { journalEntryFileBlobs } from '../../../shared/schema';
import { IFileStorage } from './IFileStorage';
import { eq } from 'drizzle-orm';

/**
 * Database-based file storage implementation
 * Stores files as base64-encoded blobs in PostgreSQL
 */
export class DbFileStorage implements IFileStorage {
  /**
   * Save a file to the database
   * @param buf The file buffer to store
   * @returns The ID of the inserted blob record
   */
  async save(buf: Buffer): Promise<number> {
    // Convert buffer to base64 string for storage
    const base64Data = buf.toString('base64');
    
    // Insert into journal_entry_file_blobs table
    const [row] = await db.insert(journalEntryFileBlobs)
      .values({ data: base64Data })
      .returning({ id: journalEntryFileBlobs.id });
    
    if (!row || !row.id) {
      throw new Error('Failed to save file to database');
    }
    
    console.log(`Saved file to database with ID ${row.id}`);
    return row.id;
  }

  /**
   * Load a file from the database
   * @param key The ID of the blob record
   * @returns The file buffer
   */
  async load(key: number | string): Promise<Buffer> {
    const keyNum = typeof key === 'string' ? parseInt(key) : key;
    
    // Query the database for the blob
    const [row] = await db.select({ data: journalEntryFileBlobs.data })
      .from(journalEntryFileBlobs)
      .where(eq(journalEntryFileBlobs.id, keyNum));
    
    if (!row || !row.data) {
      throw new Error(`File blob with ID ${key} not found`);
    }
    
    // Convert base64 string back to buffer
    return Buffer.from(row.data, 'base64');
  }

  /**
   * Delete a file from the database
   * @param key The ID of the blob record
   */
  async delete(key: number | string): Promise<void> {
    const keyNum = typeof key === 'string' ? parseInt(key) : key;
    
    // Delete the record from the database
    const result = await db.delete(journalEntryFileBlobs)
      .where(eq(journalEntryFileBlobs.id, keyNum));
    
    console.log(`Deleted file blob with ID ${key}`);
  }
}