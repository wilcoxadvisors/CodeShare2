/**
 * Simple test script to verify the consolidation storage delegation
 * without starting the entire server
 */

import { db } from '../server/db';
import { DatabaseStorage } from '../server/storage';
import { consolidationStorage } from '../server/storage/consolidationStorage';
import { ReportType } from '../shared/schema';

async function testConsolidationDelegation() {
  console.log('Starting direct consolidation delegation test...');
  
  // Create a database storage instance for testing
  const directStorage = new DatabaseStorage();
  
  try {
    console.log('Testing getConsolidationGroups delegation...');
    const userId = 1; // Use admin user
    
    const directGroups = await directStorage.getConsolidationGroups(userId);
    const delegatedGroups = await consolidationStorage.getConsolidationGroups(userId);
    
    console.log(`Retrieved ${directGroups.length} consolidation groups via direct storage`);
    console.log(`Retrieved ${delegatedGroups.length} consolidation groups via dedicated storage`);
    
    if (directGroups.length === delegatedGroups.length) {
      console.log('✅ getConsolidationGroups test passed - count matches');
    } else {
      console.log('❌ getConsolidationGroups test failed - count mismatch');
    }
    
    // Test report generation if groups exist
    if (delegatedGroups.length > 0) {
      const groupId = delegatedGroups[0].id;
      console.log(`Using consolidation group ID ${groupId} for comparison test`);
      
      // Test generating a report
      try {
        console.log('Testing generateConsolidatedReport delegation...');
        
        const directReport = await directStorage.generateConsolidatedReport(
          groupId, 
          ReportType.BALANCE_SHEET
        );
        
        const delegatedReport = await consolidationStorage.generateConsolidatedReport(
          groupId, 
          ReportType.BALANCE_SHEET
        );
        
        if (directReport && delegatedReport) {
          // Compare basic report structure
          const directAccounts = Object.keys(directReport.accounts || {}).length;
          const delegatedAccounts = Object.keys(delegatedReport.accounts || {}).length;
          
          console.log(`Direct report has ${directAccounts} accounts`);
          console.log(`Delegated report has ${delegatedAccounts} accounts`);
          
          if (directAccounts === delegatedAccounts) {
            console.log('✅ generateConsolidatedReport test passed - account count matches');
            
            // If real deep equality testing is desired, we could do:
            // console.log(JSON.stringify(directReport) === JSON.stringify(delegatedReport) 
            // ? '✅ Reports are identical' 
            // : '❌ Reports differ');
          } else {
            console.log('❌ generateConsolidatedReport test failed - account count mismatch');
          }
        } else {
          console.log('❌ generateConsolidatedReport test failed - report missing');
        }
      } catch (error) {
        console.error('❌ generateConsolidatedReport test failed with error:', error);
      }
    } else {
      console.log('⚠️ No consolidation groups found, skipping report test');
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
  
  console.log('Consolidation delegation test completed');
}

// Run the test
testConsolidationDelegation().catch(err => {
  console.error('Test error:', err);
});