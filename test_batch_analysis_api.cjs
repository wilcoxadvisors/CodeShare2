/**
 * Test script for the complete batch analysis API endpoint
 * Tests the full integration: file upload -> parsing -> validation
 */

const axios = require('axios');
const FormData = require('form-data');
const XLSX = require('xlsx');
const fs = require('fs');

// Create a test Excel file
function createTestExcelFile() {
  const testData = [
    { AccountCode: '1000', Amount: 1000, Description: 'Cash receipt', Department: 'Sales' },
    { AccountCode: '4000', Amount: -1000, Description: 'Revenue recognition', Department: 'Sales' },
    { AccountCode: '1000', Amount: 500, Description: 'Another receipt', Department: 'Marketing' }, // New dimension value
    { AccountCode: '5000', Amount: -500, Description: 'Expense', Department: 'Operations' }
  ];

  const worksheet = XLSX.utils.json_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
  
  const fileName = 'test_batch_analysis.xlsx';
  XLSX.writeFile(workbook, fileName);
  return fileName;
}

async function testBatchAnalysisAPI() {
  console.log('🧪 Testing Batch Analysis API Endpoint');
  console.log('=====================================');

  try {
    // Step 1: Authenticate
    console.log('\n📋 Step 1: Authenticating...');
    const authResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'password123'
    }, {
      withCredentials: true
    });

    const cookies = authResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';
    console.log('✅ Authentication successful');

    // Step 2: Create test file
    console.log('\n📁 Step 2: Creating test Excel file...');
    const testFileName = createTestExcelFile();
    console.log(`✅ Created test file: ${testFileName}`);

    // Step 3: Test the batch analysis endpoint
    console.log('\n🔍 Step 3: Testing batch analysis endpoint...');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFileName));

    const analysisResponse = await axios.post(
      'http://localhost:5000/api/clients/250/journal-entries/batch-analyze',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Cookie': cookieHeader
        }
      }
    );

    console.log('✅ API request successful (Status:', analysisResponse.status, ')');
    
    // Step 4: Validate response structure
    console.log('\n📊 Step 4: Validating response data...');
    const result = analysisResponse.data;
    
    console.log('\n🎯 Batch Summary:');
    console.log(`  - Total Entries: ${result.batchSummary.totalEntries}`);
    console.log(`  - Valid Entries: ${result.batchSummary.validEntries}`);
    console.log(`  - Entries with Errors: ${result.batchSummary.entriesWithErrors}`);
    console.log(`  - New Dimension Values: ${result.batchSummary.newDimensionValues}`);

    console.log('\n📋 Entry Groups:');
    result.entryGroups.forEach((group, index) => {
      console.log(`  Group ${index + 1}:`);
      console.log(`    - Lines: ${group.lines.length}`);
      console.log(`    - Valid: ${group.isValid}`);
      console.log(`    - Errors: ${group.errors.length}`);
      
      if (group.errors.length > 0) {
        group.errors.forEach(error => {
          console.log(`      ❌ ${error.type}: ${error.message} (Row ${error.originalRow})`);
        });
      }
    });

    console.log('\n🆕 New Dimension Value Suggestions:');
    if (result.newDimensionValueSuggestions.length > 0) {
      result.newDimensionValueSuggestions.forEach(suggestion => {
        console.log(`  - ${suggestion.dimensionName} (${suggestion.dimensionCode}): ${suggestion.newValueCode}`);
      });
    } else {
      console.log('  No new dimension values detected');
    }

    // Step 5: Validate business logic
    console.log('\n✅ Step 5: Validating business logic...');
    
    // Check that we have the expected structure
    if (!result.batchSummary || !result.entryGroups || !result.newDimensionValueSuggestions) {
      throw new Error('Response missing required fields');
    }

    // Check that totals make sense
    const calculatedTotal = result.batchSummary.validEntries + result.batchSummary.entriesWithErrors;
    if (calculatedTotal !== result.batchSummary.totalEntries) {
      throw new Error(`Total entries mismatch: ${calculatedTotal} calculated vs ${result.batchSummary.totalEntries} reported`);
    }

    console.log('✅ Business logic validation passed');

    // Step 6: Clean up
    console.log('\n🧹 Step 6: Cleaning up...');
    fs.unlinkSync(testFileName);
    console.log('✅ Test file cleaned up');

    console.log('\n🎉 BATCH ANALYSIS API TEST COMPLETE');
    console.log('===================================');
    console.log('✅ All tests passed successfully!');
    console.log(`✅ Smart Parser processed ${result.entryGroups.length} entry groups`);
    console.log(`✅ BatchValidationService validated all entries`);
    console.log(`✅ Found ${result.newDimensionValueSuggestions.length} new dimension value suggestions`);

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run the test
testBatchAnalysisAPI().catch(console.error);