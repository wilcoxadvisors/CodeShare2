/**
 * Migration to add JE_FILES_ADMIN role
 * 
 * This role grants permission to delete any journal entry file
 * regardless of who created the associated journal entry.
 */
import { db } from '../db';

export async function migrateAddJeFilesAdminRole() {
  console.log('Running migration to add JE_FILES_ADMIN role...');
  
  try {
    // Insert the new role if it doesn't exist
    await db.execute(`
      INSERT INTO roles (code, name)
      VALUES ('JE_FILES_ADMIN', 'JE File Admin')
      ON CONFLICT (code) DO NOTHING;
    `);
    
    console.log('✅ Added JE_FILES_ADMIN role successfully');
    return true;
  } catch (error) {
    console.error('Error adding JE_FILES_ADMIN role:', error);
    throw error;
  }
}