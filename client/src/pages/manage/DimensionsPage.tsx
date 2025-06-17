import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEntity } from '@/contexts/EntityContext';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DimensionForm } from '@/features/manage/DimensionForm';
import DimensionValuesManager from '@/features/manage/DimensionValuesManager';
import { PlusCircle, Loader2, AlertCircle, Settings, MoreVertical, Edit, Trash2, Upload, Download } from 'lucide-react';

// Define type for a Dimension based on our schema
interface Dimension {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  values: DimensionValue[];
}

interface DimensionValue {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

interface UploadPreview {
  toCreate: Array<{
    dimensionCode: string;
    valueCode: string;
    valueName: string;
    valueDescription?: string;
    isActive: boolean;
    rowIndex: number;
  }>;
  toUpdate: Array<{
    dimensionCode: string;
    valueCode: string;
    valueName: string;
    valueDescription?: string;
    isActive: boolean;
    rowIndex: number;
    existingValue: {
      id: number;
      name: string;
      description?: string;
      isActive: boolean;
    };
    changes?: {
      name?: { from: string; to: string } | null;
      description?: { from: string; to: string } | null;
      isActive?: { from: boolean; to: boolean } | null;
    };
  }>;
  toDelete: Array<{
    dimensionCode: string;
    valueCode: string;
    valueName: string;
    valueDescription?: string;
    isActive: boolean;
    rowIndex: number;
    existingValue: {
      id: number;
      name: string;
      description?: string;
      isActive: boolean;
    };
  }>;
  unchanged: Array<{
    dimensionCode: string;
    valueCode: string;
    valueName: string;
    valueDescription?: string;
    isActive: boolean;
    rowIndex: number;
    existingValue: {
      id: number;
      name: string;
      description?: string;
      isActive: boolean;
    };
  }>;
  errors: Array<{
    message: string;
  }>;
}

const DimensionsPage = () => {
  const { selectedClientId } = useEntity();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [managingDimension, setManagingDimension] = useState<Dimension | null>(null);
  const [editingDimension, setEditingDimension] = useState<Dimension | null>(null);
  const [deletingDimension, setDeletingDimension] = useState<Dimension | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null);
  const [selectedChanges, setSelectedChanges] = useState<{[key: string]: boolean}>({});
  const [showUnchanged, setShowUnchanged] = useState(false); // Hidden by default as requested
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDimensionMutation = useMutation({
    mutationFn: (newDimension: { name: string; code: string; description?: string; }) => {
      if (!selectedClientId) throw new Error("Client not selected");
      return apiRequest(`/api/clients/${selectedClientId}/dimensions`, {
        method: 'POST',
        data: newDimension,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Dimension created successfully." });
      queryClient.invalidateQueries({ queryKey: ['dimensions', selectedClientId] });
      setCreateModalOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create dimension.", variant: "destructive" });
    }
  });

  const updateDimensionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; code: string; description?: string; } }) => {
      return apiRequest(`/api/dimensions/${id}`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Dimension updated successfully." });
      queryClient.invalidateQueries({ queryKey: ['dimensions', selectedClientId] });
      queryClient.refetchQueries({ queryKey: ['dimensions', selectedClientId] });
      setEditingDimension(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update dimension.", variant: "destructive" });
    }
  });

  const deleteDimensionMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/dimensions/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Dimension deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['dimensions', selectedClientId] });
      queryClient.refetchQueries({ queryKey: ['dimensions', selectedClientId] });
      setDeletingDimension(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete dimension.", variant: "destructive" });
    }
  });

  const masterUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedClientId) throw new Error("Client not selected");
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest(`/api/clients/${selectedClientId}/master-values-upload`, {
        method: 'POST',
        data: formData,
        isFormData: true,
      });
      
      return response;
    },
    onSuccess: (result) => {
      // Store the preview data for user confirmation
      setUploadPreview(result.preview);
      
      // Initialize selected changes - all actionable items selected by default
      const initialSelection: {[key: string]: boolean} = {};
      result.preview.toCreate.forEach((item: any, index: number) => {
        initialSelection[`create-${index}`] = true;
      });
      result.preview.toUpdate.forEach((item: any, index: number) => {
        initialSelection[`update-${index}`] = true;
      });
      result.preview.toDelete.forEach((item: any, index: number) => {
        initialSelection[`delete-${index}`] = true;
      });
      // Note: unchanged items are not selected by default as they don't need processing
      setSelectedChanges(initialSelection);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload master CSV file",
        variant: "destructive",
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (payload: { toCreate: any[], toUpdate: any[], toDelete: any[] }) => {
      if (!selectedClientId) throw new Error("Client not selected");
      
      const response = await apiRequest(`/api/clients/${selectedClientId}/master-values-confirm`, {
        method: 'POST',
        data: payload,
      });
      
      return response;
    },
    onSuccess: (result) => {
      const { created, updated, deleted, skipped, errors } = result.result;
      
      if (errors && errors.length > 0) {
        // Show detailed error information
        toast({
          title: "Changes Completed with Issues",
          description: `Created: ${created}, Updated: ${updated}, Deleted: ${deleted || 0}, Skipped: ${skipped}. Some operations failed due to constraints.`,
          variant: "destructive"
        });
        
        // Show detailed error messages
        errors.forEach((error: string) => {
          toast({
            title: "Operation Skipped",
            description: error,
            variant: "destructive"
          });
        });
      } else {
        toast({
          title: "Changes Processed Successfully",
          description: `Created: ${created}, Updated: ${updated}, Deleted: ${deleted || 0}`,
          variant: "default"
        });
      }
      
      // Clear preview state and reset file input
      setUploadPreview(null);
      setSelectedChanges({});
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Invalidate dimensions cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ['dimensions', selectedClientId] });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process changes.",
        variant: "destructive"
      });
    }
  });

  const handleCreateDimension = (values: { name: string; code: string; description?: string; }) => {
      createDimensionMutation.mutate(values);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Automatically trigger analysis when file is selected
      masterUploadMutation.mutate(file);
    }
  };

  const handleUploadMasterCSV = () => {
    // Always trigger file selection - analysis happens automatically on selection
    fileInputRef.current?.click();
  };

  const handleCancelPreview = () => {
    setUploadPreview(null);
    setSelectedChanges({});
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInlineEdit = (category: 'toCreate' | 'toUpdate', index: number, field: 'valueName' | 'valueDescription' | 'isActive', value: string | boolean) => {
    if (!uploadPreview) return;
    
    const newPreview = { ...uploadPreview };
    if (category === 'toCreate') {
      newPreview.toCreate = [...newPreview.toCreate];
      newPreview.toCreate[index] = { ...newPreview.toCreate[index], [field]: value };
    } else if (category === 'toUpdate') {
      newPreview.toUpdate = [...newPreview.toUpdate];
      newPreview.toUpdate[index] = { ...newPreview.toUpdate[index], [field]: value };
    }
    
    setUploadPreview(newPreview);
  };

  const handleSelectAllChanges = (checked: boolean) => {
    const newSelection: {[key: string]: boolean} = {};
    if (uploadPreview) {
      uploadPreview.toCreate.forEach((_, index) => {
        newSelection[`create-${index}`] = checked;
      });
      uploadPreview.toUpdate.forEach((_, index) => {
        newSelection[`update-${index}`] = checked;
      });
      uploadPreview.toDelete.forEach((_, index) => {
        newSelection[`delete-${index}`] = checked;
      });
      // Note: unchanged items are not included in select all as they don't need processing
    }
    setSelectedChanges(newSelection);
  };

  const handleRowSelectionChange = (key: string, checked: boolean) => {
    setSelectedChanges(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  const getSelectedChangeCount = () => {
    return Object.values(selectedChanges).filter(Boolean).length;
  };

  const { data: dimensionsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['dimensions', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      console.log(`DIMENSIONS_DEBUG: Fetching dimensions for client ${selectedClientId}`);
      return apiRequest(`/api/clients/${selectedClientId}/dimensions`);
    },
    enabled: !!selectedClientId,
    staleTime: 0, // Always refetch when client changes
  });

  // Correctly and safely unwrap the nested data array - handle both wrapped and direct data
  const dimensions = (dimensionsResponse?.data && Array.isArray(dimensionsResponse.data))
    ? dimensionsResponse.data
    : (Array.isArray(dimensionsResponse) ? dimensionsResponse : []);

  return (
    <div className="py-6">
      <PageHeader
        title="Dimensions"
        description="Manage dimensions to categorize transactions for powerful reporting."
      >
        <Dialog open={isCreateModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Dimension
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Dimension</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <DimensionForm 
                onSubmit={handleCreateDimension} 
                isSubmitting={createDimensionMutation.isPending} 
              />
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Master Bulk Management Section */}
        {!isLoading && !error && selectedClientId && dimensions && dimensions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Master Bulk Management
              </CardTitle>
              <CardDescription>
                Download a template with all dimension values or upload a master CSV file to manage all dimensions at once for this client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadPreview ? (
                // Preview UI
                <div className="space-y-6">
                  {/* Enhanced Summary */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-blue-900">Upload Analysis Complete</h3>
                      {uploadPreview.unchanged.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUnchanged(!showUnchanged)}
                          className="text-xs"
                        >
                          {showUnchanged ? 'Hide' : 'Show'} Unchanged ({uploadPreview.unchanged.length})
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-700">{uploadPreview.toCreate.length}</span>
                        <span className="text-gray-600">to create</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="font-medium text-orange-700">{uploadPreview.toUpdate.length}</span>
                        <span className="text-gray-600">to update</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium text-red-700">{uploadPreview.toDelete.length}</span>
                        <span className="text-gray-600">to delete</span>
                      </div>
                      {uploadPreview.errors.length > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          <span className="font-medium text-red-700">{uploadPreview.errors.length}</span>
                          <span className="text-gray-600">errors</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Errors */}
                  {uploadPreview.errors.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2">Errors Found</h4>
                      <ul className="space-y-1 text-sm text-red-800">
                        {uploadPreview.errors.map((error, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Changes Table */}
                  {(uploadPreview.toCreate.length > 0 || uploadPreview.toUpdate.length > 0 || uploadPreview.toDelete.length > 0 || uploadPreview.unchanged.length > 0) && (
                    <div className="border rounded-lg">
                      <div className="p-4 border-b bg-gray-50">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Proposed Changes</h4>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={Object.values(selectedChanges).every(Boolean) && Object.keys(selectedChanges).length > 0}
                              onCheckedChange={handleSelectAllChanges}
                            />
                            <label className="text-sm font-medium">Select All (Actionable)</label>
                          </div>
                        </div>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">Select</TableHead>
                            <TableHead className="w-[80px]">Action</TableHead>
                            <TableHead>Dimension</TableHead>
                            <TableHead>Value Code</TableHead>
                            <TableHead>Value Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Changes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadPreview.toCreate.map((item, index) => (
                            <TableRow key={`create-${index}`}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedChanges[`create-${index}`] || false}
                                  onCheckedChange={(checked) => handleRowSelectionChange(`create-${index}`, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  CREATE
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.dimensionCode}</TableCell>
                              <TableCell className="font-mono text-sm">{item.valueCode}</TableCell>
                              <TableCell>
                                <Input
                                  value={item.valueName}
                                  onChange={(e) => handleInlineEdit('toCreate', index, 'valueName', e.target.value)}
                                  className="min-w-[120px]"
                                  placeholder="Value name"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.valueDescription || ''}
                                  onChange={(e) => handleInlineEdit('toCreate', index, 'valueDescription', e.target.value)}
                                  className="min-w-[150px]"
                                  placeholder="Description (optional)"
                                />
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={item.isActive}
                                  onCheckedChange={(checked) => handleInlineEdit('toCreate', index, 'isActive', checked)}
                                />
                              </TableCell>
                              <TableCell className="text-green-700 text-sm">New value</TableCell>
                            </TableRow>
                          ))}
                          
                          {uploadPreview.toUpdate.map((item, index) => (
                            <TableRow key={`update-${index}`}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedChanges[`update-${index}`] || false}
                                  onCheckedChange={(checked) => handleRowSelectionChange(`update-${index}`, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                  UPDATE
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.dimensionCode}</TableCell>
                              <TableCell className="font-mono text-sm">{item.valueCode}</TableCell>
                              <TableCell>
                                <Input
                                  value={item.valueName}
                                  onChange={(e) => handleInlineEdit('toUpdate', index, 'valueName', e.target.value)}
                                  className="min-w-[120px]"
                                  placeholder="Value name"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.valueDescription || ''}
                                  onChange={(e) => handleInlineEdit('toUpdate', index, 'valueDescription', e.target.value)}
                                  className="min-w-[150px]"
                                  placeholder="Description (optional)"
                                />
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={item.isActive}
                                  onCheckedChange={(checked) => handleInlineEdit('toUpdate', index, 'isActive', checked)}
                                />
                              </TableCell>
                              <TableCell className="text-orange-700 text-sm">
                                <div className="space-y-1">
                                  {item.changes?.name && (
                                    <div>Name: {item.changes.name.from} → {item.changes.name.to}</div>
                                  )}
                                  {item.changes?.description && (
                                    <div>Desc: {item.changes.description.from || 'None'} → {item.changes.description.to || 'None'}</div>
                                  )}
                                  {item.changes?.isActive && (
                                    <div>Active: {item.changes.isActive.from ? 'Yes' : 'No'} → {item.changes.isActive.to ? 'Yes' : 'No'}</div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}

                          {uploadPreview.toDelete.map((item, index) => (
                            <TableRow key={`delete-${index}`} className="bg-red-50">
                              <TableCell>
                                <Checkbox
                                  checked={selectedChanges[`delete-${index}`] || false}
                                  onCheckedChange={(checked) => handleRowSelectionChange(`delete-${index}`, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive" className="bg-red-100 text-red-800">
                                  DELETE
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.dimensionCode}</TableCell>
                              <TableCell className="font-mono text-sm">{item.valueCode}</TableCell>
                              <TableCell className="line-through text-gray-500">{item.valueName}</TableCell>
                              <TableCell className="line-through text-gray-500">{item.valueDescription || '-'}</TableCell>
                              <TableCell className="line-through text-gray-500">{item.isActive ? 'Yes' : 'No'}</TableCell>
                              <TableCell className="text-red-700 text-sm">Will be deleted</TableCell>
                            </TableRow>
                          ))}

                          {showUnchanged && uploadPreview.unchanged.map((item, index) => (
                            <TableRow key={`unchanged-${index}`} className="bg-gray-50">
                              <TableCell>
                                <div className="w-4 h-4 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">—</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-gray-100 text-gray-700">
                                  UNCHANGED
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-gray-600">{item.dimensionCode}</TableCell>
                              <TableCell className="font-mono text-sm text-gray-600">{item.valueCode}</TableCell>
                              <TableCell className="text-gray-600">{item.valueName}</TableCell>
                              <TableCell className="text-gray-500">{item.valueDescription || '-'}</TableCell>
                              <TableCell className="text-gray-600">{item.isActive ? 'Yes' : 'No'}</TableCell>
                              <TableCell className="text-gray-500 text-sm">No changes detected</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4">
                    <Button variant="outline" onClick={handleCancelPreview}>
                      Cancel
                    </Button>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {getSelectedChangeCount()} changes selected
                      </span>
                      <Button 
                        disabled={getSelectedChangeCount() === 0 || confirmMutation.isPending}
                        className="flex items-center gap-2"
                        onClick={() => {
                          if (!uploadPreview) return;
                          
                          // Gather selected changes
                          const toCreate = uploadPreview.toCreate.filter((_, index) => 
                            selectedChanges[`create-${index}`]
                          );
                          const toUpdate = uploadPreview.toUpdate.filter((_, index) => 
                            selectedChanges[`update-${index}`]
                          );
                          const toDelete = uploadPreview.toDelete.filter((_, index) => 
                            selectedChanges[`delete-${index}`]
                          );
                          
                          confirmMutation.mutate({ toCreate, toUpdate, toDelete });
                        }}
                      >
                        {confirmMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {confirmMutation.isPending ? 'Processing...' : 'Confirm and Process'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Upload Controls
                <div>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/clients/${selectedClientId}/master-values-template`, {
                            method: 'GET',
                            credentials: 'include',
                          });

                          if (!response.ok) {
                            throw new Error(`Failed to download template: ${response.status}`);
                          }

                          // Get the filename from the response headers
                          const contentDisposition = response.headers.get('content-disposition');
                          let filename = `client_${selectedClientId}_master_values_template.csv`;
                          if (contentDisposition) {
                            const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
                            if (filenameMatch) {
                              filename = filenameMatch[1];
                            }
                          }

                          // Create blob and download
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);

                          toast({
                            title: "Success",
                            description: "Master template downloaded successfully",
                          });
                        } catch (error) {
                          console.error('Download error:', error);
                          toast({
                            title: "Download Failed",
                            description: "Failed to download master template. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Download Master Template
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={handleUploadMasterCSV}
                      disabled={masterUploadMutation.isPending}
                    >
                      {masterUploadMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {masterUploadMutation.isPending ? 'Analyzing...' : 'Select & Analyze CSV'}
                    </Button>
                  </div>
                  
                  {/* Hidden file input for master upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
           <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Loading Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{(error as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (
          <>
            {dimensions && dimensions.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {dimensions.map((dimension: Dimension) => (
                  <Card key={dimension.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>{dimension.name} ({dimension.code})</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${dimension.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {dimension.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingDimension(dimension)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingDimension(dimension)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{dimension.description || 'No description.'}</p>
                      <h4 className="font-semibold mb-2">Values ({dimension.values?.length || 0}):</h4>
                      <div className="space-y-1 mb-4">
                        {dimension.values?.length > 0 ? dimension.values.slice(0, 5).map(value => (
                          <div key={value.id} className={`text-sm p-2 bg-gray-50 rounded-md flex justify-between items-center ${!value.isActive ? 'opacity-60' : ''}`}>
                            <span>{value.name} ({value.code})</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${value.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {value.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        )) : (
                          <div className="text-sm text-muted-foreground p-2 text-center">No values created.</div>
                        )}
                        {dimension.values?.length > 5 && <div className="text-sm text-muted-foreground p-2">...and {dimension.values.length - 5} more.</div>}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setManagingDimension(dimension)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Values
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No dimensions found. Create your first dimension to get started.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dimension Values Management Dialog */}
      <Dialog open={!!managingDimension} onOpenChange={(open) => !open && setManagingDimension(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Dimension Values</DialogTitle>
          </DialogHeader>
          {managingDimension && selectedClientId && (
            <DimensionValuesManager 
              dimension={dimensions.find(d => d.id === managingDimension.id) || managingDimension} 
              selectedClientId={selectedClientId}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dimension Dialog */}
      <Dialog open={!!editingDimension} onOpenChange={(open) => !open && setEditingDimension(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Dimension</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {editingDimension && (
              <DimensionForm 
                onSubmit={(values) => updateDimensionMutation.mutate({ id: editingDimension.id, data: values })}
                isSubmitting={updateDimensionMutation.isPending}
                initialValues={{
                  name: editingDimension.name,
                  code: editingDimension.code,
                  description: editingDimension.description || ''
                }}
                isEditing={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDimension} onOpenChange={(open) => !open && setDeletingDimension(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dimension</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the dimension "{deletingDimension?.name}" ({deletingDimension?.code})? 
              This action cannot be undone and will also delete all associated dimension values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingDimension && deleteDimensionMutation.mutate(deletingDimension.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteDimensionMutation.isPending}
            >
              {deleteDimensionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DimensionsPage;