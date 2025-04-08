import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEntity } from '@/contexts/EntityContext';
import { useToast } from '@/hooks/use-toast';
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
  const [, navigate] = useLocation();
  const { currentEntity } = useEntity();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Fetch journal entries for the current entity
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: currentEntity?.id ? [`/api/entities/${currentEntity.id}/journal-entries`] : null,
    enabled: !!currentEntity?.id
  });
  
  // Handle new journal entry button click
  const handleNewJournalEntry = () => {
    navigate('/journal-entries/new');
  };
  
  // Handle batch upload button click
  const handleBatchUpload = () => {
    navigate('/journal-entries/batch-upload');
  };
  
  // Handle row click to view journal entry details
  const handleRowClick = (id: number) => {
    navigate(`/journal-entries/${id}`);
  };
  
  // Filter and search journal entries
  const filteredEntries = React.useMemo(() => {
    if (!data) return [];
    
    // Handle different response structures
    const entries = Array.isArray(data) ? data : (data.entries || []);
    
    return entries.filter((entry: any) => {
      const matchesSearch = searchTerm === '' || 
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${entry.id}`.includes(searchTerm);
      
      const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, filterStatus]);
  
  // Pagination
  const totalPages = Math.ceil((filteredEntries?.length || 0) / pageSize);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
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
  
  if (!currentEntity) {
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
          <Button onClick={handleNewJournalEntry}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
          
          <Button variant="outline" onClick={handleBatchUpload}>
            <FileUp className="mr-2 h-4 w-4" />
            Batch Upload
          </Button>
        </div>
      </PageHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Journal Entries for {currentEntity.name}</CardTitle>
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
                <Button onClick={handleNewJournalEntry}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Journal Entry
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
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
                    {paginatedEntries.map((entry: any) => (
                      <TableRow 
                        key={entry.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRowClick(entry.id)}
                      >
                        <TableCell className="font-medium">#{entry.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                            {formatDate(entry.date)}
                          </div>
                        </TableCell>
                        <TableCell>{entry.reference || '-'}</TableCell>
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
                    ))}
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