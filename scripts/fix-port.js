/**
 * Script to fix port numbers in test files
 * 
 * This script finds and replaces instances of 'http://localhost:3000'
 * with 'http://localhost:5000' in testing files to ensure tests use
 * the correct port number.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const searchPattern = 'http://localhost:3000';
const replacePattern = 'http://localhost:5000';
const rootDir = path.resolve(__dirname, '../');
const targetDirs = ['testing'];

// Helper to find files recursively
function findFiles(dir, pattern) {
  const results = [];
  
  function traverse(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile() && file.endsWith('.js')) {
        // Only process JavaScript files
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(pattern)) {
          results.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return results;
}

// Replace port numbers in file
function fixPortsInFile(filePath) {
  console.log(`Processing file: ${filePath}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace all occurrences of the search pattern
    if (content.includes(searchPattern)) {
      const oldContent = content;
      content = content.replace(new RegExp(searchPattern, 'g'), replacePattern);
      
      // Only write if there were changes
      if (oldContent !== content) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Updated ${searchPattern} to ${replacePattern}`);
        return true;
      } else {
        console.log('  ⚠️ No changes needed');
        return false;
      }
    } else {
      console.log('  ⚠️ Pattern not found');
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error processing file: ${error.message}`);
    return false;
  }
}

// Main function
function main() {
  console.log('=============================================');
  console.log('   PORT NUMBER FIXER FOR TEST FILES');
  console.log('=============================================');
  console.log(`Searching for: ${searchPattern}`);
  console.log(`Replacing with: ${replacePattern}`);
  console.log('=============================================\n');
  
  let totalFiles = 0;
  let updatedFiles = 0;
  
  for (const dir of targetDirs) {
    const targetDir = path.join(rootDir, dir);
    console.log(`Searching in directory: ${targetDir}`);
    
    if (!fs.existsSync(targetDir)) {
      console.log(`  ⚠️ Directory does not exist, skipping`);
      continue;
    }
    
    const files = findFiles(targetDir, searchPattern);
    totalFiles += files.length;
    
    console.log(`Found ${files.length} files with the search pattern:\n`);
    
    for (const file of files) {
      const updated = fixPortsInFile(file);
      if (updated) updatedFiles++;
    }
  }
  
  console.log('\n=============================================');
  console.log(`SUMMARY: Updated ${updatedFiles} out of ${totalFiles} files`);
  console.log('=============================================');
}

// Run the script
main();