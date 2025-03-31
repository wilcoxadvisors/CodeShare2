/**
 * Manual test script for Chart of Accounts import/export functionality
 * 
 * Usage:
 *   - Export Chart of Accounts: node scripts/test-coa-manual.js export [CLIENT_ID] [OUTPUT_FILE]
 *   - Import Chart of Accounts: node scripts/test-coa-manual.js import [CLIENT_ID] [INPUT_FILE] [--verbose]
 *   - List all accounts for a client: node scripts/test-coa-manual.js list-accounts [CLIENT_ID]
 * 
 * Examples:
 *   - Export: node scripts/test-coa-manual.js export 1 ./test-export.csv
 *   - Import: node scripts/test-coa-manual.js import 1 ./test-import.csv
 *   - List: node scripts/test-coa-manual.js list-accounts 1
 */

import { db } from '../server/db.js';
import { accounts, AccountType } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import DatabaseStorage from '../server/db-storage.js';

const storage = new DatabaseStorage();

async function exportChartOfAccounts(clientId, outputPath) {
  console.log(`Exporting Chart of Accounts for client ${clientId} to ${outputPath}`);
  
  try {
    // Get all accounts for this client
    const clientAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.clientId, clientId));
    
    if (clientAccounts.length === 0) {
      console.log(`No accounts found for client ${clientId}`);
      return;
    }
    
    console.log(`Found ${clientAccounts.length} accounts`);
    
    // Create CSV header
    let csv = 'Code,Name,Type,Active,ParentCode,Description,Subtype,IsSubledger,SubledgerType\n';
    
    // Add accounts data
    for (const account of clientAccounts) {
      // Get parent code if parent exists
      let parentCode = '';
      if (account.parentId) {
        const parent = clientAccounts.find(a => a.id === account.parentId);
        if (parent) {
          parentCode = parent.code;
        }
      }
      
      // Format each field and handle null values
      const row = [
        account.code,
        escapeCsvField(account.name),
        account.type,
        account.active ? 'yes' : 'no',
        escapeCsvField(parentCode),
        escapeCsvField(account.description || ''),
        escapeCsvField(account.subtype || ''),
        account.isSubledger ? 'yes' : 'no',
        escapeCsvField(account.subledgerType || '')
      ];
      
      csv += row.join(',') + '\n';
    }
    
    // Write to file
    fs.writeFileSync(outputPath, csv);
    console.log(`Export completed successfully. File saved to ${outputPath}`);
  } catch (error) {
    console.error('Error exporting Chart of Accounts:', error);
  }
}

async function importChartOfAccounts(clientId, inputPath, verbose) {
  console.log(`Importing Chart of Accounts for client ${clientId} from ${inputPath}`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`File not found: ${inputPath}`);
      return;
    }
    
    // Read and parse CSV
    const fileContent = fs.readFileSync(inputPath, 'utf8');
    
    // Call storage method to import
    console.log(`Starting import process...`);
    const result = await storage.importCoaForClient(clientId, fileContent, { 
      fileType: 'csv',
      verbose: verbose || false
    });
    
    if (result.success) {
      console.log(`✅ Import successful!`);
      console.log(`- Created: ${result.created} accounts`);
      console.log(`- Updated: ${result.updated} accounts`);
      console.log(`- Inactive: ${result.inactivated} accounts`);
      console.log(`- Skipped: ${result.skipped} accounts`); 
      
      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.forEach(warning => console.log(`- ${warning}`));
      }
    } else {
      console.error(`❌ Import failed: ${result.errors.join(', ')}`);
    }
  } catch (error) {
    console.error('Error importing Chart of Accounts:', error);
  }
}

async function listAccounts(clientId) {
  console.log(`Listing all accounts for client ${clientId}`);
  
  try {
    // Get all accounts for this client
    const clientAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.clientId, clientId));
    
    if (clientAccounts.length === 0) {
      console.log(`No accounts found for client ${clientId}`);
      return;
    }
    
    console.log(`Found ${clientAccounts.length} accounts:`);
    console.log('---------------------------------------------');
    console.log('ID\tCode\tName\tType\tActive\tParent\tSubledger');
    console.log('---------------------------------------------');
    
    for (const account of clientAccounts) {
      // Get parent code if parent exists
      let parentCode = '';
      if (account.parentId) {
        const parent = clientAccounts.find(a => a.id === account.parentId);
        if (parent) {
          parentCode = parent.code;
        }
      }
      
      console.log(`${account.id}\t${account.code}\t${account.name}\t${account.type}\t${account.active ? 'Yes' : 'No'}\t${parentCode}\t${account.isSubledger ? 'Yes' : 'No'}`);
    }
    
    console.log('---------------------------------------------');
  } catch (error) {
    console.error('Error listing accounts:', error);
  }
}

// Helper function to escape CSV fields with commas or quotes
function escapeCsvField(field) {
  if (!field) return '';
  
  // If the field contains a comma, quote, or newline, wrap it in quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    // Double up any quotes
    return '"' + field.replace(/"/g, '""') + '"';
  }
  
  return field;
}

// Run the appropriate command based on arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('Please specify a command: export, import, or list-accounts');
    return;
  }
  
  const clientId = parseInt(args[1], 10);
  
  if (isNaN(clientId)) {
    console.log('Please provide a valid client ID');
    return;
  }
  
  switch (command) {
    case 'export':
      const outputPath = args[2] || './coa-export.csv';
      await exportChartOfAccounts(clientId, outputPath);
      break;
      
    case 'import':
      const inputPath = args[2];
      if (!inputPath) {
        console.log('Please provide an input file path');
        return;
      }
      const verbose = args.includes('--verbose');
      await importChartOfAccounts(clientId, inputPath, verbose);
      break;
      
    case 'list-accounts':
      await listAccounts(clientId);
      break;
      
    default:
      console.log('Unknown command. Please use export, import, or list-accounts');
  }
  
  // Close DB connection
  await db.end();
}

main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
});