import * as XLSX from 'xlsx';

export class BatchTemplateService {
  public generateTemplate(data: { mode: string; accounts: any[]; dimensions: any[] }): Buffer {
    const { mode, accounts, dimensions } = data;

    // 1. Create the main data entry sheet (`JournalEntryLines`)
    const mainSheetData = this.createMainSheetData(mode, dimensions);
    const mainWorksheet = XLSX.utils.json_to_sheet(mainSheetData);

    // 2. Create the reference sheets
    const coaWorksheet = XLSX.utils.json_to_sheet(
      accounts.map(acc => ({ 'Account Code': acc.accountCode, 'Account Name': acc.name, 'Type': acc.type }))
    );
    const dimWorksheet = XLSX.utils.json_to_sheet(this.flattenDimensions(dimensions));

    // 3. Create a new workbook and add all sheets
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'JournalEntryLines (EDIT THIS)');
    XLSX.utils.book_append_sheet(workbook, coaWorksheet, 'ChartOfAccountsKey (Reference)');
    XLSX.utils.book_append_sheet(workbook, dimWorksheet, 'DimensionsKey (Reference)');

    // 4. Write the workbook to a buffer in memory
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  }

  private createMainSheetData(mode: string, dimensions: any[]): any[] {
    const baseHeaders: any = {
        'EntryGroupKey': '(Optional) Example: MKTG-01',
        'AccountCode': 'Example: 60100',
        'Amount': 'Example: 5000.00 (positive for debit, negative for credit)',
        'LineDescription': 'Example: Salary for J. Doe'
    };
    
    if (mode === 'historical') {
        baseHeaders['Date'] = 'YYYY-MM-DD';
    }
    
    dimensions.forEach(dim => {
        baseHeaders[dim.name] = `(Optional) Example: ${dim.values && dim.values[0]?.code || 'VALUE_CODE'}`;
    });
    
    return [baseHeaders]; // Return an array with one example row
  }

  private flattenDimensions(dimensions: any[]): any[] {
      let flatList: any[] = [];
      dimensions.forEach(dim => {
          if (dim.values && Array.isArray(dim.values)) {
            dim.values.forEach((val: any) => {
                flatList.push({
                    'Dimension Name': dim.name,
                    'Dimension Code': dim.code,
                    'Value Name': val.name,
                    'Value Code': val.code
                });
            });
          }
      });
      return flatList;
  }
}