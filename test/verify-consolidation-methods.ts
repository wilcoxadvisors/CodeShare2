/**
 * Verification script for improved consolidation group methods
 * 
 * This script tests the finalized implementation based on the Consolidation Group Methods Improvement Guide
 * to ensure all improvements have been properly implemented.
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
  updateConsolidationGroup,
  deleteConsolidationGroup,
  addEntityToConsolidationGroup,
  removeEntityFromConsolidationGroup,
  getConsolidationGroupEntities,
  getEntityConsolidationGroups,
  generateConsolidatedReport,
  NotFoundError,
  ValidationError
} from "../server/consolidation-group-methods";
import { clearUsageStats } from "../shared/deprecation-monitor";

/**
 * Sets up test data needed for the verification tests
 */
async function setupTestData() {
  // Create a test user with a unique timestamp
  const timestamp = new Date().getTime();
  const [testUser] = await db.insert(users)
    .values({
      username: `test-consolidation-user-${timestamp}`,
      password: 'password-hash',
      name: 'Test User',
      email: `test-${timestamp}@example.com`,
      role: UserRole.ADMIN,
      active: true,
      createdAt: new Date()
    })
    .returning();

  // Create two test entities
  const [entity1] = await db.insert(entities)
    .values({
      name: 'Test Entity 1',
      legalName: 'Test Entity 1, LLC',
      entityType: 'LLC',
      code: 'TE1',  // Required field
      currency: 'USD', // Required field
      ownerId: testUser.id, // Required field
      active: true,
      createdBy: testUser.id,
      createdAt: new Date()
    })
    .returning();

  const [entity2] = await db.insert(entities)
    .values({
      name: 'Test Entity 2',
      legalName: 'Test Entity 2, Inc',
      entityType: 'Corporation',
      code: 'TE2',  // Required field
      currency: 'USD', // Required field
      ownerId: testUser.id, // Required field
      active: true,
      createdBy: testUser.id,
      createdAt: new Date()
    })
    .returning();

  return { userId: testUser.id, entity1Id: entity1.id, entity2Id: entity2.id };
}

/**
 * Cleans up test data after tests have completed
 */
async function teardownTestData(userId: number, entity1Id: number, entity2Id: number, groupId?: number) {
  // Delete test data in reverse order of creation to maintain referential integrity
  
  // Delete consolidation group if it exists
  if (groupId) {
    await db.delete(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, groupId));
      
    await db.delete(consolidationGroups)
      .where(eq(consolidationGroups.id, groupId));
  }
  
  // Delete test entities
  await db.delete(entities).where(eq(entities.id, entity1Id));
  await db.delete(entities).where(eq(entities.id, entity2Id));
  
  // Delete test user
  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Test the finalized implementation of consolidation group methods
 */
async function verifyImprovedImplementation() {
  console.log('Starting verification of consolidation group methods...');
  
  // For tracking test results
  let passCount = 0;
  let failCount = 0;
  
  // Setup test data
  console.log('Setting up test data...');
  const { userId, entity1Id, entity2Id } = await setupTestData();
  let groupId: number | undefined;
  
  try {
    // Clear usage statistics to get a clean slate
    clearUsageStats();
    
    console.log('Verifying createConsolidationGroup with validation...');
    try {
      // Test Step 1: Create a consolidation group
      const newGroup = await createConsolidationGroup({
        name: 'Test Consolidation Group',
        description: 'A test group for verification',
        ownerId: userId,
        createdBy: userId,
        currency: 'USD',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in the future
        periodType: BudgetPeriodType.MONTHLY,
        entity_ids: [entity1Id] // Use entity_ids directly as that's what the schema expects
      });
      
      console.log('✅ createConsolidationGroup test passed');
      passCount++;
      
      // Save group ID for later tests
      groupId = newGroup.id;
      
      // Verify that junction table entries were created
      const junctionEntries = await db.select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
        
      if (junctionEntries.length === 1 && junctionEntries[0].entityId === entity1Id) {
        console.log('✅ Junction table entries created properly');
        passCount++;
      } else {
        console.log('❌ Junction table entries not created properly');
        failCount++;
      }
    } catch (error) {
      console.error('❌ createConsolidationGroup test failed:', error);
      failCount++;
    }
    
    if (!groupId) {
      throw new Error('Group creation failed, cannot continue with tests');
    }
    
    console.log('Verifying addEntityToConsolidationGroup...');
    try {
      // Test Step 2: Add another entity to the group
      await addEntityToConsolidationGroup(groupId, entity2Id);
      
      // Verify both approaches were updated correctly
      const group = await db.query.consolidationGroups.findFirst({
        where: eq(consolidationGroups.id, groupId)
      });
      
      const junctionEntries = await db.select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
        
      if (
        group && 
        group.entity_ids && 
        group.entity_ids.includes(entity1Id) && 
        group.entity_ids.includes(entity2Id) &&
        junctionEntries.length === 2
      ) {
        console.log('✅ addEntityToConsolidationGroup test passed');
        passCount++;
      } else {
        console.log('❌ addEntityToConsolidationGroup test failed: data inconsistency');
        failCount++;
      }
    } catch (error) {
      console.error('❌ addEntityToConsolidationGroup test failed:', error);
      failCount++;
    }
    
    console.log('Verifying getConsolidationGroupEntities...');
    try {
      // Test Step 3: Get entities in the group
      const entityIds = await getConsolidationGroupEntities(groupId);
      
      // Should return both entity IDs
      if (
        entityIds.includes(entity1Id) && 
        entityIds.includes(entity2Id) && 
        entityIds.length === 2
      ) {
        console.log('✅ getConsolidationGroupEntities test passed');
        passCount++;
      } else {
        console.log('❌ getConsolidationGroupEntities test failed');
        failCount++;
      }
    } catch (error) {
      console.error('❌ getConsolidationGroupEntities test failed:', error);
      failCount++;
    }
    
    console.log('Verifying getEntityConsolidationGroups...');
    try {
      // Test Step 4: Get groups that entity1 belongs to
      const groups = await getEntityConsolidationGroups(entity1Id);
      
      // Should return the one group we created
      if (groups.length === 1 && groups[0].id === groupId) {
        console.log('✅ getEntityConsolidationGroups test passed');
        passCount++;
      } else {
        console.log('❌ getEntityConsolidationGroups test failed');
        failCount++;
      }
    } catch (error) {
      console.error('❌ getEntityConsolidationGroups test failed:', error);
      failCount++;
    }
    
    console.log('Verifying removeEntityFromConsolidationGroup...');
    try {
      // Test Step 5: Remove an entity from the group
      await removeEntityFromConsolidationGroup(groupId, entity1Id);
      
      // Verify both approaches were updated correctly
      const group = await db.query.consolidationGroups.findFirst({
        where: eq(consolidationGroups.id, groupId)
      });
      
      const junctionEntries = await db.select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
        
      if (
        group && 
        group.entity_ids && 
        !group.entity_ids.includes(entity1Id) && 
        group.entity_ids.includes(entity2Id) &&
        junctionEntries.length === 1 &&
        junctionEntries[0].entityId === entity2Id
      ) {
        console.log('✅ removeEntityFromConsolidationGroup test passed');
        passCount++;
      } else {
        console.log('❌ removeEntityFromConsolidationGroup test failed: data inconsistency');
        failCount++;
      }
    } catch (error) {
      console.error('❌ removeEntityFromConsolidationGroup test failed:', error);
      failCount++;
    }
    
    console.log('Verifying generateConsolidatedReport...');
    try {
      // Test Step 6: Generate a report
      const report = await generateConsolidatedReport(
        groupId, 
        ReportType.BALANCE_SHEET, 
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        new Date()
      );
      
      if (
        report && 
        report.groupId === groupId && 
        report.reportType === ReportType.BALANCE_SHEET &&
        Array.isArray(report.entities)
      ) {
        console.log('✅ generateConsolidatedReport test passed');
        passCount++;
      } else {
        console.log('❌ generateConsolidatedReport test failed');
        failCount++;
      }
    } catch (error) {
      console.error('❌ generateConsolidatedReport test failed:', error);
      failCount++;
    }
    
    console.log('Verifying updateConsolidationGroup...');
    try {
      // Test Step 7: Update the group
      const updatedName = 'Updated Consolidation Group';
      await updateConsolidationGroup(groupId, {
        name: updatedName,
        description: 'Updated description'
      });
      
      // Verify the update worked
      const group = await db.query.consolidationGroups.findFirst({
        where: eq(consolidationGroups.id, groupId)
      });
      
      if (group && group.name === updatedName) {
        console.log('✅ updateConsolidationGroup test passed');
        passCount++;
      } else {
        console.log('❌ updateConsolidationGroup test failed');
        failCount++;
      }
    } catch (error) {
      console.error('❌ updateConsolidationGroup test failed:', error);
      failCount++;
    }
    
    console.log('Verifying deleteConsolidationGroup (soft delete)...');
    try {
      // Test Step 8: Delete the group (soft delete)
      await deleteConsolidationGroup(groupId);
      
      // Verify the soft delete worked
      const group = await db.query.consolidationGroups.findFirst({
        where: eq(consolidationGroups.id, groupId)
      });
      
      // Junction table entries should still exist
      const junctionEntries = await db.select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
        
      if (group && group.isActive === false && junctionEntries.length > 0) {
        console.log('✅ deleteConsolidationGroup (soft delete) test passed');
        passCount++;
      } else {
        console.log('❌ deleteConsolidationGroup (soft delete) test failed');
        failCount++;
      }
    } catch (error) {
      console.error('❌ deleteConsolidationGroup test failed:', error);
      failCount++;
    }
    
    // Test error handling
    console.log('Verifying error handling for invalid group ID...');
    try {
      // Test Step 9: Try to get entities for a non-existent group
      await getConsolidationGroupEntities(999999);
      console.log('❌ Error handling test failed: should have thrown NotFoundError');
      failCount++;
    } catch (error) {
      if (error instanceof NotFoundError) {
        console.log('✅ Error handling test passed: correctly threw NotFoundError');
        passCount++;
      } else {
        console.log('❌ Error handling test failed: threw wrong error type');
        failCount++;
      }
    }
    
  } finally {
    // Clean up test data
    console.log('Cleaning up test data...');
    await teardownTestData(userId, entity1Id, entity2Id, groupId);
  }
  
  // Print test summary
  console.log('\n--- Test Results ---');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${passCount + failCount}`);
  
  if (failCount === 0) {
    console.log('\n✅ All consolidation group methods tests passed!');
  } else {
    console.log(`\n❌ ${failCount} tests failed.`);
  }
}

// Run tests
verifyImprovedImplementation()
  .then(() => {
    console.log('Verification complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('An error occurred during verification:', error);
    process.exit(1);
  });