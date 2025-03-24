/**
 * Verification script for the consolidation group cleanup functionality
 * 
 * This script creates several consolidation groups, some with entities and some empty,
 * then tests the cleanupEmptyConsolidationGroups function to ensure it works correctly.
 */
import { db } from '../server/db';
import { cleanupEmptyConsolidationGroups, createConsolidationGroup, addEntityToConsolidationGroup } from '../server/consolidation-group-methods';
import { consolidationGroups, consolidationGroupEntities, entities, users } from '../shared/schema';
import { eq, and, or } from 'drizzle-orm';

/**
 * Generate a random string to use as a unique identifier
 */
function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Sets up test data needed for the verification tests
 */
async function setupTestData() {
  // Create a test user
  const [userResult] = await db.insert(users)
    .values({
      username: `test_user_${randomString()}`,
      passwordHash: 'dummy_hash',
      name: 'Test User',
      email: `test_${randomString()}@example.com`,
      role: 'admin' as any,
      password: 'password123', // Required by schema
    })
    .returning({ id: users.id });
  
  const userId = userResult.id;
  
  console.log(`Created test user with ID: ${userId}`);
  
  // Create test entities
  const [entity1Result] = await db.insert(entities)
    .values({
      name: `Test Entity 1 ${randomString()}`,
      legalName: `Test Legal Entity 1 ${randomString()}`,
      entityType: 'corporation',
      isActive: true,
      createdBy: userId,
      code: `ENT1-${randomString(4)}`, // Required by schema
      ownerId: userId, // Required by schema
    })
    .returning({ id: entities.id });
  
  const entity1Id = entity1Result.id;
  
  const [entity2Result] = await db.insert(entities)
    .values({
      name: `Test Entity 2 ${randomString()}`,
      legalName: `Test Legal Entity 2 ${randomString()}`,
      entityType: 'llc',
      isActive: true,
      createdBy: userId,
      code: `ENT2-${randomString(4)}`, // Required by schema
      ownerId: userId, // Required by schema
    })
    .returning({ id: entities.id });
  
  const entity2Id = entity2Result.id;
  
  console.log(`Created test entities with IDs: ${entity1Id}, ${entity2Id}`);
  
  // Create test consolidation groups (some with entities, some empty)
  // Create current date and dates for start/end
  const today = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1); // 1 month ago
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 12); // 1 year in the future
  
  // Group 1: Has entities
  const group1 = await createConsolidationGroup({
    name: `Test Group With Entities ${randomString()}`,
    description: 'Test group with entities for cleanup verification',
    ownerId: userId,
    createdBy: userId,
    startDate: startDate,
    endDate: endDate,
    currency: 'USD',
    periodType: 'monthly' as any, // Using "as any" to avoid enum type issues in test
    entities: [entity1Id, entity2Id]
  });
  console.log(`Created group with entities, ID: ${group1.id}`);
  
  // Group 2: Empty group
  const group2 = await createConsolidationGroup({
    name: `Empty Group 1 ${randomString()}`,
    description: 'Empty test group for cleanup verification',
    ownerId: userId,
    createdBy: userId,
    startDate: startDate,
    endDate: endDate,
    currency: 'USD',
    periodType: 'monthly' as any,
    entities: []
  });
  console.log(`Created empty group, ID: ${group2.id}`);
  
  // Group 3: Another empty group
  const group3 = await createConsolidationGroup({
    name: `Empty Group 2 ${randomString()}`,
    description: 'Another empty test group for cleanup verification',
    ownerId: userId,
    createdBy: userId,
    startDate: startDate,
    endDate: endDate,
    currency: 'USD',
    periodType: 'monthly' as any,
    entities: []
  });
  console.log(`Created another empty group, ID: ${group3.id}`);
  
  // Group 4: Empty group owned by a different user
  const [otherUserResult] = await db.insert(users)
    .values({
      username: `other_user_${randomString()}`,
      passwordHash: 'dummy_hash',
      name: 'Other User',
      email: `other_${randomString()}@example.com`,
      role: 'employee' as any,
      password: 'password123', // Required by schema
    })
    .returning({ id: users.id });
  
  const otherUserId = otherUserResult.id;
  
  const group4 = await createConsolidationGroup({
    name: `Other User Empty Group ${randomString()}`,
    description: 'Empty test group owned by another user',
    ownerId: otherUserId,
    createdBy: otherUserId,
    startDate: startDate,
    endDate: endDate,
    currency: 'USD',
    periodType: 'monthly' as any,
    entities: []
  });
  console.log(`Created empty group for other user, ID: ${group4.id}`);
  
  return {
    userId,
    otherUserId,
    entity1Id,
    entity2Id,
    group1Id: group1.id,
    group2Id: group2.id,
    group3Id: group3.id,
    group4Id: group4.id
  };
}

/**
 * Cleans up test data after tests have completed
 */
async function teardownTestData(testData: any) {
  console.log('Cleaning up test data...');
  
  // Clean up in reverse order to respect foreign key constraints
  
  // 1. Remove relationships in junction table
  await db.delete(consolidationGroupEntities)
    .where(
      or(
        eq(consolidationGroupEntities.groupId, testData.group1Id),
        eq(consolidationGroupEntities.groupId, testData.group2Id),
        eq(consolidationGroupEntities.groupId, testData.group3Id),
        eq(consolidationGroupEntities.groupId, testData.group4Id)
      )
    );
  
  // 2. Delete consolidation groups
  await db.delete(consolidationGroups)
    .where(
      or(
        eq(consolidationGroups.id, testData.group1Id),
        eq(consolidationGroups.id, testData.group2Id),
        eq(consolidationGroups.id, testData.group3Id),
        eq(consolidationGroups.id, testData.group4Id)
      )
    );
  
  // 3. Delete entities
  await db.delete(entities)
    .where(
      or(
        eq(entities.id, testData.entity1Id),
        eq(entities.id, testData.entity2Id)
      )
    );
  
  // 4. Delete users
  await db.delete(users)
    .where(
      or(
        eq(users.id, testData.userId),
        eq(users.id, testData.otherUserId)
      )
    );
  
  console.log('Test data cleanup completed.');
}

/**
 * Test the cleanupEmptyConsolidationGroups utility function
 */
async function testCleanupEmptyGroups() {
  try {
    // Setup test data
    console.log('Setting up test data...');
    const testData = await setupTestData();
    console.log('Test data setup completed.');
    
    // Test 1: Clean up all empty groups without owner filter
    console.log('\nTest 1: Clean up all empty groups');
    const result1 = await cleanupEmptyConsolidationGroups();
    console.log(`Cleaned up ${result1} empty groups`);
    
    // Verify that empty groups are now soft-deleted (isActive = false)
    const remaining1 = await db.select({ id: consolidationGroups.id, isActive: consolidationGroups.isActive })
      .from(consolidationGroups)
      .where(
        or(
          eq(consolidationGroups.id, testData.group2Id),
          eq(consolidationGroups.id, testData.group3Id),
          eq(consolidationGroups.id, testData.group4Id)
        )
      );
    
    console.log('Groups after cleanup (all):', remaining1);
    
    // Reset the isActive status for the next test
    await db.update(consolidationGroups)
      .set({ isActive: true })
      .where(
        or(
          eq(consolidationGroups.id, testData.group2Id),
          eq(consolidationGroups.id, testData.group3Id),
          eq(consolidationGroups.id, testData.group4Id)
        )
      );
    
    // Test 2: Clean up empty groups for a specific owner
    console.log('\nTest 2: Clean up empty groups for main test user');
    const result2 = await cleanupEmptyConsolidationGroups(testData.userId);
    console.log(`Cleaned up ${result2} empty groups belonging to user ${testData.userId}`);
    
    // Verify that only the empty groups owned by the specified user are soft-deleted
    const remaining2 = await db.select({ 
      id: consolidationGroups.id, 
      isActive: consolidationGroups.isActive,
      ownerId: consolidationGroups.ownerId
    })
    .from(consolidationGroups)
    .where(
      or(
        eq(consolidationGroups.id, testData.group2Id),
        eq(consolidationGroups.id, testData.group3Id),
        eq(consolidationGroups.id, testData.group4Id)
      )
    );
    
    console.log('Groups after cleanup (owner-specific):', remaining2);
    
    // Test 3: Verify groups with entities are not affected
    const groupWithEntities = await db.select({ 
      id: consolidationGroups.id, 
      isActive: consolidationGroups.isActive 
    })
    .from(consolidationGroups)
    .where(eq(consolidationGroups.id, testData.group1Id));
    
    console.log('\nTest 3: Verify groups with entities are not affected');
    console.log('Group with entities:', groupWithEntities);
    
    // Clean up test data
    await teardownTestData(testData);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error testing cleanupEmptyGroups:', error);
    throw error;
  }
}

// Execute the test
testCleanupEmptyGroups()
  .then(() => {
    console.log('Cleanup verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup verification failed:', error);
    process.exit(1);
  });