import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import { useEntity } from "../contexts/EntityContext";
import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle2, XCircle, AlertCircle, Clock, Settings, Search, MoreVertical, Mail, Download, Users, CreditCard, Bell, User, PlusCircle, FileCheck, Calendar, MessageSquare, Pen, Eye, ChevronRight, Trash2, BarChart2, FileText, Loader2, FileX, RefreshCw } from "lucide-react";
import { UserRole } from "@shared/schema";
import { exportToCSV } from "../lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import SetupStepper from "../components/setup/SetupStepper";
import ClientSetupCard from "../components/setup/ClientSetupCard";
import EntityManagementCard from "../components/setup/EntityManagementCard";
import SetupSummaryCard from "../components/setup/SetupSummaryCard";
import { ClientDetailModal } from "../components/ClientDetailModal";
import { ClientEditModal } from "../components/dashboard/ClientEditModal";
import RestoreConfirmationDialog from "../components/RestoreConfirmationDialog";
import DeleteClientDialog from "../components/DeleteClientDialog";

// Define client status types for the application
type ClientStatus = 'Active' | 'Inactive' | 'Onboarding' | 'Pending Review';

// Define client form validation schema
const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters." }),
  contactName: z.string().optional(),
  contactEmail: z.string().email({ message: "Please enter a valid email address." }).optional(),
  contactPhone: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  website: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  notes: z.string().optional(),
  active: z.boolean().default(true),
  referralSource: z.string().optional(),
});

// Task interface for pending tasks
interface PendingTask {
  id: number;
  entityId: number;
  entityName: string;
  taskDescription: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
}

// Generate pending tasks based on real entities
const generatePendingTasks = (entities: any[]): PendingTask[] => {
  // Return an empty array to not display any random tasks
  return [];
};

const mockEmployees = [
  {
    id: 1,
    name: 'Jane Smith',
    role: 'Accountant',
    email: 'jane@example.com',
    assignedClients: ['Acme Corp', 'TechStart Inc'],
    avatar: 'JS'
  },
  {
    id: 2,
    name: 'John Doe',
    role: 'Support',
    email: 'john@example.com',
    assignedClients: ['Global Services LLC'],
    avatar: 'JD'
  },
  {
    id: 3,
    name: 'Emily Chen',
    role: 'Accountant',
    email: 'emily@example.com',
    assignedClients: ['Bright Futures', 'Morning Star Co'],
    avatar: 'EC'
  }
];

const mockNotifications = [
  {
    id: 1,
    type: 'message',
    content: 'New message from TechStart Inc',
    time: '5 minutes ago',
    read: false
  },
  {
    id: 2,
    type: 'task',
    content: 'Document review due for Acme Corp',
    time: '1 hour ago',
    read: false
  },
  {
    id: 3,
    type: 'alert',
    content: 'Payment overdue for Global Services LLC',
    time: '3 hours ago',
    read: true
  },
  {
    id: 4,
    type: 'system',
    content: 'System update scheduled for tonight',
    time: '1 day ago',
    read: true
  }
];

const mockPayments = [
  {
    id: 1,
    client: 'Acme Corp',
    amount: 2500,
    status: 'Paid',
    date: '2025-03-15'
  },
  {
    id: 2,
    client: 'TechStart Inc',
    amount: 1800,
    status: 'Pending',
    date: '2025-03-20'
  },
  {
    id: 3,
    client: 'Global Services LLC',
    amount: 3200,
    status: 'Overdue',
    date: '2025-03-10'
  },
  {
    id: 4,
    client: 'Bright Futures',
    amount: 1500,
    status: 'Paid',
    date: '2025-03-12'
  }
];

// Calculate real-time summary stats from API data
const getStatsSummary = (clients: any[], entities: any[], dashboardUsers: any[], consolidationGroups: any[]) => {
  const currentMonth = new Date().getMonth();
  // Filter out deleted clients for stats
  const activeClients = clients.filter(c => !isClientDeleted(c));
  
  return {
    totalClients: activeClients.length,
    activeClients: activeClients.filter(c => getClientActiveStatus(c)).length,
    newClientsThisMonth: activeClients.filter(c => new Date(c.createdAt).getMonth() === currentMonth).length,
    totalEmployees: dashboardUsers.length,
    pendingTasks: 0, // Will be implemented when we have task data
    totalRevenue: 0, // Will be implemented when we have revenue data
    outstandingPayments: 0, // Will be implemented when we have payment data
    totalEntities: entities.length,
    totalConsolidationGroups: consolidationGroups.length
  };
};

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Status color mapping
const getStatusColor = (status: string) => {
  const statusMap: Record<string, string> = {
    'Active': 'bg-green-100 text-green-800',
    'Onboarding': 'bg-blue-100 text-blue-800',
    'Pending Review': 'bg-yellow-100 text-yellow-800',
    'Inactive': 'bg-gray-100 text-gray-800',
    'Paid': 'bg-green-100 text-green-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Overdue': 'bg-red-100 text-red-800'
  };
  return statusMap[status] || 'bg-gray-100 text-gray-800';
};

// Progress color mapping
const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 30) return 'bg-yellow-500';
  return 'bg-red-500';
};

// Helper function to standardize client active status checks
// This resolves TypeScript errors related to 'active' vs 'isActive' properties
const getClientActiveStatus = (client: any): boolean => {
  // Always prefer isActive if it exists (which is the standard field in our schema)
  if (typeof client.isActive === 'boolean') {
    return client.isActive;
  }
  // For backward compatibility where some data might use 'active' instead
  if (typeof client.active === 'boolean') {
    return client.active;
  }
  // Default to false if neither property exists
  return false;
};

// Helper function to check if a client is deleted (has deletedAt timestamp)
const isClientDeleted = (client: any): boolean => {
  return !!client.deletedAt;
};

// Format date to a more readable form
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Subscriber Management Component
interface BlogSubscriber {
  id: number;
  email: string;
  name: string | null;
  industry: string | null;
  isActive: boolean;
  createdAt: string;
  source: string | null;
  unsubscribeToken: string;
}

function SubscriberManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch blog subscribers
  const { data: subscribers = [], isLoading } = useQuery<BlogSubscriber[]>({
    queryKey: ['/api/admin/blog-subscribers'],
    enabled: true
  });

  // Delete subscriber mutation
  const deleteMutation = useMutation({
    mutationFn: async (subscriberId: number) => {
      return await fetch(`/api/admin/blog-subscribers/${subscriberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog-subscribers'] });
      toast({
        title: "Subscriber removed",
        description: "The subscriber has been successfully removed.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove subscriber. Please try again.",
        variant: "destructive",
      });
      console.error("Delete error:", error);
    }
  });

  // Filter subscribers based on search and active state
  const filteredSubscribers = subscribers.filter((subscriber: BlogSubscriber) => {
    const matchesSearch = 
      subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subscriber.name && subscriber.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (subscriber.industry && subscriber.industry.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesActive = filterActive ? subscriber.isActive : true;
    
    return matchesSearch && matchesActive;
  });

  const handleDeleteSubscriber = (id: number) => {
    if (window.confirm("Are you sure you want to remove this subscriber?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-64">
          <Input
            placeholder="Search subscribers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="filter-active" className="text-sm font-medium">
            Active Only
          </Label>
          <input
            type="checkbox"
            id="filter-active"
            checked={filterActive}
            onChange={() => setFilterActive(!filterActive)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>
      </div>

      {filteredSubscribers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No subscribers found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Subscribed On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.map((subscriber: BlogSubscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="font-medium">{subscriber.email}</TableCell>
                  <TableCell>{subscriber.name || 'N/A'}</TableCell>
                  <TableCell>{subscriber.industry || 'N/A'}</TableCell>
                  <TableCell>{new Date(subscriber.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={subscriber.isActive ? "default" : "outline"}>
                      {subscriber.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{subscriber.source || 'Website'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSubscriber(subscriber.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { currentEntity } = useEntity();
  
  // Check if user is admin early
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Setup state for the stepper flow
  const [activeStep, setActiveStep] = useState(0);
  const [setupComplete, setSetupComplete] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  
  // Set default active tab based on user role
  const [activeTab, setActiveTab] = useState(isAdmin ? "admin" : "overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isEditEntityDialogOpen, setIsEditEntityDialogOpen] = useState(false);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [isClientDetailModalOpen, setIsClientDetailModalOpen] = useState(false);
  const [selectedClientIdForDetails, setSelectedClientIdForDetails] = useState<number | null>(null);
  const [currentEditEntity, setCurrentEditEntity] = useState<any>(null);
  const [currentEditClient, setCurrentEditClient] = useState<any>(null);
  const [clientEntities, setClientEntities] = useState<any[]>([]);
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
  const [showDeletedEntities, setShowDeletedEntities] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [itemToRestore, setItemToRestore] = useState<{id: number, name: string, type: 'client' | 'entity'} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state for adding a new entity
  const [entityForm, setEntityForm] = useState({
    name: "",
    legalName: "",
    taxId: "",
    entityType: "company",
    industry: "",
    address: "",
    phone: "",
    email: "",
    ownerId: user?.id || 0
  });
  
  // Handle input changes for entity form
  const handleEntityFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setEntityForm(prev => ({
      ...prev,
      [id]: value
    }));
  };
  
  // Create entity/client mutation
  const createEntityMutation = useMutation({
    mutationFn: async (entityData: any) => {
      // Use admin endpoint if user is admin
      const endpoint = isAdmin ? '/api/admin/entities' : '/api/entities';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entityData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create entity');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/entities'] });
      
      // Reset form and close dialog
      setEntityForm({
        name: "",
        legalName: "",
        taxId: "",
        entityType: "company",
        industry: "",
        address: "",
        phone: "",
        email: "",
        ownerId: user?.id || 0
      });
      setIsAddClientDialogOpen(false);
      
      toast({
        title: "Success",
        description: "New client entity created successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Entity creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create entity. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle edit entity click from dropdown menu
  const handleEditEntity = (entity: any) => {
    setCurrentEditEntity(entity);
    setIsEditEntityDialogOpen(true);
  };
  
  // Handle view client details click from dropdown menu
  const handleViewDetails = (clientId: number) => {
    console.log(`Viewing details for client ID: ${clientId}`);
    setSelectedClientIdForDetails(clientId);
    setIsClientDetailModalOpen(true);
  };
  
  // Handle opening the restore confirmation dialog
  const handleOpenRestoreDialog = (item: {id: number, name: string, type: 'client' | 'entity'}) => {
    setItemToRestore(item);
    setIsRestoreDialogOpen(true);
  };

  // State for delete client confirmation dialog
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{id: number, name: string, isDeleted?: boolean} | null>(null);

  // Handle opening the delete client confirmation dialog
  const handleOpenDeleteClientDialog = (client: {id: number, name: string}, isDeleted?: boolean) => {
    setClientToDelete({...client, isDeleted});
    setIsDeleteClientDialogOpen(true);
  };

  // Client delete mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete client');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      // Close dialog and reset client to delete
      setIsDeleteClientDialogOpen(false);
      setClientToDelete(null);
      
      toast({
        title: "Success",
        description: "Client deleted successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Client delete error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete client. Please try again.",
        variant: "destructive",
      });
      setIsDeleteClientDialogOpen(false);
    }
  });
  


  // Handle edit client click from dropdown menu
  const handleEditClient = async (client: any) => {
    // Fetch client details with entities
    try {
      const response = await fetch(`/api/admin/clients/${client.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch client details');
      }
      
      const data = await response.json();
      
      if (data && data.status === 'success') {
        setCurrentEditClient(data.data);
        // Set client entities if available
        if (data.data.entities) {
          setClientEntities(data.data.entities);
        }
        setIsEditClientDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching client details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client details. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle client update
  const updateClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await fetch(`/api/admin/clients/${clientData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update client');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      // Close dialog and reset current client
      setIsEditClientDialogOpen(false);
      setCurrentEditClient(null);
      setClientEntities([]);
      
      toast({
        title: "Success",
        description: "Client updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Client update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update client. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission for updating a client
  const handleUpdateClient = (updatedData: any) => {
    if (!currentEditClient || !currentEditClient.id) {
      toast({
        title: "Error",
        description: "No client selected for update",
        variant: "destructive",
      });
      return;
    }
    
    // Merge current client with updated data
    const clientData = {
      ...currentEditClient,
      ...updatedData,
    };
    
    // Submit the update
    updateClientMutation.mutate(clientData);
  };
  
  // Handle entity update
  const updateEntityMutation = useMutation({
    mutationFn: async (entityData: any) => {
      const endpoint = isAdmin ? `/api/admin/entities/${entityData.id}` : `/api/entities/${entityData.id}`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entityData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update entity');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/entities'] });
      
      // Close dialog and reset current entity
      setIsEditEntityDialogOpen(false);
      setCurrentEditEntity(null);
      
      toast({
        title: "Success",
        description: "Entity updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Entity update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update entity. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission for updating an entity
  const handleUpdateEntity = (updatedData: any) => {
    if (!currentEditEntity || !currentEditEntity.id) {
      toast({
        title: "Error",
        description: "No entity selected for update",
        variant: "destructive",
      });
      return;
    }
    
    // Merge current entity with updated data
    const entityData = {
      ...currentEditEntity,
      ...updatedData,
    };
    
    // Submit the update
    updateEntityMutation.mutate(entityData);
  };
  
  // Handle restore client/entity mutation
  const restoreMutation = useMutation({
    mutationFn: async ({id, type}: {id: number, type: 'client' | 'entity'}) => {
      const endpoint = type === 'client' 
        ? `/api/admin/clients/${id}/restore`
        : `/api/admin/entities/${id}/restore`;
        
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to restore ${type}`);
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
      
      // Show success notification
      toast({
        title: "Success",
        description: `${variables.type === 'client' ? 'Client' : 'Entity'} restored successfully.`,
      });
      
      // Close dialog
      setIsRestoreDialogOpen(false);
      setItemToRestore(null);
    },
    onError: (error: any) => {
      console.error('Restore error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to restore. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle restore action from dialog confirmation
  const handleRestoreConfirm = () => {
    if (!itemToRestore) return;
    
    restoreMutation.mutate({
      id: itemToRestore.id,
      type: itemToRestore.type
    });
  };
  

  
  // Handle form submission
  const handleCreateEntity = () => {
    // Validate required fields
    if (!entityForm.name) {
      toast({
        title: "Validation Error",
        description: "Entity name is required",
        variant: "destructive",
      });
      return;
    }
    
    // For admin users, ensure owner is selected
    if (isAdmin && !entityForm.ownerId) {
      toast({
        title: "Validation Error",
        description: "Please select an owner for this entity",
        variant: "destructive",
      });
      return;
    }
    
    // Add isActive flag and createdBy
    const entityData = {
      ...entityForm,
      isActive: true,
      createdBy: user?.id
    };
    
    // Submit the data
    createEntityMutation.mutate(entityData);
  };
  
  // Queries for financial data - only enabled when entity is selected
  const { data: incomeData = {} as IncomeStatementData, isLoading: incomeLoading } = useQuery<IncomeStatementData>({
    queryKey: currentEntity ? ['/api/entities', currentEntity.id, 'reports', 'income-statement'] : ['skip-query-income'],
    enabled: !!currentEntity
  });
  
  const { data: balanceSheetData = {} as BalanceSheetData, isLoading: balanceSheetLoading } = useQuery<BalanceSheetData>({
    queryKey: currentEntity ? ['/api/entities', currentEntity.id, 'reports', 'balance-sheet'] : ['skip-query-balance'],
    enabled: !!currentEntity
  });
  
  const { data: cashFlowData = {} as CashFlowData, isLoading: cashFlowLoading } = useQuery<CashFlowData>({
    queryKey: currentEntity ? ['/api/entities', currentEntity.id, 'reports', 'cash-flow'] : ['skip-query-cashflow'],
    enabled: !!currentEntity
  });
  
  // Financial data interfaces
interface FinancialAccount {
  accountId: number;
  accountName: string;
  balance: number;
}

interface BalanceSheetData {
  assets?: FinancialAccount[];
  liabilities?: FinancialAccount[];
  equity?: FinancialAccount[];
  totalAssets?: number;
  liabilitiesAndEquity?: number;
}

interface IncomeStatementData {
  revenue?: FinancialAccount[];
  expenses?: FinancialAccount[];
  totalRevenue?: number;
  totalExpenses?: number;
  netIncome?: number;
}

interface CashFlowData {
  netCashFlow?: number;
  operatingActivities?: FinancialAccount[];
  investingActivities?: FinancialAccount[];
  financingActivities?: FinancialAccount[];
}

interface BlogSubscriber {
  id: number;
  email: string;
  name?: string;
  industry?: string;
  isActive: boolean;
  createdAt: string;
  source?: string;
}

// Define types for admin dashboard data
interface AdminDashboardData {
  status: string;
  data: {
    entities: Array<{
      id: number;
      name: string;
      legalName?: string;
      taxId?: string;
      entityType?: string;
      industry?: string;
      address?: string;
      isActive: boolean;
      ownerId: number;
      createdAt: string;
      updatedAt?: string;
      email?: string;
      phone?: string;
    }>;
    clients: Array<{
      id: number;
      name: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      industry?: string;
      address?: string;
      isActive: boolean;
      createdAt: string;
      updatedAt?: string;
    }>;
    users: Array<{
      id: number;
      username: string;
      name: string;
      email: string;
      role: string;
    }>;
    consolidationGroups: Array<{
      id: number;
      name: string;
      description?: string;
      ownerId: number;
      isActive: boolean;
      createdAt: string;
      updatedAt?: string;
    }>;
  };
}
  
  // Admin API data
  const { data: adminDashboardData = { status: 'pending', data: { clients: [], entities: [], users: [], consolidationGroups: [] } }, 
    isLoading: adminDataLoading,
    refetch: refetchDashboardRaw
  } = useQuery<AdminDashboardData>({
    queryKey: ['/api/admin/dashboard'],
    enabled: isAdmin,
    staleTime: 0, // Consider data always stale
    refetchOnMount: true, // Always refetch on component mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
    onSuccess: (data) => {
      console.log("DEBUG Dashboard: adminDashboard query onSuccess triggered with data:", 
        data?.status, "clients:", data?.data?.clients?.length || 0);
    },
    onError: (error) => {
      console.error("DEBUG Dashboard: adminDashboard query onError triggered:", error);
    }
  });
  
  // Create a wrapped refetch function with logging
  const refetchDashboard = useCallback(async () => {
    console.log("DEBUG Dashboard: refetchDashboard called - executing refetchDashboardRaw()");
    try {
      const result = await refetchDashboardRaw();
      console.log("DEBUG Dashboard: refetchDashboard success. Result status:", 
        result.status, "clients:", result.data?.data?.clients?.length || 0);
      return result;
    } catch (error) {
      console.error("DEBUG Dashboard: refetchDashboard error:", error);
      throw error;
    }
  }, [refetchDashboardRaw]);
  
  // Fetch admin users list for entity owner assignment (admin only)
  const { data: adminUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: isAdmin
  });
  
  // Handle export of subscribers to CSV
  const handleExportSubscribers = async () => {
    try {
      const response = await fetch('/api/admin/blog-subscribers');
      if (!response.ok) {
        throw new Error('Failed to fetch subscribers');
      }
      const subscribers = await response.json();
      
      if (subscribers && subscribers.length > 0) {
        exportToCSV(
          subscribers, 
          `blog-subscribers-${new Date().toISOString().split('T')[0]}.csv`,
          [
            { key: 'email', label: 'Email' },
            { key: 'name', label: 'Name' },
            { key: 'industry', label: 'Industry' },
            { key: 'createdAt', label: 'Subscribed Date' },
            { key: 'isActive', label: 'Active' },
            { key: 'source', label: 'Source' }
          ]
        );
        
        toast({
          title: "Export Successful",
          description: `${subscribers.length} subscribers exported to CSV.`,
        });
      } else {
        toast({
          title: "No Subscribers",
          description: "There are no subscribers to export.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export subscribers. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Admin dashboard specific state - start with client management tab selected
  const [adminActiveTab, setAdminActiveTab] = useState("client-management");
  
  // Load entities, clients, and data from admin dashboard data
  const entities = adminDashboardData?.data?.entities || [];
  const clients = adminDashboardData?.data?.clients || [];
  const dashboardUsers = adminDashboardData?.data?.users || [];
  const consolidationGroups = adminDashboardData?.data?.consolidationGroups || [];
  
  // Filtered clients based on search and status
  const filteredClients = clients.filter(client => {
    // First, filter deleted clients based on showDeletedEntities flag
    // If the client is deleted and showDeletedEntities is false, filter it out
    // Unless the clientStatusFilter is specifically set to "Deleted"
    if (isClientDeleted(client) && !showDeletedEntities && clientStatusFilter !== "Deleted") {
      return false;
    }
    
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (client.contactName && client.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (client.contactEmail && client.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Handle status filtering based on active status and deleted status
    const matchesStatus = 
      clientStatusFilter === "all" || 
      (clientStatusFilter === "Active" && getClientActiveStatus(client) && !isClientDeleted(client)) ||
      (clientStatusFilter === "Inactive" && !getClientActiveStatus(client) && !isClientDeleted(client)) ||
      (clientStatusFilter === "Deleted" && isClientDeleted(client));
      
    return matchesSearch && matchesStatus;
  });

  // Data for client status pie chart using real client data
  const clientStatusData = [
    { name: 'Active', value: clients.filter(c => getClientActiveStatus(c) && !isClientDeleted(c)).length },
    { name: 'Inactive', value: clients.filter(c => !getClientActiveStatus(c) && !isClientDeleted(c)).length },
    { name: 'Deleted', value: clients.filter(c => isClientDeleted(c)).length }
  ];

  // Data for payment status
  const paymentStatusData = [
    { name: 'Paid', value: mockPayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0) },
    { name: 'Pending', value: mockPayments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0) },
    { name: 'Overdue', value: mockPayments.filter(p => p.status === 'Overdue').reduce((sum, p) => sum + p.amount, 0) }
  ];
  
  // Sample data for original dashboard charts
  const monthlyRevenue = [
    { month: 'Jan', revenue: 5000 },
    { month: 'Feb', revenue: 7500 },
    { month: 'Mar', revenue: 8000 },
    { month: 'Apr', revenue: 6800 },
    { month: 'May', revenue: 9200 },
    { month: 'Jun', revenue: 10500 },
  ];
  
  const cashFlowForecast = [
    { month: 'Jul', inflow: 12000, outflow: 9500 },
    { month: 'Aug', inflow: 14000, outflow: 10200 },
    { month: 'Sep', inflow: 15500, outflow: 11000 },
    { month: 'Oct', inflow: 13500, outflow: 10500 },
    { month: 'Nov', inflow: 16200, outflow: 11200 },
    { month: 'Dec', inflow: 18000, outflow: 13000 },
  ];
  
  const expenseBreakdown = [
    { category: 'Payroll', value: 45 },
    { category: 'Rent', value: 20 },
    { category: 'Utilities', value: 10 },
    { category: 'Marketing', value: 15 },
    { category: 'Other', value: 10 },
  ];

  // For admin users, don't require entity selection to show dashboard
  if (!currentEntity && !isAdmin) {
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
      <PageHeader title="Dashboard" description={`Welcome, ${user?.name || 'User'}!`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Dashboard Content */}
        <div className="mt-6">
            {/* Original Dashboard - Overview Tab */}
          {activeTab === "overview" && (
            <div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Revenue YTD</CardTitle>
                    <CardDescription>Total revenue for current fiscal year</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${incomeLoading ? "..." : incomeData?.totalRevenue?.toLocaleString() || "0.00"}</div>
                    <div className="text-xs text-green-500 mt-1">↑ 12% from last year</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Net Income</CardTitle>
                    <CardDescription>Year to date</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${incomeLoading ? "..." : incomeData?.netIncome?.toLocaleString() || "0.00"}</div>
                    <div className="text-xs text-green-500 mt-1">↑ 8% from last year</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Cash Position</CardTitle>
                    <CardDescription>Current balance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${cashFlowLoading ? "..." : (cashFlowData?.netCashFlow || 0).toLocaleString()}</div>
                    <div className="text-xs text-red-500 mt-1">↓ 3% from last month</div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Revenue</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenseBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="category" type="category" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="hsl(var(--chart-2))" name="% of Total Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          {/* Original Dashboard - Cash Flow Tab */}
          {activeTab === "cashflow" && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Forecast</CardTitle>
                  <CardDescription>Projected for next 6 months</CardDescription>
                </CardHeader>
                <CardContent className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashFlowForecast}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="inflow" stroke="hsl(var(--chart-2))" name="Cash Inflow" />
                      <Line type="monotone" dataKey="outflow" stroke="hsl(var(--chart-3))" name="Cash Outflow" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Average Monthly Inflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$14,866</div>
                    <div className="text-xs text-green-500 mt-1">↑ 5% projected growth</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Average Monthly Outflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$10,900</div>
                    <div className="text-xs text-red-500 mt-1">↑ 3% projected increase</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Projected Net Position</CardTitle>
                    <CardDescription>End of year</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$23,800</div>
                    <div className="text-xs text-green-500 mt-1">↑ 15% from current</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          {/* Original Dashboard - Reports Tab */}
          {activeTab === "reports" && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Balance Sheet Summary</CardTitle>
                  <CardDescription>As of today</CardDescription>
                </CardHeader>
                <CardContent>
                  {balanceSheetLoading ? (
                    <div className="flex justify-center py-8">Loading...</div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Assets</h3>
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <dl className="divide-y divide-gray-200">
                            {balanceSheetData?.assets?.map((asset: FinancialAccount) => (
                              <div key={asset.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{asset.accountName}</dt>
                                <dd className="text-gray-900">${asset.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            <div className="flex justify-between py-1 font-medium">
                              <dt>Total Assets</dt>
                              <dd>${balanceSheetData?.totalAssets?.toLocaleString() || "0.00"}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900">Liabilities & Equity</h3>
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <dl className="divide-y divide-gray-200">
                            {balanceSheetData?.liabilities?.map((liability: FinancialAccount) => (
                              <div key={liability.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{liability.accountName}</dt>
                                <dd className="text-gray-900">${liability.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            {balanceSheetData?.equity?.map((equity: FinancialAccount) => (
                              <div key={equity.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{equity.accountName}</dt>
                                <dd className="text-gray-900">${equity.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            <div className="flex justify-between py-1 font-medium">
                              <dt>Total Liabilities & Equity</dt>
                              <dd>${balanceSheetData?.liabilitiesAndEquity?.toLocaleString() || "0.00"}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Income Statement Summary</CardTitle>
                  <CardDescription>Year to date</CardDescription>
                </CardHeader>
                <CardContent>
                  {incomeLoading ? (
                    <div className="flex justify-center py-8">Loading...</div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Revenue</h3>
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <dl className="divide-y divide-gray-200">
                            {incomeData?.revenue?.map((rev: FinancialAccount) => (
                              <div key={rev.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{rev.accountName}</dt>
                                <dd className="text-gray-900">${rev.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            <div className="flex justify-between py-1 font-medium">
                              <dt>Total Revenue</dt>
                              <dd>${incomeData?.totalRevenue?.toLocaleString() || "0.00"}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-900">Expenses</h3>
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <dl className="divide-y divide-gray-200">
                            {incomeData?.expenses?.map((expense: FinancialAccount) => (
                              <div key={expense.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{expense.accountName}</dt>
                                <dd className="text-gray-900">${expense.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            <div className="flex justify-between py-1 font-medium">
                              <dt>Total Expenses</dt>
                              <dd>${incomeData?.totalExpenses?.toLocaleString() || "0.00"}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-2">
                        <dl>
                          <div className="flex justify-between py-1 font-medium text-gray-900">
                            <dt>Net Income</dt>
                            <dd>${incomeData?.netIncome?.toLocaleString() || "0.00"}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Admin Dashboard Tab - Always Shown */}
          {isAdmin && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Clients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getStatsSummary(clients, entities, dashboardUsers, consolidationGroups).totalClients}</div>
                    <div className="text-sm text-gray-500">
                      {getStatsSummary(clients, entities, dashboardUsers, consolidationGroups).activeClients} active, {getStatsSummary(clients, entities, dashboardUsers, consolidationGroups).newClientsThisMonth} new this month
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Employees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getStatsSummary(clients, entities, dashboardUsers, consolidationGroups).totalEmployees}</div>
                    <div className="text-sm text-gray-500">
                      Managing {getStatsSummary(clients, entities, dashboardUsers, consolidationGroups).totalClients} clients
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${getStatsSummary(clients, entities, dashboardUsers, consolidationGroups).totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">
                      ${getStatsSummary(clients, entities, dashboardUsers, consolidationGroups).outstandingPayments.toLocaleString()} outstanding
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getStatsSummary(clients, entities, dashboardUsers, consolidationGroups).pendingTasks}</div>
                    <div className="text-sm text-gray-500">
                      Pending actions across all clients
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Admin Management Features */}
              <Tabs value={adminActiveTab} onValueChange={setAdminActiveTab} className="mt-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight">Management Features</h2>
                  <p className="text-muted-foreground mb-4">Manage clients, employees, billing, and more.</p>
                </div>
                
                <TabsList className="mb-4">
                  <TabsTrigger value="client-management">Client Management</TabsTrigger>
                  <TabsTrigger value="employee-management">Employee Management</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="content-management">Website Content</TabsTrigger>
                </TabsList>
                
                {/* Client Management Tab */}
                <TabsContent value="client-management">
                  
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle>Client Status Overview</CardTitle>
                            <Dialog 
                              open={isAddClientDialogOpen} 
                              onOpenChange={(open) => {
                                // When dialog is closed, also reset all form data
                                if (!open) {
                                  // Clear any client data that might have been collected
                                  console.log("Dialog closed - resetting client setup state");
                                  
                                  // CRITICAL FIX: Explicitly clear localStorage for setup items
                                  // This prevents stale entity data from persisting across different client setups
                                  try {
                                    localStorage.removeItem('setupActiveStep');
                                    localStorage.removeItem('setupClientData');
                                    localStorage.removeItem('setupEntities');
                                    console.log("Client Dialog: Cleared all setup data from localStorage on dialog close");
                                  } catch (e) {
                                    console.warn("Error clearing localStorage:", e);
                                  }
                                }
                                setIsAddClientDialogOpen(open);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button size="sm">
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Add Client
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Client Setup Wizard</DialogTitle>
                                  <DialogDescription>
                                    Complete the steps below to set up a new client.
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="py-4">
                                  {isAddClientDialogOpen && (
                                    <SetupStepper 
                                      key="setup-stepper" // Use a stable key to prevent remounting
                                      onComplete={async () => {
                                        console.log("DEBUG Dashboard: handleSetupComplete triggered. Invalidating queries...");
                                        console.log("DEBUG Dashboard: onComplete function executed as expected");
                                        
                                        // Close the dialog first for better UX
                                        setIsAddClientDialogOpen(false);
                                        console.log("DEBUG Dashboard: Dialog closed");
                                        
                                        // More aggressive approach to refresh data
                                        // First, clear all query caches to force complete refresh
                                        console.log("DEBUG Dashboard: Clearing all query caches with queryClient.clear()");
                                        try {
                                          queryClient.clear();
                                          console.log("DEBUG Dashboard: Query cache cleared successfully");
                                        } catch (clearError) {
                                          console.error("DEBUG Dashboard: Error clearing query cache:", clearError);
                                        }
                                        
                                        // Then immediately trigger manual refetches
                                        console.log("DEBUG Dashboard: Forcing direct refetches of all data");
                                        
                                        // Set the setupComplete state to trigger UI update
                                        setSetupComplete(true);
                                        console.log("DEBUG Dashboard: setupComplete state set to true");
                                        
                                        // Clear setup data from sessionStorage to avoid caching issues
                                        try {
                                          console.log("Dashboard: Clearing setup data from sessionStorage");
                                          sessionStorage.removeItem('setupData');
                                        } catch (e) {
                                          console.error("Dashboard: Error clearing sessionStorage:", e);
                                        }
                                        
                                        // Wait briefly for dialog animations to complete, then refresh
                                        setTimeout(async () => {
                                          console.log("Dashboard: Executing refetch operations");
                                          try {
                                            // Invalidate and refetch all queries
                                            console.log("DEBUG Dashboard: Invalidating all query caches, including '/api/admin/dashboard'");
                                            queryClient.invalidateQueries();
                                            
                                            // Also explicitly refetch dashboard data
                                            if (refetchDashboard) {
                                              console.log("DEBUG Dashboard: Calling refetchDashboard function directly");
                                              await refetchDashboard();
                                              console.log("DEBUG Dashboard: Dashboard data successfully refetched");
                                            } else {
                                              console.warn("Dashboard: refetchDashboard function not available");
                                            }
                                          
                                            // Show confirmation toast after refetch completes
                                            toast({
                                              title: "Setup Complete",
                                              description: "New client has been added successfully",
                                            });
                                            
                                            // Force refresh if data still doesn't appear
                                            setTimeout(() => {
                                              if (!adminDashboardData?.data?.clients?.length) {
                                                console.log("Dashboard: Data still missing, forcing a reload");
                                                window.location.reload();
                                              }
                                            }, 2000);
                                          } catch (error) {
                                            console.error("Dashboard: Error refetching data:", error);
                                          }
                                        }, 500);
                                      }} 
                                    />
                                  )}
                                </div>
                                
                                <DialogFooter>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setIsAddClientDialogOpen(false)}
                                  >
                                    Close
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <div className="flex justify-between items-center mt-4">
                            <div className="relative w-64">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search clients..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                            </div>
                            <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                                <SelectItem value="Deleted">Deleted</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {adminDataLoading ? (
                            <div className="flex justify-center items-center py-16">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : filteredClients.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Client Name</TableHead>
                                  <TableHead>Client Code</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Progress</TableHead>
                                  <TableHead>Last Update</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredClients.map((client) => (
                                  <TableRow key={client.id}>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <span>{client.name}</span>
                                        {/* Eye button visible only on small screens (mobile) */}
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="md:hidden p-1" 
                                          onClick={() => handleViewDetails(client.id)}
                                          title="View Details"
                                        >
                                          <Eye className="h-4 w-4 text-gray-500" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="md:hidden p-1" 
                                          onClick={() => handleEditClient(client)}
                                          title="Edit Client"
                                        >
                                          <Pen className="h-4 w-4 text-gray-500" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {client.clientCode || <span className="text-gray-400 text-sm italic">Pending</span>}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={getStatusColor(getClientActiveStatus(client) ? 'Active' : 'Inactive')}>
                                        {getClientActiveStatus(client) ? 'Active' : 'Inactive'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center">
                                        <span className="text-sm text-gray-600">{getClientActiveStatus(client) ? 'Complete' : 'In Progress'}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>{formatDate(client.updatedAt || client.createdAt)}</TableCell>
                                    <TableCell className="text-right">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">More options</span>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                          <DropdownMenuItem onClick={() => handleViewDetails(client.id)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Details
                                          </DropdownMenuItem>
                                          <DropdownMenuItem>
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Send Message
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                                            <Pen className="mr-2 h-4 w-4" />
                                            Edit Client
                                          </DropdownMenuItem>
                                          {isClientDeleted(client) ? (
                                            <>
                                              <DropdownMenuItem onClick={() => handleOpenRestoreDialog({id: client.id, name: client.name, type: 'client'})}>
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                Restore Client
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                onClick={() => handleOpenDeleteClientDialog({id: client.id, name: client.name}, true)}
                                                className="text-red-800 hover:text-red-900 hover:bg-red-100"
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Permanently Delete
                                              </DropdownMenuItem>
                                            </>
                                          ) : (
                                            <DropdownMenuItem 
                                              onClick={() => handleOpenDeleteClientDialog({id: client.id, name: client.name})}
                                              className="text-red-600 hover:text-red-800 hover:bg-red-100"
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete Client
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-10 text-muted-foreground">
                              <Search className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
                              <h3 className="font-medium text-lg mb-2">No clients available</h3>
                              <p className="text-sm mb-4">Create new clients to see them listed here.</p>
                              <Button size="sm" onClick={() => setIsAddClientDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add New Client
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    <div className="space-y-6">
                      {/* Client Status Distribution Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Client Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                          {adminDataLoading ? (
                            <div className="flex justify-center items-center h-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={clientStatusData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {clientStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle>Pending Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {adminDataLoading ? (
                            <div className="flex justify-center items-center h-32">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Generate and display pending tasks based on real entities */}
                              {entities.length > 0 ? (
                                generatePendingTasks(entities).map((task) => (
                                  <div key={task.id} className="flex items-start">
                                    <CheckCircle2 
                                      className={`mt-0.5 h-5 w-5 ${
                                        task.priority === 'high' 
                                          ? 'text-red-400' 
                                          : task.priority === 'medium' 
                                            ? 'text-yellow-400' 
                                            : 'text-gray-400'
                                      }`} 
                                    />
                                    <div className="ml-3">
                                      <p className="text-sm font-medium">{task.taskDescription}</p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-500">{task.entityName}</p>
                                        <span className="text-xs bg-gray-100 px-1 rounded">Due: {formatDate(task.dueDate)}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-gray-500 text-center py-4">
                                  No pending tasks found. Add clients to see tasks.
                                </div>
                              )}
                              
                              {entities.length > 0 && generatePendingTasks(entities).length === 0 && (
                                <div className="text-sm text-gray-500 text-center py-4">
                                  No pending tasks at the moment. Good job!
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Employee Management Tab */}
                <TabsContent value="employee-management">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle>Employee Overview</CardTitle>
                            <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
                              <DialogTrigger asChild>
                                <Button size="sm">
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Add Employee
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add New Employee</DialogTitle>
                                  <DialogDescription>
                                    Enter the details for the new employee.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="emp-name" className="text-right">Name</Label>
                                    <Input id="emp-name" className="col-span-3" />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="emp-email" className="text-right">Email</Label>
                                    <Input id="emp-email" type="email" className="col-span-3" />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="emp-role" className="text-right">Role</Label>
                                    <Select>
                                      <SelectTrigger id="emp-role" className="col-span-3">
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="accountant">Accountant</SelectItem>
                                        <SelectItem value="support">Support</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Permissions</Label>
                                    <div className="col-span-3 space-y-2">
                                      <div className="flex items-center">
                                        <input type="checkbox" id="perm-view" className="mr-2" />
                                        <Label htmlFor="perm-view">View Data</Label>
                                      </div>
                                      <div className="flex items-center">
                                        <input type="checkbox" id="perm-edit" className="mr-2" />
                                        <Label htmlFor="perm-edit">Edit Data</Label>
                                      </div>
                                      <div className="flex items-center">
                                        <input type="checkbox" id="perm-approve" className="mr-2" />
                                        <Label htmlFor="perm-approve">Approve Transactions</Label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsAddEmployeeDialogOpen(false)}>Cancel</Button>
                                  <Button onClick={() => setIsAddEmployeeDialogOpen(false)}>Save Employee</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Assigned Clients</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mockEmployees.map((employee) => (
                                <TableRow key={employee.id}>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <Avatar className="h-8 w-8 mr-2">
                                        <AvatarFallback>{employee.avatar}</AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium">{employee.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{employee.role}</TableCell>
                                  <TableCell>{employee.email}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {employee.assignedClients.map((client) => (
                                        <Badge key={client} variant="outline">{client}</Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreVertical className="h-4 w-4" />
                                          <span className="sr-only">More options</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleViewDetails(employee.id)}>
                                          <Eye className="mr-2 h-4 w-4" />
                                          View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Pen className="mr-2 h-4 w-4" />
                                          Edit Employee
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Users className="mr-2 h-4 w-4" />
                                          Assign Clients
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <Card>
                        <CardHeader>
                          <CardTitle>Workload Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockEmployees.map(e => ({ 
                                id: e.id, // Adding id from the original object
                                name: e.name, 
                                clients: e.assignedClients.length 
                              }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="clients" fill="hsl(var(--chart-1))" name="Assigned Clients" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-start">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">Jane Smith approved journal entries for Acme Corp</p>
                                <p className="text-xs text-gray-500">Today at 10:30 AM</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">John Doe onboarded TechStart Inc</p>
                                <p className="text-xs text-gray-500">Yesterday at 2:15 PM</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">Emily Chen submitted quarterly report for Morning Star Co</p>
                                <p className="text-xs text-gray-500">2 days ago</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Billing Tab */}
                <TabsContent value="billing">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle>Payment Status Overview</CardTitle>
                            <Button size="sm">
                              <FileText className="mr-2 h-4 w-4" />
                              Generate Invoice
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mockPayments.map((payment) => (
                                <TableRow key={payment.id}>
                                  <TableCell className="font-medium">{payment.client}</TableCell>
                                  <TableCell>${payment.amount.toLocaleString()}</TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(payment.status)}>
                                      {payment.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{formatDate(payment.date)}</TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreVertical className="h-4 w-4" />
                                          <span className="sr-only">More options</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem>
                                          <Download className="mr-2 h-4 w-4" />
                                          Download Invoice
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Mail className="mr-2 h-4 w-4" />
                                          Send Reminder
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                          Mark as Paid
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <Card>
                        <CardHeader>
                          <CardTitle>Payment Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={paymentStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {paymentStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                        <CardFooter>
                          <div className="w-full">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">Total Revenue</span>
                              <span className="text-sm font-medium">${getStatsSummary(clients, entities, dashboardUsers, consolidationGroups).totalRevenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-red-600">Outstanding</span>
                              <span className="text-sm font-medium text-red-600">${getStatsSummary(clients, entities, dashboardUsers, consolidationGroups).outstandingPayments.toLocaleString()}</span>
                            </div>
                          </div>
                        </CardFooter>
                      </Card>
                      <Card className="mt-6 space-y-6">
                        <CardHeader>
                          <CardTitle>Recent Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">Acme Corp</p>
                                <p className="text-xs text-gray-500">Invoice #2025-001</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">$2,500.00</p>
                                <p className="text-xs text-green-500">Paid</p>
                              </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">Bright Futures</p>
                                <p className="text-xs text-gray-500">Invoice #2025-002</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">$1,500.00</p>
                                <p className="text-xs text-green-500">Paid</p>
                              </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">Global Services LLC</p>
                                <p className="text-xs text-gray-500">Invoice #2025-003</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">$3,200.00</p>
                                <p className="text-xs text-red-500">Overdue</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Notifications Tab */}
                <TabsContent value="notifications">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle>Notification Center</CardTitle>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Bell className="mr-2 h-4 w-4" />
                                Mark All as Read
                              </Button>
                              <Button size="sm">
                                <Settings className="mr-2 h-4 w-4" />
                                Notification Settings
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {mockNotifications.map((notification) => (
                              <div key={notification.id} className={`flex p-3 rounded-md ${notification.read ? '' : 'bg-muted'}`}>
                                {notification.type === 'message' && <MessageSquare className="h-6 w-6 text-blue-500 mr-3" />}
                                {notification.type === 'task' && <FileCheck className="h-6 w-6 text-green-500 mr-3" />}
                                {notification.type === 'alert' && <AlertCircle className="h-6 w-6 text-red-500 mr-3" />}
                                {notification.type === 'system' && <Settings className="h-6 w-6 text-gray-500 mr-3" />}
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <h4 className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                                      {notification.content}
                                    </h4>
                                    <span className="text-xs text-gray-500">{notification.time}</span>
                                  </div>
                                  <div className="mt-1 flex space-x-2">
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                      View
                                    </Button>
                                    {!notification.read && (
                                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                        Mark as Read
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <Card>
                        <CardHeader>
                          <CardTitle>Notification Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">Email Notifications</p>
                                <p className="text-xs text-gray-500">Get email for important alerts</p>
                              </div>
                              <div>
                                <input type="checkbox" id="email-notif" className="toggle" defaultChecked />
                              </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">Client Messages</p>
                                <p className="text-xs text-gray-500">Notification when clients message you</p>
                              </div>
                              <div>
                                <input type="checkbox" id="message-notif" className="toggle" defaultChecked />
                              </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">Task Reminders</p>
                                <p className="text-xs text-gray-500">Get reminders for upcoming tasks</p>
                              </div>
                              <div>
                                <input type="checkbox" id="task-notif" className="toggle" defaultChecked />
                              </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">System Updates</p>
                                <p className="text-xs text-gray-500">Notifications about system changes</p>
                              </div>
                              <div>
                                <input type="checkbox" id="system-notif" className="toggle" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="mt-6 space-y-6">
                        <CardHeader>
                          <CardTitle>Message Templates</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">Invoice Reminder</p>
                                <p className="text-xs text-gray-500">Template for payment reminders</p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">Monthly Update</p>
                                <p className="text-xs text-gray-500">Regular client update template</p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">New Document Request</p>
                                <p className="text-xs text-gray-500">Request additional documents</p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Content Management Tab */}
                <TabsContent value="content-management">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle>Website Content Management</CardTitle>
                            <Button size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              Preview Site
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-lg font-medium mb-3">Home Page Sections</h3>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 rounded-md border">
                                  <div>
                                    <p className="font-medium">Hero Section</p>
                                    <p className="text-sm text-gray-500">Main banner and headline</p>
                                  </div>
                                  <Button variant="outline" size="sm">Edit</Button>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-md border">
                                  <div>
                                    <p className="font-medium">Services Section</p>
                                    <p className="text-sm text-gray-500">List of accounting services</p>
                                  </div>
                                  <Button variant="outline" size="sm">Edit</Button>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-md border">
                                  <div>
                                    <p className="font-medium">Testimonials</p>
                                    <p className="text-sm text-gray-500">Client reviews and feedback</p>
                                  </div>
                                  <Button variant="outline" size="sm">Edit</Button>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-md border">
                                  <div>
                                    <p className="font-medium">Contact Form</p>
                                    <p className="text-sm text-gray-500">Inquiry and contact information</p>
                                  </div>
                                  <Button variant="outline" size="sm">Edit</Button>
                                </div>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <h3 className="text-lg font-medium mb-3">Blog Management</h3>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 rounded-md border">
                                  <div>
                                    <p className="font-medium">AI-Generated Draft: 2025 Tax Planning Strategies</p>
                                    <p className="text-sm text-gray-500">Generated on March 18, 2025</p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button variant="outline" size="sm">Edit</Button>
                                    <Button size="sm">Approve & Publish</Button>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-md border">
                                  <div>
                                    <p className="font-medium">AI-Generated Draft: Understanding Cash Flow Management</p>
                                    <p className="text-sm text-gray-500">Generated on March 19, 2025</p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button variant="outline" size="sm">Edit</Button>
                                    <Button size="sm">Approve & Publish</Button>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-md border bg-gray-50">
                                  <div>
                                    <p className="font-medium">Published: Small Business Accounting Guide</p>
                                    <p className="text-sm text-gray-500">Published on March 15, 2025</p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button variant="outline" size="sm">View Stats</Button>
                                    <Button variant="outline" size="sm">Edit</Button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-6">
                                <div className="flex justify-between items-center mb-3">
                                  <h3 className="text-lg font-medium">Blog Subscribers</h3>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleExportSubscribers()}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Export List
                                  </Button>
                                </div>
                                <Card>
                                  <CardContent className="p-4">
                                    <SubscriberManagement />
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <Card>
                        <CardHeader>
                          <CardTitle>AI Content Generator</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="blog-topic">Blog Topic</Label>
                              <Select>
                                <SelectTrigger id="blog-topic">
                                  <SelectValue placeholder="Select topic" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="tax">Tax Planning</SelectItem>
                                  <SelectItem value="cashflow">Cash Flow Management</SelectItem>
                                  <SelectItem value="startup">Startup Finances</SelectItem>
                                  <SelectItem value="retirement">Retirement Planning</SelectItem>
                                  <SelectItem value="custom">Custom Topic</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="blog-keywords">Keywords (optional)</Label>
                              <Input id="blog-keywords" placeholder="Enter keywords separated by commas" />
                            </div>
                            <div>
                              <Label htmlFor="blog-audience">Target Audience</Label>
                              <Select>
                                <SelectTrigger id="blog-audience">
                                  <SelectValue placeholder="Select audience" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="small-business">Small Business Owners</SelectItem>
                                  <SelectItem value="startups">Startups</SelectItem>
                                  <SelectItem value="individuals">Individual Taxpayers</SelectItem>
                                  <SelectItem value="all">General Audience</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="blog-length">Article Length</Label>
                              <Select>
                                <SelectTrigger id="blog-length">
                                  <SelectValue placeholder="Select length" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="short">Short (500 words)</SelectItem>
                                  <SelectItem value="medium">Medium (1000 words)</SelectItem>
                                  <SelectItem value="long">Long (1500+ words)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button className="w-full">
                              Generate Blog Post
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="mt-6 space-y-6">
                        <CardHeader>
                          <CardTitle>Blog Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { title: "Small Business Guide", views: 245 },
                              { title: "Tax Tips 2025", views: 180 },
                              { title: "Cloud Accounting", views: 120 }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="title" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="views" fill="hsl(var(--chart-2))" name="Views" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                        <CardFooter>
                          <div className="w-full text-center text-sm text-muted-foreground">
                            AI-generated posts have 35% higher engagement
                          </div>
                        </CardFooter>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* ClientDetailModal for viewing client details */}
      <ClientDetailModal 
        clientId={selectedClientIdForDetails}
        isOpen={isClientDetailModalOpen}
        onOpenChange={setIsClientDetailModalOpen}
      />

      {/* ClientEditModal for editing client details */}
      <ClientEditModal 
        clientId={currentEditClient?.id || null}
        isOpen={isEditClientDialogOpen}
        onOpenChange={setIsEditClientDialogOpen}
      />
      {/* Restore Confirmation Dialog */}
      <RestoreConfirmationDialog
        isOpen={isRestoreDialogOpen}
        onClose={() => setIsRestoreDialogOpen(false)}
        itemId={itemToRestore?.id || 0}
        itemType={itemToRestore?.type || 'client'}
        itemName={itemToRestore?.name || ''}
        onConfirm={handleRestoreConfirm}
      />

      {/* Delete Client Dialog */}
      <DeleteClientDialog
        isOpen={isDeleteClientDialogOpen}
        onClose={() => setIsDeleteClientDialogOpen(false)}
        clientId={clientToDelete?.id || null}
        clientName={clientToDelete?.name || ''}
        isDeleted={clientToDelete?.isDeleted || false}
        onConfirm={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
        }}
      />
    </>
  );
}

export default Dashboard;
