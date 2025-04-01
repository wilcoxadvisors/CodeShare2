import { AccountType } from '../shared/schema';

/**
 * Interface for Chart of Accounts template entries
 */
export interface CoATemplateEntry {
  accountCode: string;
  name: string;
  type: AccountType;
  parentCode: string | null;
  subtype?: string;
  isSubledger?: boolean;
  subledgerType?: string;
  description?: string;
  fsliBucket?: string;
  internalReportingBucket?: string;
  item?: string;
}

/**
 * Standard Chart of Accounts template
 * Used to seed new client accounts
 */
export const standardCoaTemplate: CoATemplateEntry[] = [
  // Assets (1xxx)
  { accountCode: '1', name: 'Assets', type: AccountType.ASSET, parentCode: null, description: 'Resources owned by the business that have economic value', fsliBucket: 'Assets', internalReportingBucket: 'Total Assets' },
  { accountCode: '1100', name: 'Current Assets', type: AccountType.ASSET, parentCode: '1', description: 'Assets expected to be converted to cash or used within one year', fsliBucket: 'Current Assets', internalReportingBucket: 'Total Current Assets' },
  { accountCode: '1110', name: 'Cash', type: AccountType.ASSET, subtype: 'Bank', parentCode: '1100', description: 'Money in bank accounts and cash on hand', fsliBucket: 'Cash and Cash Equivalents' },
  { accountCode: '1120', name: 'Accounts Receivable', type: AccountType.ASSET, subtype: 'Receivable', parentCode: '1100', isSubledger: true, subledgerType: 'accounts_receivable', description: 'Money owed to the business by customers', fsliBucket: 'Accounts Receivable' },
  { accountCode: '1130', name: 'Inventory', type: AccountType.ASSET, subtype: 'Inventory', parentCode: '1100', description: 'Goods available for sale or materials used in production', fsliBucket: 'Inventory' },
  { accountCode: '1140', name: 'Prepaid Expenses', type: AccountType.ASSET, subtype: 'Other Current Asset', parentCode: '1100', description: 'Expenses paid in advance such as insurance or rent', fsliBucket: 'Prepaid Expenses' },
  { accountCode: '1150', name: 'Short-term Investments', type: AccountType.ASSET, subtype: 'Investment', parentCode: '1100', description: 'Investments expected to be converted to cash within one year', fsliBucket: 'Short-term Investments' },
  { accountCode: '1400', name: 'Fixed Assets', type: AccountType.ASSET, parentCode: '1', description: 'Long-term assets used in business operations', fsliBucket: 'Property, Plant and Equipment', internalReportingBucket: 'Total Fixed Assets' },
  { accountCode: '1410', name: 'Equipment', type: AccountType.ASSET, subtype: 'Fixed Asset', parentCode: '1400', description: 'Machinery and equipment used in operations', fsliBucket: 'Property, Plant and Equipment', item: 'Equipment' },
  { accountCode: '1420', name: 'Furniture and Fixtures', type: AccountType.ASSET, subtype: 'Fixed Asset', parentCode: '1400', description: 'Office furniture and permanent fixtures', fsliBucket: 'Property, Plant and Equipment', item: 'Furniture and Fixtures' },
  { accountCode: '1430', name: 'Buildings', type: AccountType.ASSET, subtype: 'Fixed Asset', parentCode: '1400', description: 'Structures owned by the business', fsliBucket: 'Property, Plant and Equipment', item: 'Buildings' },
  { accountCode: '1440', name: 'Land', type: AccountType.ASSET, subtype: 'Fixed Asset', parentCode: '1400', description: 'Real estate owned by the business', fsliBucket: 'Property, Plant and Equipment', item: 'Land' },
  { accountCode: '1450', name: 'Vehicles', type: AccountType.ASSET, subtype: 'Fixed Asset', parentCode: '1400', description: 'Cars, trucks, and other transportation equipment', fsliBucket: 'Property, Plant and Equipment', item: 'Vehicles' },
  { accountCode: '1490', name: 'Accumulated Depreciation', type: AccountType.ASSET, subtype: 'Contra Asset', parentCode: '1400', description: 'Total depreciation taken against fixed assets', fsliBucket: 'Property, Plant and Equipment', item: 'Accumulated Depreciation' },
  { accountCode: '1800', name: 'Other Assets', type: AccountType.ASSET, parentCode: '1', description: 'Assets not classified as current or fixed', fsliBucket: 'Other Assets', internalReportingBucket: 'Other Assets' },
  { accountCode: '1810', name: 'Intangible Assets', type: AccountType.ASSET, subtype: 'Other Asset', parentCode: '1800', description: 'Non-physical assets like patents, trademarks, and goodwill', fsliBucket: 'Intangible Assets' },
  { accountCode: '1820', name: 'Long-term Investments', type: AccountType.ASSET, subtype: 'Investment', parentCode: '1800', description: 'Investments held for more than one year', fsliBucket: 'Long-term Investments' },
  
  // Liabilities (2xxx)
  { accountCode: '2', name: 'Liabilities', type: AccountType.LIABILITY, parentCode: null, description: 'Obligations and debts owed by the business', fsliBucket: 'Liabilities', internalReportingBucket: 'Total Liabilities' },
  { accountCode: '2100', name: 'Current Liabilities', type: AccountType.LIABILITY, parentCode: '2', description: 'Debts due within one year', fsliBucket: 'Current Liabilities', internalReportingBucket: 'Total Current Liabilities' },
  { accountCode: '2110', name: 'Accounts Payable', type: AccountType.LIABILITY, subtype: 'Payable', parentCode: '2100', isSubledger: true, subledgerType: 'accounts_payable', description: 'Money owed to suppliers for goods or services purchased on credit', fsliBucket: 'Accounts Payable' },
  { accountCode: '2120', name: 'Accrued Expenses', type: AccountType.LIABILITY, subtype: 'Other Current Liability', parentCode: '2100', description: 'Expenses incurred but not yet paid', fsliBucket: 'Accrued Liabilities' },
  { accountCode: '2130', name: 'Payroll Liabilities', type: AccountType.LIABILITY, subtype: 'Payroll', parentCode: '2100', description: 'Amounts owed to employees and tax authorities for payroll', fsliBucket: 'Accrued Liabilities', item: 'Payroll' },
  { accountCode: '2140', name: 'Short-term Loans', type: AccountType.LIABILITY, subtype: 'Loan', parentCode: '2100', description: 'Loans due within one year', fsliBucket: 'Short-term Debt' },
  { accountCode: '2150', name: 'Current Portion of Long-term Debt', type: AccountType.LIABILITY, subtype: 'Loan', parentCode: '2100', description: 'Principal due within one year on long-term debt', fsliBucket: 'Current Portion of Long-term Debt' },
  { accountCode: '2160', name: 'Unearned Revenue', type: AccountType.LIABILITY, subtype: 'Other Current Liability', parentCode: '2100', description: 'Payments received from customers before goods or services are delivered', fsliBucket: 'Deferred Revenue' },
  { accountCode: '2170', name: 'Sales Tax Payable', type: AccountType.LIABILITY, subtype: 'Tax', parentCode: '2100', description: 'Sales tax collected from customers but not yet paid to the government', fsliBucket: 'Taxes Payable' },
  { accountCode: '2400', name: 'Long-term Liabilities', type: AccountType.LIABILITY, parentCode: '2', description: 'Debts due beyond one year', fsliBucket: 'Long-term Liabilities', internalReportingBucket: 'Total Long-term Liabilities' },
  { accountCode: '2410', name: 'Mortgage Payable', type: AccountType.LIABILITY, subtype: 'Loan', parentCode: '2400', description: 'Long-term loans secured by real estate', fsliBucket: 'Long-term Debt', item: 'Mortgage' },
  { accountCode: '2420', name: 'Notes Payable', type: AccountType.LIABILITY, subtype: 'Loan', parentCode: '2400', description: 'Formal written promises to pay specified amounts', fsliBucket: 'Long-term Debt', item: 'Notes' },
  { accountCode: '2430', name: 'Bonds Payable', type: AccountType.LIABILITY, subtype: 'Loan', parentCode: '2400', description: 'Long-term debt securities issued by the business', fsliBucket: 'Long-term Debt', item: 'Bonds' },
  
  // Equity (3xxx)
  { accountCode: '3', name: 'Equity', type: AccountType.EQUITY, parentCode: null, description: 'Ownership interest in the business', fsliBucket: 'Equity', internalReportingBucket: 'Total Equity' },
  { accountCode: '3100', name: 'Owner\'s Equity', type: AccountType.EQUITY, parentCode: '3', description: 'Owner\'s investment in the business', fsliBucket: 'Owner\'s Equity' },
  { accountCode: '3110', name: 'Capital', type: AccountType.EQUITY, subtype: 'Capital', parentCode: '3100', description: 'Owner\'s contributions to the business', fsliBucket: 'Owner\'s Equity', item: 'Capital' },
  { accountCode: '3120', name: 'Owner Draws', type: AccountType.EQUITY, subtype: 'Draw', parentCode: '3100', description: 'Withdrawals of business assets for personal use', fsliBucket: 'Owner\'s Equity', item: 'Draws' },
  { accountCode: '3200', name: 'Retained Earnings', type: AccountType.EQUITY, parentCode: '3', description: 'Accumulated profits reinvested in the business', fsliBucket: 'Retained Earnings' },
  { accountCode: '3300', name: 'Common Stock', type: AccountType.EQUITY, parentCode: '3', description: 'Shares of ownership issued to stockholders', fsliBucket: 'Common Stock' },
  { accountCode: '3400', name: 'Additional Paid-in Capital', type: AccountType.EQUITY, parentCode: '3', description: 'Amount paid by shareholders for stock in excess of par value', fsliBucket: 'Additional Paid-in Capital' },
  
  // Revenue (4xxx)
  { accountCode: '4', name: 'Revenue', type: AccountType.REVENUE, parentCode: null, description: 'Income earned from business activities', fsliBucket: 'Revenue', internalReportingBucket: 'Total Revenue' },
  { accountCode: '4100', name: 'Operating Revenue', type: AccountType.REVENUE, parentCode: '4', description: 'Income from primary business activities', fsliBucket: 'Revenue', internalReportingBucket: 'Operating Revenue' },
  { accountCode: '4110', name: 'Service Revenue', type: AccountType.REVENUE, subtype: 'Service', parentCode: '4100', description: 'Income from services provided to customers', fsliBucket: 'Revenue', item: 'Services' },
  { accountCode: '4120', name: 'Product Sales', type: AccountType.REVENUE, subtype: 'Sales', parentCode: '4100', description: 'Income from selling goods to customers', fsliBucket: 'Revenue', item: 'Product Sales' },
  { accountCode: '4200', name: 'Other Revenue', type: AccountType.REVENUE, parentCode: '4', description: 'Income from secondary business activities', fsliBucket: 'Other Income', internalReportingBucket: 'Non-Operating Revenue' },
  { accountCode: '4210', name: 'Interest Income', type: AccountType.REVENUE, subtype: 'Other Revenue', parentCode: '4200', description: 'Income earned from investments or bank accounts', fsliBucket: 'Other Income', item: 'Interest' },
  { accountCode: '4220', name: 'Rental Income', type: AccountType.REVENUE, subtype: 'Other Revenue', parentCode: '4200', description: 'Income from renting property to others', fsliBucket: 'Other Income', item: 'Rental' },
  { accountCode: '4230', name: 'Gain on Sale of Assets', type: AccountType.REVENUE, subtype: 'Other Revenue', parentCode: '4200', description: 'Profits from selling business assets', fsliBucket: 'Other Income', item: 'Asset Sales' },
  
  // Expenses (5xxx-9xxx)
  { accountCode: '5', name: 'Expenses', type: AccountType.EXPENSE, parentCode: null, description: 'Costs incurred in business operations', fsliBucket: 'Expenses', internalReportingBucket: 'Total Expenses' },
  { accountCode: '5100', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, parentCode: '5', description: 'Direct costs of producing goods or services sold', fsliBucket: 'Cost of Goods Sold', internalReportingBucket: 'Total COGS' },
  { accountCode: '5110', name: 'Purchases', type: AccountType.EXPENSE, subtype: 'COGS', parentCode: '5100', description: 'Cost of inventory bought for resale', fsliBucket: 'Cost of Goods Sold', item: 'Purchases' },
  { accountCode: '5120', name: 'Direct Labor', type: AccountType.EXPENSE, subtype: 'COGS', parentCode: '5100', description: 'Wages paid to employees directly involved in production', fsliBucket: 'Cost of Goods Sold', item: 'Direct Labor' },
  { accountCode: '5130', name: 'Manufacturing Overhead', type: AccountType.EXPENSE, subtype: 'COGS', parentCode: '5100', description: 'Indirect costs of production not easily traceable to specific products', fsliBucket: 'Cost of Goods Sold', item: 'Manufacturing Overhead' },
  { accountCode: '6000', name: 'Operating Expenses', type: AccountType.EXPENSE, parentCode: '5', description: 'Costs of running the business not directly tied to production', fsliBucket: 'Operating Expenses', internalReportingBucket: 'Operating Expenses' },
  { accountCode: '6100', name: 'Office Expenses', type: AccountType.EXPENSE, parentCode: '6000', description: 'Costs related to office operations', fsliBucket: 'Operating Expenses', internalReportingBucket: 'Office Expenses' },
  { accountCode: '6110', name: 'Office Supplies', type: AccountType.EXPENSE, subtype: 'Office', parentCode: '6100', description: 'Consumable items used in the office', fsliBucket: 'Operating Expenses', item: 'Office Supplies' },
  { accountCode: '6120', name: 'Office Equipment', type: AccountType.EXPENSE, subtype: 'Office', parentCode: '6100', description: 'Small equipment items not capitalized', fsliBucket: 'Operating Expenses', item: 'Office Equipment' },
  { accountCode: '6200', name: 'Payroll Expenses', type: AccountType.EXPENSE, parentCode: '6000', description: 'All costs related to employee compensation', fsliBucket: 'Operating Expenses', internalReportingBucket: 'Payroll Expenses' },
  { accountCode: '6210', name: 'Salaries and Wages', type: AccountType.EXPENSE, subtype: 'Payroll', parentCode: '6200', description: 'Regular pay to employees', fsliBucket: 'Operating Expenses', item: 'Salaries and Wages' },
  { accountCode: '6220', name: 'Payroll Taxes', type: AccountType.EXPENSE, subtype: 'Payroll', parentCode: '6200', description: 'Employer portion of taxes on employee wages', fsliBucket: 'Operating Expenses', item: 'Payroll Taxes' },
  { accountCode: '6230', name: 'Employee Benefits', type: AccountType.EXPENSE, subtype: 'Payroll', parentCode: '6200', description: 'Health insurance, retirement plans, and other benefits', fsliBucket: 'Operating Expenses', item: 'Employee Benefits' },
  { accountCode: '6300', name: 'Rent and Utilities', type: AccountType.EXPENSE, parentCode: '6000', description: 'Costs for business facilities', fsliBucket: 'Operating Expenses', internalReportingBucket: 'Facilities' },
  { accountCode: '6310', name: 'Rent', type: AccountType.EXPENSE, subtype: 'Facilities', parentCode: '6300', description: 'Payments for leased property', fsliBucket: 'Operating Expenses', item: 'Rent' },
  { accountCode: '6320', name: 'Utilities', type: AccountType.EXPENSE, subtype: 'Facilities', parentCode: '6300', description: 'Electricity, water, gas, internet, and phone services', fsliBucket: 'Operating Expenses', item: 'Utilities' },
  { accountCode: '6400', name: 'Professional Services', type: AccountType.EXPENSE, parentCode: '6000', description: 'Fees paid to outside service providers', fsliBucket: 'Operating Expenses', internalReportingBucket: 'Professional Services' },
  { accountCode: '6410', name: 'Legal Fees', type: AccountType.EXPENSE, subtype: 'Professional Services', parentCode: '6400', description: 'Costs for legal counsel and services', fsliBucket: 'Operating Expenses', item: 'Legal' },
  { accountCode: '6420', name: 'Accounting Fees', type: AccountType.EXPENSE, subtype: 'Professional Services', parentCode: '6400', description: 'Costs for accounting and bookkeeping services', fsliBucket: 'Operating Expenses', item: 'Accounting' },
  { accountCode: '6430', name: 'Consulting Fees', type: AccountType.EXPENSE, subtype: 'Professional Services', parentCode: '6400', description: 'Payments to consultants and advisors', fsliBucket: 'Operating Expenses', item: 'Consulting' },
  { accountCode: '6500', name: 'Insurance', type: AccountType.EXPENSE, parentCode: '6000', description: 'Business insurance premiums', fsliBucket: 'Operating Expenses', item: 'Insurance' },
  { accountCode: '6600', name: 'Marketing and Advertising', type: AccountType.EXPENSE, parentCode: '6000', description: 'Costs to promote the business', fsliBucket: 'Operating Expenses', item: 'Marketing' },
  { accountCode: '6700', name: 'Travel and Entertainment', type: AccountType.EXPENSE, parentCode: '6000', description: 'Business travel, meals, and entertainment expenses', fsliBucket: 'Operating Expenses', item: 'Travel & Entertainment' },
  { accountCode: '6800', name: 'Depreciation Expense', type: AccountType.EXPENSE, subtype: 'Depreciation', parentCode: '6000', description: 'Allocation of asset costs over their useful lives', fsliBucket: 'Operating Expenses', item: 'Depreciation' },
  { accountCode: '7000', name: 'Other Expenses', type: AccountType.EXPENSE, parentCode: '5', description: 'Expenses not classified elsewhere', fsliBucket: 'Other Expenses', internalReportingBucket: 'Non-Operating Expenses' },
  { accountCode: '7100', name: 'Interest Expense', type: AccountType.EXPENSE, subtype: 'Other Expense', parentCode: '7000', description: 'Interest paid on loans and credit', fsliBucket: 'Interest Expense' },
  { accountCode: '7200', name: 'Bank Fees', type: AccountType.EXPENSE, subtype: 'Other Expense', parentCode: '7000', description: 'Charges for banking services', fsliBucket: 'Other Expenses', item: 'Bank Fees' },
  { accountCode: '7300', name: 'Loss on Sale of Assets', type: AccountType.EXPENSE, subtype: 'Other Expense', parentCode: '7000', description: 'Losses from selling business assets', fsliBucket: 'Other Expenses', item: 'Asset Sales Losses' },
  { accountCode: '9000', name: 'Income Taxes', type: AccountType.EXPENSE, parentCode: '5', description: 'Taxes paid on business profits', fsliBucket: 'Income Tax Expense' },
];