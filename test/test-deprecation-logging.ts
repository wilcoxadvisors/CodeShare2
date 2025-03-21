/**
 * Test script for deprecation logging in consolidation group operations
 * 
 * This script verifies that appropriate deprecation warnings are logged
 * when entity_ids is accessed or modified.
 */

import {
  createConsolidationGroup,
  addEntityToConsolidationGroup,
  removeEntityFromConsolidationGroup,
  getConsolidationGroupEntities,
  getEntityConsolidationGroups,
  deleteConsolidationGroup,
  updateConsolidationGroup
} from "../server/consolidation-group-methods";
import { db } from "../server/db";
import { users, entities, consolidationGroups, consolidationGroupEntities } from "../shared/schema";
import { eq } from "drizzle-orm";

// Mock the logging functions to capture calls
const logCalls: {method: string, type: string, context?: any}[] = [];

// Override the real logging functions with our mocks that track calls
jest.mock("../shared/deprecation-logger", () => ({
  logEntityIdsDeprecation: (method: string, context?: any) => {
    console.log(`[MOCK] Deprecation warning: entity_ids in ${method}`);
    logCalls.push({method, type: 'deprecation', context});
  },
  
  logEntityIdsFallback: (method: string, context?: any) => {
    console.log(`[MOCK] Fallback to entity_ids in ${method}`);
    logCalls.push({method, type: 'fallback', context});
  },
  
  logEntityIdsUpdate: (method: string, context?: any) => {
    console.log(`[MOCK] Updating entity_ids in ${method}`);
    logCalls.push({method, type: 'update', context});
  }
}));

/**
 * Test the deprecation logging in consolidation group operations
 */
async function testDeprecationLogging() {
  try {
    console.log("Starting deprecation logging test...");
    
    // Clear log calls before starting
    logCalls.length = 0;
    
    // Setup test data
    // Create test user
    const [user] = await db.insert(users)
      .values({
        username: "testuser_deprecation",
        password: "password123",
        email: "testuser_deprecation@example.com",
        name: "Test User",
        role: "admin",
        active: true,
        createdAt: new Date()
      })
      .returning();
    
    // Create test entities
    const [entity1] = await db.insert(entities)
      .values({
        name: "Test Entity 1 Deprecation",
        legalName: "Test Entity 1 Legal Name",
        entityType: "company",
        ownerId: user.id,
        isActive: true,
        createdAt: new Date()
      })
      .returning();
    
    const [entity2] = await db.insert(entities)
      .values({
        name: "Test Entity 2 Deprecation",
        legalName: "Test Entity 2 Legal Name",
        entityType: "company",
        ownerId: user.id,
        isActive: true,
        createdAt: new Date()
      })
      .returning();
      
    console.log("Test data setup complete.");
    
    // Test 1: Create consolidation group with entity_ids
    console.log("\nTest 1: Create consolidation group with entity_ids");
    const group = await createConsolidationGroup({
      name: "Deprecation Test Group",
      description: "Test group for deprecation logging",
      ownerId: user.id,
      entity_ids: [entity1.id], // Directly using entity_ids should trigger deprecation warning
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdBy: user.id
    });
    
    console.log(`Created group: ${group.id}`);
    
    // Check log calls for Test 1
    console.log("Log calls after creation:", logCalls);
    const createDeprecationLogs = logCalls.filter(call => 
      call.method === 'createConsolidationGroup' && call.type === 'deprecation'
    );
    
    if (createDeprecationLogs.length > 0) {
      console.log("✅ Test 1 passed: Deprecation warning logged for createConsolidationGroup");
    } else {
      console.log("❌ Test 1 failed: No deprecation warning logged for createConsolidationGroup");
    }
    
    // Test 2: Add entity to group
    console.log("\nTest 2: Add entity to group");
    logCalls.length = 0; // Clear logs
    
    await addEntityToConsolidationGroup(group.id, entity2.id);
    
    // Check log calls for Test 2
    console.log("Log calls after adding entity:", logCalls);
    const addEntityUpdateLogs = logCalls.filter(call => 
      call.method === 'addEntityToConsolidationGroup' && call.type === 'update'
    );
    
    if (addEntityUpdateLogs.length > 0) {
      console.log("✅ Test 2 passed: Update log recorded for addEntityToConsolidationGroup");
    } else {
      console.log("❌ Test 2 failed: No update log for addEntityToConsolidationGroup");
    }
    
    // Test 3: Get entities for group
    console.log("\nTest 3: Get entities for group");
    
    // Delete junction table records to force fallback to entity_ids
    await db.delete(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, group.id));
    
    logCalls.length = 0; // Clear logs
    
    await getConsolidationGroupEntities(group.id);
    
    // Check log calls for Test 3
    console.log("Log calls after getting entities:", logCalls);
    const getEntitiesFallbackLogs = logCalls.filter(call => 
      call.method === 'getConsolidationGroupEntities' && call.type === 'fallback'
    );
    
    if (getEntitiesFallbackLogs.length > 0) {
      console.log("✅ Test 3 passed: Fallback log recorded for getConsolidationGroupEntities");
    } else {
      console.log("❌ Test 3 failed: No fallback log for getConsolidationGroupEntities");
    }
    
    // Test 4: Update consolidation group with direct entity_ids modification
    console.log("\nTest 4: Update group with direct entity_ids modification");
    logCalls.length = 0; // Clear logs
    
    await updateConsolidationGroup(group.id, {
      name: "Updated Deprecation Test Group",
      entity_ids: [entity1.id, entity2.id] // Direct update should trigger deprecation warning
    });
    
    // Check log calls for Test 4
    console.log("Log calls after updating group:", logCalls);
    const updateDeprecationLogs = logCalls.filter(call => 
      call.method === 'updateConsolidationGroup' && call.type === 'deprecation'
    );
    
    if (updateDeprecationLogs.length > 0) {
      console.log("✅ Test 4 passed: Deprecation warning logged for updateConsolidationGroup");
    } else {
      console.log("❌ Test 4 failed: No deprecation warning logged for updateConsolidationGroup");
    }
    
    // Test 5: Remove entity from group
    console.log("\nTest 5: Remove entity from group");
    
    // Recreate junction table entries for both entities
    await db.insert(consolidationGroupEntities)
      .values([
        { groupId: group.id, entityId: entity1.id },
        { groupId: group.id, entityId: entity2.id }
      ]);
    
    logCalls.length = 0; // Clear logs
    
    await removeEntityFromConsolidationGroup(group.id, entity2.id);
    
    // Check log calls for Test 5
    console.log("Log calls after removing entity:", logCalls);
    const removeEntityUpdateLogs = logCalls.filter(call => 
      call.method === 'removeEntityFromConsolidationGroup' && call.type === 'update'
    );
    
    if (removeEntityUpdateLogs.length > 0) {
      console.log("✅ Test 5 passed: Update log recorded for removeEntityFromConsolidationGroup");
    } else {
      console.log("❌ Test 5 failed: No update log for removeEntityFromConsolidationGroup");
    }
    
    // Test 6: Get groups for entity with fallback
    console.log("\nTest 6: Get groups for entity with fallback");
    
    // Delete junction table records to force fallback to entity_ids
    await db.delete(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, group.id));
    
    logCalls.length = 0; // Clear logs
    
    await getEntityConsolidationGroups(entity1.id);
    
    // Check log calls for Test 6
    console.log("Log calls after getting groups for entity:", logCalls);
    const getGroupsFallbackLogs = logCalls.filter(call => 
      call.method === 'getEntityConsolidationGroups' && call.type === 'fallback'
    );
    
    if (getGroupsFallbackLogs.length > 0) {
      console.log("✅ Test 6 passed: Fallback log recorded for getEntityConsolidationGroups");
    } else {
      console.log("❌ Test 6 failed: No fallback log for getEntityConsolidationGroups");
    }
    
    // Cleanup
    await deleteConsolidationGroup(group.id);
    await db.delete(entities).where(eq(entities.id, entity1.id));
    await db.delete(entities).where(eq(entities.id, entity2.id));
    await db.delete(users).where(eq(users.id, user.id));
    
    console.log("\nDeprecation logging test completed.");
    
    // Summary
    const testsPassed = [
      createDeprecationLogs.length > 0,
      addEntityUpdateLogs.length > 0,
      getEntitiesFallbackLogs.length > 0,
      updateDeprecationLogs.length > 0,
      removeEntityUpdateLogs.length > 0,
      getGroupsFallbackLogs.length > 0
    ].filter(passed => passed).length;
    
    console.log(`\nSummary: ${testsPassed}/6 tests passed.`);
    
  } catch (error) {
    console.error("Error in testing deprecation logging:", error);
  }
}

testDeprecationLogging().catch(console.error);