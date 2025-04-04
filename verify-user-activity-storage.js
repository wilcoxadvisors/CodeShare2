/**
 * This script verifies that all User Activity methods in the main storage.ts file
 * correctly delegate to the userActivityStorage module.
 */

const fs = require('fs');
const path = require('path');

function verifyUserActivityDelegation() {
  try {
    // Path to the updated storage file
    const updatedStoragePath = path.join(process.cwd(), 'server', 'storage-updated.ts');
    const originalStoragePath = path.join(process.cwd(), 'server', 'storage.ts');
    const userActivityStoragePath = path.join(process.cwd(), 'server', 'storage', 'userActivityStorage.ts');
    
    console.log('Verifying proper delegation of User Activity methods to userActivityStorage...');
    
    // Read the file contents
    const updatedStorageContent = fs.readFileSync(updatedStoragePath, 'utf8');
    const originalStorageContent = fs.readFileSync(originalStoragePath, 'utf8');
    const userActivityStorageContent = fs.readFileSync(userActivityStoragePath, 'utf8');
    
    // Extract user activity methods from userActivityStorage.ts interface
    const interfaceMethodPattern = /\s+([\w]+)\(.*\):\s+Promise<.*>/g;
    let userActivityInterfaceStart = userActivityStorageContent.indexOf('export interface IUserActivityStorage');
    let userActivityInterfaceEnd = userActivityStorageContent.indexOf('}', userActivityInterfaceStart);
    let userActivityInterface = userActivityStorageContent.substring(userActivityInterfaceStart, userActivityInterfaceEnd);
    
    const userActivityMethods = [];
    let match;
    while ((match = interfaceMethodPattern.exec(userActivityInterface)) !== null) {
      userActivityMethods.push(match[1]);
    }
    
    console.log(`Found ${userActivityMethods.length} user activity methods in IUserActivityStorage interface:`);
    userActivityMethods.forEach(method => console.log(`  - ${method}`));
    
    // Check for delegation patterns in updated storage
    console.log('\nChecking for proper delegation in updated storage.ts:');
    const delegationPattern = method => 
      new RegExp(`async\\s+${method}\\(.*\\).*{\\s*return\\s+this\\.userActivity\\.${method}\\(`);
    
    const delegationResults = userActivityMethods.map(method => ({
      method,
      hasProperDelegation: delegationPattern(method).test(updatedStorageContent)
    }));
    
    // Print delegation check results
    let allMethodsDelegated = true;
    delegationResults.forEach(result => {
      if (result.hasProperDelegation) {
        console.log(`  ✓ ${result.method} properly delegates to userActivityStorage`);
      } else {
        console.log(`  ✗ ${result.method} does NOT properly delegate to userActivityStorage`);
        allMethodsDelegated = false;
      }
    });
    
    if (allMethodsDelegated) {
      console.log('\n✅ All user activity methods properly delegate to userActivityStorage!');
    } else {
      console.log('\n❌ Some user activity methods do not properly delegate to userActivityStorage.');
    }
    
    // Check for differences between original and updated storage files
    console.log('\nChanges required to fully migrate to userActivityStorage:');
    
    // Count instances of direct database access in original storage
    const dbAccessPattern = /db\.(select|insert|update|delete)/g;
    const originalDbAccessCount = (originalStorageContent.match(dbAccessPattern) || []).length;
    const updatedDbAccessCount = (updatedStorageContent.match(dbAccessPattern) || []).length;
    
    console.log(`  - Original storage.ts has ${originalDbAccessCount} direct database calls`);
    console.log(`  - Updated storage-updated.ts has ${updatedDbAccessCount} direct database calls`);
    console.log(`  - Reduction of ${originalDbAccessCount - updatedDbAccessCount} direct database accesses`);
    
    return {
      methodsCount: userActivityMethods.length,
      delegatedMethodsCount: delegationResults.filter(r => r.hasProperDelegation).length,
      undelegatedMethods: delegationResults.filter(r => !r.hasProperDelegation).map(r => r.method),
      originalDbAccess: originalDbAccessCount,
      updatedDbAccess: updatedDbAccessCount
    };
  } catch (error) {
    console.error('Error verifying user activity delegation:', error);
    return {
      error: error.message,
      methodsCount: 0,
      delegatedMethodsCount: 0,
      undelegatedMethods: [],
      originalDbAccess: 0,
      updatedDbAccess: 0
    };
  }
}

// Run the verification
const results = verifyUserActivityDelegation();

// Print summary
console.log('\nSummary:');
console.log(`Total methods in IUserActivityStorage: ${results.methodsCount}`);
console.log(`Methods properly delegated: ${results.delegatedMethodsCount}`);

if (results.undelegatedMethods.length > 0) {
  console.log('Methods not properly delegated:');
  results.undelegatedMethods.forEach(method => console.log(`  - ${method}`));
}

console.log('\nNext steps:');
console.log('1. Implement any missing delegation methods in DatabaseStorage class');
console.log('2. Update the remaining userActivity-related methods to delegate properly');
console.log('3. Apply changes to the original storage.ts file');
console.log('4. Run tests to ensure functionality still works correctly');