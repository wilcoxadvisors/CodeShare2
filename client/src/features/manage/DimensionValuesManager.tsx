import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Power, PowerOff, Loader2 } from 'lucide-react';

interface DimensionValue {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

interface Dimension {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  values: DimensionValue[];
}

interface DimensionValuesManagerProps {
  dimension: Dimension;
  selectedClientId: number;
}

interface ValueFormData {
  name: string;
  code: string;
  description: string;
}

const DimensionValuesManager: React.FC<DimensionValuesManagerProps> = ({ dimension, selectedClientId }) => {
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<DimensionValue | null>(null);
  const [formData, setFormData] = useState<ValueFormData>({ name: '', code: '', description: '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create dimension value mutation
  const createValueMutation = useMutation({
    mutationFn: (newValue: ValueFormData) => {
      return apiRequest(`/api/dimensions/${dimension.id}/values`, {
        method: 'POST',
        data: newValue,
      });
    },
    onSuccess: () => {
      // Force immediate refetch of dimensions data
      queryClient.invalidateQueries({ queryKey: ['dimensions', selectedClientId] });
      queryClient.refetchQueries({ queryKey: ['dimensions', selectedClientId] });
      
      toast({ title: "Success", description: "Dimension value created successfully." });
      setAddModalOpen(false);
      setFormData({ name: '', code: '', description: '' });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create dimension value.", variant: "destructive" });
    }
  });

  // Update dimension value mutation
  const updateValueMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ValueFormData & { isActive: boolean }> }) => {
      return apiRequest(`/api/dimension-values/${id}`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      // Force immediate refetch of dimensions data
      queryClient.invalidateQueries({ queryKey: ['dimensions', selectedClientId] });
      queryClient.refetchQueries({ queryKey: ['dimensions', selectedClientId] });
      
      toast({ title: "Success", description: "Dimension value updated successfully." });
      setEditingValue(null);
      setFormData({ name: '', code: '', description: '' });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update dimension value.", variant: "destructive" });
    }
  });

  const handleAddValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({ title: "Error", description: "Name and code are required.", variant: "destructive" });
      return;
    }
    createValueMutation.mutate(formData);
  };

  const handleEditValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingValue || !formData.name.trim() || !formData.code.trim()) {
      toast({ title: "Error", description: "Name and code are required.", variant: "destructive" });
      return;
    }
    updateValueMutation.mutate({
      id: editingValue.id,
      data: formData
    });
  };

  const handleToggleActive = (value: DimensionValue) => {
    updateValueMutation.mutate({
      id: value.id,
      data: { isActive: !value.isActive }
    });
  };

  const openEditModal = (value: DimensionValue) => {
    setEditingValue(value);
    setFormData({
      name: value.name,
      code: value.code,
      description: value.description || ''
    });
  };

  const closeEditModal = () => {
    setEditingValue(null);
    setFormData({ name: '', code: '', description: '' });
  };

  const resetAddForm = () => {
    setFormData({ name: '', code: '', description: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Manage Values for {dimension.name}</h3>
          <p className="text-sm text-muted-foreground">
            Add, edit, and manage values for the {dimension.name} dimension.
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) resetAddForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Value
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Value</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddValue} className="space-y-4">
              <div>
                <Label htmlFor="add-name">Name *</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter value name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="add-code">Code *</Label>
                <Input
                  id="add-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Enter value code"
                  required
                />
              </div>
              <div>
                <Label htmlFor="add-description">Description</Label>
                <Textarea
                  id="add-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter value description (optional)"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createValueMutation.isPending}>
                  {createValueMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Value
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Values List */}
      <div className="space-y-3">
        {dimension.values && dimension.values.length > 0 ? (
          dimension.values.map((value) => (
            <Card key={value.id} className={`${!value.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{value.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {value.code}
                      </Badge>
                      <Badge variant={value.isActive ? "default" : "secondary"} className="text-xs">
                        {value.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {value.description && (
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(value)}
                      disabled={updateValueMutation.isPending}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(value)}
                      disabled={updateValueMutation.isPending}
                    >
                      {updateValueMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : value.isActive ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No values created for this dimension yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Add Value" to create the first value.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingValue} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Value</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditValue} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter value name"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-code">Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Enter value code"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter value description (optional)"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateValueMutation.isPending}>
                {updateValueMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Value
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DimensionValuesManager;