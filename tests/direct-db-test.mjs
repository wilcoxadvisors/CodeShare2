/**
 * Direct database test for Chart of Accounts seeding
 * 
 * This test bypasses API authentication by directly checking the database
 * for properly seeded Chart of Accounts after client creation
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database connection from environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Get clients created in the last minute
 */
async function getRecentClients() {
  try {
    const query = `
      SELECT * FROM clients 
      WHERE created_at > NOW() - INTERVAL '5 minutes'
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting recent clients:', error.message);
    return [];
  }
}

/**
 * Get accounts for a specific client
 */
async function getClientAccounts(clientId) {
  try {
    const query = `
      SELECT * FROM accounts
      WHERE client_id = $1;
    `;
    
    const result = await pool.query(query, [clientId]);
    return result.rows;
  } catch (error) {
    console.error(`Error getting accounts for client ${clientId}:`, error.message);
    return [];
  }
}

/**
 * Verify that a client has properly seeded Chart of Accounts
 */
async function verifyClientAccounts(clientId, clientName) {
  console.log(`\nVerifying accounts for client: ${clientName} (ID: ${clientId})`);
  
  // Get accounts for this client
  const accounts = await getClientAccounts(clientId);
  
  if (accounts.length < 10) {
    console.error(`❌ FAILED: Client ${clientName} has only ${accounts.length} accounts`);
    return false;
  }
  
  console.log(`✅ Found ${accounts.length} accounts for client ${clientName}`);
  
  // Check for essential account types
  const accountTypes = new Set(accounts.map(a => a.type));
  const expectedTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
  const missingTypes = expectedTypes.filter(type => !accountTypes.has(type));
  
  if (missingTypes.length > 0) {
    console.error(`❌ FAILED: Missing account types: ${missingTypes.join(', ')}`);
    return false;
  }
  
  console.log('✅ All required account types are present');
  
  // Check for parent-child relationships
  const hasParentRelationships = accounts.some(a => a.parent_id !== null);
  if (!hasParentRelationships) {
    console.error("❌ FAILED: No parent-child relationships found");
    return false;
  }
  
  console.log('✅ Parent-child relationships exist in the account structure');
  
  // Verify essential account codes
  const accountCodes = new Set(accounts.map(a => a.account_code));
  const essentialCodes = ['1000', '2000', '3000', '4000', '5000']; // Basic codes for main categories
  const missingCodes = essentialCodes.filter(code => !accountCodes.has(code));
  
  if (missingCodes.length > 0) {
    console.error(`❌ FAILED: Missing essential account codes: ${missingCodes.join(', ')}`);
    return false;
  }
  
  console.log('✅ All essential account codes are present');
  
  // Success
  console.log(`✅ Chart of Accounts properly seeded for client ${clientName}`);
  return true;
}

/**
 * Main test function
 */
async function runDirectTest() {
  console.log("====== DIRECT DATABASE COA SEEDING VERIFICATION ======\n");
  console.log("Checking recently created clients for Chart of Accounts seeding...");
  
  try {
    // Get recent clients
    const recentClients = await getRecentClients();
    
    if (recentClients.length === 0) {
      console.error("❌ No recent clients found. Please create test clients first.");
      return false;
    }
    
    console.log(`Found ${recentClients.length} recently created clients`);
    
    // Test each recent client
    let allPassed = true;
    for (const client of recentClients) {
      const clientPassed = await verifyClientAccounts(client.id, client.name);
      allPassed = allPassed && clientPassed;
    }
    
    // Overall result
    console.log("\n====== TEST SUMMARY ======");
    console.log(`Overall result: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return allPassed;
  } catch (error) {
    console.error("Test error:", error.message);
    return false;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the test
runDirectTest()
  .then(success => {
    console.log(`\nTest completed ${success ? 'successfully' : 'with failures'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Fatal test error:", error);
    process.exit(1);
  });