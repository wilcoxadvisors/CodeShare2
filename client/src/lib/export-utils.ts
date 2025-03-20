// client/src/lib/export-utils.ts
import Papa from 'papaparse';

/**
 * Export data to CSV file and trigger download
 * @param data - The array of data objects to export
 * @param filename - The name of the file to download
 * @param fields - Optional array of field configurations
 */
export function exportToCSV<T>(
  data: T[], 
  filename: string, 
  fields?: { key: string; label: string }[]
) {
  // If fields are provided, use them to transform data
  const transformedData = fields 
    ? data.map(item => {
        const newItem: Record<string, any> = {};
        fields.forEach(field => {
          newItem[field.label] = typeof item[field.key as keyof T] !== 'undefined' 
            ? item[field.key as keyof T]
            : '';
        });
        return newItem;
      })
    : data;

  // Convert data to CSV using Papa.unparse with type assertion
  const csv = Papa.unparse(transformedData as any);
  
  // Create a Blob containing the CSV data
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  // Create a temporary URL for the Blob
  const url = URL.createObjectURL(blob);
  
  // Create a link element
  const link = document.createElement('a');
  link.href = url;
  
  // Set the filename
  link.setAttribute('download', `${filename}.csv`);
  
  // Append the link to the body (required for Firefox)
  document.body.appendChild(link);
  
  // Trigger the download
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for use in filenames
 * @returns formatted date string (YYYY-MM-DD)
 */
export function getFormattedDateForFilename(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}