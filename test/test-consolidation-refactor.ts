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
  
  // Test getting consolidation groups
  try {
    console.log('Testing getConsolidationGroups delegation...');
    const userId = 1; // Use admin user
    
    const groupsFromMainStorage = await storage.getConsolidationGroups(userId);
    const groupsFromDedicatedStorage = await consolidationStorage.getConsolidationGroups(userId);
    
    console.log(`Retrieved ${groupsFromMainStorage.length} groups from main storage`);
    console.log(`Retrieved ${groupsFromDedicatedStorage.length} groups from dedicated storage`);
    
    if (groupsFromMainStorage.length === groupsFromDedicatedStorage.length) {
      console.log('✅ getConsolidationGroups test passed');
    } else {
      console.log('❌ getConsolidationGroups test failed - count mismatch');
    }
  } catch (error) {
    console.error('❌ getConsolidationGroups test failed with error:', error);
  }
  
  // Test generating a report if consolidation groups exist
  try {
    console.log('Testing generateConsolidatedReport delegation...');
    const userId = 1; // Use admin user
    
    const groups = await consolidationStorage.getConsolidationGroups(userId);
    
    if (groups.length > 0) {
      const groupId = groups[0].id;
      console.log(`Using consolidation group ID ${groupId} for report test`);
      
      // Use fixed dates to ensure deterministic output
      const endDate = new Date('2023-12-31T23:59:59Z');
      const startDate = new Date('2023-01-01T00:00:00Z');
      
      const reportFromMainStorage = await storage.generateConsolidatedReport(
        groupId, 
        ReportType.BALANCE_SHEET,
        startDate,
        endDate
      );
      
      const reportFromDedicatedStorage = await consolidationStorage.generateConsolidatedReport(
        groupId, 
        ReportType.BALANCE_SHEET,
        startDate,
        endDate
      );
      
      if (
        reportFromMainStorage && 
        reportFromDedicatedStorage
      ) {
        console.log('Reports generated, comparing...');
        const mainJSON = JSON.stringify(reportFromMainStorage, null, 2);
        const dedicatedJSON = JSON.stringify(reportFromDedicatedStorage, null, 2);
        
        // Print the JSON structure for debugging
        console.log('=== Report from main storage ===');
        console.log(mainJSON);
        console.log('=== Report from dedicated storage ===');
        console.log(dedicatedJSON);
        
        if (mainJSON === dedicatedJSON) {
          console.log('✅ generateConsolidatedReport test passed');
        } else {
          console.log('❌ generateConsolidatedReport test failed - output mismatch');
        }
      } else {
        console.log('❌ generateConsolidatedReport test failed - null reports');
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