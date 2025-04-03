/**
 * Run Chart of Accounts Verification
 * 
 * This script runs the Chart of Accounts stability verification
 * and displays a formatted summary of the results.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure verification-logs directory exists
const logDir = path.join(__dirname, '..', 'verification-logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Run the verification script
console.log('🔍 Running Chart of Accounts stability verification...');
console.log('========================================================');

try {
  // Execute the verification script
  execSync('node scripts/verify-coa-stability.js', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  // Get the latest log file
  const logFiles = fs.readdirSync(logDir)
    .filter(file => file.startsWith('coa-verification-'))
    .sort()
    .reverse();
  
  if (logFiles.length === 0) {
    console.error('❌ No verification log files found.');
    process.exit(1);
  }
  
  const latestLogFile = path.join(logDir, logFiles[0]);
  const logContent = fs.readFileSync(latestLogFile, 'utf8');
  
  // Parse results
  const passResults = logContent.match(/\[PASS\]/g) || [];
  const failResults = logContent.match(/\[FAIL\]/g) || [];
  const totalTests = passResults.length + failResults.length;
  
  console.log('\n📊 Verification Summary:');
  console.log('========================================================');
  console.log(`✅ Tests Passed: ${passResults.length}/${totalTests}`);
  console.log(`❌ Tests Failed: ${failResults.length}/${totalTests}`);
  
  // Extract specific test results
  const extractTestResult = (testName) => {
    const regex = new RegExp(`\\[(PASS|FAIL)\\] ${testName}[^\n]*`, 'i');
    const match = logContent.match(regex);
    return match ? match[0] : `${testName}: No result found`;
  };
  
  console.log('\n📝 Detailed Results:');
  console.log('--------------------------------------------------------');
  console.log(extractTestResult('Account structure verification'));
  console.log(extractTestResult('Accounts list verification'));
  console.log(extractTestResult('Account export verification'));
  console.log(extractTestResult('Account import preview verification'));
  
  console.log('\n📄 Full log available at:');
  console.log(latestLogFile);
  
  // Final status
  if (failResults.length === 0) {
    console.log('\n✨ All verification tests PASSED!');
    console.log('The Chart of Accounts implementation at commit 64447303 is stable.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some verification tests FAILED.');
    console.log('Review the detailed log for more information.');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Verification script execution failed:', error.message);
  process.exit(1);
}