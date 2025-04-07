/**
 * Test Direct SQL Entity Creation with Industry Field
 * 
 * This script tests direct SQL operations with the entities table
 * to ensure industry field can be correctly saved.
 */

const { Pool } = require('pg');

// Create a connection to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Log section utility
function logSection(title) {
  console.log('\n' + '='.repeat(50));
  console.log(title);
  console.log('='.repeat(50));
}

async function cleanup(testPrefix) {
  logSection('CLEANING UP TEST ENTITIES');
  
  try {
    // Delete any entities created by this test
    const result = await pool.query(
      'DELETE FROM entities WHERE name LIKE $1 RETURNING id, name, industry',
      [testPrefix + '%']
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
    
    // Build the SQL query
    const insertSql = `
      INSERT INTO entities (
        name, code, owner_id, client_id, active, 
        fiscal_year_start, fiscal_year_end, industry,
        created_at, updated_at, currency
      ) VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8,
        $9, $10, $11
      ) RETURNING *
    `;
    
    // Prepare parameters
    const params = [
      name,
      name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000),
      1, // owner_id
      1, // client_id
      true, // active
      '01-01', // fiscal_year_start
      '12-31', // fiscal_year_end
      industryValue, // industry - this is what we're testing
      now, // created_at
      now, // updated_at
      'USD' // currency
    ];
    
    // Execute the query
    const result = await pool.query(insertSql, params);
    
    if (result.rows && result.rows.length > 0) {
      const entity = result.rows[0];
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
    const result = await pool.query('SELECT * FROM entities WHERE id = $1', [id]);
    
    if (result.rows && result.rows.length > 0) {
      const entity = result.rows[0];
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
  const testPrefix = 'SQLTest_' + Date.now().toString().substring(0, 6) + '_';
  
  try {
    logSection('STARTING DIRECT SQL ENTITY CREATION TEST');
    
    // Test cases for different industry values
    const testCases = [
      { name: testPrefix + 'String_Value', industry: 'tech' },
      { name: testPrefix + 'Numeric_Value', industry: '123' },
      { name: testPrefix + 'Empty_String', industry: '' },
      { name: testPrefix + 'Null_Value', industry: null },
      { name: testPrefix + 'Other_Value', industry: 'other' }
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
      
      // In PostgreSQL, empty strings might be stored as null
      const expectedValue = originalValue === '' ? null : originalValue;
      
      console.log(`Entity #${i+1}: ${entity.name}`);
      console.log(`  - Original industry: ${originalValue === null ? 'null' : `"${originalValue}"`} (${typeof originalValue})`);
      console.log(`  - Expected industry: ${expectedValue === null ? 'null' : `"${expectedValue}"`}`);
      console.log(`  - Actual industry: ${entity.industry === null ? 'null' : `"${entity.industry}"`}`);
      
      // In PostgreSQL, empty strings might be stored as null in the database
      const isMatch = (entity.industry === expectedValue) || 
                     (expectedValue === '' && entity.industry === null);
      
      console.log(`  - Result: ${isMatch ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    // Clean up test entities
    await cleanup(testPrefix);
    
    console.log('\nTest completed.');
    
    // Close pool
    await pool.end();
  } catch (error) {
    console.error('Test error:', error);
    
    // Make sure to close the pool even if there's an error
    await pool.end();
  }
}

// Run the test
runTest();