import { AccountType } from '../shared/schema';

/**
 * Interface for Chart of Accounts template entries
 */
export interface CoATemplateEntry {
  code: string;
  name: string;
  type: AccountType;
  parentCode: string | null;
  subtype?: string;
  isSubledger?: boolean;
  subledgerType?: string;
  description?: string;
}

/**
 * Standard Chart of Accounts template
 * Used to seed new client accounts
 */
export const standardCoaTemplate: CoATemplateEntry[] = [
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