/**
 * Storage Module Verification Script
 * 
 * This script verifies that all specialized storage modules follow the same pattern:
 * 1. Define an interface (e.g., IClientStorage)
 * 2. Implement the interface in a class (e.g., ClientStorage)
 * 3. Export a singleton instance (e.g., clientStorage)
 * 4. Have proper documentation
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const STORAGE_DIR = path.join(process.cwd(), 'server', 'storage');
const MODULES = [
  'accountStorage',
  'clientStorage',
  'entityStorage',
  'journalEntryStorage',
  'consolidationStorage',
  'userStorage',
  'budgetStorage',
  'formStorage',
  'assetStorage',
  'reportStorage',
  'userActivityStorage'
];

function checkFile(filePath, moduleName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for interface export
    const interfacePattern = new RegExp(`export\\s+interface\\s+I${moduleName.charAt(0).toUpperCase() + moduleName.slice(1, -7)}Storage`);
    const hasInterface = interfacePattern.test(content);
    
    // Check for class implementation
    const classPattern = new RegExp(`export\\s+class\\s+${moduleName.charAt(0).toUpperCase() + moduleName.slice(1, -7)}Storage\\s+implements\\s+I${moduleName.charAt(0).toUpperCase() + moduleName.slice(1, -7)}Storage`);
    const hasClass = classPattern.test(content);
    
    // Check for singleton export
    const singletonPattern = new RegExp(`export\\s+const\\s+${moduleName}\\s*[=:]`);
    const hasSingleton = singletonPattern.test(content);
    
    // Check for documentation
    const hasDocsLines = content.split('\n').filter(line => 
      line.trim().startsWith('*') || 
      line.trim().startsWith('/**') || 
      line.trim().startsWith('*/') ||
      line.trim().startsWith('//')).length > 5;
    
    const isComplete = hasInterface && hasClass && hasSingleton && hasDocsLines;
    
    return {
      name: moduleName,
      hasInterface,
      hasClass,
      hasSingleton,
      hasDocsLines,
      isComplete
    };
  } catch (error) {
    return {
      name: moduleName,
      hasInterface: false,
      hasClass: false,
      hasSingleton: false,
      hasDocsLines: false,
      isComplete: false,
      error: error.message
    };
  }
}

function verifyDelegationInMainStorage() {
  try {
    const mainStoragePath = path.join(process.cwd(), 'server', 'storage.ts');
    const content = fs.readFileSync(mainStoragePath, 'utf8');
    
    // Check for import of all modules
    const importPattern = (moduleName) => 
      new RegExp(`import\\s+\\{[^}]*${moduleName}[^}]*\\}\\s+from\\s+(['"])\\./storage/${moduleName.slice(0, -7)}Storage\\1`);
    
    const moduleImports = MODULES.map(moduleName => ({
      name: moduleName,
      hasImport: importPattern(moduleName).test(content)
    }));
    
    // Check for property declarations in IStorage
    const propertyPattern = (moduleName) => 
      new RegExp(`\\s+${moduleName.slice(0, -7)}s?:\\s+I${moduleName.charAt(0).toUpperCase() + moduleName.slice(1, -7)}Storage;`);
      
    const moduleProperties = MODULES.map(moduleName => ({
      name: moduleName,
      hasProperty: propertyPattern(moduleName).test(content)
    }));
    
    // Check for initialization in constructors
    const initializationPattern = (moduleName) => 
      new RegExp(`\\s+this\\.${moduleName.slice(0, -7)}s?\\s+=\\s+${moduleName};`);
      
    const moduleInitializations = MODULES.map(moduleName => ({
      name: moduleName,
      hasInitialization: initializationPattern(moduleName).test(content)
    }));
    
    return {
      imports: moduleImports,
      properties: moduleProperties,
      initializations: moduleInitializations
    };
  } catch (error) {
    return {
      imports: [],
      properties: [],
      initializations: [],
      error: error.message
    };
  }
}

function printSummary(results, delegationResults) {
  console.log(chalk.cyan.bold('\n=== Storage Module Verification Summary ===\n'));
  
  // Print module status
  results.forEach(result => {
    if (result.isComplete) {
      console.log(`${chalk.green('✓')} ${chalk.bold(result.name)}: Complete`);
    } else {
      console.log(`${chalk.red('✗')} ${chalk.bold(result.name)}: Incomplete`);
      if (!result.hasInterface) console.log(`  ${chalk.red('•')} Missing interface`);
      if (!result.hasClass) console.log(`  ${chalk.red('•')} Missing class implementation`);
      if (!result.hasSingleton) console.log(`  ${chalk.red('•')} Missing singleton export`);
      if (!result.hasDocsLines) console.log(`  ${chalk.red('•')} Insufficient documentation`);
      if (result.error) console.log(`  ${chalk.red('•')} Error: ${result.error}`);
    }
  });
  
  console.log(chalk.cyan.bold('\n=== Main Storage Delegation Verification ===\n'));
  
  // Print missing imports
  const missingImports = delegationResults.imports.filter(i => !i.hasImport);
  if (missingImports.length === 0) {
    console.log(`${chalk.green('✓')} All modules properly imported in storage.ts`);
  } else {
    console.log(`${chalk.red('✗')} Missing imports in storage.ts:`);
    missingImports.forEach(i => console.log(`  ${chalk.red('•')} ${i.name}`));
  }
  
  // Print missing properties
  const missingProperties = delegationResults.properties.filter(p => !p.hasProperty);
  if (missingProperties.length === 0) {
    console.log(`${chalk.green('✓')} All modules declared as properties in IStorage interface`);
  } else {
    console.log(`${chalk.red('✗')} Missing properties in IStorage interface:`);
    missingProperties.forEach(p => console.log(`  ${chalk.red('•')} ${p.name}`));
  }
  
  // Print missing initializations
  const missingInits = delegationResults.initializations.filter(i => !i.hasInitialization);
  if (missingInits.length === 0) {
    console.log(`${chalk.green('✓')} All modules properly initialized in constructors`);
  } else {
    console.log(`${chalk.red('✗')} Missing initializations in constructors:`);
    missingInits.forEach(i => console.log(`  ${chalk.red('•')} ${i.name}`));
  }
  
  // Overall status
  const allModulesComplete = results.every(r => r.isComplete);
  const allDelegationsComplete = 
    missingImports.length === 0 && 
    missingProperties.length === 0 && 
    missingInits.length === 0;
  
  console.log(chalk.cyan.bold('\n=== Overall Status ===\n'));
  if (allModulesComplete && allDelegationsComplete) {
    console.log(chalk.green.bold('✅ All storage modules are correctly implemented and integrated!'));
  } else {
    console.log(chalk.red.bold('❌ There are issues with storage modules implementation or integration.'));
    if (!allModulesComplete) {
      console.log(chalk.yellow(`   • ${results.filter(r => !r.isComplete).length} modules have implementation issues.`));
    }
    if (!allDelegationsComplete) {
      console.log(chalk.yellow(`   • There are delegation issues in the main storage.ts file.`));
    }
  }
}

// Main function
(function main() {
  console.log(chalk.cyan.bold('Storage Module Verification'));
  console.log(chalk.cyan('Checking modules in', STORAGE_DIR));
  
  const results = MODULES.map(moduleName => {
    const filePath = path.join(STORAGE_DIR, `${moduleName.slice(0, -7)}Storage.ts`);
    return checkFile(filePath, moduleName);
  });
  
  const delegationResults = verifyDelegationInMainStorage();
  
  printSummary(results, delegationResults);
})();