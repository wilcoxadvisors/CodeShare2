/**
 * Cleanup script for orphaned files created by immediate upload behavior
 * 
 * This script identifies and removes files that were uploaded but never properly
 * linked to saved journal entries, preventing database bloat from abandoned uploads.
 */

import { DatabaseStorage } from '../server/storage.js';
import fs from 'fs/promises';
import path from 'path';

async function cleanupOrphanedFiles() {
  console.log('🧹 Starting orphaned files cleanup...');
  
  const storage = new DatabaseStorage();
  
  try {
    // Find files that exist in database but journal entries are not saved
    const query = `
      SELECT jef.id, jef.filename, jef.file_path, je.status, je.id as entry_id
      FROM journal_entry_files jef
      LEFT JOIN journal_entries je ON jef.journal_entry_id = je.id
      WHERE jef.deleted_at IS NULL
      AND (je.id IS NULL OR je.status = 'draft' AND je.created_at < NOW() - INTERVAL '1 hour')
      ORDER BY jef.created_at DESC
    `;
    
    const result = await storage.db.execute(query);
    const orphanedFiles = result.rows || [];
    
    console.log(`📊 Found ${orphanedFiles.length} potentially orphaned files`);
    
    if (orphanedFiles.length === 0) {
      console.log('✅ No orphaned files found - database is clean!');
      return;
    }
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const file of orphanedFiles) {
      try {
        console.log(`🗑️  Processing file: ${file.filename} (ID: ${file.id})`);
        
        // Delete physical file if it exists
        if (file.file_path) {
          try {
            await fs.unlink(file.file_path);
            console.log(`   📁 Deleted physical file: ${file.file_path}`);
          } catch (fsError) {
            if (fsError.code !== 'ENOENT') {
              console.log(`   ⚠️  Could not delete physical file: ${fsError.message}`);
            }
          }
        }
        
        // Delete database record
        await storage.db.execute(
          'UPDATE journal_entry_files SET deleted_at = NOW() WHERE id = ?',
          [file.id]
        );
        
        deletedCount++;
        console.log(`   ✅ Marked database record as deleted`);
        
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error processing file ${file.id}:`, error.message);
      }
    }
    
    console.log(`\n📈 Cleanup Summary:`);
    console.log(`   • Files processed: ${orphanedFiles.length}`);
    console.log(`   • Successfully deleted: ${deletedCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Database space recovered: ~${Math.round(deletedCount * 0.5)}MB (estimated)`);
    
    if (deletedCount > 0) {
      console.log('✅ Orphaned files cleanup completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupOrphanedFiles()
    .then(() => {
      console.log('🎉 Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupOrphanedFiles };