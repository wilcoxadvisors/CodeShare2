import { useState, useEffect } from 'react';
import { useEntity } from '@/contexts/EntityContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { Plus, Trash2, Upload, Info, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account } from '@shared/schema';

interface JournalEntryLine {
  id: string;
  accountId: number;
  description: string | null;
  reference?: string;
  debit: string;
  credit: string;
}

interface JournalEntryData {
  date: string;
  description: string | null;
  reference: string;
  entries: JournalEntryLine[];
  files: File[];
}

interface EntryErrors {
  [key: string]: {
    accountId?: string;
    amount?: string;
  };
}

interface SupportingDocument {
  name: string;
  size: number;
  file: File;
}

export default function ManualJournalEntry() {
  const { currentEntity } = useEntity();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [supportingDocs, setSupportingDocs] = useState<SupportingDocument[]>([]);
  
  // Journal entry form state
  const [journalData, setJournalData] = useState<JournalEntryData>({
    date: new Date().toISOString().split('T')[0],
    description: null,
    reference: '',
    entries: [
      {
        id: crypto.randomUUID(),
        accountId: 0,
        description: null,
        debit: '',
        credit: ''
      }
    ],
    files: []
  });
  
  // Validation errors
  const [errors, setErrors] = useState<{
    date?: string;
    description?: string;
    balance?: string;
  }>({});
  
  const [entryErrors, setEntryErrors] = useState<EntryErrors>({});
  
  useEffect(() => {
    if (currentEntity) {
      fetchAccounts();
    }
  }, [currentEntity]);
  
  const fetchAccounts = async () => {
    try {
      const response = await apiRequest(`/api/entities/${currentEntity?.id}/accounts`);
      if (response) {
        setAccounts(response);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive",
      });
      console.error(error);
    }
  };
  
  // Calculate totals
  const totals = {
    debit: journalData.entries.reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0),
    credit: journalData.entries.reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0),
    isBalanced: false
  };
  
  totals.isBalanced = Math.abs(totals.debit - totals.credit) < 0.001;
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJournalData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is updated
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };
  
  // Handle changes in journal entry lines
  const handleEntryChange = (id: string, field: string, value: string | number) => {
    setJournalData(prev => ({
      ...prev,
      entries: prev.entries.map(entry => {
        if (entry.id === id) {
          // If debit is entered, clear credit and vice versa
          if (field === 'debit' && value !== '' && entry.credit !== '') {
            return {
              ...entry,
              [field]: value,
              credit: ''
            };
          }
          if (field === 'credit' && value !== '' && entry.debit !== '') {
            return {
              ...entry,
              [field]: value,
              debit: ''
            };
          }
          return {
            ...entry,
            [field]: value
          };
        }
        return entry;
      })
    }));
    
    // Clear error when field is updated
    if (entryErrors[id] && entryErrors[id][field as keyof typeof entryErrors[id]]) {
      setEntryErrors(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          [field]: undefined
        }
      }));
    }
  };
  
  // Add a new entry row
  const addEntryRow = () => {
    setJournalData(prev => ({
      ...prev,
      entries: [
        ...prev.entries,
        {
          id: crypto.randomUUID(),
          accountId: 0,
          description: null,
          debit: '',
          credit: ''
        }
      ]
    }));
  };
  
  // Remove an entry row
  const removeEntryRow = (id: string) => {
    if (journalData.entries.length <= 1) {
      return; // Don't remove if it's the only row
    }
    
    setJournalData(prev => ({
      ...prev,
      entries: prev.entries.filter(entry => entry.id !== id)
    }));
    
    // Remove any errors for this entry
    if (entryErrors[id]) {
      const newEntryErrors = { ...entryErrors };
      delete newEntryErrors[id];
      setEntryErrors(newEntryErrors);
    }
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      // Add files to supporting docs
      const newDocs = newFiles.map(file => ({
        name: file.name,
        size: file.size,
        file
      }));
      
      setSupportingDocs(prev => [...prev, ...newDocs]);
      
      // Update form data with files
      setJournalData(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles]
      }));
    }
  };
  
  // Remove a supporting document
  const removeDocument = (index: number) => {
    setSupportingDocs(prev => {
      const newDocs = [...prev];
      newDocs.splice(index, 1);
      return newDocs;
    });
    
    setJournalData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };
  
  // Validate the form
  const validateForm = () => {
    const newErrors: typeof errors = {};
    const newEntryErrors: EntryErrors = {};
    let valid = true;
    
    // Validate header fields
    if (!journalData.date) {
      newErrors.date = "Date is required";
      valid = false;
    }
    
    if (!journalData.description) {
      newErrors.description = "Description is required";
      valid = false;
    }
    
    // Validate entries
    journalData.entries.forEach(entry => {
      const entryError: { accountId?: string; amount?: string } = {};
      
      if (!entry.accountId) {
        entryError.accountId = "Account is required";
        valid = false;
      }
      
      if (parseFloat(entry.debit) === 0 && parseFloat(entry.credit) === 0) {
        entryError.amount = "Either debit or credit must be entered";
        valid = false;
      }
      
      if (Object.keys(entryError).length > 0) {
        newEntryErrors[entry.id] = entryError;
      }
    });
    
    // Check if debits equal credits
    if (!totals.isBalanced) {
      newErrors.balance = "Total debits must equal total credits";
      valid = false;
    }
    
    setErrors(newErrors);
    setEntryErrors(newEntryErrors);
    
    return valid;
  };
  
  // Handle journal entry submission
  const createJournalEntryMutation = useMutation({
    mutationFn: async () => {
      // Format entry data for API
      const formattedEntries = journalData.entries.map(entry => ({
        accountId: entry.accountId,
        description: entry.description,
        debit: entry.debit || '0',
        credit: entry.credit || '0',
        entityId: currentEntity?.id
      }));
      
      // Create journal entry
      const journalEntryResponse = await apiRequest({
        url: `/api/entities/${currentEntity?.id}/journal-entries`,
        method: 'POST',
        body: JSON.stringify({
          entityId: currentEntity?.id,
          date: new Date(journalData.date),
          description: journalData.description,
          reference: journalData.reference || `JE-${new Date().toISOString().split('T')[0]}`,
          status: 'draft',
          createdBy: user?.id
        })
      });
      
      // Add journal entry lines
      for (const entry of formattedEntries) {
        await apiRequest({
          url: `/api/entities/${currentEntity?.id}/journal-entries/${journalEntryResponse.id}/lines`,
          method: 'POST',
          body: JSON.stringify(entry)
        });
      }
      
      // Upload supporting documents if any
      for (const file of journalData.files) {
        // Read file as base64 string
        const fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target && typeof e.target.result === 'string') {
              resolve(e.target.result);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        
        await apiRequest({
          url: `/api/entities/${currentEntity?.id}/journal-entries/${journalEntryResponse.id}/files`,
          method: 'POST',
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileContent: fileContent
          })
        });
      }
      
      return journalEntryResponse;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Journal entry created successfully",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/entities/${currentEntity?.id}/journal-entries`] 
      });
      navigate(`/journal-entries/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create journal entry",
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting",
        variant: "destructive",
      });
      return;
    }
    
    createJournalEntryMutation.mutate();
  };
  
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
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Create Journal Entry</h2>
        <Button 
          variant="outline" 
          onClick={() => setShowTips(!showTips)}
          className="flex items-center gap-2"
        >
          <Info className="h-4 w-4" />
          {showTips ? "Hide Tips" : "Show Tips"}
        </Button>
      </div>
      
      {showTips && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-800 mb-2">Quick Tips:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Enter debits first, followed by credits</li>
              <li>Total debits must equal total credits</li>
              <li>Accounts beginning with 1xxx are assets, 2xxx are liabilities, 3xxx are equity, 4xxx are revenue, 5-9xxx are expenses</li>
              <li>Add supporting documentation for audit purposes</li>
              <li>Use the description field to explain the purpose of the journal entry</li>
            </ul>
          </CardContent>
        </Card>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Journal Entry Header */}
        <Card>
          <CardHeader>
            <CardTitle>Journal Entry Information</CardTitle>
            <CardDescription>Enter the basic information for this journal entry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  name="date"
                  value={journalData.date}
                  onChange={handleChange}
                  className={errors.date ? "border-red-500" : ""}
                />
                {errors.date && <p className="text-red-500 text-sm">{errors.date}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  name="reference"
                  value={journalData.reference}
                  onChange={handleChange}
                  placeholder="JE-20250318-001"
                />
              </div>
              
              <div className="flex flex-col md:items-end justify-end">
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                  className="text-blue-600 hover:text-blue-800 flex items-center self-end"
                >
                  {showAdvancedFields ? "Hide Advanced Fields" : "Show Advanced Fields"}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={journalData.description || ""}
                onChange={handleChange}
                placeholder="Enter a detailed description of this journal entry"
                className={errors.description ? "border-red-500" : ""}
                rows={2}
              />
              {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
            </div>
          </CardContent>
        </Card>
        
        {/* Journal Entry Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Journal Entry Lines</CardTitle>
            <CardDescription>Enter the debit and credit lines for this journal entry</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Account</th>
                    <th className="py-3 px-4 text-left font-medium">Description</th>
                    {showAdvancedFields && (
                      <th className="py-3 px-4 text-left font-medium">Reference</th>
                    )}
                    <th className="py-3 px-4 text-right font-medium">Debit</th>
                    <th className="py-3 px-4 text-right font-medium">Credit</th>
                    <th className="py-3 px-4 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {journalData.entries.map((entry, index) => (
                    <tr key={entry.id} className="border-t">
                      <td className="py-2 px-4">
                        <Select
                          value={entry.accountId ? entry.accountId.toString() : ""}
                          onValueChange={(value) => handleEntryChange(entry.id, 'accountId', parseInt(value))}
                        >
                          <SelectTrigger className={`w-full ${entryErrors[entry.id]?.accountId ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="Select Account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(account => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.code} - {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {entryErrors[entry.id]?.accountId && (
                          <p className="text-red-500 text-xs mt-1">{entryErrors[entry.id].accountId}</p>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <Input
                          value={entry.description || ''}
                          onChange={(e) => handleEntryChange(entry.id, 'description', e.target.value)}
                          placeholder="Line description"
                        />
                      </td>
                      {showAdvancedFields && (
                        <td className="py-2 px-4">
                          <Input
                            value={entry.reference || ''}
                            onChange={(e) => handleEntryChange(entry.id, 'reference', e.target.value)}
                            placeholder="Reference"
                          />
                        </td>
                      )}
                      <td className="py-2 px-4">
                        <Input
                          type="number"
                          value={entry.debit}
                          onChange={(e) => handleEntryChange(entry.id, 'debit', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className={`text-right ${entryErrors[entry.id]?.amount ? "border-red-500" : ""}`}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <Input
                          type="number"
                          value={entry.credit}
                          onChange={(e) => handleEntryChange(entry.id, 'credit', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className={`text-right ${entryErrors[entry.id]?.amount ? "border-red-500" : ""}`}
                        />
                        {entryErrors[entry.id]?.amount && (
                          <p className="text-red-500 text-xs mt-1">{entryErrors[entry.id].amount}</p>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEntryRow(entry.id)}
                          disabled={journalData.entries.length <= 1}
                          className="text-red-500 hover:text-red-700 p-0 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals row */}
                  <tr className="border-t bg-muted font-medium">
                    <td colSpan={showAdvancedFields ? 3 : 2} className="py-3 px-4 text-right">
                      Totals
                    </td>
                    <td className="py-3 px-4 text-right">
                      ${totals.debit.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      ${totals.credit.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Balance check and add row button */}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={addEntryRow}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Line
          </Button>
          
          <div>
            {errors.balance && (
              <p className="text-red-500 font-medium">{errors.balance}</p>
            )}
            
            {totals.isBalanced && totals.debit > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                ✓ Balanced
              </Badge>
            )}
          </div>
        </div>
        
        {/* Supporting Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Supporting Documents</CardTitle>
            <CardDescription>Attach any relevant files to this journal entry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileUpload}
                multiple
                className="max-w-sm"
              />
              
              {supportingDocs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {supportingDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
                      <span className="text-sm truncate max-w-[250px]">{doc.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDocument(idx)}
                        className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Submit button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            className="flex items-center gap-2"
            disabled={createJournalEntryMutation.isPending}
          >
            {createJournalEntryMutation.isPending ? (
              <>
                <span className="animate-spin">⌛</span>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Journal Entry
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}