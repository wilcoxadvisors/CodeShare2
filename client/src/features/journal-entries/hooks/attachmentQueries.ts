import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
export function useJournalEntryFiles(journalEntryId: number | undefined | null, entityId?: number) {
  return useQuery<JournalEntryFile[]>({
    queryKey: ['journalEntryAttachments', journalEntryId],
    queryFn: async () => {
      if (!journalEntryId) return [];
      if (!entityId) return [];
      
      const response = await apiRequest(`/api/entities/${entityId}/journal-entries/${journalEntryId}/files`, {
        method: 'GET'
      });
      
      return response?.data || [];
    },
    enabled: !!journalEntryId && !!entityId,
  });
}

/**
 * Hook to upload files to a journal entry
 */
export function useUploadJournalEntryFile(journalEntryId: number | undefined | null, entityId?: number) {
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
      
      // Use axios for progress tracking if onProgress is provided
      if (onProgress) {
        const axios = (await import('axios')).default;
        
        // Bug fix #7: Do NOT set Content-Type header when using FormData
        // Let the browser automatically set the correct multipart boundary parameter
        console.log("DEBUG: Uploading file with progress tracking");
        const response = await axios.post(
          `/api/entities/${entityId}/journal-entries/${journalEntryId}/files`, 
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
        console.log("DEBUG: Uploading file without progress tracking");
        
        // Bug fix #7: Make sure apiRequest properly handles FormData
        return await apiRequest(`/api/entities/${entityId}/journal-entries/${journalEntryId}/files`, {
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
        
        // Invalidate both standard and entity-scoped journal entry endpoints
        queryClient.invalidateQueries({ 
          queryKey: [`/api/journal-entries/${journalEntryId}`] 
        });
        
        // Invalidate entity-scoped endpoint if entityId is provided
        if (entityId) {
          queryClient.invalidateQueries({ 
            queryKey: [`/api/entities/${entityId}/journal-entries/${journalEntryId}`] 
          });
        }
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
      entityId,
      journalEntryId, 
      fileId 
    }: { 
      entityId: number,
      journalEntryId: number, 
      fileId: number 
    }) => {
      return await apiRequest(`/api/entities/${entityId}/journal-entries/${journalEntryId}/files/${fileId}`, {
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
      
      // Also invalidate both the attachments query and the journal entry itself
      queryClient.invalidateQueries({ 
        queryKey: ['journalEntryAttachments', variables.journalEntryId] 
      });
      
      // Also invalidate the journal entry detail
      queryClient.invalidateQueries({ 
        queryKey: [`/api/journal-entries/${variables.journalEntryId}`] 
      });
      
      // Invalidate entity-scoped journal entries endpoint if needed
      if (variables.entityId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/entities/${variables.entityId}/journal-entries/${variables.journalEntryId}`] 
        });
      }
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