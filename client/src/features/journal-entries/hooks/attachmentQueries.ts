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
  console.log("ARCHITECT_DEBUG_ATTACHMENT_QUERY_PARAMS:", {
    journalEntryId,
    entityId,
    clientId,
    queryEnabled: !!journalEntryId && !!entityId && !!clientId
  });
  
  return useQuery<JournalEntryFile[]>({
    queryKey: ['journalEntryAttachments', journalEntryId],
    enabled: !!journalEntryId && !!entityId && !!clientId,
    queryFn: async () => {
      if (!journalEntryId || !entityId || !clientId) {
        console.log("ARCHITECT_DEBUG_ATTACHMENT_QUERY_SKIPPED:", { journalEntryId, entityId, clientId });
        return [];
      }
      
      // Always use the hierarchical URL pattern
      const url = getJournalEntryFilesBaseUrl(clientId, entityId, journalEntryId);
      
      const response = await apiRequest(url, {
        method: 'GET'
      });
      

      
      // Transform the response data to match the expected interface
      const files = response?.files || [];
      console.log("ARCHITECT_DEBUG_ATTACHMENT_TRANSFORM:", {
        filesCount: files.length,
        firstFile: files[0],
        url,
        fullResponse: response,
        responseKeys: Object.keys(response || {}),
        journalEntryId,
        entityId,
        clientId
      });
      
      return files.map((file: any) => {
        const uploadedAtDate = file.uploadedAt ? new Date(file.uploadedAt) : null;
        return {
          ...file,
          uploadedAt: uploadedAtDate && !isNaN(uploadedAtDate.getTime()) ? uploadedAtDate : null
        };
      });
    },
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
        // Include filename as third parameter to ensure proper field name and filename
        formData.append('files', file, file.name);
      });
      
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      // Always use hierarchical URL pattern
      const url = getJournalEntryFilesBaseUrl(clientId, entityId, journalEntryId);
      
      // Use axios for progress tracking if onProgress is provided
      if (onProgress) {
        const axios = (await import('axios')).default;
        
        // Do NOT set Content-Type header when using FormData
        // Let the browser automatically set the correct multipart boundary parameter
        console.log("DEBUG: Uploading file with progress tracking to URL:", url);
        
        // Create a standard XMLHttpRequest to have more control over the FormData upload
        const xhr = new XMLHttpRequest();
        
        // Add with credentials to ensure session cookies are sent
        xhr.withCredentials = true;
        
        // Set up the request
        xhr.open('POST', url, true);
        
        // Debug logging
        console.log("DEBUG: XHR file upload to URL:", url);
        console.log("DEBUG: FormData contains files count:", 
                    formData.getAll('files').length);
        
        // Add event listeners for progress tracking
        xhr.upload.onprogress = (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        };
        
        // Create a promise to handle the XHR response
        const responsePromise = new Promise((resolve, reject) => {
          xhr.onload = () => {
            console.log(`DEBUG: XHR response status: ${xhr.status}`);
            console.log(`DEBUG: XHR response headers: ${xhr.getAllResponseHeaders()}`);
            
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch (e) {
                console.log("DEBUG: XHR response is not JSON, raw response:", xhr.responseText);
                resolve({ success: true }); // If response isn't JSON
              }
            } else {
              // Log the error response
              console.error(`DEBUG: Upload failed with status ${xhr.status}: ${xhr.responseText || xhr.statusText}`);
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText || xhr.statusText}`));
            }
          };
          
          xhr.onerror = () => {
            console.error("DEBUG: Network error during file upload");
            reject(new Error('Network error during file upload'));
          };
        });
        
        // Send the FormData
        xhr.send(formData);
        
        // Wait for the response and return it
        return await responsePromise;
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
      
      if (!entityId) {
        throw new Error('Entity ID is required');
      }
      
      if (!journalEntryId) {
        throw new Error('Journal Entry ID is required');
      }
      
      if (!fileId) {
        throw new Error('File ID is required');
      }
      
      // Always use hierarchical URL pattern
      const url = getJournalEntryFileUrl(clientId, entityId, journalEntryId, fileId);
      
      console.log("DEBUG: Deleting file using URL:", url);
      
      // Use XMLHttpRequest for better debugging
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true; // Include credentials
        xhr.open('DELETE', url, true);
        
        xhr.onload = () => {
          console.log(`DEBUG: Delete file response status: ${xhr.status}, text: ${xhr.responseText || 'no text'}`);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              // If not valid JSON, still resolve if status is OK
              resolve({ success: true });
            }
          } else {
            reject(new Error(`Failed to delete file: ${xhr.status} ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => {
          console.error("Network error during file deletion");
          reject(new Error('Network error during file deletion'));
        };
        
        xhr.send();
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