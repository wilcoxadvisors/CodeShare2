/**
 * Test Entity Creation with Industry Field Using Drizzle ORM
 * 
 * This script tests direct Drizzle ORM interactions with the entities table
 * to ensure industry field can be correctly saved.
 */

// Import PostgreSQL client and setup connection pool
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { sql } = require('drizzle-orm');
const schema = require('../../shared/schema');

// Create a connection to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create a Drizzle instance
const db = drizzle(pool, { schema });
const { entities } = schema;

// Log section utility
function logSection(title) {
  console.log('\n' + '='.repeat(50));
  console.log(title);
  console.log('='.repeat(50));
}

async function cleanupTestEntities(testPrefix) {
  logSection('CLEANING UP TEST ENTITIES');
  
  try {
    // Delete any entities created by this test
    const result = await db.execute(
      sql`DELETE FROM entities WHERE name LIKE ${testPrefix + '%'} RETURNING id, name, industry`
    );
    
    if (result.rows && result.rows.length > 0) {
      console.log(`Deleted ${result.rows.length} test entities:`);
      result.rows.forEach(entity => {
        console.log(`- ID: ${entity.id}, Name: ${entity.name}, Industry: ${entity.industry}`);
      });
    } else {
      console.log('No test entities to delete');
    }
  } catch (error) {
    console.error('Error cleaning up test entities:', error);
  }
}

async function createTestEntityWithIndustry(name, industryValue) {
  logSection(`CREATING TEST ENTITY: ${name}`);
  
  try {
    // For clarity, log what we're trying to insert
    console.log(`Inserting entity with industry value: ${industryValue} (${typeof industryValue})`);
    
    // Create timestamp for created_at field
    const now = new Date();
    
    // Insert the entity using Drizzle ORM directly
    const insertResult = await db
      .insert(entities)
      .values({
        name,
        code: name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000),
        ownerId: 1,
        clientId: 1,
        active: true,
        fiscalYearStart: '01-01',
        fiscalYearEnd: '12-31',
        industry: industryValue, // This is what we're testing
        createdAt: now,
        updatedAt: now,
        currency: 'USD'
      })
      .returning();
    
    if (insertResult && insertResult.length > 0) {
      const entity = insertResult[0];
      console.log('Entity created successfully:', {
        id: entity.id,
        name: entity.name,
        industry: entity.industry
      });
      console.log(`Industry value stored: "${entity.industry}" (${typeof entity.industry})`);
      
      return entity;
    } else {
      throw new Error('No result returned from entity insertion');
    }
  } catch (error) {
    console.error('Error creating entity:', error);
    return null;
  }
}

async function getEntityById(id) {
  logSection(`FETCHING ENTITY: ID ${id}`);
  
  try {
    const [entity] = await db
      .select()
      .from(entities)
      .where(sql`id = ${id}`);
    
    if (entity) {
      console.log('Found entity:', {
        id: entity.id,
        name: entity.name,
        industry: entity.industry
      });
      console.log(`Industry value: "${entity.industry}" (${typeof entity.industry})`);
      
      return entity;
    } else {
      console.log(`No entity found with ID ${id}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching entity:', error);
    return null;
  }
}

async function runTest() {
  const testPrefix = 'DrmTest_' + Date.now().toString().substring(0, 6) + '_';
  
  try {
    logSection('STARTING DRIZZLE ORM ENTITY CREATION TEST');
    
    // Test cases for different industry values
    const testCases = [
      { name: testPrefix + 'String_Value', industry: 'tech' },
      { name: testPrefix + 'Numeric_Value', industry: '123' },
      { name: testPrefix + 'Empty_String', industry: '' },
      { name: testPrefix + 'Null_Value', industry: null }
    ];
    
    const createdEntities = [];
    
    // Create test entities
    for (const testCase of testCases) {
      const entity = await createTestEntityWithIndustry(testCase.name, testCase.industry);
      if (entity) {
        createdEntities.push({
          entity,
          originalValue: testCase.industry
        });
        
        // Verify the entity can be fetched
        await getEntityById(entity.id);
      }
    }
    
    // Summary
    logSection('TEST RESULTS SUMMARY');
    console.log('Created entities:');
    
    for (let i = 0; i < createdEntities.length; i++) {
      const { entity, originalValue } = createdEntities[i];
      const expectedValue = originalValue === null || originalValue === '' ? null : originalValue;
      
      console.log(`Entity #${i+1}: ${entity.name}`);
      console.log(`  - Original industry: ${originalValue === null ? 'null' : `"${originalValue}"`} (${typeof originalValue})`);
      console.log(`  - Expected industry: ${expectedValue === null ? 'null' : `"${expectedValue}"`}`);
      console.log(`  - Actual industry: ${entity.industry === null ? 'null' : `"${entity.industry}"`}`);
      
      // In Drizzle ORM, empty strings might be stored as null in the database
      const isMatch = (entity.industry === expectedValue) || 
                    (expectedValue === '' && entity.industry === null);
      
      console.log(`  - Result: ${isMatch ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    // Clean up test entities
    await cleanupTestEntities(testPrefix);
    
    console.log('\nTest completed.');
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
runTest();