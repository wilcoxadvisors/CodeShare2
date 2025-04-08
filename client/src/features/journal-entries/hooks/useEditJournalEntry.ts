import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';

/**
 * Hook to fetch a journal entry for editing
 * This hook is designed to be used in the NewJournalEntry component
 * when the component is rendered in edit mode
 */
export function useEditJournalEntry() {
  // Get the entry ID from the URL parameters
  const params = useParams<{ id: string }>();
  const entryId = params?.id;
  
  console.log("useEditJournalEntry - Entry ID from URL:", entryId);
  
  // Fetch the journal entry data
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: entryId ? [`/api/journal-entries/${entryId}`] : ['no-entry-id'],
    enabled: !!entryId,
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
  const journalEntry = data ? 
    (data && typeof data === 'object' && 'journalEntry' in data ? data.journalEntry : data) 
    : null;
  
  // Convert server format lines (type/amount) to client format (debit/credit) if needed
  let processedEntry = journalEntry;
  
  if (journalEntry && journalEntry.lines && Array.isArray(journalEntry.lines)) {
    console.log("useEditJournalEntry - Journal entry lines:", journalEntry.lines);
    
    // Check if the first line is in server format
    const firstLine = journalEntry.lines[0];
    const isServerFormat = firstLine && 'type' in firstLine && 'amount' in firstLine;
    
    if (isServerFormat) {
      console.log("useEditJournalEntry - Converting server format to client format");
      
      // Convert server format to client format
      const convertedLines = journalEntry.lines.map((line: any) => ({
        accountId: line.accountId.toString(),
        entityCode: line.entityCode || '',
        description: line.description || '',
        debit: line.type === 'debit' ? line.amount.toString() : '0',
        credit: line.type === 'credit' ? line.amount.toString() : '0',
      }));
      
      processedEntry = {
        ...journalEntry,
        lines: convertedLines
      };
    } else {
      // Even if not in server format, ensure accountId is a string 
      // for proper form field binding and comparison
      const normalizedLines = journalEntry.lines.map((line: any) => ({
        ...line,
        accountId: line.accountId ? line.accountId.toString() : '',
        debit: line.debit ? line.debit.toString() : '0',
        credit: line.credit ? line.credit.toString() : '0',
      }));
      
      processedEntry = {
        ...journalEntry,
        lines: normalizedLines
      };
    }
    
    console.log("useEditJournalEntry - Processed entry lines:", processedEntry.lines);
  } else {
    console.log("useEditJournalEntry - No lines found in journal entry");
  }
  
  return {
    journalEntry: processedEntry,
    isLoading,
    error,
    isEditMode: !!entryId
  };
}