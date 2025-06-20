import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Eye, FileText, Download } from 'lucide-react';
import { JournalEntryStatus } from '@shared/schema';

interface JournalEntryFile {
  id: number;
  journalEntryId: number;
  filename: string;
  originalname?: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedBy: number;
  uploadedAt: string | Date;
}

interface AttachmentSectionProps {
  entityId: number;
  clientId: number;
  journalEntryId: number | null | undefined;
  isInEditMode: boolean;
  onUploadToEntryRef: React.MutableRefObject<((entryId: number) => Promise<void>) | null>;
}

export function AttachmentSection({
  entityId,
  clientId,
  journalEntryId,
  isInEditMode,
  onUploadToEntryRef,
}: AttachmentSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SURGICAL FIX #1: Use proper useJournalEntryFiles hook for data fetching
  const { data: actualAttachments = [], isLoading } = useQuery({
    queryKey: ['journalEntryAttachments', clientId, entityId, journalEntryId],
    queryFn: async () => {
      if (!journalEntryId) return [];
      const response = await fetch(`/api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json();
    },
    enabled: !!journalEntryId,
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setPendingFiles(prev => [...prev, ...Array.from(event.target.files || [])]);
      event.target.value = '';
    }
  };

  // SURGICAL FIX #2: Implement proper upload mutation with cache invalidation
  const uploadMutation = useMutation({
    mutationFn: async ({ files, entryId }: { files: File[], entryId: number }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await fetch(`/api/clients/${clientId}/entities/${entityId}/journal-entries/${entryId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntryAttachments'] });
      setPendingFiles([]);
      toast({ title: "Success", description: "Files uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload files", variant: "destructive" });
    }
  });

  // SURGICAL FIX #3: Implement proper delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await fetch(`/api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntryAttachments'] });
      toast({ title: "Success", description: "File deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete file", variant: "destructive" });
    }
  });

  // SURGICAL FIX #4: Expose upload function to parent via ref
  useEffect(() => {
    onUploadToEntryRef.current = async (entryId: number) => {
      if (pendingFiles.length > 0) {
        await uploadMutation.mutateAsync({ files: pendingFiles, entryId });
      }
    };
  }, [pendingFiles, uploadMutation, onUploadToEntryRef]);

  const handleDeleteFile = (fileId: number) => {
    deleteMutation.mutate(fileId);
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileText className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // SURGICAL FIX #5: Display both pending and actual attachments
  const allFiles = [...(actualAttachments || []), ...pendingFiles.map(file => ({
    id: `pending-${file.name}`,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
    isPending: true
  }))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Attachments</h3>
        {isInEditMode && (
          <div className="flex items-center space-x-2">
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt,.msg,.eml"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Files
            </Button>
          </div>
        )}
      </div>

      {/* Display all attachments (existing + pending) */}
      {allFiles.length > 0 && (
        <div className="grid gap-2">
          {allFiles.map((file: any) => (
            <div
              key={file.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${file.isPending ? 'bg-yellow-50' : 'bg-gray-50'}`}
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(file.mimeType)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {file.filename}
                    {file.isPending && <span className="ml-2 text-xs text-yellow-600">(Pending)</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                    {!file.isPending && file.uploadedAt && (
                      <> • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {!file.isPending && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${file.id}/download`, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {isInEditMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => file.isPending 
                      ? setPendingFiles(prev => prev.filter(f => f.name !== file.filename))
                      : handleDeleteFile(file.id)
                    }
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {allFiles.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            {isInEditMode ? 'No files attached. Click "Add Files" to upload.' : 'No files attached to this journal entry.'}
          </p>
        </div>
      )}
    </div>
  );
}