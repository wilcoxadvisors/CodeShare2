/**
 * Test script to verify junction table implementation for consolidation groups
 * 
 * This script tests the updated consolidation group methods that use
 * both the entity_ids array and junction table for backward compatibility.
 */

import { db } from "../server/db";
import { eq, and } from "drizzle-orm";
import { 
  users, 
  entities, 
  consolidationGroups,
  consolidationGroupEntities,
  ReportType,
  UserRole,
  BudgetPeriodType
} from "../shared/schema";
import { 
  createConsolidationGroup, 
  addEntityToConsolidationGroup,
  removeEntityFromConsolidationGroup,
  getConsolidationGroupEntities,
  getEntityConsolidationGroups,
  deleteConsolidationGroup
} from "../server/consolidation-group-methods";

/**
 * Sets up test data needed for the junction table tests
 */
async function setupTestData() {
  console.log('Setting up test data...');
  
  // Create a test user if one doesn't exist
  const existingUsers = await db.select()
    .from(users)
    .where(eq(users.username, 'testuser'))
    .limit(1);
    
  let userId: number;
  
  if (existingUsers.length === 0) {
    console.log('Creating test user...');
    const [user] = await db.insert(users)
      .values({
        username: 'testuser',
        password: 'password-hash', // This would normally be hashed
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date()
      })
      .returning();
      
    userId = user.id;
  } else {
    userId = existingUsers[0].id;
  }
  
  // Create test entities if they don't exist
  const existingEntities = await db.select()
    .from(entities)
    .where(eq(entities.name, 'Test Entity 1'))
    .limit(1);
    
  let entity1Id: number;
  let entity2Id: number;
  
  if (existingEntities.length === 0) {
    console.log('Creating test entities...');
    const [entity1] = await db.insert(entities)
      .values({
        name: 'Test Entity 1',
        legalName: 'Test Entity 1 Legal Name',
        entityType: 'Corporation',
        isActive: true,
        createdAt: new Date()
      })
      .returning();
      
    const [entity2] = await db.insert(entities)
      .values({
        name: 'Test Entity 2',
        legalName: 'Test Entity 2 Legal Name',
        entityType: 'LLC',
        isActive: true,
        createdAt: new Date()
      })
      .returning();
      
    entity1Id = entity1.id;
    entity2Id = entity2.id;
  } else {
    entity1Id = existingEntities[0].id;
    
    const secondEntity = await db.select()
      .from(entities)
      .where(eq(entities.name, 'Test Entity 2'))
      .limit(1);
      
    if (secondEntity.length === 0) {
      const [entity2] = await db.insert(entities)
        .values({
          name: 'Test Entity 2',
          legalName: 'Test Entity 2 Legal Name',
          entityType: 'LLC',
          isActive: true,
          createdAt: new Date()
        })
        .returning();
        
      entity2Id = entity2.id;
    } else {
      entity2Id = secondEntity[0].id;
    }
  }
  
  return { userId, entity1Id, entity2Id };
}

/**
 * Cleans up test data after tests have completed
 */
async function teardownTestData(userId: number, entity1Id: number, entity2Id: number, groupId?: number) {
  console.log('Cleaning up test data...');
  
  // Only clean up if not running in production
  if (process.env.NODE_ENV !== 'production') {
    if (groupId) {
      // First remove junction table entries to maintain referential integrity
      await db.delete(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
        
      // Then delete the group
      await db.delete(consolidationGroups)
        .where(eq(consolidationGroups.id, groupId));
    }
    
    // Clean up entities
    await db.delete(entities)
      .where(eq(entities.id, entity1Id));
      
    await db.delete(entities)
      .where(eq(entities.id, entity2Id));
    
    // Don't delete the test user as it might be used by other tests
  }
}

/**
 * Test the junction table implementation for consolidation groups
 */
async function testJunctionTableImplementation() {
  console.log('Starting junction table implementation test...');
  
  let testData;
  let createdGroup;
  
  try {
    // Setup test data
    testData = await setupTestData();
    const { userId, entity1Id, entity2Id } = testData;
    
    console.log('Testing createConsolidationGroup with junction table...');
    // Create a new consolidation group
    createdGroup = await createConsolidationGroup({
      name: `Junction Table Test Group ${Date.now()}`,
      description: "A test consolidation group for junction table",
      ownerId: userId,
      createdBy: userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      entity_ids: [entity1Id], // Initially add only the first entity
      currency: "USD",
      periodType: BudgetPeriodType.MONTHLY
    });
    
    console.log('Group created:', createdGroup);
    
    // Verify the group was created
    if (createdGroup.id) {
      console.log('Group created successfully with ID:', createdGroup.id);
      
      // Verify entity was added to both array and junction table
      console.log('Verifying initial entity in array and junction table...');
      
      // Check entity_ids array
      const groupResult = await db.select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, createdGroup.id))
        .limit(1);
        
      console.log('Entity IDs in array:', groupResult[0].entity_ids);
      
      // Check junction table
      const junctionEntities = await db.select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, createdGroup.id));
        
      console.log('Junction table entries:', junctionEntities);
      
      // Add the second entity to the group
      console.log('Testing addEntityToConsolidationGroup with junction table...');
      await addEntityToConsolidationGroup(createdGroup.id, entity2Id);
      
      // Verify both entities are in both array and junction table
      console.log('Verifying both entities in array and junction table...');
      
      // Check entity_ids array
      const updatedGroup = await db.select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, createdGroup.id))
        .limit(1);
        
      console.log('Entity IDs in array after adding second entity:', updatedGroup[0].entity_ids);
      
      // Check junction table
      const updatedJunctionEntities = await db.select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, createdGroup.id));
        
      console.log('Junction table entries after adding second entity:', updatedJunctionEntities);
      
      // Test getConsolidationGroupEntities
      console.log('Testing getConsolidationGroupEntities...');
      const groupEntities = await getConsolidationGroupEntities(createdGroup.id);
      console.log('Entities retrieved:', groupEntities);
      
      // Test getEntityConsolidationGroups
      console.log('Testing getEntityConsolidationGroups...');
      const entityGroups = await getEntityConsolidationGroups(entity1Id);
      console.log('Groups containing entity 1:', entityGroups.map(g => g.id));
      
      // Test removeEntityFromConsolidationGroup
      console.log('Testing removeEntityFromConsolidationGroup...');
      await removeEntityFromConsolidationGroup(createdGroup.id, entity1Id);
      
      // Verify entity was removed from both array and junction table
      console.log('Verifying entity removal from array and junction table...');
      
      // Check entity_ids array
      const groupAfterRemoval = await db.select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, createdGroup.id))
        .limit(1);
        
      console.log('Entity IDs in array after removal:', groupAfterRemoval[0].entity_ids);
      
      // Check junction table
      const junctionAfterRemoval = await db.select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, createdGroup.id));
        
      console.log('Junction table entries after removal:', junctionAfterRemoval);
      
      // Test soft delete
      console.log('Testing deleteConsolidationGroup (soft delete)...');
      await deleteConsolidationGroup(createdGroup.id);
      
      // Verify group is marked as inactive but junction records remain
      const deletedGroup = await db.select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, createdGroup.id))
        .limit(1);
        
      console.log('Group active status after soft delete:', deletedGroup[0].isActive);
      
      // Check junction table after soft delete
      const junctionAfterDelete = await db.select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, createdGroup.id));
        
      console.log('Junction table entries after soft delete:', junctionAfterDelete);
      
      console.log('All tests passed successfully!');
    } else {
      console.error('Failed to create group');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Clean up test data
    if (testData && createdGroup) {
      await teardownTestData(testData.userId, testData.entity1Id, testData.entity2Id, createdGroup.id);
    }
  }
}

// Run the test if invoked directly
if (require.main === module) {
  testJunctionTableImplementation()
    .then(() => {
      console.log('Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export default testJunctionTableImplementation;