/**
 * Direct test script that logs in and performs operations in one session
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000';
const CLIENT_ID = 236;

async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    // Get session cookie
    const sessionCookie = response.headers['set-cookie'][0];
    console.log('Login successful. Session cookie:', sessionCookie);
    
    return sessionCookie;
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
}

async function exportCsv(cookie) {
  try {
    console.log(`Exporting accounts for client ${CLIENT_ID} in CSV format...`);
    
    const response = await axios.get(`${API_URL}/api/clients/${CLIENT_ID}/accounts/export`, {
      params: { format: 'csv' },
      headers: { Cookie: cookie },
      responseType: 'arraybuffer'
    });
    
    const outputPath = path.join(__dirname, 'exports', 'direct-accounts.csv');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, response.data);
    console.log(`Successfully exported CSV to ${outputPath} (${response.data.length} bytes)`);
    
    return outputPath;
  } catch (error) {
    console.error('CSV export error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    throw error;
  }
}

async function exportExcel(cookie) {
  try {
    console.log(`Exporting accounts for client ${CLIENT_ID} in Excel format...`);
    
    const response = await axios.get(`${API_URL}/api/clients/${CLIENT_ID}/accounts/export`, {
      params: { format: 'excel' },
      headers: { Cookie: cookie },
      responseType: 'arraybuffer'
    });
    
    const outputPath = path.join(__dirname, 'exports', 'direct-accounts.xlsx');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, response.data);
    console.log(`Successfully exported Excel to ${outputPath} (${response.data.length} bytes)`);
    
    return outputPath;
  } catch (error) {
    console.error('Excel export error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    throw error;
  }
}

async function checkCsvHasAccountCode(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('CSV file content (first 200 chars):', content.substring(0, 200));
    
    if (content.startsWith('<!DOCTYPE html>')) {
      console.error('CSV file contains HTML instead of CSV data');
      return false;
    }
    
    const headers = content.split('\n')[0].split(',');
    console.log('CSV headers:', headers);
    
    return headers.includes('AccountCode');
  } catch (error) {
    console.error('Error checking CSV file:', error.message);
    return false;
  }
}

async function runTest() {
  try {
    // Login
    const sessionCookie = await login();
    
    // Test CSV export
    const csvPath = await exportCsv(sessionCookie);
    const hasCsvAccountCode = await checkCsvHasAccountCode(csvPath);
    
    if (hasCsvAccountCode) {
      console.log('✅ CSV export has AccountCode field');
    } else {
      console.log('❌ CSV export is missing AccountCode field');
    }
    
    // Test Excel export
    const excelPath = await exportExcel(sessionCookie);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();