import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Eye, FileText, Download } from 'lucide-react';

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
  attachments: any[]; // Single source of truth for all files
  onRemoveAttachment: (fileId: number) => void;
  onAddAttachments: (files: File[]) => void;
}

export function AttachmentSection({
  entityId,
  clientId,
  journalEntryId,
  isInEditMode,
  attachments,
  onRemoveAttachment,
  onAddAttachments,
}: AttachmentSectionProps) {
  const { toast } = useToast();

  // Handle file selection and pass to parent
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onAddAttachments(Array.from(event.target.files));
      event.target.value = ''; // Clear input
    }
  };

  // Handle file deletion by calling parent function
  const handleDeleteFile = (fileId: number) => {
    onRemoveAttachment(fileId);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Attachments</h3>
        {isInEditMode && (
          <div className="flex items-center space-x-2">
            <Input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt,.msg,.eml"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Files
            </Button>
          </div>
        )}
      </div>

      {/* Display existing attachments */}
      {attachments && attachments.length > 0 && (
        <div className="grid gap-2">
          {attachments.map((file: JournalEntryFile) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(file.mimeType)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {file.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${file.id}/download`, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {isInEditMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFile(file.id)}
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
      {(!attachments || attachments.length === 0) && (
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