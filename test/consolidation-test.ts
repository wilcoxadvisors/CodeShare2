/**
 * Test script to verify consolidation group database operations
 */
import { db } from "../server/db";
import { eq, inArray } from "drizzle-orm";
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
  updateConsolidationGroup,
  deleteConsolidationGroup,
  addEntityToConsolidationGroup,
  removeEntityFromConsolidationGroup,
  generateConsolidatedReport,
  NotFoundError,
  ValidationError
} from "../server/consolidation-group-methods";

/**
 * Sets up test data needed for the consolidation group tests
 */
async function setupTestData() {
  console.log('Setting up test data...');
  
  // Insert test user
  const [testUser] = await db.insert(users)
    .values({
      username: `testuser_${Date.now()}`,
      password: "password123",
      email: `test_${Date.now()}@example.com`,
      name: "Test User",
      role: UserRole.ADMIN
    })
    .returning();
  
  // Insert test entities
  const [entity1] = await db.insert(entities)
    .values({
      name: `Test Entity 1 ${Date.now()}`,
      code: `TE1_${Date.now()}`,
      ownerId: testUser.id,
      currency: "USD"
    })
    .returning();
    
  const [entity2] = await db.insert(entities)
    .values({
      name: `Test Entity 2 ${Date.now()}`,
      code: `TE2_${Date.now()}`,
      ownerId: testUser.id,
      currency: "EUR"
    })
    .returning();
  
  return {
    userId: testUser.id,
    entity1Id: entity1.id,
    entity2Id: entity2.id
  };
}

/**
 * Cleans up test data after tests have completed
 */
async function teardownTestData(userId: number, entity1Id: number, entity2Id: number, groupId?: number) {
  console.log('Cleaning up test data...');
  
  try {
    // First, clean up the junction table to avoid foreign key constraints
    if (groupId) {
      // Remove all entity associations from the junction table for this group
      await db.delete(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
      
      // Group should have been soft-deleted already, verify it's marked inactive
      const group = await db.select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, groupId))
        .limit(1);
        
      if (group.length > 0 && group[0].isActive) {
        console.warn('Warning: Group should have been soft-deleted but is still active');
        // Set it to inactive
        await db.update(consolidationGroups)
          .set({ isActive: false })
          .where(eq(consolidationGroups.id, groupId));
      }
    }
    
    // Also clean up any junction entries for these entities
    if (entity1Id || entity2Id) {
      const entitiesToCleanup = [];
      if (entity1Id) entitiesToCleanup.push(entity1Id);
      if (entity2Id) entitiesToCleanup.push(entity2Id);
      
      if (entitiesToCleanup.length > 0) {
        await db.delete(consolidationGroupEntities)
          .where(inArray(consolidationGroupEntities.entityId, entitiesToCleanup));
      }
    }
    
    // Now clean up entities
    if (entity1Id) {
      await db.delete(entities).where(eq(entities.id, entity1Id));
    }
    
    if (entity2Id) {
      await db.delete(entities).where(eq(entities.id, entity2Id));
    }
    
    // Clean up user
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
}

/**
 * Test consolidation group operations with the enhanced implementation
 */
async function testConsolidationGroupsOperations() {
  console.log('Starting consolidation group test with improved implementation...');
  
  let testData;
  let createdGroup;
  
  try {
    // Setup test data
    testData = await setupTestData();
    const { userId, entity1Id, entity2Id } = testData;
    
    console.log('Testing createConsolidationGroup...');
    // Create a new consolidation group
    createdGroup = await createConsolidationGroup({
      name: `Test Consolidation Group ${Date.now()}`,
      description: "A test consolidation group",
      ownerId: userId,
      createdBy: userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      initialEntityId: entity1Id, // Initially add only the first entity
      currency: "USD",
      periodType: BudgetPeriodType.MONTHLY
    });
    
    console.log('Group created:', createdGroup);
    
    // Verify the group was created
    if (createdGroup.id) {
      console.log('Group created successfully with ID:', createdGroup.id);
      
      // Add the second entity to the group
      console.log('Testing addEntityToConsolidationGroup...');
      await addEntityToConsolidationGroup(createdGroup.id, entity2Id);
      
      // Verify entity was added - use junction table
      const junctionEntities = await db.select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, createdGroup.id));
        
      const entityIdsInJunction = junctionEntities.map(je => je.entityId);
      
      if (entityIdsInJunction.includes(entity1Id) && entityIdsInJunction.includes(entity2Id)) {
        console.log('Entity successfully added to group');
      } else {
        console.error('Failed to add entity to group');
        console.log('Current entity IDs in junction table:', entityIdsInJunction);
      }
      
      // Test removing an entity
      console.log('Testing removeEntityFromConsolidationGroup...');
      await removeEntityFromConsolidationGroup(createdGroup.id, entity1Id);
      
      // Verify entity was removed - use junction table
      const afterRemovalEntities = await db.select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, createdGroup.id));
        
      const afterRemovalEntityIds = afterRemovalEntities.map(je => je.entityId);
      
      if (!afterRemovalEntityIds.includes(entity1Id) && afterRemovalEntityIds.includes(entity2Id)) {
        console.log('Entity successfully removed from group');
      } else {
        console.error('Failed to remove entity from group');
        console.log('Current entity IDs after removal in junction table:', afterRemovalEntityIds);
      }
      
      // Test updating a group
      console.log('Testing updateConsolidationGroup...');
      const updatedGroupData = await updateConsolidationGroup(createdGroup.id, {
        name: `Updated Group Name ${Date.now()}`,
        description: "Updated description"
      });
      
      if (updatedGroupData && 
          updatedGroupData.name !== createdGroup.name &&
          updatedGroupData.description !== createdGroup.description) {
        console.log('Group successfully updated');
      } else {
        console.error('Failed to update group');
      }
      
      // Test soft deleting the group
      console.log('Testing soft deletion...');
      await deleteConsolidationGroup(createdGroup.id);
      
      // Verify the group is marked as inactive but still exists
      const deletedGroup = await db.select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, createdGroup.id))
        .limit(1);
      
      if (deletedGroup.length > 0 && !deletedGroup[0].isActive) {
        console.log('Soft deletion test passed!');
      } else {
        console.error('Soft deletion test failed!');
        console.log('Deleted group state:', deletedGroup[0]);
      }
      
      // Test error handling for non-existent group
      console.log('Testing error handling for non-existent group...');
      try {
        await updateConsolidationGroup(9999, { name: "This should fail" });
        console.error('Expected error not thrown for non-existent group');
      } catch (error) {
        if (error instanceof NotFoundError) {
          console.log('NotFoundError correctly thrown for non-existent group');
        } else {
          console.error('Expected NotFoundError but got:', error);
        }
      }
      
      // Test validation error handling
      console.log('Testing validation error handling...');
      try {
        // @ts-ignore - Intentionally passing invalid data for testing
        await createConsolidationGroup({ name: "" });
        console.error('Expected validation error not thrown');
      } catch (error) {
        if (error instanceof ValidationError) {
          console.log('ValidationError correctly thrown for invalid data');
        } else {
          console.error('Expected ValidationError but got:', error);
        }
      }
      
    } else {
      console.error('Failed to create group!');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Clean up test data
    if (testData) {
      await teardownTestData(
        testData.userId, 
        testData.entity1Id, 
        testData.entity2Id,
        createdGroup?.id
      );
    }
  }
  
  console.log('Consolidation group database test completed');
}

// Run the test
testConsolidationGroupsOperations().catch(error => {
  console.error('Unhandled error in test:', error);
});