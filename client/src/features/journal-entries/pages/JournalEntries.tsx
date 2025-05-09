import React, { useState, useEffect } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEntity } from '@/contexts/EntityContext';
import { useToast } from '@/hooks/use-toast';
import { getJournalEntriesBaseUrl } from '@/api/urlHelpers';
import { ymdToDisplay } from '@/utils/dateUtils';
import { getDebit, getCredit, isClientFormatLine, isServerFormatLine } from '../utils/lineFormat';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Plus,
  FileUp,
  Filter,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

function JournalEntries() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ clientId: string; entityId: string }>();
  const { currentEntity, setCurrentEntity, entities } = useEntity();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Extract and convert route params
  const clientId = params?.clientId ? parseInt(params.clientId) : (currentEntity?.clientId || null);
  const entityId = params?.entityId ? parseInt(params.entityId) : (currentEntity?.id || null);
  
  // Log detailed entity context information
  console.log("JournalEntries: Detailed context check", {
    "params.clientId": params?.clientId,
    "params.entityId": params?.entityId,
    "currentEntity?.clientId": currentEntity?.clientId,
    "currentEntity?.id": currentEntity?.id,
    "calculated clientId": clientId,
    "calculated entityId": entityId,
    "total entities in context": entities.length
  });
  
  // Update entity context if needed based on route params
  useEffect(() => {
    console.log("JournalEntries: Route params check - entityId:", entityId, 
                "clientId:", clientId, 
                "currentEntity:", currentEntity?.id);
    
    if (entityId && (!currentEntity || currentEntity.id !== entityId)) {
      console.log("JournalEntries: Looking for entity with ID:", entityId, "in", entities.length, "entities");
      const entity = entities.find(e => e.id === entityId);
      if (entity) {
        console.log("JournalEntries: Found entity in context, setting current entity:", entity.name);
        setCurrentEntity(entity);
      } else {
        console.log("JournalEntries: Entity not found in context for ID:", entityId);
      }
    }
  }, [entityId, clientId, currentEntity, entities, setCurrentEntity]);
  
  // EMERGENCY FIX: Direct API URL with no helper function
  const apiUrl = entityId && clientId ? `/api/clients/${clientId}/entities/${entityId}/journal-entries` : null;
  
  // Log the constructed URL for debugging
  console.log(`DEBUG: Constructing journal entries API URL: ${apiUrl}`);
  
  // Fetch journal entries for the entity using hierarchical URL pattern
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: apiUrl ? [apiUrl] : [],
    enabled: !!apiUrl,
    retry: 3, // Retry up to 3 times if the query fails
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    // TanStack Query v5 doesn't support onError in options
    // Handle errors with error state instead
  });
  
  useEffect(() => {
    console.log("JournalEntries Data:", data);
    console.log("JournalEntries Error:", error);
    console.log("JournalEntries Loading:", isLoading);
    
    if (!isLoading && !data && !error && entityId && clientId) {
      console.log("Journal entries query not running despite entityId and clientId being set");
      console.log("QueryKey:", getJournalEntriesBaseUrl(clientId, entityId));
      console.log("Current entity:", currentEntity);
    }
  }, [data, error, isLoading, entityId, clientId, currentEntity]);
  
  // We imported the helper functions from lineFormat at the top of the file
  
  // Calculate total debit/credit for each journal entry by using the lines data
  const entriesWithTotals = React.useMemo(() => {
    if (!data) {
      console.log("No data available for journal entries");
      return [];
    }
    
    // Handle different response structures
    const entries = Array.isArray(data) 
      ? data 
      : (data as any).entries || (data as any).journalEntries || [];
    
    console.log("DEBUG - JournalEntries - Raw entries:", entries);
    
    // Map through entries to enhance them with totals data
    return entries.map((entry: any) => {
      // Enhanced debugging to see the full entry structure
      console.log(`DEBUG - Entry ${entry.id} structure:`, Object.keys(entry));
      
      // If entry already has totals, use them
      if (entry.totalDebit !== undefined && entry.totalCredit !== undefined && 
          (entry.totalDebit > 0 || entry.totalCredit > 0)) {
        console.log(`DEBUG - Using existing totals for entry ${entry.id}: debit=${entry.totalDebit}, credit=${entry.totalCredit}`);
        return entry;
      }
      
      // Check if the API response includes totals in a nested structure
      if (entry.totals && typeof entry.totals === 'object') {
        if ('debit' in entry.totals && 'credit' in entry.totals) {
          console.log(`DEBUG - Using nested totals for entry ${entry.id}: debit=${entry.totals.debit}, credit=${entry.totals.credit}`);
          return { 
            ...entry, 
            totalDebit: safeParseAmount(entry.totals.debit), 
            totalCredit: safeParseAmount(entry.totals.credit)
          };
        }
      }
      
      // Otherwise, calculate totals from lines if available
      if (entry.lines && Array.isArray(entry.lines)) {
        console.log(`DEBUG - JournalEntries - Processing entry ${entry.id} lines:`, entry.lines);
        
        // Log the format of the first line to help diagnose issues
        if (entry.lines.length > 0) {
          const firstLine = entry.lines[0];
          console.log(`DEBUG - First line format for entry ${entry.id}:`, 
            isClientFormatLine(firstLine) ? "Client format" : 
            isServerFormatLine(firstLine) ? "Server format" : 
            "Unknown format", Object.keys(firstLine));
        }
        
        // Use our safer helper functions that handle both formats
        const totals = entry.lines.reduce((acc: any, line: any) => {
          // Get debit and credit values using our helper functions
          const debitValue = getDebit(line);
          const creditValue = getCredit(line);
          
          console.log(`Line in entry ${entry.id}: debit=${debitValue}, credit=${creditValue}`, line);
          
          acc.totalDebit += debitValue;
          acc.totalCredit += creditValue;
          return acc;
        }, { totalDebit: 0, totalCredit: 0 });
        
        console.log(`DEBUG - JournalEntries - Entry ${entry.id} calculated totals:`, totals);
        return { ...entry, ...totals };
      }
      
      // Look for debitTotal and creditTotal fields which might be present in some API responses
      if (entry.debitTotal !== undefined || entry.creditTotal !== undefined) {
        const totalDebit = safeParseAmount(entry.debitTotal);
        const totalCredit = safeParseAmount(entry.creditTotal);
        console.log(`DEBUG - Using debitTotal/creditTotal for entry ${entry.id}: debit=${totalDebit}, credit=${totalCredit}`);
        return { ...entry, totalDebit, totalCredit };
      }
      
      // If still no totals, try to calculate from a summary array if present
      if (entry.summary && Array.isArray(entry.summary)) {
        const totals = entry.summary.reduce((acc: any, item: any) => {
          if (item.type === 'debit') {
            acc.totalDebit += safeParseAmount(item.total);
          } else if (item.type === 'credit') {
            acc.totalCredit += safeParseAmount(item.total);
          }
          return acc;
        }, { totalDebit: 0, totalCredit: 0 });
        
        console.log(`DEBUG - Using summary data for entry ${entry.id}: debit=${totals.totalDebit}, credit=${totals.totalCredit}`);
        return { ...entry, ...totals };
      }
      
      // If no lines or other total data available, return entry as is with zero totals
      console.warn(`DEBUG - No totals data found for entry ${entry.id}, using zeros`);
      return { ...entry, totalDebit: 0, totalCredit: 0 };
    });
  }, [data]);
  
  // Handle new journal entry button click
  const handleNewJournalEntry = () => {
    if (clientId && entityId) {
      // Use absolute URL pattern to ensure parameters are included
      navigate(`/clients/${clientId}/entities/${entityId}/journal-entries/new`);
    } else {
      console.error("Cannot create journal entry: Missing client ID or entity ID");
      toast({
        title: "Error",
        description: "Cannot create journal entry. Please select a client and entity first.",
        variant: "destructive",
      });
    }
  };
  
  // Handle batch upload button click
  const handleBatchUpload = () => {
    if (clientId && entityId) {
      // Use absolute URL pattern to ensure client and entity params are included
      navigate(`/clients/${clientId}/entities/${entityId}/journal-entries/batch-upload`);
    } else {
      console.error("Cannot access batch upload: Missing client ID or entity ID");
      toast({
        title: "Error",
        description: "Cannot access batch upload. Please select a client and entity first.",
        variant: "destructive",
      });
    }
  };
  
  // Handle row click to view journal entry details
  const handleRowClick = (id: number) => {
    if (clientId && entityId) {
      // Use absolute URL path to include all parameters
      navigate(`/clients/${clientId}/entities/${entityId}/journal-entries/${id}`);
    } else {
      console.error("Cannot navigate to journal entry detail: Missing client ID or entity ID");
      toast({
        title: "Error",
        description: "Cannot view journal entry. Please select a client and entity first.",
        variant: "destructive",
      });
    }
  };
  
  // Filter and search journal entries
  const filteredEntries = React.useMemo(() => {
    if (!entriesWithTotals.length) return [];
    
    return entriesWithTotals.filter((entry: any) => {
      const matchesSearch = searchTerm === '' || 
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${entry.id}`.includes(searchTerm);
      
      const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [entriesWithTotals, searchTerm, filterStatus]);
  
  // Pagination
  const totalPages = Math.ceil((filteredEntries?.length || 0) / pageSize);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Format date for display without timezone shifts
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return ymdToDisplay(dateString);
  };
  
  // Get badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'posted':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Posted</Badge>;
      case 'void':
      case 'voided':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Void</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // If we have entityId from URL but no corresponding entity in context yet, show loading
  if (entityId && !currentEntity) {
    return (
      <div className="py-6">
        <PageHeader
          title="Journal Entries"
          description="Loading entity data..."
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-500 mb-4">Loading entity information...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // If no entity at all (neither from URL nor from context), prompt user to select one
  if (!entityId && !currentEntity) {
    return (
      <div className="py-6">
        <PageHeader
          title="Journal Entries"
          description="Create, view, and manage journal entries"
        >
          {/* Entity selection is handled in the main header */}
        </PageHeader>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-500 mb-4">Please select an entity from the header to view journal entries</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-6">
      <PageHeader
        title="Journal Entries"
        description="Create, view, and manage journal entries"
      >
        <div className="flex space-x-2">
          {clientId && entityId ? (
            <>
              <Link to={`/clients/${clientId}/entities/${entityId}/journal-entries/new`}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Entry
                </Button>
              </Link>
              
              <Link to={`/clients/${clientId}/entities/${entityId}/journal-entries/batch-upload`}>
                <Button variant="outline">
                  <FileUp className="mr-2 h-4 w-4" />
                  Batch Upload
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button onClick={handleNewJournalEntry}>
                <Plus className="mr-2 h-4 w-4" />
                New Entry
              </Button>
              
              <Button variant="outline" onClick={handleBatchUpload}>
                <FileUp className="mr-2 h-4 w-4" />
                Batch Upload
              </Button>
            </>
          )}
        </div>
      </PageHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Journal Entries for {currentEntity?.name || 'Selected Entity'}</CardTitle>
            <CardDescription>
              View and manage transactions for this entity
            </CardDescription>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by ID, description, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              
              <div className="flex space-x-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <span>{filterStatus === 'all' ? 'All Statuses' : filterStatus}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading journal entries...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-red-800">Error loading journal entries</p>
                <p className="text-red-600 text-sm">{(error as Error).message}</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-500 mb-4">No journal entries found</p>
                {clientId && entityId ? (
                  <Link to={`/clients/${clientId}/entities/${entityId}/journal-entries/new`}>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Journal Entry
                    </Button>
                  </Link>
                ) : (
                  <Button onClick={handleNewJournalEntry}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Journal Entry
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Journal ID</TableHead>
                      <TableHead>Database ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEntries.map((entry: any) => {
                      // Create the entry detail link once
                      const entryDetailLink = clientId && entityId 
                        ? `/clients/${clientId}/entities/${entityId}/journal-entries/${entry.id}`
                        : null;
                        
                      return (
                        <TableRow 
                          key={entry.id}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="font-medium">
                            {entryDetailLink ? (
                              <Link 
                                to={entryDetailLink}
                                className="text-blue-600 hover:underline hover:text-blue-800"
                              >
                                {entry.displayId || `JE-${entry.date.substring(0, 4)}-${entry.id.toString().padStart(4, '0')}`}
                              </Link>
                            ) : (
                              entry.displayId || `JE-${entry.date.substring(0, 4)}-${entry.id.toString().padStart(4, '0')}`
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                              {formatDate(entry.date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {entryDetailLink ? (
                              <Link 
                                to={entryDetailLink}
                                className="hover:underline"
                              >
                                {entry.referenceNumber || entry.reference || '-'}
                              </Link>
                            ) : (
                              entry.referenceNumber || entry.reference || '-'
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                          <TableCell>{entry.journalType || 'JE'}</TableCell>
                          <TableCell>{getStatusBadge(entry.status)}</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD'
                            }).format(entry.totalDebit || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD'
                            }).format(entry.totalCredit || 0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          
          {filteredEntries.length > 0 && (
            <CardFooter className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredEntries.length)} of {filteredEntries.length} entries
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

export default JournalEntries;