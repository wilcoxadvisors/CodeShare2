/**
 * Generate Excel test file for CoA import testing
 */

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source CSV file
const CSV_FILE = path.join(__dirname, '..', 'test', 'coa-import-export', 'valid_import.csv');
const EXCEL_OUTPUT = path.join(__dirname, '..', 'test', 'coa-import-export', 'valid_import.xlsx');

// Read CSV data
const csvData = fs.readFileSync(CSV_FILE, 'utf8');
const lines = csvData.split('\n');
const headers = lines[0].split(',');

// Parse CSV into array of objects
const data = [];
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  
  const values = lines[i].split(',');
  const row = {};
  
  headers.forEach((header, index) => {
    row[header] = values[index];
  });
  
  data.push(row);
}

// Create worksheet
const worksheet = XLSX.utils.json_to_sheet(data);

// Create workbook and add the worksheet
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart of Accounts');

// Write to file
XLSX.writeFile(workbook, EXCEL_OUTPUT);

console.log(`Excel file created at: ${EXCEL_OUTPUT}`);