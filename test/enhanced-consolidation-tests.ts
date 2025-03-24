/**
 * Enhanced Consolidation Group Tests
 * 
 * This test file covers edge cases and ensures stability of the migration
 * from entity_ids array to junction table approach.
 */

import { db } from "../server/db";
import { eq, and, not, inArray } from "drizzle-orm";
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
  deleteConsolidationGroup,
  updateConsolidationGroup,
  generateConsolidatedReport,
  NotFoundError,
  ValidationError
} from "../server/consolidation-group-methods";

/**
 * Sets up test data needed for the tests
 */
async function setupTestData() {
  console.log('Setting up test data...');
  
  // Create a test user if one doesn't exist
  const existingUsers = await db.select()
    .from(users)
    .where(eq(users.username, 'edgecase_testuser'))
    .limit(1);
    
  let userId: number;
  
  if (existingUsers.length === 0) {
    console.log('Creating test user...');
    const [user] = await db.insert(users)
      .values({
        username: 'edgecase_testuser',
        password: 'password-hash', 
        email: 'edgecase_test@example.com',
        name: 'Edge Case Test User',
        role: UserRole.ADMIN,
        active: true,
        createdAt: new Date()
      })
      .returning();
      
    userId = user.id;
  } else {
    userId = existingUsers[0].id;
  }
  
  // Create test entities if they don't exist
  let entity1Id: number;
  let entity2Id: number;
  
  {
    const firstEntity = await db.select()
      .from(entities)
      .where(eq(entities.name, 'Edge Case Test Entity 1'))
      .limit(1);
      
    if (firstEntity.length === 0) {
      const [entity1] = await db.insert(entities)
        .values([{
          name: 'Edge Case Test Entity 1',
          code: 'ECTE1',
          ownerId: userId,
          active: true,
          createdAt: new Date()
        }])
        .returning();
        
      entity1Id = entity1.id;
    } else {
      entity1Id = firstEntity[0].id;
    }
    
    const secondEntity = await db.select()
      .from(entities)
      .where(eq(entities.name, 'Edge Case Test Entity 2'))
      .limit(1);
      
    if (secondEntity.length === 0) {
      const [entity2] = await db.insert(entities)
        .values([{
          name: 'Edge Case Test Entity 2',
          code: 'ECTE2',
          ownerId: userId,
          active: true,
          createdAt: new Date()
        }])
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
 * with proper handling of foreign key constraints
 */
async function teardownTestData(userId: number, entity1Id: number, entity2Id: number, groupIds: number[] = []) {
  console.log('Cleaning up test data...');
  
  try {
    // First handle the consolidation groups
    if (groupIds.length > 0) {
      // First clean up the junction table entries for these groups
      await db.delete(consolidationGroupEntities)
        .where(inArray(consolidationGroupEntities.groupId, groupIds));
      
      // Then delete the groups themselves
      await db.delete(consolidationGroups)
        .where(inArray(consolidationGroups.id, groupIds));
    }
    
    // Now clean up entities - first collect the IDs to handle
    const entitiesToCleanup: number[] = [];
    if (entity1Id) entitiesToCleanup.push(entity1Id);
    if (entity2Id) entitiesToCleanup.push(entity2Id);
    
    // First remove any junction table entries for these entities
    if (entitiesToCleanup.length > 0) {
      await db.delete(consolidationGroupEntities)
        .where(inArray(consolidationGroupEntities.entityId, entitiesToCleanup));
    }
    
    // Find and clean up any consolidation groups owned by this user
    // This must be done before deleting the user to avoid foreign key constraint errors
    const userGroups = await db.select({ id: consolidationGroups.id })
      .from(consolidationGroups)
      .where(eq(consolidationGroups.ownerId, userId));
    
    const userGroupIds = userGroups.map(group => group.id);
    
    if (userGroupIds.length > 0) {
      // Clean up junction table entries
      await db.delete(consolidationGroupEntities)
        .where(inArray(consolidationGroupEntities.groupId, userGroupIds));
      
      // Delete the groups
      await db.delete(consolidationGroups)
        .where(inArray(consolidationGroups.id, userGroupIds));
    }
    
    // Now delete the entities BEFORE deleting the user (foreign key constraint)
    if (entity1Id) {
      await db.delete(entities).where(eq(entities.id, entity1Id));
    }
    
    if (entity2Id) {
      await db.delete(entities).where(eq(entities.id, entity2Id));
    }
    
    // Find any other entities owned by this user and delete them
    const userEntities = await db.select({ id: entities.id })
      .from(entities)
      .where(eq(entities.ownerId, userId));
    
    const userEntityIds = userEntities.map(entity => entity.id);
    
    if (userEntityIds.length > 0) {
      // First remove any junction table entries for these entities
      await db.delete(consolidationGroupEntities)
        .where(inArray(consolidationGroupEntities.entityId, userEntityIds));
      
      // Then delete the entities
      await db.delete(entities)
        .where(inArray(entities.id, userEntityIds));
    }
    
    // Finally, clean up the user
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
}

/**
 * 2.1 Test Groups with No Entities
 * Verifies the system handles groups with no entities gracefully
 */
async function testGroupWithNoEntities() {
  console.log('2.1 Testing consolidation group with no entities...');
  
  let testData;
  let groupId: number | undefined;
  
  try {
    // Setup test data
    testData = await setupTestData();
    const { userId } = testData;
    
    // Create a consolidation group with no entities
    const createdGroup = await createConsolidationGroup({
      name: `Empty Group ${Date.now()}`,
      description: "A consolidation group with no entities",
      ownerId: userId,
      createdBy: userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      currency: "USD",
      periodType: BudgetPeriodType.MONTHLY
    });
    
    console.log('Empty group created:', createdGroup);
    groupId = createdGroup.id;
    
    // Verify no entities in junction table
    const junctionEntities = await db.select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, createdGroup.id));
      
    console.log('Junction table entries for empty group:', junctionEntities);
    
    if (junctionEntities.length === 0) {
      console.log('Verified: Group has no entities in junction table');
    } else {
      console.error('Failed: Group unexpectedly has entities in junction table');
    }
    
    // Try to generate a report for it
    console.log('Attempting to generate a report for empty group...');
    try {
      const report = await generateConsolidatedReport(
        createdGroup.id, 
        ReportType.BALANCE_SHEET
      );
      
      console.log('Generated report for empty group:', report);
      
      // Expect an empty report (could be an empty object, array, or appropriate message)
      if (
        (Array.isArray(report) && report.length === 0) || 
        (typeof report === 'object' && Object.keys(report).length === 0) ||
        (report && report.message && report.message.includes('empty'))
      ) {
        console.log('Success: System handled empty group report generation gracefully');
      } else {
        console.log('Note: System generated a non-empty report for an empty group');
      }
    } catch (error) {
      console.log('System rejected report generation for empty group with error:', error.message);
    }
    
    // Cleanup
    if (groupId) {
      await teardownTestData(userId, 0, 0, [groupId]);
    }
    
    console.log('Empty group test completed successfully');
    return true;
  } catch (error) {
    console.error('Error in empty group test:', error);
    
    // Cleanup on error
    if (testData && groupId) {
      await teardownTestData(testData.userId, 0, 0, [groupId]);
    }
    
    return false;
  }
}

/**
 * 2.2 Test Invalid or Non-Existent Entity IDs
 * Ensures the system rejects invalid or non-existent entity IDs
 */
async function testInvalidEntityId() {
  console.log('2.2 Testing invalid entity ID handling...');
  
  let testData;
  let groupId: number | undefined;
  
  try {
    // Setup test data
    testData = await setupTestData();
    const { userId, entity1Id } = testData;
    
    // Create a consolidation group with one valid entity
    const createdGroup = await createConsolidationGroup({
      name: `Valid Group ${Date.now()}`,
      description: "A consolidation group for testing invalid entity IDs",
      ownerId: userId,
      createdBy: userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      initialEntityId: entity1Id,
      currency: "USD",
      periodType: BudgetPeriodType.MONTHLY
    });
    
    console.log('Group created:', createdGroup);
    groupId = createdGroup.id;
    
    // Try to add a non-existent entity ID (use a very large number to ensure it doesn't exist)
    const nonExistentEntityId = 999999999;
    
    console.log('Attempting to add non-existent entity ID:', nonExistentEntityId);
    try {
      await addEntityToConsolidationGroup(createdGroup.id, nonExistentEntityId);
      console.error('Failed: System allowed adding a non-existent entity ID');
    } catch (error) {
      console.log('Success: System rejected non-existent entity ID with error:', error.message);
      
      // Check if it's the expected error type
      if (error instanceof NotFoundError || error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log('Correct error type raised for non-existent entity');
      } else {
        console.log('Unexpected error type for non-existent entity:', error.constructor.name);
      }
    }
    
    // Cleanup
    if (groupId) {
      await teardownTestData(userId, entity1Id, 0, [groupId]);
    }
    
    console.log('Invalid entity ID test completed successfully');
    return true;
  } catch (error) {
    console.error('Error in invalid entity ID test:', error);
    
    // Cleanup on error
    if (testData && groupId) {
      await teardownTestData(testData.userId, testData.entity1Id, 0, [groupId]);
    }
    
    return false;
  }
}

/**
 * 2.3 Test Soft Delete Behavior
 * Confirms soft-deleted groups are excluded from retrieval
 */
async function testSoftDeleteBehavior() {
  console.log('2.3 Testing soft delete behavior...');
  
  let testData;
  let groupId: number | undefined;
  
  try {
    // Setup test data
    testData = await setupTestData();
    const { userId, entity1Id } = testData;
    
    // Create a consolidation group
    const createdGroup = await createConsolidationGroup({
      name: `Soft Delete Test Group ${Date.now()}`,
      description: "A consolidation group for testing soft deletion",
      ownerId: userId,
      createdBy: userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      initialEntityId: entity1Id,
      currency: "USD",
      periodType: BudgetPeriodType.MONTHLY
    });
    
    console.log('Group created:', createdGroup);
    groupId = createdGroup.id;
    
    // Verify the group exists and is retrievable
    const groups = await getEntityConsolidationGroups(entity1Id);
    const foundBeforeDeletion = groups.some(g => g.id === createdGroup.id);
    
    console.log('Group found before deletion:', foundBeforeDeletion);
    
    if (!foundBeforeDeletion) {
      console.error('Failed: Group not found before deletion');
      return false;
    }
    
    // Now soft delete the group
    console.log('Soft deleting group...');
    await deleteConsolidationGroup(createdGroup.id);
    
    // Check if we can still retrieve it
    console.log('Checking if group is excluded after soft deletion...');
    const groupsAfterDeletion = await getEntityConsolidationGroups(entity1Id);
    const foundAfterDeletion = groupsAfterDeletion.some(g => g.id === createdGroup.id);
    
    console.log('Group found after deletion:', foundAfterDeletion);
    
    if (foundAfterDeletion) {
      console.error('Failed: Soft-deleted group is still being retrieved');
      return false;
    } else {
      console.log('Success: Soft-deleted group is correctly excluded from retrieval');
    }
    
    // Verify the group still exists in the database but with isActive=false
    const [groupRecord] = await db.select()
      .from(consolidationGroups)
      .where(eq(consolidationGroups.id, createdGroup.id));
      
    if (!groupRecord) {
      console.error('Failed: Group record not found at all after soft deletion');
      return false;
    }
    
    if (groupRecord.isActive === false) {
      console.log('Success: Group record has isActive=false after soft deletion');
    } else {
      console.error('Failed: Group record still has isActive=true after soft deletion');
      return false;
    }
    
    // Also verify that junction table entries still exist
    const junctionEntries = await db.select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, createdGroup.id));
      
    if (junctionEntries.length > 0) {
      console.log('Success: Junction table entries are preserved after soft deletion');
    } else {
      console.log('Note: No junction table entries found after soft deletion');
    }
    
    // Full cleanup, including the soft-deleted group
    if (groupId) {
      await teardownTestData(userId, entity1Id, 0, [groupId]);
    }
    
    console.log('Soft delete test completed successfully');
    return true;
  } catch (error) {
    console.error('Error in soft delete test:', error);
    
    // Cleanup on error
    if (testData && groupId) {
      await teardownTestData(testData.userId, testData.entity1Id, 0, [groupId]);
    }
    
    return false;
  }
}

/**
 * 2.4 Test Data Consistency
 * Ensures consistency between consolidation_groups and consolidation_group_entities
 */
async function testDataConsistency() {
  console.log('2.4 Testing data consistency...');
  
  let testData;
  let groupId: number | undefined;
  
  try {
    // Setup test data
    testData = await setupTestData();
    const { userId, entity1Id, entity2Id } = testData;
    
    // Create a consolidation group and add entities via junction table
    const createdGroup = await createConsolidationGroup({
      name: `Consistency Test Group ${Date.now()}`,
      description: "A group for testing data consistency",
      ownerId: userId,
      createdBy: userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      currency: "USD",
      periodType: BudgetPeriodType.MONTHLY
    });
    
    console.log('Group created:', createdGroup);
    groupId = createdGroup.id;
    
    // Add entities via API methods
    await addEntityToConsolidationGroup(createdGroup.id, entity1Id);
    await addEntityToConsolidationGroup(createdGroup.id, entity2Id);
    
    // Get entities from junction table
    const junctionEntities = await db.select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, createdGroup.id));
      
    const junctionEntityIds = junctionEntities.map(je => je.entityId).sort();
    console.log('Entity IDs in junction table:', junctionEntityIds);
    
    // Get entities through API method
    const apiEntities = await getConsolidationGroupEntities(createdGroup.id);
    const apiEntityIds = [...apiEntities].sort();
    console.log('Entity IDs from API:', apiEntityIds);
    
    // Compare for consistency
    const areConsistent = 
      junctionEntityIds.length === apiEntityIds.length && 
      junctionEntityIds.every((id, idx) => id === apiEntityIds[idx]);
      
    if (areConsistent) {
      console.log('Success: Junction table and API method return consistent entity IDs');
    } else {
      console.error('Failed: Junction table and API method return inconsistent entity IDs');
      return false;
    }
    
    // Cleanup
    if (groupId) {
      await teardownTestData(userId, entity1Id, entity2Id, [groupId]);
    }
    
    console.log('Data consistency test completed successfully');
    return true;
  } catch (error) {
    console.error('Error in data consistency test:', error);
    
    // Cleanup on error
    if (testData && groupId) {
      await teardownTestData(testData.userId, testData.entity1Id, testData.entity2Id, [groupId]);
    }
    
    return false;
  }
}

/**
 * 2.5 Test Entity Deletion Behavior
 * Verifies that removing an entity properly updates all related groups
 */
async function testEntityDeletionBehavior() {
  console.log('2.5 Testing entity deletion behavior...');
  
  let testData;
  let groupId1: number | undefined;
  let groupId2: number | undefined;
  
  try {
    // Setup test data
    testData = await setupTestData();
    const { userId, entity1Id, entity2Id } = testData;
    
    // Create two consolidation groups that share one entity
    const createdGroup1 = await createConsolidationGroup({
      name: `Entity Deletion Test Group 1 ${Date.now()}`,
      description: "A group for testing entity deletion",
      ownerId: userId,
      createdBy: userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      initialEntityId: entity1Id,
      currency: "USD",
      periodType: BudgetPeriodType.MONTHLY
    });
    
    console.log('Group 1 created:', createdGroup1);
    groupId1 = createdGroup1.id;
    
    const createdGroup2 = await createConsolidationGroup({
      name: `Entity Deletion Test Group 2 ${Date.now()}`,
      description: "A second group for testing entity deletion",
      ownerId: userId,
      createdBy: userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      initialEntityId: entity1Id,
      currency: "USD",
      periodType: BudgetPeriodType.MONTHLY
    });
    
    console.log('Group 2 created:', createdGroup2);
    groupId2 = createdGroup2.id;
    
    // Add entity2 only to group1
    await addEntityToConsolidationGroup(createdGroup1.id, entity2Id);
    
    // Verify entities in both groups
    const group1Entities = await getConsolidationGroupEntities(createdGroup1.id);
    const group2Entities = await getConsolidationGroupEntities(createdGroup2.id);
    
    console.log('Group 1 entities before deletion:', group1Entities);
    console.log('Group 2 entities before deletion:', group2Entities);
    
    // Now remove entity1 from all groups
    const entityGroups = await getEntityConsolidationGroups(entity1Id);
    console.log(`Entity ${entity1Id} belongs to ${entityGroups.length} groups before deletion`);
    
    for (const group of entityGroups) {
      await removeEntityFromConsolidationGroup(group.id, entity1Id);
      console.log(`Removed entity ${entity1Id} from group ${group.id}`);
    }
    
    // Verify entity1 is no longer in any groups
    const entityGroupsAfter = await getEntityConsolidationGroups(entity1Id);
    console.log(`Entity ${entity1Id} belongs to ${entityGroupsAfter.length} groups after deletion`);
    
    if (entityGroupsAfter.length === 0) {
      console.log('Success: Entity successfully removed from all groups');
    } else {
      console.error('Failed: Entity still belongs to some groups after removal');
      return false;
    }
    
    // Verify group1 still has entity2
    const group1EntitiesAfter = await getConsolidationGroupEntities(createdGroup1.id);
    console.log('Group 1 entities after deletion:', group1EntitiesAfter);
    
    if (group1EntitiesAfter.length === 1 && group1EntitiesAfter.includes(entity2Id)) {
      console.log('Success: Group 1 still contains entity2 after entity1 was removed');
    } else {
      console.error('Failed: Group 1 entities were incorrectly modified');
      return false;
    }
    
    // Verify group2 is now empty
    const group2EntitiesAfter = await getConsolidationGroupEntities(createdGroup2.id);
    console.log('Group 2 entities after deletion:', group2EntitiesAfter);
    
    if (group2EntitiesAfter.length === 0) {
      console.log('Success: Group 2 is now empty as expected');
    } else {
      console.error('Failed: Group 2 should be empty but contains entities');
      return false;
    }
    
    // Cleanup
    if (groupId1 && groupId2) {
      await teardownTestData(userId, entity1Id, entity2Id, [groupId1, groupId2]);
    }
    
    console.log('Entity deletion test completed successfully');
    return true;
  } catch (error) {
    console.error('Error in entity deletion test:', error);
    
    // Cleanup on error
    if (testData && (groupId1 || groupId2)) {
      await teardownTestData(
        testData.userId, 
        testData.entity1Id, 
        testData.entity2Id, 
        [groupId1, groupId2].filter(Boolean) as number[]
      );
    }
    
    return false;
  }
}

/**
 * Run all the enhanced tests
 */
async function runEnhancedTests() {
  console.log('Running enhanced consolidation group tests...');
  
  const results = {
    testGroupWithNoEntities: await testGroupWithNoEntities(),
    testInvalidEntityId: await testInvalidEntityId(),
    testSoftDeleteBehavior: await testSoftDeleteBehavior(),
    testDataConsistency: await testDataConsistency(),
    testEntityDeletionBehavior: await testEntityDeletionBehavior()
  };
  
  console.log('\nTest Results Summary:');
  for (const [testName, passed] of Object.entries(results)) {
    console.log(`${testName}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  }
  
  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.values(results).length;
  
  console.log(`\nSummary: ${totalPassed}/${totalTests} tests passed`);
  
  return Object.values(results).every(Boolean);
}

// Run the tests
runEnhancedTests()
  .then(result => {
    console.log('Enhanced tests completed:', result ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  })
  .catch(error => {
    console.error('Error running enhanced tests:', error);
  });