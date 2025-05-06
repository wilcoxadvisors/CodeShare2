import React, { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useJournalEntry } from '../hooks/useJournalEntry';

const DeleteJournalEntry: React.FC = () => {
  const { deleteJournalEntry } = useJournalEntry();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [match, params] = useRoute('/clients/:clientId/entities/:entityId/journal-entries/:id/delete');
  
  const entryId = params?.id ? parseInt(params.id, 10) : null;
  const clientId = params?.clientId ? parseInt(params.clientId, 10) : null;
  const entityId = params?.entityId ? parseInt(params.entityId, 10) : null;
  
  useEffect(() => {
    if (entryId && clientId && entityId) {
      const confirmDelete = window.confirm('Are you sure you want to delete this journal entry? This action cannot be undone.');
      
      if (confirmDelete) {
        deleteJournalEntry.mutate(entryId, {
          onSuccess: () => {
            toast({
              title: 'Success',
              description: 'Journal entry deleted successfully',
            });
            navigate(`/clients/${clientId}/entities/${entityId}/journal-entries`);
          },
          onError: (error: any) => {
            toast({
              title: 'Error',
              description: `Failed to delete journal entry: ${error.message}`,
              variant: 'destructive',
            });
            navigate(`/clients/${clientId}/entities/${entityId}/journal-entries/${entryId}`);
          }
        });
      } else {
        // If user cancels deletion, navigate back to the detail page
        navigate(`/clients/${clientId}/entities/${entityId}/journal-entries/${entryId}`);
      }
    } else {
      // If we don't have all required parameters, go back to the journal entries list
      toast({
        title: 'Error',
        description: 'Missing required parameters for journal entry deletion',
        variant: 'destructive',
      });
      navigate(`/clients/${clientId}/entities/${entityId}/journal-entries`);
    }
  }, [entryId, clientId, entityId, deleteJournalEntry, toast, navigate]);
  
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Deleting Journal Entry</h2>
        <p>Please wait while the journal entry is being deleted...</p>
      </div>
    </div>
  );
};

export default DeleteJournalEntry;