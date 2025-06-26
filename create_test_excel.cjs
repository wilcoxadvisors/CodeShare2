const XLSX = require('xlsx');

const testData = [
  { AccountCode: '1000', Amount: 1500, Description: 'Cash receipt', Date: new Date('2023-01-15'), Department: 'Sales', Location: 'New York' },
  { AccountCode: '4000', Amount: -1500, Description: 'Revenue recognition', Date: new Date('2023-01-15'), Department: 'Sales', Location: 'New York' },
  { AccountCode: '6000', Amount: 500, Description: 'Office supplies', Date: new Date('2023-01-16'), Department: 'Operations', Location: 'Boston' },
  { AccountCode: '1000', Amount: -500, Description: 'Cash payment', Date: new Date('2023-01-16'), Department: 'Operations', Location: 'Boston' }
];

const worksheet = XLSX.utils.json_to_sheet(testData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'JournalEntryLines');
XLSX.writeFile(workbook, 'test_smart_parser.xlsx');

console.log('Excel file created successfully');
