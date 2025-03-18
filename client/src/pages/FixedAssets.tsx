import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEntity } from '../contexts/EntityContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, ArrowDownToLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AccountType } from '@shared/schema';

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

  const handleNewAsset = () => {
    setSelectedAsset(null);
    setAssetFormData({
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
    setShowAssetForm(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAssetFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setAssetFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!assetFormData.name || !assetFormData.acquisitionDate || !assetFormData.acquisitionCost || 
        !assetFormData.depreciationMethod || !assetFormData.usefulLife || 
        !assetFormData.assetAccountId || !assetFormData.accumulatedDepreciationAccountId || 
        !assetFormData.depreciationExpenseAccountId) {
      
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Convert numeric fields
    const formattedData = {
      ...assetFormData,
      acquisitionCost: parseFloat(assetFormData.acquisitionCost),
      usefulLife: parseInt(assetFormData.usefulLife),
      salvageValue: parseFloat(assetFormData.salvageValue || '0'),
      assetAccountId: parseInt(assetFormData.assetAccountId),
      accumulatedDepreciationAccountId: parseInt(assetFormData.accumulatedDepreciationAccountId),
      depreciationExpenseAccountId: parseInt(assetFormData.depreciationExpenseAccountId),
      entityId: currentEntity?.id,
      createdBy: 1 // Current user ID would come from auth context
    };
    
    createAsset.mutate(formattedData);
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
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Asset Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={assetFormData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={assetFormData.description}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="acquisitionDate">Acquisition Date</Label>
                  <Input
                    id="acquisitionDate"
                    name="acquisitionDate"
                    type="date"
                    value={assetFormData.acquisitionDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
                  <Input
                    id="acquisitionCost"
                    name="acquisitionCost"
                    type="number"
                    step="0.01"
                    value={assetFormData.acquisitionCost}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="depreciationMethod">Depreciation Method</Label>
                  <Select 
                    value={assetFormData.depreciationMethod} 
                    onValueChange={(value) => handleSelectChange("depreciationMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight_line">Straight Line</SelectItem>
                      <SelectItem value="declining_balance">Declining Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="usefulLife">Useful Life (months)</Label>
                  <Input
                    id="usefulLife"
                    name="usefulLife"
                    type="number"
                    value={assetFormData.usefulLife}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="salvageValue">Salvage Value</Label>
                <Input
                  id="salvageValue"
                  name="salvageValue"
                  type="number"
                  step="0.01"
                  value={assetFormData.salvageValue}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="assetAccountId">Asset Account</Label>
                <Select 
                  value={assetFormData.assetAccountId} 
                  onValueChange={(value) => handleSelectChange("assetAccountId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Select Account</SelectItem>
                    {assetAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accumulatedDepreciationAccountId">Accumulated Depreciation Account</Label>
                <Select 
                  value={assetFormData.accumulatedDepreciationAccountId} 
                  onValueChange={(value) => handleSelectChange("accumulatedDepreciationAccountId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Select Account</SelectItem>
                    {depreciationAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="depreciationExpenseAccountId">Depreciation Expense Account</Label>
                <Select 
                  value={assetFormData.depreciationExpenseAccountId} 
                  onValueChange={(value) => handleSelectChange("depreciationExpenseAccountId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Select Account</SelectItem>
                    {expenseAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                disabled={createAsset.isPending}
              >
                {createAsset.isPending ? "Saving..." : (selectedAsset ? "Update Asset" : "Create Asset")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FixedAssets;
