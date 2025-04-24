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
export function useJournalEntryFiles(journalEntryId: number | undefined | null) {
  return useQuery<JournalEntryFile[]>({
    queryKey: ['journalEntryAttachments', journalEntryId],
    queryFn: async () => {
      if (!journalEntryId) return [];
      
      const response = await apiRequest(`/api/journal-entries/${journalEntryId}/files`, {
        method: 'GET'
      });
      
      return response?.data || [];
    },
    enabled: !!journalEntryId,
  });
}

/**
 * Hook to upload files to a journal entry
 */
export function useUploadJournalEntryFile(journalEntryId: number | undefined | null) {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ files, onProgress }: { 
      files: File[], 
      onProgress?: (progress: number) => void 
    }) => {
      if (!journalEntryId) {
        throw new Error('Journal entry ID is required');
      }
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Use axios for progress tracking if onProgress is provided
      if (onProgress) {
        const axios = (await import('axios')).default;
        
        const response = await axios.post(
          `/api/journal-entries/${journalEntryId}/files`, 
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
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
        return await apiRequest(`/api/journal-entries/${journalEntryId}/files`, {
          method: 'POST',
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Files uploaded',
        description: 'Files were successfully uploaded to the journal entry.',
      });
      
      if (journalEntryId) {
        queryClient.invalidateQueries({ 
          queryKey: ['journalEntryAttachments', journalEntryId] 
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
      journalEntryId, 
      fileId 
    }: { 
      journalEntryId: number, 
      fileId: number 
    }) => {
      return await apiRequest(`/api/journal-entries/${journalEntryId}/files/${fileId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'File deleted',
        description: 'File was successfully deleted.',
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['journalEntryAttachments', variables.journalEntryId] 
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