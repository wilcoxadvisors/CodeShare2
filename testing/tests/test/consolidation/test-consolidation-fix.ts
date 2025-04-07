/**
 * Test script for consolidation group database operations with junction table
 * 
 * This script tests database operations for consolidation groups
 * with the junction table approach for entity-group relationships.
 */

import { db, pool } from '../server/db';
import { consolidationGroups, consolidationGroupEntities } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { DatabaseStorage } from '../server/storage';

async function testConsolidationGroupsOperations() {
  console.log('Testing consolidation group operations with junction table...');
  
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
      rules: null,
      periodType: 'monthly'
    });
    
    console.log('Created test group:', testGroup);
    
    // Verify group was created and has no entities associated
    const initialEntities = await db.select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, testGroup.id));
    
    if (initialEntities.length !== 0) {
      console.error('ERROR: Group was created with entities in the junction table');
      process.exit(1);
    }
    
    console.log('Adding entity 1 to the group...');
    
    // Add an entity to the group
    await storage.addEntityToConsolidationGroup(testGroup.id, 1);
    
    // Get the updated group entities from junction table
    const updatedEntities = await db.select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, testGroup.id));
    
    console.log('Updated entities after adding entity:', updatedEntities);
    
    // Verify entity was added to junction table
    if (updatedEntities.length !== 1 || updatedEntities[0].entityId !== 1) {
      console.error('ERROR: Entity 1 was not added to junction table');
      process.exit(1);
    }
    
    console.log('Removing entity 1 from the group...');
    
    // Remove the entity from the group
    await storage.removeEntityFromConsolidationGroup(testGroup.id, 1);
    
    // Get the final entities from junction table
    const finalEntities = await db.select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, testGroup.id));
    
    console.log('Final entities after removing entity:', finalEntities);
    
    // Verify entity was removed from junction table
    if (finalEntities.length !== 0) {
      console.error('ERROR: Entity 1 was not removed from junction table');
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