/**
 * Test script for consolidation group database operations
 */
import { db } from '../server/db';
import { ReportType, consolidationGroups } from '../shared/schema';
import { DatabaseStorage } from '../server/storage';
import { eq, sql } from 'drizzle-orm';

// Create a temporary storage instance for testing
const storage = new DatabaseStorage();

async function testConsolidationGroups() {
  try {
    console.log('Testing consolidation group database operations...');
    
    // Use a fixed test user and entity IDs for testing
    const testUserId = 1; // Typically admin user
    const testEntityId1 = 1;
    const testEntityId2 = 2;
    
    console.log(`Using test user ID: ${testUserId}`);
    console.log(`Using test entity IDs: ${testEntityId1} and ${testEntityId2}`);
    
    // Create a test consolidation group
    const newGroup = await storage.createConsolidationGroup({
      name: 'Test Consolidation Group',
      description: 'Created for testing',
      ownerId: testUserId,
      createdBy: testUserId,
      entityIds: [testEntityId1],
      startDate: new Date(),
      endDate: new Date(),
      periodType: 'monthly',
      isActive: true,
      currency: 'USD'
    });
    
    console.log('Created test consolidation group:', newGroup);
    
    // Get the created group
    const retrievedGroup = await storage.getConsolidationGroup(newGroup.id);
    console.log('Retrieved group:', retrievedGroup);
    
    // Add another entity
    const updatedGroup = await storage.addEntityToConsolidationGroup(newGroup.id, testEntityId2);
    console.log('Added entity to group:', updatedGroup);
    
    // Get all groups for user
    const userGroups = await storage.getConsolidationGroupsByUser(testUserId);
    console.log('User groups:', userGroups);
    
    // Get groups by entity
    const entityGroups = await storage.getConsolidationGroupsByEntity(testEntityId1);
    console.log('Entity groups:', entityGroups);
    
    // Update a group
    const updatedGroupInfo = await storage.updateConsolidationGroup(newGroup.id, {
      name: 'Updated Group Name',
      description: 'Updated description'
    });
    console.log('Updated group:', updatedGroupInfo);
    
    // Try to generate a report (may fail if no accounting data exists)
    try {
      const report = await storage.generateConsolidatedReport(newGroup.id, ReportType.BALANCE_SHEET);
      console.log('Generated report:', report);
    } catch (error) {
      console.log('Report generation failed (expected if no accounting data):', error.message);
    }
    
    // Remove entity from group
    const groupAfterRemoval = await storage.removeEntityFromConsolidationGroup(newGroup.id, testEntityId2);
    console.log('Group after entity removal:', groupAfterRemoval);
    
    // Delete the test group
    await storage.deleteConsolidationGroup(newGroup.id);
    console.log('Deleted test group');
    
    const deletedGroup = await storage.getConsolidationGroup(newGroup.id);
    console.log('Group after deletion:', deletedGroup);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testConsolidationGroups();