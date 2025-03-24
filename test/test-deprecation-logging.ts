/**
 * Migration complete: This test script is now obsolete
 * 
 * This script previously tested deprecation warnings for entity_ids usage,
 * but since we've fully migrated to the junction table approach and 
 * removed the entity_ids column, these tests are no longer relevant.
 * 
 * The file is kept for historical documentation purposes.
 */

import {
  createConsolidationGroup,
  addEntityToConsolidationGroup,
  removeEntityFromConsolidationGroup,
  getConsolidationGroupEntities,
  getEntityConsolidationGroups,
  deleteConsolidationGroup
} from "../server/consolidation-group-methods";
import { db } from "../server/db";
import { users, entities, consolidationGroupEntities, UserRole } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * A validation test to confirm junction table functionality
 * This replaces the previous deprecation logging tests
 */
async function testJunctionTableFunctionality() {
  try {
    console.log("Starting junction table functionality test...");
    
    // Setup test data
    // Create test user
    const [user] = await db.insert(users)
      .values({
        username: "testuser_junction",
        password: "password123",
        email: "testuser_junction@example.com",
        name: "Test User",
        role: UserRole.ADMIN,
        active: true,
        createdAt: new Date()
      })
      .returning();
    
    // Create test entities
    const [entity1] = await db.insert(entities)
      .values([{
        name: "Test Entity 1 Junction",
        code: "TE1J",
        ownerId: user.id,
        active: true,
        createdAt: new Date()
      }])
      .returning();
    
    const [entity2] = await db.insert(entities)
      .values([{
        name: "Test Entity 2 Junction",
        code: "TE2J",
        ownerId: user.id,
        active: true,
        createdAt: new Date()
      }])
      .returning();
      
    console.log("Test data setup complete.");
    
    // Test 1: Create consolidation group with initialEntityId
    console.log("\nTest 1: Create consolidation group with initialEntityId");
    const group = await createConsolidationGroup({
      name: "Junction Test Group",
      description: "Test group for junction table",
      ownerId: user.id,
      initialEntityId: entity1.id, // Using initialEntityId instead of entity_ids
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdBy: user.id
    });
    
    console.log(`Created group: ${group.id}`);
    
    // Verify entity was added to junction table
    const initialEntities = await db.select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, group.id));
      
    if (initialEntities.length === 1 && initialEntities[0].entityId === entity1.id) {
      console.log("✅ Test 1 passed: Entity correctly added to junction table on group creation");
    } else {
      console.log("❌ Test 1 failed: Entity not properly added to junction table");
      console.log("Found entities:", initialEntities);
    }
    
    // Test 2: Add entity to group
    console.log("\nTest 2: Add entity to group");
    
    await addEntityToConsolidationGroup(group.id, entity2.id);
    
    // Verify both entities are in junction table
    const entitiesAfterAdd = await db.select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, group.id));
      
    const entityIds = entitiesAfterAdd.map(e => e.entityId);
    
    if (entitiesAfterAdd.length === 2 && 
        entityIds.includes(entity1.id) && 
        entityIds.includes(entity2.id)) {
      console.log("✅ Test 2 passed: Second entity successfully added to junction table");
    } else {
      console.log("❌ Test 2 failed: Second entity not properly added");
      console.log("Found entities:", entitiesAfterAdd);
    }
    
    // Test 3: Get entities for group
    console.log("\nTest 3: Get entities for group");
    
    const groupEntities = await getConsolidationGroupEntities(group.id);
    
    if (groupEntities.length === 2 && 
        groupEntities.includes(entity1.id) && 
        groupEntities.includes(entity2.id)) {
      console.log("✅ Test 3 passed: getConsolidationGroupEntities returns correct entities");
    } else {
      console.log("❌ Test 3 failed: getConsolidationGroupEntities returned incorrect results");
      console.log("Returned entities:", groupEntities);
    }
    
    // Test 4: Remove entity from group
    console.log("\nTest 4: Remove entity from group");
    
    await removeEntityFromConsolidationGroup(group.id, entity1.id);
    
    // Verify entity was removed
    const entitiesAfterRemove = await db.select()
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, group.id));
      
    if (entitiesAfterRemove.length === 1 && entitiesAfterRemove[0].entityId === entity2.id) {
      console.log("✅ Test 4 passed: Entity successfully removed from junction table");
    } else {
      console.log("❌ Test 4 failed: Entity not properly removed");
      console.log("Found entities:", entitiesAfterRemove);
    }
    
    // Test 5: Get groups for entity
    console.log("\nTest 5: Get groups for entity");
    
    const entityGroups = await getEntityConsolidationGroups(entity2.id);
    
    if (entityGroups.length === 1 && entityGroups[0].id === group.id) {
      console.log("✅ Test 5 passed: getEntityConsolidationGroups returns correct groups");
    } else {
      console.log("❌ Test 5 failed: getEntityConsolidationGroups returned incorrect results");
      console.log("Returned groups:", entityGroups);
    }
    
    // Cleanup
    await deleteConsolidationGroup(group.id);
    
    // Delete junction table entries first to avoid foreign key constraints
    await db.delete(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.entityId, entity1.id));
      
    await db.delete(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.entityId, entity2.id));
      
    await db.delete(entities).where(eq(entities.id, entity1.id));
    await db.delete(entities).where(eq(entities.id, entity2.id));
    await db.delete(users).where(eq(users.id, user.id));
    
    console.log("\nJunction table functionality test completed.");
    
  } catch (error) {
    console.error("Error in testing junction table functionality:", error);
  }
}

testJunctionTableFunctionality().catch(console.error);