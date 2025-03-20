import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEntity } from '../contexts/EntityContext';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, ArrowDownToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AccountType } from '@shared/schema';
import { FormContainer, TextField, SelectField } from '@/components/common';
import { useFormState } from '@/hooks/useFormState';

function FixedAssets() {
  const { currentEntity } = useEntity();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("assets");
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetFormData, setAssetFormData] = useState({
    name: '',
    description: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: '',
    depreciationMethod: 'straight_line',
    usefulLife: '',
    salvageValue: '',
    assetAccountId: '',
    accumulatedDepreciationAccountId: '',
    depreciationExpenseAccountId: ''
  });
  
  // Get accounts for fixed assets
  const { data: accounts } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : null,
    enabled: !!currentEntity
  });
  
  // Filter accounts by type
  const assetAccounts = accounts?.filter(acc => 
    acc.type === AccountType.ASSET && acc.subtype === 'fixed_asset'
  ) || [];
  
  const depreciationAccounts = accounts?.filter(acc => 
    acc.type === AccountType.ASSET && acc.code.includes('Accumulated Depreciation')
  ) || [];
  
  const expenseAccounts = accounts?.filter(acc => 
    acc.type === AccountType.EXPENSE
  ) || [];
  
  // Get fixed assets
  const { data: fixedAssets, isLoading, refetch } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/fixed-assets`] : null,
    enabled: !!currentEntity,
  });

  const createAsset = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(
        "POST", 
        `/api/entities/${currentEntity?.id}/fixed-assets`, 
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Asset created",
        description: "The fixed asset has been created successfully.",
      });
      setShowAssetForm(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create asset: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Fixed asset validation schema
  const assetFormSchema = z.object({
    name: z.string().min(1, "Asset name is required"),
    description: z.string().optional(),
    acquisitionDate: z.string().min(1, "Acquisition date is required"),
    acquisitionCost: z.string().min(1, "Acquisition cost is required"),
    depreciationMethod: z.string().min(1, "Depreciation method is required"),
    usefulLife: z.string().min(1, "Useful life is required"),
    salvageValue: z.string().optional(),
    assetAccountId: z.string().min(1, "Asset account is required"),
    accumulatedDepreciationAccountId: z.string().min(1, "Accumulated depreciation account is required"),
    depreciationExpenseAccountId: z.string().min(1, "Depreciation expense account is required")
  });

  // Use our custom form state hook
  const initialAssetForm = {
    name: '',
    description: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: '',
    depreciationMethod: 'straight_line',
    usefulLife: '',
    salvageValue: '',
    assetAccountId: '',
    accumulatedDepreciationAccountId: '',
    depreciationExpenseAccountId: ''
  };

  const {
    data: formData,
    errors,
    formError,
    isSubmitting,
    setFieldValue,
    setSelectValue,
    handleSubmit,
    resetForm,
    setFormData
  } = useFormState({
    initialData: initialAssetForm,
    schema: assetFormSchema,
    onSubmit: async (data) => {
      // Convert numeric fields
      const formattedData = {
        ...data,
        acquisitionCost: parseFloat(data.acquisitionCost),
        usefulLife: parseInt(data.usefulLife),
        salvageValue: parseFloat(data.salvageValue || '0'),
        assetAccountId: parseInt(data.assetAccountId),
        accumulatedDepreciationAccountId: parseInt(data.accumulatedDepreciationAccountId),
        depreciationExpenseAccountId: parseInt(data.depreciationExpenseAccountId),
        entityId: currentEntity?.id,
        createdBy: 1 // Current user ID would come from auth context
      };
      
      await createAsset.mutateAsync(formattedData);
      setShowAssetForm(false);
    }
  });

  const handleNewAsset = () => {
    setSelectedAsset(null);
    resetForm();
    setShowAssetForm(true);
  };
  
  const assetColumns = [
    { header: "Name", accessor: "name", type: "text" },
    { header: "Acquisition Date", accessor: "acquisitionDate", type: "date" },
    { header: "Acquisition Cost", accessor: "acquisitionCost", type: "currency" },
    { header: "Depreciation Method", accessor: "depreciationMethod", type: "text" },
    { header: "Useful Life (months)", accessor: "usefulLife", type: "number" },
    { header: "Status", accessor: "status", type: "text" },
    {
      header: "Actions",
      accessor: "id",
      type: "actions",
      render: (row: any) => (
        <div className="text-right">
          <a href="#" className="text-primary-600 hover:text-primary-900 mr-2">View</a>
          <a href="#" className="text-primary-600 hover:text-primary-900">Depreciate</a>
        </div>
      )
    }
  ];
  
  // Sample depreciation schedules - would come from API in real app
  const depreciationSchedules = [
    { 
      assetName: 'New computer purchase', 
      period: 'Q1 2023', 
      depreciation: 183.33, 
      accumulatedDepreciation: 183.33, 
      bookValue: 2016.67 
    },
    { 
      assetName: 'New computer purchase', 
      period: 'Q2 2023', 
      depreciation: 183.33, 
      accumulatedDepreciation: 366.66, 
      bookValue: 1833.34 
    },
    { 
      assetName: 'New computer purchase', 
      period: 'Q3 2023', 
      depreciation: 183.33, 
      accumulatedDepreciation: 549.99, 
      bookValue: 1650.01 
    },
  ];
  
  const scheduleColumns = [
    { header: "Asset", accessor: "assetName", type: "text" },
    { header: "Period", accessor: "period", type: "text" },
    { header: "Depreciation Amount", accessor: "depreciation", type: "currency" },
    { header: "Accumulated Depreciation", accessor: "accumulatedDepreciation", type: "currency" },
    { header: "Book Value", accessor: "bookValue", type: "currency" },
  ];

  if (!currentEntity) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center py-10">
            <h1 className="text-xl font-semibold text-gray-900">Please select an entity to continue</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Fixed Assets" 
        description="Manage fixed assets and depreciation"
      >
        <div className="flex space-x-3">
          <button 
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowDownToLine className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            Export
          </button>
          <button 
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={handleNewAsset}
          >
            <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
            New Asset
          </button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Asset Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$2,200.00</div>
              <div className="text-xs text-gray-500 mt-1">1 Active Asset</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Accumulated Depreciation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$550.00</div>
              <div className="text-xs text-gray-500 mt-1">25% of total value</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Net Book Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$1,650.00</div>
              <div className="text-xs text-gray-500 mt-1">Current book value</div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="depreciation">Depreciation Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assets">
            <DataTable 
              columns={assetColumns} 
              data={fixedAssets || []} 
              isLoading={isLoading} 
            />
          </TabsContent>
          
          <TabsContent value="depreciation">
            <DataTable 
              columns={scheduleColumns} 
              data={depreciationSchedules} 
              isLoading={false} 
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAssetForm} onOpenChange={setShowAssetForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedAsset ? 'Edit Fixed Asset' : 'Add New Fixed Asset'}
            </DialogTitle>
          </DialogHeader>
          
          <FormContainer onSubmit={handleSubmit} formError={formError}>
            <div className="grid gap-4 py-4">
              <TextField
                id="name"
                name="name"
                label="Asset Name"
                value={formData.name}
                onChange={setFieldValue}
                error={errors.name}
                required
              />
              
              <TextField
                id="description"
                name="description"
                label="Description"
                value={formData.description}
                onChange={setFieldValue}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  id="acquisitionDate"
                  name="acquisitionDate"
                  label="Acquisition Date"
                  type="date"
                  value={formData.acquisitionDate}
                  onChange={setFieldValue}
                  error={errors.acquisitionDate}
                  required
                />
                
                <TextField
                  id="acquisitionCost"
                  name="acquisitionCost"
                  label="Acquisition Cost"
                  type="number"
                  step="0.01"
                  value={formData.acquisitionCost}
                  onChange={setFieldValue}
                  error={errors.acquisitionCost}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  id="depreciationMethod"
                  name="depreciationMethod"
                  label="Depreciation Method"
                  value={formData.depreciationMethod}
                  onValueChange={(value) => setSelectValue("depreciationMethod", value)}
                  error={errors.depreciationMethod}
                  options={[
                    { value: "straight_line", label: "Straight Line" },
                    { value: "declining_balance", label: "Declining Balance" }
                  ]}
                  required
                />
                
                <TextField
                  id="usefulLife"
                  name="usefulLife"
                  label="Useful Life (months)"
                  type="number"
                  value={formData.usefulLife}
                  onChange={setFieldValue}
                  error={errors.usefulLife}
                  required
                />
              </div>
              
              <TextField
                id="salvageValue"
                name="salvageValue"
                label="Salvage Value"
                type="number"
                step="0.01"
                value={formData.salvageValue}
                onChange={setFieldValue}
                error={errors.salvageValue}
              />
              
              <SelectField
                id="assetAccountId"
                name="assetAccountId"
                label="Asset Account"
                value={formData.assetAccountId}
                onValueChange={(value) => setSelectValue("assetAccountId", value)}
                error={errors.assetAccountId}
                options={[
                  { value: "", label: "Select Account" },
                  ...assetAccounts.map(account => ({
                    value: account.id.toString(),
                    label: `${account.code} - ${account.name}`
                  }))
                ]}
                required
              />
              
              <SelectField
                id="accumulatedDepreciationAccountId"
                name="accumulatedDepreciationAccountId"
                label="Accumulated Depreciation Account"
                value={formData.accumulatedDepreciationAccountId}
                onValueChange={(value) => setSelectValue("accumulatedDepreciationAccountId", value)}
                error={errors.accumulatedDepreciationAccountId}
                options={[
                  { value: "", label: "Select Account" },
                  ...depreciationAccounts.map(account => ({
                    value: account.id.toString(),
                    label: `${account.code} - ${account.name}`
                  }))
                ]}
                required
              />
              
              <SelectField
                id="depreciationExpenseAccountId"
                name="depreciationExpenseAccountId"
                label="Depreciation Expense Account"
                value={formData.depreciationExpenseAccountId}
                onValueChange={(value) => setSelectValue("depreciationExpenseAccountId", value)}
                error={errors.depreciationExpenseAccountId}
                options={[
                  { value: "", label: "Select Account" },
                  ...expenseAccounts.map(account => ({
                    value: account.id.toString(),
                    label: `${account.code} - ${account.name}`
                  }))
                ]}
                required
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button"
                variant="outline"
                onClick={() => setShowAssetForm(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting || createAsset.isPending}
              >
                {isSubmitting || createAsset.isPending ? "Saving..." : (selectedAsset ? "Update Asset" : "Create Asset")}
              </Button>
            </DialogFooter>
          </FormContainer>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FixedAssets;
