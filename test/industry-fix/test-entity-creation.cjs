/**
 * Entity Creation Test with Industry Field
 * 
 * This script tests the entity creation workflow with industry field,
 * using the same direct SQL approach we implemented in storage.ts
 */

// Import the PostgreSQL client
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

async function createEntity(entityData) {
  logSection(`CREATING ENTITY: ${entityData.name}`);
  
  // Process industry data for consistency
  let industryValue = entityData.industry;
  
  // Handle null/empty values
  if (industryValue === null || industryValue === '' || industryValue === undefined) {
    console.log("Empty/null industry provided, defaulting to 'other'");
    industryValue = 'other';
  } else {
    // Ensure industry is stored as string regardless of input type
    console.log(`Converting industry value "${industryValue}" (${typeof industryValue}) to string for storage consistency`);
    industryValue = String(industryValue);
  }
  
  console.log(`Final industry value to be stored: "${industryValue}"`);
  
  try {
    // Create timestamp for created_at field
    const now = new Date();
    
    // Build the SQL query to explicitly include all necessary fields
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
      entityData.name,
      entityData.code || entityData.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000),
      entityData.ownerId || 1,
      entityData.clientId || 1,
      entityData.active ?? true,
      entityData.fiscalYearStart ?? "01-01",
      entityData.fiscalYearEnd ?? "12-31",
      industryValue, // Explicitly include processed industry value
      now, // created_at
      now, // updated_at
      entityData.currency ?? "USD"
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
      
      // Now use select to verify what was stored
      await getEntityById(entity.id);
      
      return entity;
    } else {
      throw new Error("Entity creation failed - no result returned from insertion");
    }
  } catch (error) {
    console.error("Error creating entity:", error);
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

async function runTest() {
  const testPrefix = 'TestEntity_' + Date.now().toString().substring(0, 6) + '_';
  
  try {
    logSection('STARTING ENTITY CREATION TEST');
    
    // Test cases for different industry values
    const testCases = [
      { name: testPrefix + 'String_Value', industry: 'tech' },
      { name: testPrefix + 'Numeric_Value', industry: 123 },
      { name: testPrefix + 'Empty_String', industry: '' },
      { name: testPrefix + 'Null_Value', industry: null },
      { name: testPrefix + 'Other_Value', industry: 'other' }
    ];
    
    // Create test entities
    for (const testCase of testCases) {
      await createEntity(testCase);
    }
    
    // Cleanup test entities
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