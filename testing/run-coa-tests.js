/**
 * Chart of Accounts Import Test Runner
 * 
 * This script runs the automated tests to verify that the Chart of Accounts
 * import functionality correctly processes only explicitly selected accounts.
 * 
 * Usage:
 *   node testing/run-coa-tests.js
 */

const coaTests = require('./coa-import-tests');

// Print a fancy header
console.log('\n============================================================');
console.log('  CHART OF ACCOUNTS IMPORT FUNCTIONALITY VERIFICATION TESTS');
console.log('============================================================\n');

console.log('This test suite will verify that the Chart of Accounts import');
console.log('functionality correctly processes only explicitly selected accounts.\n');

console.log('The following tests will be run:');
console.log('1. "No Selection" - Verify import is rejected when no accounts are selected');
console.log('2. "Partial Selection" - Verify only selected accounts are processed');
console.log('3. "Select All" - Verify all selected accounts are processed correctly\n');

// Run the tests
coaTests.runAllTests()
  .then(results => {
    console.log('\n============================================================');
    console.log('  TEST SUMMARY');
    console.log('============================================================\n');
    
    const allPassed = results.every(result => result.passed);
    
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('The Chart of Accounts import functionality correctly processes');
      console.log('only explicitly selected accounts.\n');
    } else {
      console.log('❌ SOME TESTS FAILED!');
      console.log('Please check the detailed results above to identify and fix the issues.\n');
    }
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ ERROR RUNNING TESTS:', error);
    process.exit(1);
  });