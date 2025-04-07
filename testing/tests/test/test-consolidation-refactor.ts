/**
 * Simple test script to verify the refactored consolidation storage functionality
 */

import { db } from '../server/db';
import { storage } from '../server/index';
import { consolidationStorage } from '../server/storage/consolidationStorage';
import { ReportType } from '../shared/schema';

async function testConsolidationRefactor() {
  console.log('Starting consolidation refactor test...');
  
  // Use the singleton storage instances
  // This ensures we're testing the actual instances used by the application
  
  // Consolidation methods are now available only through consolidationStorage
  // No need to test delegation since there are no methods in storage to delegate
  
  // Test getting consolidation groups
  try {
    console.log('Testing getConsolidationGroups from consolidationStorage...');
    const userId = 1; // Use admin user
    
    const groups = await consolidationStorage.getConsolidationGroups(userId);
    console.log(`Retrieved ${groups.length} groups from consolidationStorage`);
    
    if (groups.length > 0) {
      console.log('✅ getConsolidationGroups test passed');
    } else {
      console.log('⚠️ getConsolidationGroups test returned zero groups');
    }
  } catch (error) {
    console.error('❌ getConsolidationGroups test failed with error:', error);
  }
  
  // Test generating two identical reports to ensure consistent results
  try {
    console.log('Testing consistent results from consolidationStorage...');
    const userId = 1; // Use admin user
    
    const groups = await consolidationStorage.getConsolidationGroups(userId);
    
    if (groups.length > 0) {
      const groupId = groups[0].id;
      console.log(`Using consolidation group ID ${groupId} for report test`);
      
      // Use fixed dates to ensure deterministic output
      const endDate = new Date('2023-12-31T23:59:59Z');
      const startDate = new Date('2023-01-01T00:00:00Z');
      
      // Generate the same report twice with identical parameters
      const firstReport = await consolidationStorage.generateConsolidatedReport(
        groupId, 
        ReportType.BALANCE_SHEET,
        startDate,
        endDate
      );
      
      const secondReport = await consolidationStorage.generateConsolidatedReport(
        groupId, 
        ReportType.BALANCE_SHEET,
        startDate,
        endDate
      );
      
      if (
        firstReport && 
        secondReport
      ) {
        console.log('Reports generated, comparing...');
        const firstJSON = JSON.stringify(firstReport, null, 2);
        const secondJSON = JSON.stringify(secondReport, null, 2);
        
        // Create copies of the reports without the generatedAt timestamp for comparison
        const firstReportForComparison = { ...firstReport };
        const secondReportForComparison = { ...secondReport };
        
        // Delete the timestamp which can cause false negatives
        delete firstReportForComparison.generatedAt;
        delete secondReportForComparison.generatedAt;
        
        // Compare the reports without the timestamp
        const firstJSONWithoutTimestamp = JSON.stringify(firstReportForComparison, null, 2);
        const secondJSONWithoutTimestamp = JSON.stringify(secondReportForComparison, null, 2);
        
        if (firstJSONWithoutTimestamp === secondJSONWithoutTimestamp) {
          console.log('✅ Report consistency test passed - reports match after excluding timestamp');
        } else {
          console.error("❌ Reports do not match - inconsistent results!");
          
          // First, display critical sections and totals
          console.log("\n--- Critical Fields Comparison ---");
          
          // Balance Sheet specific comparisons - adjust if using different report type
          if (firstReport.type === 'balanceSheet' || firstReport.reportType === 'balance_sheet') {
            console.log("First Report Totals:", {
              totalAssets: firstReport.totalAssets,
              totalLiabilities: firstReport.totalLiabilities,
              totalEquity: firstReport.totalEquity
            });
            
            console.log("Second Report Totals:", {
              totalAssets: secondReport.totalAssets,
              totalLiabilities: secondReport.totalLiabilities,
              totalEquity: secondReport.totalEquity
            });
          }
          
          // Compare entities included in reports
          console.log("\n--- Entities Included ---");
          console.log("First Report Entities:", firstReport.entities?.map(e => e) || []);
          console.log("Second Report Entities:", secondReport.entities?.map(e => e) || []);
          
          // Detailed comparison of entire report objects
          console.log("\n--- Detailed Report Comparison ---");
          console.log("--- First Report (without timestamp) ---");
          console.log(firstJSONWithoutTimestamp);
          console.log("\n--- Second Report (without timestamp) ---");
          console.log(secondJSONWithoutTimestamp);
          
          throw new Error("Generated reports are inconsistent.");
        }
      } else {
        console.log('❌ Report generation test failed - null reports');
      }
    } else {
      console.log('⚠️ No consolidation groups found, skipping report test');
    }
  } catch (error) {
    console.error('❌ generateConsolidatedReport test failed with error:', error);
  }
  
  console.log('Consolidation refactor test completed');
}

// Run the test
testConsolidationRefactor().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});