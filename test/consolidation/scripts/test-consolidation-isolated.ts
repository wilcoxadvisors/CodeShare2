/**
 * Isolated test script for consolidation group database operations
 * 
 * This script tests CRUD operations against the database
 * without starting the server to avoid port conflicts.
 */

import { db } from '../../server/db';
import { DatabaseStorage } from '../../server/storage';
import { consolidationGroups } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function testConsolidationGroupsOperations() {
  console.log('Starting isolated consolidation group database test...');
  
  // Create an isolated storage instance without starting the server
  const storage = new DatabaseStorage();
  
  try {
    // First, check if we have any existing data
    const existingGroups = await db.select().from(consolidationGroups);
    console.log(`Found ${existingGroups.length} existing consolidation groups`);
    
    // Create a test consolidation group
    const testGroup = {
      name: 'Test Client Group Beta',
      description: 'An isolated test group with multiple entities',
      ownerId: 1, // Assuming admin user with ID 1 exists
      currency: 'USD',
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // One year from now
      periodType: 'monthly',
      rules: {},
      createdBy: 1,
      // Note: primaryEntityId and other fields are not included to match actual DB schema
      isActive: true
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
        name: 'Updated Isolated Test Group',
        description: 'Updated for isolated testing purposes'
      });
      console.log('Updated group:', updatedGroup);
      
      // Verify the update
      const verifyUpdate = await storage.getConsolidationGroup(createdGroup.id);
      if (verifyUpdate?.name === 'Updated Isolated Test Group') {
        console.log('Group update test passed!');
      } else {
        console.error('Group update test failed!');
      }
      
      // Test adding an entity to the group
      console.log('Testing adding entity to group...');
      const entityId = 3; // Assuming entity ID 3 exists
      await storage.addEntityToConsolidationGroup(createdGroup.id, entityId);
      
      // Verify entity was added by checking the database directly
      console.log('Verifying entity was added to group...');
      const groupsWithEntity = await storage.getConsolidationGroupsByEntity(entityId);
      
      if (groupsWithEntity && groupsWithEntity.some(g => g.id === createdGroup.id)) {
        console.log('Entity addition test passed!');
      } else {
        console.error('Entity addition test failed!');
      }
      
      // Test removing an entity from the group
      console.log('Testing removing entity from group...');
      await storage.removeEntityFromConsolidationGroup(createdGroup.id, entityId);
      
      // Verify entity was removed
      console.log('Verifying entity was removed from group...');
      const groupsAfterRemoval = await storage.getConsolidationGroupsByEntity(entityId);
      
      if (!groupsAfterRemoval.some(g => g.id === createdGroup.id)) {
        console.log('Entity removal test passed!');
      } else {
        console.error('Entity removal test failed!');
      }
      
      // Test finding groups by entity
      console.log('Testing finding groups by entity...');
      const groupsByEntity = await storage.getConsolidationGroupsByEntity(1);
      console.log(`Found ${groupsByEntity.length} groups containing entity ID 1`);
      
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