/**
 * Simple Chart of Accounts Export Verification Script
 */
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const COOKIE_FILE = './cookies.txt';
const TEMP_DIR = './tmp/export-verification';

// Create temp directory if it doesn't exist
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Helper function to read cookies from file
 */
function getCookieHeader() {
  try {
    const cookieContent = fs.readFileSync(COOKIE_FILE, 'utf8');
    return cookieContent.trim();
  } catch (error) {
    console.error('Error reading cookie file:', error.message);
    process.exit(1);
  }
}

/**
 * Export accounts to CSV for a client
 */
async function exportAccountsCSV(clientId, cookie) {
  try {
    console.log(`Exporting CSV for client ${clientId}...`);
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/accounts/export?format=csv`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export accounts: ${response.status} ${response.statusText}`);
    }
    
    const exportPath = path.join(TEMP_DIR, `client_${clientId}_accounts.csv`);
    const buffer = await response.buffer();
    fs.writeFileSync(exportPath, buffer);
    
    console.log(`✓ Successfully exported accounts to ${exportPath}`);
    
    // Check CSV content
    const csvContent = fs.readFileSync(exportPath, 'utf8');
    const firstLine = csvContent.split('\n')[0];
    console.log(`CSV Headers: ${firstLine}`);
    
    // Check for accountCode field
    const hasAccountCode = firstLine.includes('AccountCode');
    if (hasAccountCode) {
      console.log('✓ CSV export includes AccountCode field');
    } else {
      console.log('✗ CSV export is missing AccountCode field');
    }
    
    // Check for reporting fields
    const hasReportingFields = firstLine.includes('FsliBucket') && 
                               firstLine.includes('InternalReportingBucket') && 
                               firstLine.includes('Item');
    if (hasReportingFields) {
      console.log('✓ CSV export includes all reporting fields');
    } else {
      console.log('✗ CSV export is missing some reporting fields');
    }
    
    return {
      path: exportPath,
      hasAccountCode,
      hasReportingFields
    };
  } catch (error) {
    console.error(`Failed to export CSV: ${error.message}`);
    return null;
  }
}

/**
 * Export accounts to Excel for a client
 */
async function exportAccountsExcel(clientId, cookie) {
  try {
    console.log(`\nExporting Excel for client ${clientId}...`);
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/accounts/export?format=excel`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export accounts: ${response.status} ${response.statusText}`);
    }
    
    const exportPath = path.join(TEMP_DIR, `client_${clientId}_accounts.xlsx`);
    const buffer = await response.buffer();
    fs.writeFileSync(exportPath, buffer);
    
    console.log(`✓ Successfully exported accounts to ${exportPath}`);
    console.log(`Excel file size: ${buffer.length} bytes`);
    
    return {
      path: exportPath,
      size: buffer.length
    };
  } catch (error) {
    console.error(`Failed to export Excel: ${error.message}`);
    return null;
  }
}

/**
 * Main verification function
 */
async function verifyExports() {
  console.log('Starting Chart of Accounts Export Verification...');
  
  try {
    // Get authentication cookie
    const cookie = getCookieHeader();
    
    // Test with existing client ID 1
    const clientId = 1;
    
    // Test CSV export
    const csvResult = await exportAccountsCSV(clientId, cookie);
    
    // Test Excel export
    const excelResult = await exportAccountsExcel(clientId, cookie);
    
    // Print summary
    console.log('\n===========================================');
    console.log('Chart of Accounts Export Verification Results');
    console.log('===========================================');
    console.log(`CSV Export: ${csvResult ? 'Success ✓' : 'Failed ✗'}`);
    console.log(`Excel Export: ${excelResult ? 'Success ✓' : 'Failed ✗'}`);
    
    if (csvResult && csvResult.hasAccountCode) {
      console.log('✓ Export correctly uses AccountCode instead of Code');
    }
    
    if (csvResult && csvResult.hasReportingFields) {
      console.log('✓ Export includes all new reporting fields');
    }
    
    console.log('===========================================');
    
    if (csvResult && excelResult) {
      console.log('\nVerification PASSED ✓');
      process.exit(0);
    } else {
      console.log('\nVerification FAILED ✗');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

// Run the verification
verifyExports();