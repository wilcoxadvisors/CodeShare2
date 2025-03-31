/**
 * Simple script to seed Chart of Accounts for existing clients
 * 
 * This script uses ESM format as required by the package.json setting
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import chalk from 'chalk';
import ws from 'ws';

// Import schema - use direct imports since we need to reference exact schema
import * as schema from '../shared/schema.js';

// Access needed schema elements
const { clients, accounts } = schema;
const AccountType = {
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE"
};

// Standard Chart of Accounts template for seeding
const standardCoaTemplate = [
  // Assets (1xxx)
  { code: '1', name: 'Assets', type: AccountType.ASSET, parentCode: null, description: 'Resources owned by the business that have economic value' },
  { code: '1100', name: 'Current Assets', type: AccountType.ASSET, parentCode: '1', description: 'Assets expected to be converted to cash or used within one year' },
  { code: '1110', name: 'Cash', type: AccountType.ASSET, subtype: 'Bank', parentCode: '1100', description: 'Money in bank accounts and cash on hand' },
  { code: '1120', name: 'Accounts Receivable', type: AccountType.ASSET, subtype: 'Receivable', parentCode: '1100', isSubledger: true, subledgerType: 'accounts_receivable', description: 'Money owed to the business by customers' },
  { code: '1130', name: 'Inventory', type: AccountType.ASSET, subtype: 'Inventory', parentCode: '1100', description: 'Goods available for sale or materials used in production' },
  { code: '1140', name: 'Prepaid Expenses', type: AccountType.ASSET, subtype: 'Other Current Asset', parentCode: '1100', description: 'Expenses paid in advance such as insurance or rent' },
  { code: '1150', name: 'Short-term Investments', type: AccountType.ASSET, subtype: 'Investment', parentCode: '1100', description: 'Investments expected to be converted to cash within one year' },
  { code: '1400', name: 'Fixed Assets', type: AccountType.ASSET, parentCode: '1', description: 'Long-term assets used in business operations' },
  { code: '1410', name: 'Equipment', type: AccountType.ASSET, subtype: 'Fixed Asset', parentCode: '1400', description: 'Machinery and equipment used in operations' },
  { code: '1420', name: 'Furniture and Fixtures', type: AccountType.ASSET, subtype: 'Fixed Asset', parentCode: '1400', description: 'Office furniture and permanent fixtures' },
  { code: '1430', name: 'Buildings', type: AccountType.ASSET, subtype: 'Fixed Asset', parentCode: '1400', description: 'Structures owned by the business' },
  { code: '1440', name: 'Land', type: AccountType.ASSET, subtype: 'Fixed Asset', parentCode: '1400', description: 'Real estate owned by the business' },
  { code: '1450', name: 'Vehicles', type: AccountType.ASSET, subtype: 'Fixed Asset', parentCode: '1400', description: 'Cars, trucks, and other transportation equipment' },
  { code: '1490', name: 'Accumulated Depreciation', type: AccountType.ASSET, subtype: 'Contra Asset', parentCode: '1400', description: 'Total depreciation taken against fixed assets' },
  { code: '1800', name: 'Other Assets', type: AccountType.ASSET, parentCode: '1', description: 'Assets not classified as current or fixed' },
  { code: '1810', name: 'Intangible Assets', type: AccountType.ASSET, subtype: 'Other Asset', parentCode: '1800', description: 'Non-physical assets like patents, trademarks, and goodwill' },
  { code: '1820', name: 'Long-term Investments', type: AccountType.ASSET, subtype: 'Investment', parentCode: '1800', description: 'Investments held for more than one year' },
  
  // Liabilities (2xxx)
  { code: '2', name: 'Liabilities', type: AccountType.LIABILITY, parentCode: null, description: 'Obligations and debts owed by the business' },
  { code: '2100', name: 'Current Liabilities', type: AccountType.LIABILITY, parentCode: '2', description: 'Debts due within one year' },
  { code: '2110', name: 'Accounts Payable', type: AccountType.LIABILITY, subtype: 'Payable', parentCode: '2100', isSubledger: true, subledgerType: 'accounts_payable', description: 'Money owed to suppliers for goods or services purchased on credit' },
  { code: '2120', name: 'Accrued Expenses', type: AccountType.LIABILITY, subtype: 'Other Current Liability', parentCode: '2100', description: 'Expenses incurred but not yet paid' },
  { code: '2130', name: 'Payroll Liabilities', type: AccountType.LIABILITY, subtype: 'Payroll', parentCode: '2100', description: 'Amounts owed to employees and tax authorities for payroll' },
  { code: '2140', name: 'Short-term Loans', type: AccountType.LIABILITY, subtype: 'Loan', parentCode: '2100', description: 'Loans due within one year' },
  { code: '2150', name: 'Current Portion of Long-term Debt', type: AccountType.LIABILITY, subtype: 'Loan', parentCode: '2100', description: 'Principal due within one year on long-term debt' },
  { code: '2160', name: 'Unearned Revenue', type: AccountType.LIABILITY, subtype: 'Other Current Liability', parentCode: '2100', description: 'Payments received from customers before goods or services are delivered' },
  { code: '2170', name: 'Sales Tax Payable', type: AccountType.LIABILITY, subtype: 'Tax', parentCode: '2100', description: 'Sales tax collected from customers but not yet paid to the government' },
  { code: '2400', name: 'Long-term Liabilities', type: AccountType.LIABILITY, parentCode: '2', description: 'Debts due beyond one year' },
  { code: '2410', name: 'Mortgage Payable', type: AccountType.LIABILITY, subtype: 'Loan', parentCode: '2400', description: 'Long-term loans secured by real estate' },
  { code: '2420', name: 'Notes Payable', type: AccountType.LIABILITY, subtype: 'Loan', parentCode: '2400', description: 'Formal written promises to pay specified amounts' },
  { code: '2430', name: 'Bonds Payable', type: AccountType.LIABILITY, subtype: 'Loan', parentCode: '2400', description: 'Long-term debt securities issued by the business' },
  
  // Equity (3xxx)
  { code: '3', name: 'Equity', type: AccountType.EQUITY, parentCode: null, description: 'Ownership interest in the business' },
  { code: '3100', name: 'Owner\'s Equity', type: AccountType.EQUITY, parentCode: '3', description: 'Owner\'s investment in the business' },
  { code: '3110', name: 'Capital', type: AccountType.EQUITY, subtype: 'Capital', parentCode: '3100', description: 'Owner\'s contributions to the business' },
  { code: '3120', name: 'Owner Draws', type: AccountType.EQUITY, subtype: 'Draw', parentCode: '3100', description: 'Withdrawals of business assets for personal use' },
  { code: '3200', name: 'Retained Earnings', type: AccountType.EQUITY, parentCode: '3', description: 'Accumulated profits reinvested in the business' },
  { code: '3300', name: 'Common Stock', type: AccountType.EQUITY, parentCode: '3', description: 'Shares of ownership issued to stockholders' },
  { code: '3400', name: 'Additional Paid-in Capital', type: AccountType.EQUITY, parentCode: '3', description: 'Amount paid by shareholders for stock in excess of par value' },
  
  // Revenue (4xxx)
  { code: '4', name: 'Revenue', type: AccountType.REVENUE, parentCode: null, description: 'Income earned from business activities' },
  { code: '4100', name: 'Operating Revenue', type: AccountType.REVENUE, parentCode: '4', description: 'Income from primary business activities' },
  { code: '4110', name: 'Service Revenue', type: AccountType.REVENUE, subtype: 'Service', parentCode: '4100', description: 'Income from services provided to customers' },
  { code: '4120', name: 'Product Sales', type: AccountType.REVENUE, subtype: 'Sales', parentCode: '4100', description: 'Income from selling goods to customers' },
  { code: '4200', name: 'Other Revenue', type: AccountType.REVENUE, parentCode: '4', description: 'Income from secondary business activities' },
  { code: '4210', name: 'Interest Income', type: AccountType.REVENUE, subtype: 'Other Revenue', parentCode: '4200', description: 'Income earned from investments or bank accounts' },
  { code: '4220', name: 'Rental Income', type: AccountType.REVENUE, subtype: 'Other Revenue', parentCode: '4200', description: 'Income from renting property to others' },
  { code: '4230', name: 'Gain on Sale of Assets', type: AccountType.REVENUE, subtype: 'Other Revenue', parentCode: '4200', description: 'Profits from selling business assets' },
  
  // Expenses (5xxx-9xxx)
  { code: '5', name: 'Expenses', type: AccountType.EXPENSE, parentCode: null, description: 'Costs incurred in business operations' },
  { code: '5100', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, parentCode: '5', description: 'Direct costs of producing goods or services sold' },
  { code: '5110', name: 'Purchases', type: AccountType.EXPENSE, subtype: 'COGS', parentCode: '5100', description: 'Cost of inventory bought for resale' },
  { code: '5120', name: 'Direct Labor', type: AccountType.EXPENSE, subtype: 'COGS', parentCode: '5100', description: 'Wages paid to employees directly involved in production' },
  { code: '5130', name: 'Manufacturing Overhead', type: AccountType.EXPENSE, subtype: 'COGS', parentCode: '5100', description: 'Indirect costs of production not easily traceable to specific products' },
  { code: '6000', name: 'Operating Expenses', type: AccountType.EXPENSE, parentCode: '5', description: 'Costs of running the business not directly tied to production' },
  { code: '6100', name: 'Office Expenses', type: AccountType.EXPENSE, parentCode: '6000', description: 'Costs related to office operations' },
  { code: '6110', name: 'Office Supplies', type: AccountType.EXPENSE, subtype: 'Office', parentCode: '6100', description: 'Consumable items used in the office' },
  { code: '6120', name: 'Office Equipment', type: AccountType.EXPENSE, subtype: 'Office', parentCode: '6100', description: 'Small equipment items not capitalized' },
  { code: '6200', name: 'Payroll Expenses', type: AccountType.EXPENSE, parentCode: '6000', description: 'All costs related to employee compensation' },
  { code: '6210', name: 'Salaries and Wages', type: AccountType.EXPENSE, subtype: 'Payroll', parentCode: '6200', description: 'Regular pay to employees' },
  { code: '6220', name: 'Payroll Taxes', type: AccountType.EXPENSE, subtype: 'Payroll', parentCode: '6200', description: 'Employer portion of taxes on employee wages' },
  { code: '6230', name: 'Employee Benefits', type: AccountType.EXPENSE, subtype: 'Payroll', parentCode: '6200', description: 'Health insurance, retirement plans, and other benefits' },
  { code: '6300', name: 'Rent and Utilities', type: AccountType.EXPENSE, parentCode: '6000', description: 'Costs for business facilities' },
  { code: '6310', name: 'Rent', type: AccountType.EXPENSE, subtype: 'Facilities', parentCode: '6300', description: 'Payments for leased property' },
  { code: '6320', name: 'Utilities', type: AccountType.EXPENSE, subtype: 'Facilities', parentCode: '6300', description: 'Electricity, water, gas, internet, and phone services' },
  { code: '6400', name: 'Professional Services', type: AccountType.EXPENSE, parentCode: '6000', description: 'Fees paid to outside service providers' },
  { code: '6410', name: 'Legal Fees', type: AccountType.EXPENSE, subtype: 'Professional Services', parentCode: '6400', description: 'Costs for legal counsel and services' },
  { code: '6420', name: 'Accounting Fees', type: AccountType.EXPENSE, subtype: 'Professional Services', parentCode: '6400', description: 'Costs for accounting and bookkeeping services' },
  { code: '6430', name: 'Consulting Fees', type: AccountType.EXPENSE, subtype: 'Professional Services', parentCode: '6400', description: 'Payments to consultants and advisors' },
  { code: '6500', name: 'Insurance', type: AccountType.EXPENSE, parentCode: '6000', description: 'Business insurance premiums' },
  { code: '6600', name: 'Marketing and Advertising', type: AccountType.EXPENSE, parentCode: '6000', description: 'Costs to promote the business' },
  { code: '6700', name: 'Travel and Entertainment', type: AccountType.EXPENSE, parentCode: '6000', description: 'Business travel, meals, and entertainment expenses' },
  { code: '6800', name: 'Depreciation Expense', type: AccountType.EXPENSE, subtype: 'Depreciation', parentCode: '6000', description: 'Allocation of asset costs over their useful lives' },
  { code: '7000', name: 'Other Expenses', type: AccountType.EXPENSE, parentCode: '5', description: 'Expenses not classified elsewhere' },
  { code: '7100', name: 'Interest Expense', type: AccountType.EXPENSE, subtype: 'Other Expense', parentCode: '7000', description: 'Interest paid on loans and credit' },
  { code: '7200', name: 'Bank Fees', type: AccountType.EXPENSE, subtype: 'Other Expense', parentCode: '7000', description: 'Charges for banking services' },
  { code: '7300', name: 'Loss on Sale of Assets', type: AccountType.EXPENSE, subtype: 'Other Expense', parentCode: '7000', description: 'Losses from selling business assets' },
  { code: '9000', name: 'Income Taxes', type: AccountType.EXPENSE, parentCode: '5', description: 'Taxes paid on business profits' },
];

// Configure neon to use websockets for Serverless PostgreSQL connection
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create connection pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
});

// Create Drizzle ORM instance
const db = drizzle(pool, { schema });

/**
 * Find clients without any accounts (no Chart of Accounts)
 */
async function findClientsWithoutCoA() {
  console.log(chalk.blue('Searching for clients without Chart of Accounts...'));
  
  // Find all clients
  const allClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients);
    
  console.log(chalk.gray(`Total clients in database: ${allClients.length}`));
  
  // For each client, check if they have accounts
  const clientsWithoutCoA = [];
  
  for (const client of allClients) {
    const clientAccounts = await db
      .select({ count: accounts.id })
      .from(accounts)
      .where(eq(accounts.clientId, client.id));
      
    if (clientAccounts.length === 0) {
      clientsWithoutCoA.push(client);
      console.log(chalk.yellow(`Client ID ${client.id} (${client.name}) has no accounts`));
    }
  }
  
  return clientsWithoutCoA;
}

/**
 * Seed Chart of Accounts for a specific client
 */
async function seedCoAForClient(client) {
  console.log(chalk.blue(`Starting CoA seed for client ID: ${client.id} (${client.name})`));
  
  try {
    // Double-check again if this client already has accounts (safety check)
    const existingAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.clientId, client.id))
      .limit(1);
      
    if (existingAccounts.length > 0) {
      console.log(chalk.yellow(`Client ${client.id} (${client.name}) already has accounts. Skipping seed.`));
      return false;
    }
    
    // Map to store account codes to their generated IDs for parentId resolution
    const codeToIdMap = new Map();
    
    // Use a transaction to ensure data consistency
    await db.transaction(async (tx) => {
      console.log(chalk.blue(`Processing ${standardCoaTemplate.length} account records in transaction`));
      
      // Process each template account
      for (const templateAccount of standardCoaTemplate) {
        // Determine parentId by looking up the parent code in our map
        let parentId = null;
        
        if (templateAccount.parentCode) {
          parentId = codeToIdMap.get(templateAccount.parentCode) || null;
          if (!parentId && templateAccount.parentCode) {
            console.warn(chalk.yellow(`Parent account with code ${templateAccount.parentCode} not found for ${templateAccount.code} (${templateAccount.name})`));
          }
        }
        
        // Insert the account
        const [newAccount] = await tx
          .insert(accounts)
          .values({
            clientId: client.id,
            code: templateAccount.code,
            name: templateAccount.name,
            type: templateAccount.type,
            subtype: templateAccount.subtype,
            isSubledger: templateAccount.isSubledger || false,
            subledgerType: templateAccount.subledgerType,
            parentId,
            description: templateAccount.description,
            active: true
          })
          .returning({ id: accounts.id });
        
        // Store the generated ID mapped to the account code
        if (newAccount && newAccount.id) {
          codeToIdMap.set(templateAccount.code, newAccount.id);
        } else {
          console.error(chalk.red(`Failed to insert account ${templateAccount.code}`));
        }
      }
    });
    
    console.log(chalk.green(`Successfully seeded ${standardCoaTemplate.length} accounts for client ID: ${client.id}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to seed Chart of Accounts for client ${client.id}:`), error);
    return false;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  console.log(chalk.blue('===== Chart of Accounts Seeder for Existing Clients ====='));
  
  try {
    // Find clients without Chart of Accounts
    const clientsToSeed = await findClientsWithoutCoA();
    
    if (clientsToSeed.length === 0) {
      console.log(chalk.green('All clients already have Chart of Accounts. Nothing to do.'));
      process.exit(0);
    }
    
    console.log(chalk.blue(`Found ${clientsToSeed.length} clients without Chart of Accounts.`));
    
    // Track successful and failed seeding operations
    let successCount = 0;
    let failCount = 0;
    
    // Seed Chart of Accounts for each client
    for (const client of clientsToSeed) {
      const success = await seedCoAForClient(client);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    // Print summary
    console.log(chalk.blue('\n===== Seeding Summary ====='));
    console.log(chalk.green(`Successfully seeded ${successCount} clients`));
    if (failCount > 0) {
      console.log(chalk.red(`Failed to seed ${failCount} clients`));
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('Fatal error during seeding process:'), error);
    await pool.end();
    process.exit(1);
  }
}

// Execute the main function
main().catch((error) => {
  console.error(chalk.red('Unhandled exception:'), error);
  pool.end();
  process.exit(1);
});