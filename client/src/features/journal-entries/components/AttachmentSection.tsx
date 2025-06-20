import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Eye } from 'lucide-react';

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
  attachments: any[]; // This will be the single source of truth for all files
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
  const [isDragOver, setIsDragOver] = useState(false);

  // Calculate if there are files
  const hasAttachedFiles = attachments.length > 0;

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInEditMode) {
      setIsDragOver(true);
    }
  }, [isInEditMode]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (!isInEditMode) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Validate file types and sizes
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      const allowedTypes = [
        'application/pdf', 
        'image/jpeg', 
        'image/png', 
        'image/gif',
        'application/vnd.ms-outlook', // MSG files
        'message/rfc822', // EML files
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      const invalidFiles = files.filter(file => 
        file.size > maxSize || !allowedTypes.includes(file.type)
      );

      if (invalidFiles.length > 0) {
        toast({
          title: "Invalid Files",
          description: `${invalidFiles.length} file(s) rejected. Files must be under 10MB and of supported type.`,
          variant: "destructive",
        });
        return;
      }

      onAddAttachments(files);
    }
  }, [isInEditMode, onAddAttachments, toast]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) {
      return '🖼️';
    } else if (mimeType === 'application/pdf') {
      return '📄';
    } else if (mimeType?.includes('word') || mimeType?.includes('document')) {
      return '📝';
    } else if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
      return '📊';
    } else {
      return '📎';
    }
  };

  // Rewired file input handler - passes files directly to parent
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    
    // Validate file types and sizes
    const invalidFiles = newFiles.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      const allowedTypes = [
        'application/pdf', 
        'image/jpeg', 
        'image/png', 
        'image/gif',
        'application/vnd.ms-outlook', // MSG files
        'message/rfc822', // EML files
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      return file.size > maxSize || !allowedTypes.includes(file.type);
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid Files",
        description: `${invalidFiles.length} file(s) rejected. Files must be under 10MB and of supported type.`,
        variant: "destructive",
      });
      return;
    }

    // Pass valid files to parent
    onAddAttachments(newFiles);
    event.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Attachments
          {hasAttachedFiles && (
            <span className="text-sm font-normal text-muted-foreground">
              ({attachments.length} file{attachments.length !== 1 ? 's' : ''})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Section - Only show in edit mode */}
        {isInEditMode && (
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className={`mx-auto h-12 w-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <div className="mt-4">
              <span className={`mt-2 block text-sm font-medium ${isDragOver ? 'text-blue-900' : 'text-gray-900'}`}>
                {isDragOver ? 'Drop files here!' : 'Drop files here or click anywhere to upload'}
              </span>
              <p className="text-xs text-gray-500 mt-2">
                Supported: PDF, Images, Word, Excel, Email files (Max 10MB each)
              </p>
              <Input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.msg,.eml,.txt,.doc,.docx"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}

        {/* Existing Files List */}
        {hasAttachedFiles && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Attached Files</h4>
            {attachments.map((file: JournalEntryFile) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-lg">{getFileIcon(file.mimeType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Fixed Download Link - uses new download route */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/api/clients/${clientId}/entities/${entityId}/journal-entries/${journalEntryId}/files/${file.id}/download`, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {/* Rewired Delete Button - calls parent callback */}
                  {isInEditMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveAttachment(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasAttachedFiles && !isInEditMode && (
          <p className="text-sm text-gray-500 text-center py-4">
            No attachments
          </p>
        )}
      </CardContent>
    </Card>
  );
}