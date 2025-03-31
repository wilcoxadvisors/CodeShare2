/**
 * Seed Chart of Accounts for Existing Clients
 * 
 * This script populates predefined Chart of Accounts for existing clients
 * based on industry-specific templates.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'url';

// In ES Modules, __dirname is not available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5000';
const API_BASE = '/api/clients';
const COOKIES_FILE = path.join(__dirname, '..', 'cookies.txt');

// Parse command line arguments
const args = parseArgs({
  options: {
    'client-id': {
      type: 'string',
    },
    'all': {
      type: 'boolean',
      default: false,
    }
  }
});

// Standard Chart of Accounts template
const standardCoA = [
  // ASSET Accounts (1000-1999)
  {
    code: '1000',
    name: 'Cash',
    type: 'ASSET',
    subtype: 'Current Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Cash on hand and in checking accounts',
    parentCode: null
  },
  {
    code: '1010',
    name: 'Petty Cash',
    type: 'ASSET',
    subtype: 'Current Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Small cash funds kept on premises',
    parentCode: '1000'
  },
  {
    code: '1100',
    name: 'Accounts Receivable',
    type: 'ASSET',
    subtype: 'Current Asset',
    isSubledger: true,
    subledgerType: 'Customer',
    active: true,
    description: 'Amounts owed by customers',
    parentCode: null
  },
  {
    code: '1200',
    name: 'Inventory',
    type: 'ASSET',
    subtype: 'Current Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Goods held for resale',
    parentCode: null
  },
  {
    code: '1300',
    name: 'Prepaid Expenses',
    type: 'ASSET',
    subtype: 'Current Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Expenses paid in advance',
    parentCode: null
  },
  {
    code: '1500',
    name: 'Property, Plant & Equipment',
    type: 'ASSET',
    subtype: 'Fixed Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Long-term tangible assets',
    parentCode: null
  },
  {
    code: '1510',
    name: 'Buildings',
    type: 'ASSET',
    subtype: 'Fixed Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Company-owned buildings',
    parentCode: '1500'
  },
  {
    code: '1520',
    name: 'Equipment',
    type: 'ASSET',
    subtype: 'Fixed Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Machinery and equipment',
    parentCode: '1500'
  },
  {
    code: '1530',
    name: 'Vehicles',
    type: 'ASSET',
    subtype: 'Fixed Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Company-owned vehicles',
    parentCode: '1500'
  },
  {
    code: '1540',
    name: 'Furniture & Fixtures',
    type: 'ASSET',
    subtype: 'Fixed Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Office furniture and fixtures',
    parentCode: '1500'
  },
  {
    code: '1600',
    name: 'Accumulated Depreciation',
    type: 'ASSET',
    subtype: 'Fixed Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Cumulative depreciation of fixed assets',
    parentCode: null
  },
  {
    code: '1610',
    name: 'Accumulated Depreciation - Buildings',
    type: 'ASSET',
    subtype: 'Fixed Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Cumulative depreciation of buildings',
    parentCode: '1600'
  },
  {
    code: '1620',
    name: 'Accumulated Depreciation - Equipment',
    type: 'ASSET',
    subtype: 'Fixed Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Cumulative depreciation of equipment',
    parentCode: '1600'
  },
  {
    code: '1630',
    name: 'Accumulated Depreciation - Vehicles',
    type: 'ASSET',
    subtype: 'Fixed Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Cumulative depreciation of vehicles',
    parentCode: '1600'
  },
  {
    code: '1640',
    name: 'Accumulated Depreciation - Furniture & Fixtures',
    type: 'ASSET',
    subtype: 'Fixed Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Cumulative depreciation of furniture and fixtures',
    parentCode: '1600'
  },
  {
    code: '1800',
    name: 'Investments',
    type: 'ASSET',
    subtype: 'Other Asset',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Long-term investments',
    parentCode: null
  },
  
  // LIABILITY Accounts (2000-2999)
  {
    code: '2000',
    name: 'Accounts Payable',
    type: 'LIABILITY',
    subtype: 'Current Liability',
    isSubledger: true,
    subledgerType: 'Vendor',
    active: true,
    description: 'Amounts owed to vendors',
    parentCode: null
  },
  {
    code: '2100',
    name: 'Accrued Liabilities',
    type: 'LIABILITY',
    subtype: 'Current Liability',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Obligations not yet billed',
    parentCode: null
  },
  {
    code: '2200',
    name: 'Payroll Liabilities',
    type: 'LIABILITY',
    subtype: 'Current Liability',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Amounts owed to employees and tax authorities',
    parentCode: null
  },
  {
    code: '2210',
    name: 'Salaries Payable',
    type: 'LIABILITY',
    subtype: 'Current Liability',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Salaries and wages owed to employees',
    parentCode: '2200'
  },
  {
    code: '2220',
    name: 'Payroll Taxes Payable',
    type: 'LIABILITY',
    subtype: 'Current Liability',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Employment taxes owed to government',
    parentCode: '2200'
  },
  {
    code: '2300',
    name: 'Sales Tax Payable',
    type: 'LIABILITY',
    subtype: 'Current Liability',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Sales taxes collected but not yet remitted',
    parentCode: null
  },
  {
    code: '2400',
    name: 'Income Tax Payable',
    type: 'LIABILITY',
    subtype: 'Current Liability',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Income taxes owed but not yet paid',
    parentCode: null
  },
  {
    code: '2500',
    name: 'Unearned Revenue',
    type: 'LIABILITY',
    subtype: 'Current Liability',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Payments received for goods/services not yet provided',
    parentCode: null
  },
  {
    code: '2600',
    name: 'Short-term Loans',
    type: 'LIABILITY',
    subtype: 'Current Liability',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Loans due within one year',
    parentCode: null
  },
  {
    code: '2700',
    name: 'Long-term Debt',
    type: 'LIABILITY',
    subtype: 'Long-term Liability',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Loans due beyond one year',
    parentCode: null
  },
  {
    code: '2800',
    name: 'Deferred Tax Liability',
    type: 'LIABILITY',
    subtype: 'Long-term Liability',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Future tax obligations',
    parentCode: null
  },
  
  // EQUITY Accounts (3000-3999)
  {
    code: '3000',
    name: 'Common Stock',
    type: 'EQUITY',
    subtype: 'Equity',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Ownership shares',
    parentCode: null
  },
  {
    code: '3100',
    name: 'Paid-in Capital',
    type: 'EQUITY',
    subtype: 'Equity',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Capital invested beyond par value',
    parentCode: null
  },
  {
    code: '3200',
    name: 'Retained Earnings',
    type: 'EQUITY',
    subtype: 'Equity',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Accumulated profits not distributed',
    parentCode: null
  },
  {
    code: '3300',
    name: 'Dividends',
    type: 'EQUITY',
    subtype: 'Equity',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Profits distributed to shareholders',
    parentCode: null
  },
  {
    code: '3900',
    name: 'Current Year Earnings',
    type: 'EQUITY',
    subtype: 'Equity',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Net income for the current year',
    parentCode: null
  },
  
  // REVENUE Accounts (4000-4999)
  {
    code: '4000',
    name: 'Sales Revenue',
    type: 'REVENUE',
    subtype: 'Operating Revenue',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Income from sales of goods or services',
    parentCode: null
  },
  {
    code: '4100',
    name: 'Product Sales',
    type: 'REVENUE',
    subtype: 'Operating Revenue',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Revenue from product sales',
    parentCode: '4000'
  },
  {
    code: '4200',
    name: 'Service Revenue',
    type: 'REVENUE',
    subtype: 'Operating Revenue',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Revenue from services',
    parentCode: '4000'
  },
  {
    code: '4300',
    name: 'Subscription Revenue',
    type: 'REVENUE',
    subtype: 'Operating Revenue',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Revenue from recurring subscriptions',
    parentCode: '4000'
  },
  {
    code: '4500',
    name: 'Discounts',
    type: 'REVENUE',
    subtype: 'Revenue Reduction',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Discounts offered to customers',
    parentCode: null
  },
  {
    code: '4600',
    name: 'Returns and Allowances',
    type: 'REVENUE',
    subtype: 'Revenue Reduction',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Refunds and allowances',
    parentCode: null
  },
  {
    code: '4800',
    name: 'Interest Income',
    type: 'REVENUE',
    subtype: 'Other Revenue',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Income from interest-bearing accounts',
    parentCode: null
  },
  {
    code: '4900',
    name: 'Other Income',
    type: 'REVENUE',
    subtype: 'Other Revenue',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Miscellaneous income',
    parentCode: null
  },
  
  // EXPENSE Accounts (5000-9999)
  {
    code: '5000',
    name: 'Cost of Goods Sold',
    type: 'EXPENSE',
    subtype: 'Cost of Sales',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Direct costs of products sold',
    parentCode: null
  },
  {
    code: '5100',
    name: 'Materials',
    type: 'EXPENSE',
    subtype: 'Cost of Sales',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Raw materials and components',
    parentCode: '5000'
  },
  {
    code: '5200',
    name: 'Direct Labor',
    type: 'EXPENSE',
    subtype: 'Cost of Sales',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Labor directly involved in production',
    parentCode: '5000'
  },
  {
    code: '5300',
    name: 'Manufacturing Overhead',
    type: 'EXPENSE',
    subtype: 'Cost of Sales',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Indirect production costs',
    parentCode: '5000'
  },
  {
    code: '6000',
    name: 'Operating Expenses',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'General operating expenses',
    parentCode: null
  },
  {
    code: '6100',
    name: 'Salaries and Wages',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Employee salaries and wages',
    parentCode: '6000'
  },
  {
    code: '6110',
    name: 'Administrative Salaries',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Salaries for administrative staff',
    parentCode: '6100'
  },
  {
    code: '6120',
    name: 'Sales Salaries',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Salaries for sales staff',
    parentCode: '6100'
  },
  {
    code: '6200',
    name: 'Employee Benefits',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Health insurance, retirement plans, etc.',
    parentCode: '6000'
  },
  {
    code: '6300',
    name: 'Payroll Taxes',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Employer portion of payroll taxes',
    parentCode: '6000'
  },
  {
    code: '6400',
    name: 'Rent Expense',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Office and facility rent',
    parentCode: '6000'
  },
  {
    code: '6500',
    name: 'Utilities',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Electricity, water, gas, etc.',
    parentCode: '6000'
  },
  {
    code: '6600',
    name: 'Office Supplies',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Consumable office items',
    parentCode: '6000'
  },
  {
    code: '6700',
    name: 'Insurance',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Business insurance premiums',
    parentCode: '6000'
  },
  {
    code: '6800',
    name: 'Depreciation Expense',
    type: 'EXPENSE',
    subtype: 'Operating Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Allocation of fixed asset costs',
    parentCode: '6000'
  },
  {
    code: '7000',
    name: 'Marketing Expenses',
    type: 'EXPENSE',
    subtype: 'Marketing Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Advertising and promotion costs',
    parentCode: null
  },
  {
    code: '7100',
    name: 'Advertising',
    type: 'EXPENSE',
    subtype: 'Marketing Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Paid advertising costs',
    parentCode: '7000'
  },
  {
    code: '7200',
    name: 'Promotional Materials',
    type: 'EXPENSE',
    subtype: 'Marketing Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Brochures, displays, etc.',
    parentCode: '7000'
  },
  {
    code: '7300',
    name: 'Trade Shows',
    type: 'EXPENSE',
    subtype: 'Marketing Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Costs for industry exhibitions',
    parentCode: '7000'
  },
  {
    code: '8000',
    name: 'Professional Fees',
    type: 'EXPENSE',
    subtype: 'Administrative Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Fees for professional services',
    parentCode: null
  },
  {
    code: '8100',
    name: 'Legal Fees',
    type: 'EXPENSE',
    subtype: 'Administrative Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Attorney and legal service fees',
    parentCode: '8000'
  },
  {
    code: '8200',
    name: 'Accounting Fees',
    type: 'EXPENSE',
    subtype: 'Administrative Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Accounting and bookkeeping fees',
    parentCode: '8000'
  },
  {
    code: '8300',
    name: 'Consulting Fees',
    type: 'EXPENSE',
    subtype: 'Administrative Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Fees paid to consultants',
    parentCode: '8000'
  },
  {
    code: '9000',
    name: 'Interest Expense',
    type: 'EXPENSE',
    subtype: 'Other Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Interest paid on loans',
    parentCode: null
  },
  {
    code: '9100',
    name: 'Income Tax Expense',
    type: 'EXPENSE',
    subtype: 'Other Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Income taxes',
    parentCode: null
  },
  {
    code: '9800',
    name: 'Miscellaneous Expense',
    type: 'EXPENSE',
    subtype: 'Other Expense',
    isSubledger: false,
    subledgerType: null,
    active: true,
    description: 'Expenses that don\'t fit elsewhere',
    parentCode: null
  }
];

/**
 * Log in to get auth cookie
 */
async function login() {
  try {
    const cookies = fs.existsSync(COOKIES_FILE) ? fs.readFileSync(COOKIES_FILE, 'utf8') : null;
    if (cookies) {
      return cookies;
    }

    // If no cookie file exists, attempt to login with default credentials
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'password123'
    }, {
      withCredentials: true
    });
    
    if (response.headers['set-cookie']) {
      // Save cookies to file for other processes
      fs.writeFileSync(COOKIES_FILE, response.headers['set-cookie'].join(';'));
      return response.headers['set-cookie'].join(';');
    } else {
      throw new Error('No cookies received from login');
    }
  } catch (error) {
    console.error(chalk.red('Login failed:'), error.message);
    throw error;
  }
}

/**
 * Get all clients
 */
async function getAllClients() {
  try {
    const cookies = await login();
    const response = await axios.get(`${BASE_URL}${API_BASE}`, {
      headers: {
        Cookie: cookies
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(chalk.red('Failed to get clients:'), error.message);
    throw error;
  }
}

/**
 * Get client by ID
 */
async function getClient(clientId) {
  try {
    const cookies = await login();
    const response = await axios.get(`${BASE_URL}${API_BASE}/${clientId}`, {
      headers: {
        Cookie: cookies
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Failed to get client ${clientId}:`), error.message);
    throw error;
  }
}

/**
 * Get accounts for a client
 */
async function getAccounts(clientId) {
  try {
    const cookies = await login();
    const response = await axios.get(`${BASE_URL}${API_BASE}/${clientId}/accounts`, {
      headers: {
        Cookie: cookies
      }
    });
    
    return response.data;
  } catch (error) {
    // If 404, client likely has no accounts yet
    if (error.response?.status === 404) {
      return [];
    }
    
    console.error(chalk.red(`Failed to get accounts for client ${clientId}:`), error.message);
    throw error;
  }
}

/**
 * Create accounts for a client
 */
async function createAccounts(clientId, accounts) {
  try {
    const cookies = await login();
    const response = await axios.post(`${BASE_URL}${API_BASE}/${clientId}/accounts/import`, 
      { accounts },
      {
        headers: {
          Cookie: cookies,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(chalk.red(`Failed to create accounts for client ${clientId}:`), error.message);
    if (error.response?.data) {
      console.error(chalk.red('Error details:'), JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Seed Chart of Accounts for a specific client
 */
async function seedClientCoA(clientId) {
  try {
    // Get client info to check industry
    const client = await getClient(clientId);
    console.log(chalk.blue(`Seeding CoA for client: ${client.name} (ID: ${client.id})`));
    
    // Check if client already has accounts
    const existingAccounts = await getAccounts(clientId);
    
    if (existingAccounts.length > 0) {
      console.log(chalk.yellow(`Client ${client.name} already has ${existingAccounts.length} accounts. Skipping.`));
      return {
        clientId: client.id,
        clientName: client.name,
        status: 'skipped',
        message: `Already has ${existingAccounts.length} accounts`
      };
    }
    
    // Create accounts using standard template
    // In a real implementation, you might select different templates based on industry
    // For simplicity, we're using the same template for all clients
    const result = await createAccounts(clientId, standardCoA);
    
    console.log(chalk.green(`Successfully seeded ${result.added} accounts for client ${client.name}`));
    
    return {
      clientId: client.id,
      clientName: client.name,
      status: 'success',
      accountsAdded: result.added
    };
  } catch (error) {
    console.error(chalk.red(`Failed to seed CoA for client ${clientId}:`), error.message);
    return {
      clientId,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Main function to seed Chart of Accounts
 */
async function seedCoA() {
  try {
    const clientId = args.values['client-id'];
    const all = args.values['all'];
    
    let results = [];
    
    if (clientId) {
      // Seed specific client
      console.log(chalk.blue(`Seeding CoA for client ID: ${clientId}`));
      const result = await seedClientCoA(clientId);
      results.push(result);
    } else if (all) {
      // Seed all clients
      console.log(chalk.blue('Seeding CoA for all clients...'));
      
      const clients = await getAllClients();
      console.log(chalk.blue(`Found ${clients.length} clients`));
      
      for (const client of clients) {
        const result = await seedClientCoA(client.id);
        results.push(result);
      }
    } else {
      console.log(chalk.yellow('Please specify --client-id=<id> or --all to seed Chart of Accounts'));
      process.exit(0);
    }
    
    // Print summary
    console.log(chalk.blue('\nSeed Summary:'));
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    results.forEach(result => {
      if (result.status === 'success') {
        successCount++;
        console.log(chalk.green(`✓ [${result.clientId}] ${result.clientName}: Added ${result.accountsAdded} accounts`));
      } else if (result.status === 'skipped') {
        skippedCount++;
        console.log(chalk.yellow(`- [${result.clientId}] ${result.clientName}: ${result.message}`));
      } else {
        errorCount++;
        console.log(chalk.red(`× [${result.clientId}]: ${result.error}`));
      }
    });
    
    console.log(chalk.blue(`\nTotal: ${results.length} clients processed (${successCount} successful, ${skippedCount} skipped, ${errorCount} failed)`));
    
  } catch (error) {
    console.error(chalk.red('Seeding failed:'), error.message);
    process.exit(1);
  }
}

// Run the seeding process
seedCoA();