/**
 * Test script for consolidation group database operations with entity_ids fix
 * 
 * This script tests database operations for consolidation groups
 * to verify our fix for entity_ids handling works correctly.
 */

import { db, pool } from '../server/db';
import { consolidationGroups } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { DatabaseStorage } from '../server/storage';

async function testConsolidationGroupsOperations() {
  console.log('Testing consolidation group operations with entity_ids fix...');
  
  // Create a storage instance
  const storage = new DatabaseStorage();
  
  try {
    // Create a test consolidation group
    const testGroup = await storage.createConsolidationGroup({
      name: 'Test Group ' + Date.now(),
      ownerId: 1,
      createdBy: 1,
      currency: 'USD',
      description: 'Test description',
      isActive: true,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      entity_ids: [], // Start with empty array
      rules: null,
      periodType: 'monthly'
    });
    
    console.log('Created test group:', testGroup);
    
    // Verify group was created with empty entity_ids array
    if (!testGroup.entity_ids || testGroup.entity_ids.length !== 0) {
      console.error('ERROR: Group was not created with empty entity_ids array');
      process.exit(1);
    }
    
    console.log('Adding entity 1 to the group...');
    
    // Add an entity to the group
    await storage.addEntityToConsolidationGroup(testGroup.id, 1);
    
    // Get the updated group
    const updatedGroup = await storage.getConsolidationGroup(testGroup.id);
    console.log('Updated group after adding entity:', updatedGroup);
    
    // Verify entity was added to entity_ids array
    if (!updatedGroup?.entity_ids || !updatedGroup.entity_ids.includes(1)) {
      console.error('ERROR: Entity 1 was not added to entity_ids array');
      process.exit(1);
    }
    
    console.log('Removing entity 1 from the group...');
    
    // Remove the entity from the group
    await storage.removeEntityFromConsolidationGroup(testGroup.id, 1);
    
    // Get the updated group again
    const finalGroup = await storage.getConsolidationGroup(testGroup.id);
    console.log('Final group after removing entity:', finalGroup);
    
    // Verify entity was removed from entity_ids array
    if (!finalGroup?.entity_ids || finalGroup.entity_ids.includes(1)) {
      console.error('ERROR: Entity 1 was not removed from entity_ids array');
      process.exit(1);
    }
    
    // Clean up - delete the test group
    await db.delete(consolidationGroups).where(eq(consolidationGroups.id, testGroup.id));
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the test
testConsolidationGroupsOperations();