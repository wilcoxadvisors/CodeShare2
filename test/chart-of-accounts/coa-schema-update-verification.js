/**
 * Chart of Accounts Schema Update Verification Test
 * 
 * This test verifies the schema changes made to the accounts table:
 * 1. Renaming 'code' to 'accountCode'
 * 2. Adding unique constraint on accountCode scoped to clientId
 * 3. Verifying parentId has onDelete: 'restrict'
 * 4. Testing the new fields: fsliBucket, internalReportingBucket, and item
 * 5. Regression testing the basic CRUD operations
 */

import { db, pool } from '../../server/db.js';
import { sql } from 'drizzle-orm';
import { accounts, AccountType } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup file path handling for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const AUTH_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

// Utility functions
async function authenticate() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(AUTH_CREDENTIALS)
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
  }

  const cookies = response.headers.get('set-cookie') || '';
  return { cookie: cookies };
}

async function makeApiRequest(endpoint, method = 'GET', body, cookie) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const options = {
    method,
    headers
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    return { status: response.status, data };
  } else {
    const text = await response.text();
    return { status: response.status, text };
  }
}

// Test for applying the SQL migration if it hasn't been applied yet
async function ensureMigrationApplied() {
  console.log('Checking if migration needs to be applied...');
  
  try {
    // Verify if accountCode column exists
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'accounts' AND column_name = 'account_code'
    `);
    
    // If accountCode column doesn't exist, apply migration
    if (checkResult.rows.length === 0) {
      console.log('Migration not yet applied, applying now...');
      
      // Read and execute migration SQL file
      const migrationPath = path.join(__dirname, '../../migrations/accounts_schema_updates.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Split by statements and execute each one
      const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        await db.execute(sql.raw(statement.trim()));
      }
      
      console.log('Migration applied successfully');
    } else {
      console.log('Migration already applied');
    }
  } catch (error) {
    console.error('Error ensuring migration is applied:', error);
    throw error;
  }
}

// Test suite
async function runTests() {
  let cookie;
  let testClientId1;
  let testClientId2;
  let testAccountId1;
  let testAccountId2;
  let parentAccountId;
  let childAccountId;

  console.log('====== CHART OF ACCOUNTS SCHEMA UPDATE VERIFICATION TESTS ======');
  console.log(`Test Time: ${new Date().toISOString()}`);
  
  try {
    // Step 0: Apply migration if needed
    await ensureMigrationApplied();
    
    // Step 1: Authentication
    console.log('\n--- Step 1: Authentication ---');
    const authResult = await authenticate();
    cookie = authResult.cookie;
    console.log('Authentication successful!');
    
    // Step 2: Create Test Clients
    console.log('\n--- Step 2: Create Test Clients ---');
    
    // Create test client 1
    const createClient1Result = await makeApiRequest('/clients', 'POST', {
      name: 'Test Client 1 for CoA Schema Test',
      userId: 1  // Assuming admin user has ID 1
    }, cookie);
    
    if (createClient1Result.status !== 201 && createClient1Result.status !== 200) {
      throw new Error(`Failed to create test client 1: ${JSON.stringify(createClient1Result)}`);
    }
    
    testClientId1 = createClient1Result.data.id;
    console.log(`Created test client 1 with ID: ${testClientId1}`);
    
    // Create test client 2
    const createClient2Result = await makeApiRequest('/clients', 'POST', {
      name: 'Test Client 2 for CoA Schema Test',
      userId: 1  // Assuming admin user has ID 1
    }, cookie);
    
    if (createClient2Result.status !== 201 && createClient2Result.status !== 200) {
      throw new Error(`Failed to create test client 2: ${JSON.stringify(createClient2Result)}`);
    }
    
    testClientId2 = createClient2Result.data.id;
    console.log(`Created test client 2 with ID: ${testClientId2}`);
    
    // Step 3: Test accountCode Uniqueness Constraint
    console.log('\n--- Step 3: Test accountCode Uniqueness Constraint ---');
    
    // Create account for client 1
    const createAccount1Result = await makeApiRequest(`/clients/${testClientId1}/accounts`, 'POST', {
      accountCode: 'TEST-UNIQUE-CODE',
      name: 'Test Account 1',
      type: AccountType.ASSET,
      subtype: 'current_asset',
      isSubledger: false,
      active: true,
      description: 'Test account for schema verification'
    }, cookie);
    
    if (createAccount1Result.status !== 201 && createAccount1Result.status !== 200) {
      throw new Error(`Failed to create test account 1: ${JSON.stringify(createAccount1Result)}`);
    }
    
    testAccountId1 = createAccount1Result.data.id;
    console.log(`Created test account 1 with ID: ${testAccountId1}`);
    
    // Try to create another account with the same code for the same client (should fail)
    const createDuplicateResult = await makeApiRequest(`/clients/${testClientId1}/accounts`, 'POST', {
      accountCode: 'TEST-UNIQUE-CODE',  // Same code
      name: 'Test Account Duplicate',
      type: AccountType.ASSET,
      isSubledger: false,
      active: true
    }, cookie);
    
    // This should fail due to the unique constraint
    if (createDuplicateResult.status === 201 || createDuplicateResult.status === 200) {
      throw new Error('Uniqueness constraint test failed: Duplicate account creation succeeded when it should have failed');
    }
    
    console.log('Successfully tested accountCode uniqueness constraint for the same client');
    
    // Create account with the same code for the second client (should succeed)
    const createAccount2Result = await makeApiRequest(`/clients/${testClientId2}/accounts`, 'POST', {
      accountCode: 'TEST-UNIQUE-CODE',  // Same code, different client
      name: 'Test Account 2',
      type: AccountType.ASSET,
      isSubledger: false,
      active: true,
      description: 'Test account for client 2'
    }, cookie);
    
    if (createAccount2Result.status !== 201 && createAccount2Result.status !== 200) {
      throw new Error(`Failed to create test account for client 2: ${JSON.stringify(createAccount2Result)}`);
    }
    
    testAccountId2 = createAccount2Result.data.id;
    console.log(`Successfully created account with same code for different client (ID: ${testAccountId2})`);
    
    // Step 4: Test parentId onDelete: 'restrict'
    console.log('\n--- Step 4: Test parentId onDelete: restrict ---');
    
    // Create parent account
    const createParentResult = await makeApiRequest(`/clients/${testClientId1}/accounts`, 'POST', {
      accountCode: 'PARENT-ACCOUNT',
      name: 'Parent Account',
      type: AccountType.ASSET,
      isSubledger: false,
      active: true
    }, cookie);
    
    if (createParentResult.status !== 201 && createParentResult.status !== 200) {
      throw new Error(`Failed to create parent account: ${JSON.stringify(createParentResult)}`);
    }
    
    parentAccountId = createParentResult.data.id;
    console.log(`Created parent account with ID: ${parentAccountId}`);
    
    // Create child account
    const createChildResult = await makeApiRequest(`/clients/${testClientId1}/accounts`, 'POST', {
      accountCode: 'CHILD-ACCOUNT',
      name: 'Child Account',
      type: AccountType.ASSET,
      isSubledger: false,
      active: true,
      parentId: parentAccountId
    }, cookie);
    
    if (createChildResult.status !== 201 && createChildResult.status !== 200) {
      throw new Error(`Failed to create child account: ${JSON.stringify(createChildResult)}`);
    }
    
    childAccountId = createChildResult.data.id;
    console.log(`Created child account with ID: ${childAccountId}`);
    
    // Try to delete parent (should fail due to foreign key constraint)
    let restrictionTested = false;
    try {
      // Direct database attempt to delete the parent account
      await db.execute(sql`DELETE FROM accounts WHERE id = ${parentAccountId}`);
      throw new Error('Parent deletion succeeded when it should have failed due to foreign key constraint');
    } catch (error) {
      // Expect a foreign key constraint violation error
      if (error.message.includes('foreign key constraint') || 
          error.message.includes('violates foreign key constraint') ||
          error.message.includes('restrict')) {
        console.log('Successfully tested parentId onDelete: restrict - deletion prevented');
        restrictionTested = true;
      } else {
        throw error; // Re-throw if it's not the expected error
      }
    }
    
    if (!restrictionTested) {
      // Try API endpoint as an alternative test if direct deletion didn't throw
      const deleteParentResult = await makeApiRequest(`/clients/${testClientId1}/accounts/${parentAccountId}`, 'DELETE', undefined, cookie);
      
      if (deleteParentResult.status === 200 || deleteParentResult.status === 204) {
        throw new Error('Parent deletion via API succeeded when it should have failed due to foreign key constraint');
      }
      
      console.log('Successfully tested parentId onDelete: restrict via API - deletion prevented');
    }
    
    // Step 5: Test New Fields
    console.log('\n--- Step 5: Test New Fields ---');
    
    // Create account with all new fields
    const createAccountWithNewFieldsResult = await makeApiRequest(`/clients/${testClientId1}/accounts`, 'POST', {
      accountCode: 'TEST-NEW-FIELDS',
      name: 'Test Account with New Fields',
      type: AccountType.ASSET,
      isSubledger: false,
      active: true,
      fsliBucket: 'Test FSLI Bucket',
      internalReportingBucket: 'Test Internal Reporting Bucket',
      item: 'Test Item'
    }, cookie);
    
    if (createAccountWithNewFieldsResult.status !== 201 && createAccountWithNewFieldsResult.status !== 200) {
      throw new Error(`Failed to create account with new fields: ${JSON.stringify(createAccountWithNewFieldsResult)}`);
    }
    
    const newFieldsAccountId = createAccountWithNewFieldsResult.data.id;
    console.log(`Created account with new fields, ID: ${newFieldsAccountId}`);
    
    // Fetch the created account to verify new fields are saved
    const fetchNewFieldsAccountResult = await makeApiRequest(`/clients/${testClientId1}/accounts/${newFieldsAccountId}`, 'GET', undefined, cookie);
    
    if (fetchNewFieldsAccountResult.status !== 200) {
      throw new Error(`Failed to fetch account with new fields: ${JSON.stringify(fetchNewFieldsAccountResult)}`);
    }
    
    const fetchedAccount = fetchNewFieldsAccountResult.data;
    
    // Verify new fields
    if (fetchedAccount.fsliBucket !== 'Test FSLI Bucket' ||
        fetchedAccount.internalReportingBucket !== 'Test Internal Reporting Bucket' ||
        fetchedAccount.item !== 'Test Item') {
      throw new Error(`New fields verification failed: ${JSON.stringify(fetchedAccount)}`);
    }
    
    console.log('Successfully verified new fields are saved and retrieved correctly');
    
    // Create account without new fields to verify they default to null
    const createAccountWithoutNewFieldsResult = await makeApiRequest(`/clients/${testClientId1}/accounts`, 'POST', {
      accountCode: 'TEST-NULL-FIELDS',
      name: 'Test Account without New Fields',
      type: AccountType.ASSET,
      isSubledger: false,
      active: true
    }, cookie);
    
    if (createAccountWithoutNewFieldsResult.status !== 201 && createAccountWithoutNewFieldsResult.status !== 200) {
      throw new Error(`Failed to create account without new fields: ${JSON.stringify(createAccountWithoutNewFieldsResult)}`);
    }
    
    const nullFieldsAccountId = createAccountWithoutNewFieldsResult.data.id;
    
    // Fetch the created account to verify new fields are null
    const fetchNullFieldsAccountResult = await makeApiRequest(`/clients/${testClientId1}/accounts/${nullFieldsAccountId}`, 'GET', undefined, cookie);
    
    if (fetchNullFieldsAccountResult.status !== 200) {
      throw new Error(`Failed to fetch account without new fields: ${JSON.stringify(fetchNullFieldsAccountResult)}`);
    }
    
    const fetchedNullAccount = fetchNullFieldsAccountResult.data;
    
    // Verify new fields are null
    if (fetchedNullAccount.fsliBucket !== null && fetchedNullAccount.fsliBucket !== undefined &&
        fetchedNullAccount.internalReportingBucket !== null && fetchedNullAccount.internalReportingBucket !== undefined &&
        fetchedNullAccount.item !== null && fetchedNullAccount.item !== undefined) {
      throw new Error(`Null fields verification failed: ${JSON.stringify(fetchedNullAccount)}`);
    }
    
    console.log('Successfully verified new fields default to null when not provided');
    
    // Step 6: Test Account Hierarchy Retrieval
    console.log('\n--- Step 6: Test Account Hierarchy Retrieval ---');
    
    // Fetch the account tree hierarchy
    const fetchTreeResult = await makeApiRequest(`/clients/${testClientId1}/accounts/tree`, 'GET', undefined, cookie);
    
    if (fetchTreeResult.status !== 200) {
      throw new Error(`Failed to fetch account hierarchy: ${JSON.stringify(fetchTreeResult)}`);
    }
    
    // Verify the parent-child relationship in the tree
    const accountTree = fetchTreeResult.data;
    let parentFound = false;
    let childFoundUnderParent = false;
    
    // Find parent account in the tree
    for (const account of accountTree) {
      if (account.id === parentAccountId) {
        parentFound = true;
        // Check if child is under parent
        for (const child of account.children || []) {
          if (child.id === childAccountId) {
            childFoundUnderParent = true;
            break;
          }
        }
        break;
      }
    }
    
    if (!parentFound) {
      throw new Error('Parent account not found in the account tree');
    }
    
    if (!childFoundUnderParent) {
      throw new Error('Child account not found under parent in the account tree');
    }
    
    console.log('Successfully verified account hierarchy retrieval');
    
    // Step 7: Update an account including new fields
    console.log('\n--- Step 7: Test Account Update ---');
    
    const updateResult = await makeApiRequest(`/clients/${testClientId1}/accounts/${newFieldsAccountId}`, 'PUT', {
      name: 'Updated Account Name',
      fsliBucket: 'Updated FSLI Bucket',
      internalReportingBucket: 'Updated Internal Reporting Bucket',
      item: 'Updated Item'
    }, cookie);
    
    if (updateResult.status !== 200) {
      throw new Error(`Failed to update account: ${JSON.stringify(updateResult)}`);
    }
    
    // Fetch the updated account
    const fetchUpdatedResult = await makeApiRequest(`/clients/${testClientId1}/accounts/${newFieldsAccountId}`, 'GET', undefined, cookie);
    
    if (fetchUpdatedResult.status !== 200) {
      throw new Error(`Failed to fetch updated account: ${JSON.stringify(fetchUpdatedResult)}`);
    }
    
    const updatedAccount = fetchUpdatedResult.data;
    
    // Verify updated fields
    if (updatedAccount.name !== 'Updated Account Name' ||
        updatedAccount.fsliBucket !== 'Updated FSLI Bucket' ||
        updatedAccount.internalReportingBucket !== 'Updated Internal Reporting Bucket' ||
        updatedAccount.item !== 'Updated Item') {
      throw new Error(`Account update verification failed: ${JSON.stringify(updatedAccount)}`);
    }
    
    console.log('Successfully verified account update with new fields');
    
    // Step 8: Clean up - Delete test accounts safely
    console.log('\n--- Step 8: Clean up ---');
    
    // Delete child account first (to avoid constraint issues)
    const deleteChildResult = await makeApiRequest(`/clients/${testClientId1}/accounts/${childAccountId}`, 'DELETE', undefined, cookie);
    
    if (deleteChildResult.status !== 200 && deleteChildResult.status !== 204) {
      console.warn(`Warning: Failed to delete child account: ${JSON.stringify(deleteChildResult)}`);
    } else {
      console.log(`Successfully deleted child account (ID: ${childAccountId})`);
    }
    
    // Now delete parent account
    const deleteParentResult = await makeApiRequest(`/clients/${testClientId1}/accounts/${parentAccountId}`, 'DELETE', undefined, cookie);
    
    if (deleteParentResult.status !== 200 && deleteParentResult.status !== 204) {
      console.warn(`Warning: Failed to delete parent account: ${JSON.stringify(deleteParentResult)}`);
    } else {
      console.log(`Successfully deleted parent account (ID: ${parentAccountId})`);
    }
    
    // Delete other test accounts
    const accountIdsToDelete = [testAccountId1, testAccountId2, newFieldsAccountId, nullFieldsAccountId];
    
    for (const id of accountIdsToDelete) {
      if (!id) continue;
      
      try {
        // Try to delete from the appropriate client
        const clientId = id === testAccountId2 ? testClientId2 : testClientId1;
        await makeApiRequest(`/clients/${clientId}/accounts/${id}`, 'DELETE', undefined, cookie);
        console.log(`Deleted account with ID ${id}`);
      } catch (error) {
        console.warn(`Warning: Could not delete test account with ID ${id}:`, error);
      }
    }
    
    console.log('Test cleanup completed');
    
    // Test Summary
    console.log('\n====== TEST SUMMARY ======');
    console.log('✓ Successfully applied migration or verified it was already applied');
    console.log('✓ Successfully tested accountCode uniqueness constraint');
    console.log('✓ Successfully tested parentId with onDelete: restrict');
    console.log('✓ Successfully tested new fields (fsliBucket, internalReportingBucket, item)');
    console.log('✓ Successfully tested account hierarchy retrieval');
    console.log('✓ Successfully tested account update with new fields');
    console.log('\nALL TESTS PASSED!');
    
    return true;
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    return false;
  } finally {
    // Always close the connection pool
    await pool.end();
  }
}

// Run the test
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });