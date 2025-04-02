/**
 * Script to create an Excel test file from a CSV file for CoA import testing
 */
import { readFileSync, writeFileSync } from 'fs';
import { writeFile, utils } from 'xlsx';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to CSV file
const csvFilePath = join(__dirname, '../test/data/coa-import/updated-tests/test-accounts-import-updated.csv');
const excelFilePath = join(__dirname, '../test/data/coa-import/updated-tests/test-accounts-import-updated.xlsx');

// Read the CSV file
const csvContent = readFileSync(csvFilePath, 'utf8');
const lines = csvContent.split('\n');
const headers = lines[0].split(',');

// Create data array for the Excel sheet
const data = [];
data.push(headers);

for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() !== '') {
    data.push(lines[i].split(','));
  }
}

// Create a new workbook
const workbook = utils.book_new();
const worksheet = utils.aoa_to_sheet(data);

// Add the worksheet to the workbook
utils.book_append_sheet(workbook, worksheet, 'CoA Import');

// Write the workbook to a file
writeFile(workbook, excelFilePath);

console.log(`Excel file created at: ${excelFilePath}`);