/**
 * This script checks the database schema and directly verifies industry column values
 */
import { Client } from 'pg';

async function checkDatabaseSchema() {
  try {
    // Connect to the database using the connection string from environment variables
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    console.log("Connected to database successfully");
    
    // Check the entities table schema
    console.log("\n------ ENTITY TABLE SCHEMA CHECK ------");
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'entities'
      AND column_name = 'industry';
    `;
    
    const schemaResult = await client.query(schemaQuery);
    console.log("Industry column definition:", schemaResult.rows);
    
    // Count entities with industry values
    console.log("\n------ ENTITY INDUSTRY VALUES CHECK ------");
    const industryQuery = `
      SELECT id, name, industry, code
      FROM entities
      ORDER BY id DESC
      LIMIT 10;
    `;
    
    const industryResult = await client.query(industryQuery);
    console.log("Recent entities with industry values:", 
      industryResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        code: row.code,
        industry: row.industry || '(null)'
      }))
    );
    
    // Count by industry value
    const countQuery = `
      SELECT industry, COUNT(*) as count
      FROM entities
      GROUP BY industry
      ORDER BY count DESC;
    `;
    
    const countResult = await client.query(countQuery);
    console.log("\nIndustry value distribution:", countResult.rows);
    
    // Close the connection
    await client.end();
    console.log("\nDatabase connection closed");
    
  } catch (error) {
    console.error("Error checking database schema:", error);
  }
}

// Execute the checks
checkDatabaseSchema();