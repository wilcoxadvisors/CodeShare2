import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useEntity } from '@/contexts/EntityContext';
import { getJournalEntryUrl } from '@/api/urlHelpers';

/**
 * Hook to fetch a journal entry for editing
 * This hook is designed to be used in the NewJournalEntry component
 * when the component is rendered in edit mode
 */
export function useEditJournalEntry() {
  // Get the entry ID from the URL parameters
  const params = useParams<{ id: string }>();
  const entryId = params?.id ? parseInt(params.id) : undefined;
  const { currentEntity } = useEntity();
  const clientId = currentEntity?.clientId;
  const entityId = currentEntity?.id;
  
  console.log("useEditJournalEntry - Entry ID from URL:", entryId);
  console.log("useEditJournalEntry - Client ID:", clientId, "Entity ID:", entityId);
  
  // Fetch the journal entry data using hierarchical URL pattern
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: entryId && clientId && entityId 
      ? [getJournalEntryUrl(clientId, entityId, entryId)] 
      : ['no-entry-id'],
    enabled: !!entryId && !!clientId && !!entityId,
    staleTime: 0, // Always fetch fresh data when editing
  });
  
  // Log the response for debugging
  if (data) {
    console.log("useEditJournalEntry - Journal entry data:", data);
  }
  
  if (error) {
    console.error("useEditJournalEntry - Error fetching journal entry:", error);
  }
  
  // Process the data to handle different API response formats
  console.log("useEditJournalEntry - Raw API response structure:", 
    data ? Object.keys(data).join(', ') : 'null data');
  
  // Extract the journal entry data from response
  const journalEntry = data ? 
    (data && typeof data === 'object' && 'journalEntry' in data ? data.journalEntry : data) 
    : null;
  
  console.log("useEditJournalEntry - Extracted journal entry structure:", 
    journalEntry ? Object.keys(journalEntry).join(', ') : 'null journalEntry');
  
  if (journalEntry) {
    console.log("useEditJournalEntry - Journal entry status:", journalEntry.status);
  }
  
  // Convert server format lines (type/amount) to client format (debit/credit) if needed
  let processedEntry = journalEntry;
  
  // Helper function to format numbers with commas and 2 decimal places
  const formatNumberWithSeparator = (value: string | number): string => {
    if (!value && value !== 0) return '';
    
    // Convert to number then to string with 2 decimal places
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '';
    
    // Format with 2 decimal places
    const withDecimals = numValue.toFixed(2);
    
    // Add thousand separators
    return withDecimals.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  if (journalEntry && journalEntry.lines && Array.isArray(journalEntry.lines)) {
    console.log("useEditJournalEntry - Journal entry lines count:", journalEntry.lines.length);
    
    if (journalEntry.lines.length > 0) {
      const firstLine = journalEntry.lines[0];
      console.log("useEditJournalEntry - First line structure:", 
        firstLine ? Object.keys(firstLine).join(', ') : 'empty line');
      console.log("useEditJournalEntry - Journal entry lines sample:", 
        JSON.stringify(journalEntry.lines.slice(0, 2), null, 2));
      
      // Check if the first line is in server format
      const isServerFormat = firstLine && 'type' in firstLine && 'amount' in firstLine;
      console.log("useEditJournalEntry - Line format: ", isServerFormat ? "SERVER (type/amount)" : "CLIENT (debit/credit)");
      
      if (isServerFormat) {
        console.log("useEditJournalEntry - Converting server format to client format");
        
        // Convert server format to client format
        const convertedLines = journalEntry.lines.map((line, index) => {
          console.log(`useEditJournalEntry - Converting line ${index + 1} of ${journalEntry.lines.length}:`, 
            JSON.stringify(line, null, 2));
          
          // Format the amount with commas and 2 decimal places
          const formattedAmount = formatNumberWithSeparator(line.amount || 0);
          
          const convertedLine = {
            accountId: line.accountId.toString(),
            entityCode: line.entityCode || '',
            description: line.description || '',
            debit: line.type === 'debit' ? formattedAmount : '',
            credit: line.type === 'credit' ? formattedAmount : '',
            tags: line.tags || [], // Preserve dimension tags during conversion
            id: line.id, // Preserve line ID for updates
          };
          
          console.log(`useEditJournalEntry - Line ${index + 1} converted from type='${line.type}', amount=${line.amount} to:`, 
            JSON.stringify(convertedLine, null, 2));
            
          return convertedLine;
        });
        
        console.log("useEditJournalEntry - All lines converted from server to client format");
        
        processedEntry = {
          ...journalEntry,
          lines: convertedLines
        };
      } else {
        // Even if not in server format, ensure accountId is a string 
        // and format debit/credit values properly
        const normalizedLines = journalEntry.lines.map(line => ({
          ...line,
          accountId: line.accountId ? line.accountId.toString() : '',
          debit: formatNumberWithSeparator(line.debit || 0),
          credit: formatNumberWithSeparator(line.credit || 0),
        }));
        
        processedEntry = {
          ...journalEntry,
          lines: normalizedLines
        };
      }
    }
    
    if (processedEntry && processedEntry.lines) {
      console.log("useEditJournalEntry - Processed entry lines:", processedEntry.lines);
    }
  } else {
    console.log("useEditJournalEntry - No lines found in journal entry");
  }
  
  // Ensure we return files if they exist in the journal entry
  // Bug fix #1 - ensure files are preserved when editing a journal entry
  if (processedEntry) {
    // Log the files data for debugging
    console.log("useEditJournalEntry - Files in processedEntry:", processedEntry.files);
    console.log("useEditJournalEntry - Raw data has files:", data && 'files' in data ? data.files : 'no files in data');
    
    processedEntry = {
      ...processedEntry,
      files: processedEntry.files ?? [] // Preserve files array
    };
    
    console.log("useEditJournalEntry - Final processedEntry.files:", processedEntry.files);
  }

  return {
    journalEntry: processedEntry,
    isLoading,
    error,
    isEditMode: !!entryId
  };
}