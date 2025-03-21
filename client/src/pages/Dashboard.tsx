import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
import { CheckCircle2, XCircle, AlertCircle, Clock, Settings, Search, MoreVertical, Mail, Download, Users, CreditCard, Bell, User, PlusCircle, FileCheck, Calendar, MessageSquare, Pen, Eye, ChevronRight, Trash2, BarChart2, FileText, Loader2 } from "lucide-react";
import { UserRole } from "@shared/schema";
import { exportToCSV } from "../lib/export-utils";
import { useToast } from "@/hooks/use-toast";

// Sample data for our admin dashboard
// In a real application, this would come from API calls
const mockClients = [
  {
    id: 1, 
    name: 'Acme Corp', 
    status: 'Active', 
    lastUpdate: '2025-03-15', 
    pendingActions: ['Review Documents', 'Approve Entries'],
    progress: 75
  },
  {
    id: 2, 
    name: 'TechStart Inc', 
    status: 'Onboarding', 
    lastUpdate: '2025-03-17', 
    pendingActions: ['Complete Setup'],
    progress: 30
  },
  {
    id: 3, 
    name: 'Global Services LLC', 
    status: 'Pending Review', 
    lastUpdate: '2025-03-16', 
    pendingActions: ['Financial Review'],
    progress: 90
  },
  {
    id: 4, 
    name: 'Bright Futures', 
    status: 'Active', 
    lastUpdate: '2025-03-10', 
    pendingActions: [],
    progress: 100
  },
  {
    id: 5, 
    name: 'Morning Star Co', 
    status: 'Active', 
    lastUpdate: '2025-03-13', 
    pendingActions: ['Quarterly Review'],
    progress: 85
  }
];

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
const getStatsSummary = (entities: any[], users: any[], consolidationGroups: any[]) => {
  const currentMonth = new Date().getMonth();
  return {
    totalClients: entities.length,
    activeClients: entities.filter(e => e.isActive).length,
    newClientsThisMonth: entities.filter(e => new Date(e.createdAt).getMonth() === currentMonth).length,
    totalEmployees: users.length,
    pendingTasks: 0, // Will be implemented when we have task data
    totalRevenue: 0, // Will be implemented when we have revenue data
    outstandingPayments: 0, // Will be implemented when we have payment data
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
  const { data: subscribers, isLoading } = useQuery({
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
  const filteredSubscribers = subscribers?.filter((subscriber: BlogSubscriber) => {
    const matchesSearch = 
      subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subscriber.name && subscriber.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (subscriber.industry && subscriber.industry.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesActive = filterActive ? subscriber.isActive : true;
    
    return matchesSearch && matchesActive;
  }) || [];

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
  
  // Set default active tab based on user role
  const [activeTab, setActiveTab] = useState(isAdmin ? "admin" : "overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
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
  const { data: incomeData = {}, isLoading: incomeLoading } = useQuery({
    queryKey: currentEntity ? ['/api/entities', currentEntity.id, 'reports', 'income-statement'] : ['skip-query-income'],
    enabled: !!currentEntity
  });
  
  const { data: balanceSheetData = {}, isLoading: balanceSheetLoading } = useQuery({
    queryKey: currentEntity ? ['/api/entities', currentEntity.id, 'reports', 'balance-sheet'] : ['skip-query-balance'],
    enabled: !!currentEntity
  });
  
  const { data: cashFlowData = {}, isLoading: cashFlowLoading } = useQuery({
    queryKey: currentEntity ? ['/api/entities', currentEntity.id, 'reports', 'cash-flow'] : ['skip-query-cashflow'],
    enabled: !!currentEntity
  });
  
  // Admin API data
  const { data: adminDashboardData = {}, isLoading: adminDataLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
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
            { key: 'email', header: 'Email' },
            { key: 'name', header: 'Name' },
            { key: 'industry', header: 'Industry' },
            { key: 'createdAt', header: 'Subscribed Date' },
            { key: 'isActive', header: 'Active' },
            { key: 'source', header: 'Source' }
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
  
  // Load entities and users from admin dashboard data
  const entities = adminDashboardData?.data?.entities || [];
  const users = adminDashboardData?.data?.users || [];
  const consolidationGroups = adminDashboardData?.data?.consolidationGroups || [];
  
  // Filtered entities based on search (replacing mock clients)
  const filteredClients = entities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = clientStatusFilter === "all" || 
      (clientStatusFilter === "Active" && entity.isActive) ||
      (clientStatusFilter === "Inactive" && !entity.isActive);
    return matchesSearch && matchesStatus;
  });

  // Data for client status pie chart using real entity data
  const clientStatusData = [
    { name: 'Active', value: entities.filter(e => e.isActive).length },
    { name: 'Inactive', value: entities.filter(e => !e.isActive).length }
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
        {/* No tabs - admin dashboard only */}
        
        {/* Tab Content Container */}
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
                            {balanceSheetData?.assets?.map((asset) => (
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
                            {balanceSheetData?.liabilities?.map((liability) => (
                              <div key={liability.accountId} className="flex justify-between py-1 text-sm">
                                <dt className="text-gray-500">{liability.accountName}</dt>
                                <dd className="text-gray-900">${liability.balance.toLocaleString()}</dd>
                              </div>
                            ))}
                            {balanceSheetData?.equity?.map((equity) => (
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
                            {incomeData?.revenue?.map((rev) => (
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
                            {incomeData?.expenses?.map((expense) => (
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
                    <div className="text-2xl font-bold">{getStatsSummary(entities, users, consolidationGroups).totalClients}</div>
                    <div className="text-sm text-gray-500">
                      {getStatsSummary(entities, users, consolidationGroups).activeClients} active, {getStatsSummary(entities, users, consolidationGroups).newClientsThisMonth} new this month
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Employees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getStatsSummary(entities, users, consolidationGroups).totalEmployees}</div>
                    <div className="text-sm text-gray-500">
                      Managing {getStatsSummary(entities, users, consolidationGroups).totalClients} clients
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${getStatsSummary(entities, users, consolidationGroups).totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">
                      ${getStatsSummary(entities, users, consolidationGroups).outstandingPayments.toLocaleString()} outstanding
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getStatsSummary(entities, users, consolidationGroups).pendingTasks}</div>
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
                            <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
                              <DialogTrigger asChild>
                                <Button size="sm">
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Add Client
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add New Client</DialogTitle>
                                  <DialogDescription>
                                    Enter the details for the new client.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Company Name *</Label>
                                    <Input 
                                      id="name" 
                                      className="col-span-3" 
                                      value={entityForm.name}
                                      onChange={handleEntityFormChange}
                                      required
                                    />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="legalName" className="text-right">Legal Name</Label>
                                    <Input 
                                      id="legalName" 
                                      className="col-span-3" 
                                      value={entityForm.legalName}
                                      onChange={handleEntityFormChange}
                                    />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="email" className="text-right">Email</Label>
                                    <Input 
                                      id="email" 
                                      type="email" 
                                      className="col-span-3"
                                      value={entityForm.email}
                                      onChange={handleEntityFormChange}
                                    />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="phone" className="text-right">Phone</Label>
                                    <Input 
                                      id="phone" 
                                      className="col-span-3"
                                      value={entityForm.phone}
                                      onChange={handleEntityFormChange}
                                    />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="industry" className="text-right">Industry</Label>
                                    <Input 
                                      id="industry" 
                                      className="col-span-3" 
                                      value={entityForm.industry}
                                      onChange={handleEntityFormChange}
                                    />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="entityType" className="text-right">Entity Type</Label>
                                    <Select 
                                      value={entityForm.entityType}
                                      onValueChange={(value) => setEntityForm(prev => ({...prev, entityType: value}))}
                                    >
                                      <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select entity type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="company">Company</SelectItem>
                                        <SelectItem value="individual">Individual</SelectItem>
                                        <SelectItem value="partnership">Partnership</SelectItem>
                                        <SelectItem value="llc">LLC</SelectItem>
                                        <SelectItem value="nonprofit">Non-Profit</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="taxId" className="text-right">Tax ID</Label>
                                    <Input 
                                      id="taxId" 
                                      className="col-span-3"
                                      value={entityForm.taxId}
                                      onChange={handleEntityFormChange}
                                    />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="address" className="text-right">Address</Label>
                                    <Textarea 
                                      id="address" 
                                      className="col-span-3" 
                                      value={entityForm.address}
                                      onChange={handleEntityFormChange}
                                    />
                                  </div>
                                  {isAdmin && users && users.length > 0 && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="ownerId" className="text-right">Owner</Label>
                                      <Select 
                                        value={entityForm.ownerId.toString()} 
                                        onValueChange={(value) => setEntityForm(prev => ({...prev, ownerId: parseInt(value)}))}
                                      >
                                        <SelectTrigger className="col-span-3">
                                          <SelectValue placeholder="Select user" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {users.map(u => (
                                            <SelectItem key={u.id} value={u.id.toString()}>
                                              {u.name} ({u.email})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                                <DialogFooter>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setIsAddClientDialogOpen(false)}
                                    disabled={createEntityMutation.isPending}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleCreateEntity}
                                    disabled={createEntityMutation.isPending}
                                  >
                                    {createEntityMutation.isPending ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                      </>
                                    ) : "Save Client"}
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
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter by status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Onboarding">Onboarding</SelectItem>
                                <SelectItem value="Pending Review">Pending Review</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Client Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Last Update</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredClients.map((entity) => (
                                <TableRow key={entity.id}>
                                  <TableCell className="font-medium">{entity.name}</TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(entity.isActive ? 'Active' : 'Inactive')}>
                                      {entity.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      {/* Progress based on entity completeness */}
                                      <Progress value={entity.isActive ? 100 : 50} className="h-2 w-32" />
                                      <span className="ml-2 text-xs">{entity.isActive ? 100 : 50}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatDate(entity.updatedAt || entity.createdAt)}</TableCell>
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
                                          <Eye className="mr-2 h-4 w-4" />
                                          View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <MessageSquare className="mr-2 h-4 w-4" />
                                          Send Message
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Pen className="mr-2 h-4 w-4" />
                                          Edit Entity
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
                          <CardTitle>Client Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
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
                        </CardContent>
                      </Card>
                      <Card className="mt-6">
                        <CardHeader className="pb-2">
                          <CardTitle>Pending Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {mockClients.flatMap(client => 
                              client.pendingActions.map((action, idx) => (
                                <div key={`${client.id}-${idx}`} className="flex items-start">
                                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-gray-400" />
                                  <div className="ml-3">
                                    <p className="text-sm font-medium">{action}</p>
                                    <p className="text-xs text-gray-500">{client.name}</p>
                                  </div>
                                </div>
                              ))
                            )}
                            {mockClients.flatMap(client => client.pendingActions).length === 0 && (
                              <div className="text-sm text-gray-500 text-center">No pending tasks</div>
                            )}
                          </div>
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
                                        <DropdownMenuItem>
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
                            <BarChart data={mockEmployees.map(e => ({ name: e.name, clients: e.assignedClients.length }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="clients" fill="hsl(var(--chart-1))" name="Assigned Clients" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                      <Card className="mt-6">
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
                              <span className="text-sm font-medium">${getStatsSummary(entities, users, consolidationGroups).totalRevenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-red-600">Outstanding</span>
                              <span className="text-sm font-medium text-red-600">${getStatsSummary(entities, users, consolidationGroups).outstandingPayments.toLocaleString()}</span>
                            </div>
                          </div>
                        </CardFooter>
                      </Card>
                      <Card className="mt-6">
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
                      
                      <Card className="mt-6">
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
                      
                      <Card className="mt-6">
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
    </>
  );
}

export default Dashboard;
