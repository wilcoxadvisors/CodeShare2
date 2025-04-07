/**
 * Entity and CoA Direct Fix Script (JavaScript version)
 * 
 * This script bypasses the API and TypeScript layers completely to:
 * 1. Connect directly to the PostgreSQL database
 * 2. Find clients that are missing entities
 * 3. Create default entities for them
 * 4. Seed the Chart of Accounts for clients without accounts
 * 
 * USAGE: node scripts/fix-entity-coa-seed.js
 */

import pg from 'pg';
const { Client } = pg;

// Connect to database using the DATABASE_URL environment variable
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Standard Chart of Accounts template data
const standardCoaAccounts = [
  // Assets (1xxx)
  { accountCode: '1', name: 'Assets', type: 'asset', description: 'Resources owned by the business that have economic value' },
  { accountCode: '1100', name: 'Current Assets', type: 'asset', description: 'Assets expected to be converted to cash or used within one year' },
  { accountCode: '1110', name: 'Cash', type: 'asset', subtype: 'Bank', description: 'Money in bank accounts and cash on hand' },
  { accountCode: '1120', name: 'Accounts Receivable', type: 'asset', subtype: 'Receivable', isSubledger: true, subledgerType: 'accounts_receivable', description: 'Money owed to the business by customers' },
  { accountCode: '1130', name: 'Inventory', type: 'asset', subtype: 'Inventory', description: 'Goods available for sale or materials used in production' },
  { accountCode: '1140', name: 'Prepaid Expenses', type: 'asset', subtype: 'Other Current Asset', description: 'Expenses paid in advance such as insurance or rent' },
  { accountCode: '1400', name: 'Fixed Assets', type: 'asset', description: 'Long-term assets used in business operations' },
  { accountCode: '1410', name: 'Equipment', type: 'asset', subtype: 'Fixed Asset', description: 'Machinery and equipment used in operations' },
  { accountCode: '1420', name: 'Furniture and Fixtures', type: 'asset', subtype: 'Fixed Asset', description: 'Office furniture and permanent fixtures' },
  
  // Liabilities (2xxx)
  { accountCode: '2', name: 'Liabilities', type: 'liability', description: 'Obligations and debts owed by the business' },
  { accountCode: '2100', name: 'Current Liabilities', type: 'liability', description: 'Debts due within one year' },
  { accountCode: '2110', name: 'Accounts Payable', type: 'liability', subtype: 'Payable', isSubledger: true, subledgerType: 'accounts_payable', description: 'Money owed to suppliers for goods or services purchased on credit' },
  { accountCode: '2120', name: 'Accrued Expenses', type: 'liability', subtype: 'Other Current Liability', description: 'Expenses incurred but not yet paid' },
  { accountCode: '2400', name: 'Long-term Liabilities', type: 'liability', description: 'Debts due beyond one year' },
  
  // Equity (3xxx)
  { accountCode: '3', name: 'Equity', type: 'equity', description: 'Ownership interest in the business' },
  { accountCode: '3100', name: 'Owner\'s Equity', type: 'equity', description: 'Owner\'s investment in the business' },
  { accountCode: '3200', name: 'Retained Earnings', type: 'equity', description: 'Accumulated profits reinvested in the business' },
  
  // Revenue (4xxx)
  { accountCode: '4', name: 'Revenue', type: 'revenue', description: 'Income earned from business activities' },
  { accountCode: '4100', name: 'Operating Revenue', type: 'revenue', description: 'Income from primary business activities' },
  { accountCode: '4110', name: 'Service Revenue', type: 'revenue', subtype: 'Service', description: 'Income from services provided to customers' },
  { accountCode: '4120', name: 'Product Sales', type: 'revenue', subtype: 'Sales', description: 'Income from selling goods to customers' },
  
  // Expenses (5xxx-9xxx)
  { accountCode: '5', name: 'Expenses', type: 'expense', description: 'Costs incurred in business operations' },
  { accountCode: '5100', name: 'Cost of Goods Sold', type: 'expense', description: 'Direct costs of producing goods or services sold' },
  { accountCode: '6000', name: 'Operating Expenses', type: 'expense', description: 'Costs of running the business not directly tied to production' },
  { accountCode: '6100', name: 'Office Expenses', type: 'expense', description: 'Costs related to office operations' },
  { accountCode: '6200', name: 'Payroll Expenses', type: 'expense', description: 'All costs related to employee compensation' },
  { accountCode: '6300', name: 'Rent and Utilities', type: 'expense', description: 'Costs for business facilities' }
];

/**
 * Main function to run the fix
 */
async function fixEntityAndCoA() {
  try {
    console.log('===== ENTITY AND COA FIX SCRIPT =====');
    console.log('Connecting to database...');
    
    await dbClient.connect();
    console.log('Connected to database successfully');
    
    // Get all active clients
    const clientsQuery = `
      SELECT id, name, user_id, client_code 
      FROM clients 
      WHERE deleted_at IS NULL 
      ORDER BY id`;
    
    const clientsResult = await dbClient.query(clientsQuery);
    const allClients = clientsResult.rows;
    
    console.log(`Found ${allClients.length} total clients`);
    
    // Process each client
    for (const client of allClients) {
      console.log(`\nProcessing client: #${client.id} - ${client.name}`);
      
      // Check if client has entities
      const entitiesQuery = `
        SELECT id, name, entity_code 
        FROM entities 
        WHERE client_id = $1 AND deleted_at IS NULL`;
      
      const entitiesResult = await dbClient.query(entitiesQuery, [client.id]);
      const clientEntities = entitiesResult.rows;
      
      console.log(`  Found ${clientEntities.length} entities`);
      
      // Create default entity if needed
      if (clientEntities.length === 0) {
        console.log(`  Creating default entity for client ${client.id}...`);
        try {
          const entityCode = await generateUniqueEntityCode(client.id, client.client_code);
          
          // Insert the new entity
          const insertEntityQuery = `
            INSERT INTO entities (
              name, code, entity_code, owner_id, client_id, active, 
              fiscal_year_start, fiscal_year_end, currency, timezone, 
              created_at, updated_at
            ) 
            VALUES (
              $1, $2, $3, $4, $5, $6, 
              $7, $8, $9, $10, 
              NOW(), NOW()
            )
            RETURNING id`;
          
          const entityValues = [
            `${client.name} Default Entity`,  // name
            'DEFAULT',                       // code
            entityCode,                      // entity_code
            client.user_id,                  // owner_id
            client.id,                       // client_id
            true,                            // active
            '01-01',                         // fiscal_year_start
            '12-31',                         // fiscal_year_end
            'USD',                           // currency
            'UTC'                            // timezone
          ];
          
          const entityResult = await dbClient.query(insertEntityQuery, entityValues);
          const newEntity = entityResult.rows[0];
          
          console.log(`  ✅ Entity created with ID ${newEntity.id}`);
        } catch (error) {
          console.error(`  ❌ Failed to create entity:`, error);
        }
      }
      
      // Check if client has accounts
      const accountsQuery = `
        SELECT COUNT(*) as count 
        FROM accounts 
        WHERE client_id = $1`;
      
      const accountsResult = await dbClient.query(accountsQuery, [client.id]);
      const accountCount = parseInt(accountsResult.rows[0].count, 10);
      
      console.log(`  Found ${accountCount} accounts`);
      
      // Seed Chart of Accounts if needed
      if (accountCount === 0) {
        console.log(`  Seeding Chart of Accounts for client ${client.id}...`);
        try {
          // Create each account
          for (const account of standardCoaAccounts) {
            const insertAccountQuery = `
              INSERT INTO accounts (
                client_id, account_code, name, type, 
                subtype, description, active, is_subledger, subledger_type,
                parent_id, created_at
              ) 
              VALUES (
                $1, $2, $3, $4, 
                $5, $6, $7, $8, $9,
                $10, NOW()
              )`;
            
            const accountValues = [
              client.id,                        // client_id
              account.accountCode,              // account_code
              account.name,                     // name
              account.type,                     // type
              account.subtype || null,          // subtype
              account.description || null,      // description
              true,                             // active
              account.isSubledger || false,     // is_subledger
              account.subledgerType || null,    // subledger_type
              null                              // parent_id (set in second pass)
            ];
            
            await dbClient.query(insertAccountQuery, accountValues);
          }
          
          // Count accounts after seeding
          const accountsAfterQuery = `
            SELECT COUNT(*) as count 
            FROM accounts 
            WHERE client_id = $1`;
          
          const accountsAfterResult = await dbClient.query(accountsAfterQuery, [client.id]);
          const accountsAfterCount = parseInt(accountsAfterResult.rows[0].count, 10);
          
          console.log(`  ✅ ${accountsAfterCount} accounts created`);
          
          // TODO: Set parent relationships in a second pass
          console.log(`  ℹ️ Parent-child relationships will be established in a future update`);
          
        } catch (error) {
          console.error(`  ❌ Failed to seed Chart of Accounts:`, error);
        }
      }
    }
    
    console.log('\n===== ENTITY AND COA FIX COMPLETE =====');
  } catch (error) {
    console.error('ERROR DURING FIX:', error);
  } finally {
    // Close DB connection
    await dbClient.end();
    console.log('Database connection closed');
  }
}

/**
 * Generate a unique hierarchical entity code based on the client's code
 * Format: {ClientCode}-{SequentialNumber}
 * Example: "ABC123-001"
 */
async function generateUniqueEntityCode(clientId, clientCode) {
  // If no client code, create a default one
  const baseCode = clientCode || `CL${clientId}`;
  
  // Count existing entities for this client to determine the next sequence number
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM entities 
    WHERE client_id = $1`;
  
  const countResult = await dbClient.query(countQuery, [clientId]);
  const count = parseInt(countResult.rows[0].count, 10) + 1;
  
  // Format the sequence number with leading zeros
  const sequenceNumber = count.toString().padStart(3, '0');
  
  return `${baseCode}-${sequenceNumber}`;
}

// Run the fix
fixEntityAndCoA().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});