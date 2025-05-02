import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  getJournalEntryFilesBaseUrl, 
  getJournalEntryFileUrl,
  getJournalEntryUrl,
  getJournalEntryFileDownloadUrl,
  getLegacyJournalEntryFilesUrl,
  getLegacyJournalEntryFileUrl
} from '@/api/urlHelpers';

/**
 * Interface for journal entry file attachments
 */
export interface JournalEntryFile {
  id: number;
  journalEntryId: number;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedBy: number;
  uploadedAt: Date;
}

/**
 * Hook to fetch files attached to a journal entry
 */
export function useJournalEntryFiles(journalEntryId: number | undefined | null, entityId: number, clientId: number) {
  return useQuery<JournalEntryFile[]>({
    queryKey: ['journalEntryAttachments', journalEntryId],
    queryFn: async () => {
      if (!journalEntryId || !entityId || !clientId) return [];
      
      // Always use the hierarchical URL pattern
      const url = getJournalEntryFilesBaseUrl(clientId, entityId, journalEntryId);
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      
      return response?.data || [];
    },
    enabled: !!(journalEntryId && entityId && clientId),
  });
}

/**
 * Hook to upload files to a journal entry
 */
export function useUploadJournalEntryFile(journalEntryId: number | undefined | null, entityId: number, clientId: number) {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ files, onProgress }: { 
      files: File[], 
      onProgress?: (progress: number) => void 
    }) => {
      if (!journalEntryId) {
        throw new Error('Journal entry ID is required');
      }
      
      if (!entityId) {
        throw new Error('Entity ID is required');
      }
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      // Always use hierarchical URL pattern
      const url = getJournalEntryFilesBaseUrl(clientId, entityId, journalEntryId);
      
      // Use axios for progress tracking if onProgress is provided
      if (onProgress) {
        const axios = (await import('axios')).default;
        
        // Bug fix #7: Do NOT set Content-Type header when using FormData
        // Let the browser automatically set the correct multipart boundary parameter
        console.log("DEBUG: Uploading file with progress tracking to URL:", url);
        const response = await axios.post(
          url, 
          formData,
          {
            // Important: Don't manually set Content-Type when using FormData
            // The browser needs to set this automatically with the boundary parameter
            headers: {
              // Explicitly remove content type - let browser handle it
              'Content-Type': undefined
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
              }
            }
          }
        );
        
        return response.data;
      } else {
        // Use standard apiRequest if no progress tracking is needed
        console.log("DEBUG: Uploading file without progress tracking to URL:", url);
        
        // Bug fix #7: Make sure apiRequest properly handles FormData
        return await apiRequest(url, {
          method: 'POST',
          data: formData,
          // Important: Ensure apiRequest doesn't set Content-Type for FormData
          isFormData: true
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Files uploaded',
        description: 'Files were successfully uploaded to the journal entry.',
      });
      
      if (journalEntryId) {
        // Invalidate the attachments query to refresh the list
        queryClient.invalidateQueries({ 
          queryKey: ['journalEntryAttachments', journalEntryId] 
        });
        
        // Invalidate the hierarchical journal entry URL
        queryClient.invalidateQueries({ 
          queryKey: [getJournalEntryUrl(clientId, entityId, journalEntryId)] 
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      toast({
        title: 'Upload failed',
        description: `Failed to upload files: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
}

/**
 * Hook to delete a file from a journal entry
 */
export function useDeleteJournalEntryFile() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      clientId,
      entityId,
      journalEntryId, 
      fileId 
    }: { 
      clientId: number,
      entityId: number,
      journalEntryId: number, 
      fileId: number 
    }) => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      // Always use hierarchical URL pattern
      const url = getJournalEntryFileUrl(clientId, entityId, journalEntryId, fileId);
      
      console.log("DEBUG: Deleting file using URL:", url);
      
      return await apiRequest(url, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'File deleted',
        description: 'File was successfully deleted.',
      });
      
      // Immediately update UI by optimistically updating the cache
      queryClient.setQueryData(
        ['journalEntryAttachments', variables.journalEntryId],
        (oldData: JournalEntryFile[] | undefined) => {
          if (!oldData) return [];
          // Filter out the deleted file
          return oldData.filter(file => file.id !== variables.fileId);
        }
      );
      
      // Invalidate the attachments query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['journalEntryAttachments', variables.journalEntryId] 
      });
      
      // Invalidate the hierarchical journal entry URL
      queryClient.invalidateQueries({ 
        queryKey: [getJournalEntryUrl(variables.clientId, variables.entityId, variables.journalEntryId)] 
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      toast({
        title: 'Deletion failed',
        description: `Failed to delete file: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  });
}