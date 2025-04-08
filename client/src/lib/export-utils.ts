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
 * Parse CSV file and return structured data
 * Optimized for fast processing of large files using worker threads
 * 
 * @param file - The CSV file to import
 * @param config - Configuration options for parsing
 * @returns Promise resolving to the parsed data
 */
export function importFromCSV<T>(
  file: File,
  config: {
    header?: boolean;
    worker?: boolean;
    transformHeader?: (header: string) => string;
    skipFirstN?: number;
    onProgress?: (progress: { processed: number; total: number }) => void;
  } = {}
): Promise<{
  data: T[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}> {
  const {
    header = true,
    worker = true,
    transformHeader,
    skipFirstN = 0,
    onProgress
  } = config;
  
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    const totalRows = 0; // Will be estimated by PapaParse
    
    // Use type assertion to work around TypeScript error 
    // This is safe because PapaParse can handle File objects
    Papa.parse(file as any, {
      header,
      // Worker is a valid option in PapaParse but TypeScript doesn't know about it
      ...(worker ? { worker } as any : {}),
      skipEmptyLines: true,
      delimiter: ",", // Explicitly set delimiter for better performance
      dynamicTyping: true, // Automatically convert to numbers where appropriate
      
      // Transform headers if callback provided
      transformHeader: transformHeader || undefined,
      
      // Called on each chunk when using worker threads
      chunk: function(results: Papa.ParseResult<any>, parser: any) {
        if (skipFirstN > 0 && rowCount < skipFirstN) {
          // Skip initial rows if needed
          results.data = results.data.slice(Math.min(skipFirstN - rowCount, results.data.length));
          rowCount += skipFirstN;
        }
        
        rowCount += results.data.length;
        
        if (onProgress) {
          onProgress({
            processed: rowCount,
            total: totalRows || file.size / 100 // Rough estimate if totalRows not known
          });
        }
      },
      
      // Triggered when parsing is complete
      complete: function(results: Papa.ParseResult<any>) {
        resolve({
          data: results.data as T[],
          errors: results.errors,
          meta: results.meta
        });
      },
      
      // Triggered on error
      error: function(error: Papa.ParseError) {
        reject(error);
      }
    });
  });
}

/**
 * Format date for use in filenames
 * @returns formatted date string (YYYY-MM-DD)
 */
export function getFormattedDateForFilename(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}