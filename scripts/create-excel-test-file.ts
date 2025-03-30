/**
 * Script to create an Excel test file from a CSV file for CoA import testing
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to CSV file
const csvFilePath = path.join(__dirname, '../test/coa-import-export/valid_import.csv');
const excelFilePath = path.join(__dirname, '../test/coa-import-export/valid_import.xlsx');

// Read the CSV file
const csvContent = fs.readFileSync(csvFilePath, 'utf8');

// Parse CSV to workbook
const workbook = XLSX.read(csvContent, { type: 'string' });

// Write the workbook to Excel file
XLSX.writeFile(workbook, excelFilePath);

console.log(`Excel file created at: ${excelFilePath}`);