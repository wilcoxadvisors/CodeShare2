/**
 * Test script for consolidation group database operations
 * 
 * This script tests all CRUD operations against the database
 * to ensure our implementation is working correctly.
 */

import { db } from '../../server/db';
import { storage } from '../../server/index';
import { consolidationGroups } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function testConsolidationGroupsOperations() {
  console.log('Starting consolidation group database operations test...');
  
  try {
    // First, check if we have any existing data
    const existingGroups = await db.select().from(consolidationGroups);
    console.log(`Found ${existingGroups.length} existing consolidation groups`);
    
    // Create a test consolidation group
    const testGroup = {
      name: 'Test Client Group Alpha',
      description: 'A test group for client Alpha with multiple entities',
      entityIds: [1, 2], // Assuming these entity IDs exist
      ownerId: 1, // Assuming admin user with ID 1 exists
      currency: 'USD',
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // One year from now
      periodType: 'monthly',
      rules: {},
      createdBy: 1
    };
    
    console.log('Creating test consolidation group...');
    const createdGroup = await storage.createConsolidationGroup(testGroup);
    console.log('Created group with ID:', createdGroup.id);
    
    // Verify the created group by fetching it
    console.log('Verifying created group...');
    const fetchedGroup = await storage.getConsolidationGroup(createdGroup.id);
    console.log('Fetched group from database:', fetchedGroup);
    
    if (fetchedGroup) {
      console.log('Group creation test passed!');
      
      // Test updating the group
      console.log('Testing group update...');
      const updatedGroup = await storage.updateConsolidationGroup(createdGroup.id, {
        name: 'Updated Test Group',
        description: 'Updated for testing purposes'
      });
      console.log('Updated group:', updatedGroup);
      
      // Verify the update
      const verifyUpdate = await storage.getConsolidationGroup(createdGroup.id);
      if (verifyUpdate?.name === 'Updated Test Group') {
        console.log('Group update test passed!');
      } else {
        console.error('Group update test failed!');
      }
      
      // Test adding an entity to the group
      console.log('Testing adding entity to group...');
      const entityId = 3; // Assuming entity ID 3 exists
      const groupWithNewEntity = await storage.addEntityToConsolidationGroup(createdGroup.id, entityId);
      
      // Verify entity was added
      if (groupWithNewEntity && groupWithNewEntity.entityIds && groupWithNewEntity.entityIds.includes(entityId)) {
        console.log('Entity addition test passed!');
      } else {
        console.error('Entity addition test failed!');
      }
      
      // Test removing an entity from the group
      console.log('Testing removing entity from group...');
      const groupWithEntityRemoved = await storage.removeEntityFromConsolidationGroup(createdGroup.id, entityId);
      
      // Verify entity was removed
      if (groupWithEntityRemoved && groupWithEntityRemoved.entityIds && !groupWithEntityRemoved.entityIds.includes(entityId)) {
        console.log('Entity removal test passed!');
      } else {
        console.error('Entity removal test failed!');
      }
      
      // Test finding groups by entity
      console.log('Testing finding groups by entity...');
      const groupsByEntity = await storage.getConsolidationGroupsByEntity(1);
      console.log(`Found ${groupsByEntity.length} groups containing entity ID 1`);
      
      // Test generating a consolidated report - SKIPPING SERVER START
      console.log('Skipping consolidated report generation test (requires running server)');
      // Commenting this out to avoid port conflict
      // try {
      //   const report = await storage.generateConsolidatedReport(createdGroup.id, 'balance_sheet');
      //   console.log('Report generation successful:', report ? 'Yes' : 'No');
      // } catch (error) {
      //   console.error('Report generation failed:', error);
      // }
      
      // Clean up - soft delete the test group
      console.log('Testing soft deletion...');
      await storage.deleteConsolidationGroup(createdGroup.id);
      
      // Verify the group is marked as inactive but still exists
      const deletedGroup = await db.select().from(consolidationGroups)
        .where(eq(consolidationGroups.id, createdGroup.id));
      
      if (deletedGroup.length > 0 && !deletedGroup[0].isActive) {
        console.log('Soft deletion test passed!');
      } else {
        console.error('Soft deletion test failed!');
      }
    } else {
      console.error('Failed to verify created group!');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
  
  console.log('Consolidation group database operations test completed');
}

// Run the test
testConsolidationGroupsOperations()
  .then(() => {
    console.log('All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Tests failed:', error);
    process.exit(1);
  });