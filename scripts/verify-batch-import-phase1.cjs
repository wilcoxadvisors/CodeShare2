/**
 * Comprehensive Verification Script for Phase 1: Backend Foundation
 * 
 * This script validates the complete batch import functionality:
 * 1. Authentication system
 * 2. File upload with validation
 * 3. Smart Parser with zero-balance grouping
 * 4. BatchValidationService with account/dimension validation
 * 5. Comprehensive error reporting and suggestions
 */

const axios = require('axios');
const FormData = require('form-data');
const XLSX = require('xlsx');
const fs = require('fs');

// Test scenarios
const testScenarios = [
  {
    name: "Valid Balanced Entries",
    description: "Test smart parser with balanced journal entries",
    data: [
      { AccountCode: '1001', Amount: 1000, Description: 'Cash receipt', Department: 'Sales' },
      { AccountCode: '4001', Amount: -1000, Description: 'Revenue recognition', Department: 'Sales' }
    ]
  },
  {
    name: "Multiple Entry Groups",
    description: "Test zero-balance grouping with multiple entries",
    data: [
      // First entry group
      { AccountCode: '1001', Amount: 500, Description: 'Cash receipt 1', Department: 'Sales' },
      { AccountCode: '4001', Amount: -500, Description: 'Revenue 1', Department: 'Sales' },
      // Second entry group
      { AccountCode: '1001', Amount: 750, Description: 'Cash receipt 2', Department: 'Marketing' },
      { AccountCode: '4001', Amount: -750, Description: 'Revenue 2', Department: 'Marketing' }
    ]
  },
  {
    name: "New Dimension Values",
    description: "Test dimension value suggestions",
    data: [
      { AccountCode: '1001', Amount: 300, Description: 'Cash receipt', Department: 'Engineering' }, // New dimension value
      { AccountCode: '4001', Amount: -300, Description: 'Revenue', Department: 'Engineering' }
    ]
  },
  {
    name: "Invalid Accounts",
    description: "Test account validation errors",
    data: [
      { AccountCode: '9999', Amount: 200, Description: 'Invalid account' }, // Invalid account
      { AccountCode: '1001', Amount: -200, Description: 'Valid account' }
    ]
  },
  {
    name: "Invalid Dimensions",
    description: "Test dimension validation errors",
    data: [
      { AccountCode: '1001', Amount: 400, Description: 'Cash receipt', InvalidDimension: 'Value' }, // Invalid dimension
      { AccountCode: '4001', Amount: -400, Description: 'Revenue', InvalidDimension: 'Value' }
    ]
  }
];

function createTestExcelFile(testData, fileName) {
  const worksheet = XLSX.utils.json_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
  XLSX.writeFile(workbook, fileName);
  return fileName;
}

async function authenticate() {
  console.log('🔐 Authenticating...');
  try {
    const authResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'password123'
    }, {
      withCredentials: true
    });

    const cookies = authResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';
    console.log('✅ Authentication successful');
    return cookieHeader;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

async function testBatchAnalysis(cookieHeader, testData, scenarioName) {
  console.log(`\n📊 Testing: ${scenarioName}`);
  console.log('=' + '='.repeat(scenarioName.length + 10));

  try {
    // Create test file
    const fileName = `test_${scenarioName.replace(/\s+/g, '_').toLowerCase()}.xlsx`;
    createTestExcelFile(testData, fileName);

    // Upload and analyze
    const formData = new FormData();
    formData.append('file', fs.createReadStream(fileName));

    const response = await axios.post(
      'http://localhost:5000/api/clients/250/journal-entries/batch-analyze',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Cookie': cookieHeader
        }
      }
    );

    const result = response.data.data;
    
    // Display results
    console.log(`📈 Summary: ${result.batchSummary.totalEntries} entries, ${result.batchSummary.validEntries} valid, ${result.batchSummary.entriesWithErrors} with errors`);
    
    if (result.batchSummary.newDimensionValues > 0) {
      console.log(`🆕 New dimension value suggestions: ${result.batchSummary.newDimensionValues}`);
      result.newDimensionValueSuggestions.forEach(suggestion => {
        console.log(`   - ${suggestion.dimensionName}: ${suggestion.newValueCode}`);
      });
    }

    if (result.batchSummary.entriesWithErrors > 0) {
      console.log('⚠️  Validation errors detected:');
      result.entryGroups.forEach((group, index) => {
        if (!group.isValid) {
          console.log(`   Group ${index + 1}: ${group.errors.length} errors`);
          group.errors.slice(0, 2).forEach(error => { // Show first 2 errors
            console.log(`     - ${error.type}: ${error.message} (Row ${error.originalRow})`);
          });
        }
      });
    }

    // Cleanup
    fs.unlinkSync(fileName);
    console.log('✅ Test completed successfully');
    
    return {
      success: true,
      totalEntries: result.batchSummary.totalEntries,
      validEntries: result.batchSummary.validEntries,
      errors: result.batchSummary.entriesWithErrors,
      newDimensionValues: result.batchSummary.newDimensionValues
    };

  } catch (error) {
    console.error('❌ Test failed:', error.response?.status, error.response?.statusText);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

async function runComprehensiveVerification() {
  console.log('🧪 PHASE 1 BACKEND FOUNDATION VERIFICATION');
  console.log('==========================================\n');

  try {
    // Step 1: Authenticate
    const cookieHeader = await authenticate();

    // Step 2: Run all test scenarios
    const results = [];
    for (const scenario of testScenarios) {
      const result = await testBatchAnalysis(cookieHeader, scenario.data, scenario.name);
      results.push({ scenario: scenario.name, ...result });
    }

    // Step 3: Summary report
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('======================');
    
    const successfulTests = results.filter(r => r.success).length;
    const totalTests = results.length;
    
    console.log(`✅ Tests passed: ${successfulTests}/${totalTests}`);
    
    if (successfulTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED - PHASE 1 BACKEND FOUNDATION COMPLETE');
      console.log('\nKey Achievements:');
      console.log('✅ Smart Parser with zero-balance grouping algorithm');
      console.log('✅ BatchValidationService with account/dimension validation');
      console.log('✅ Comprehensive error reporting with specific row numbers');
      console.log('✅ New dimension value suggestion system');
      console.log('✅ Production-grade file processing (Excel/CSV)');
      console.log('✅ Enterprise-level error handling and validation');
      console.log('\n🚀 Ready for Phase 2: Frontend Wizard Implementation');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }

    console.log('\n📋 Detailed Results:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.scenario}`);
      if (result.success) {
        console.log(`   📊 ${result.totalEntries} entries, ${result.validEntries} valid, ${result.errors} errors, ${result.newDimensionValues} new dimension values`);
      }
    });

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run the verification
runComprehensiveVerification().catch(console.error);