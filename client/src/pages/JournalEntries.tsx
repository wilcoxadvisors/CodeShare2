import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntity } from "../contexts/EntityContext";
import { Link, useLocation } from "wouter";
import PageHeader from "../components/PageHeader";
import FilterSection from "../components/FilterSection";
import DataTable from "../components/DataTable";
import JournalEntryForm from "../components/JournalEntryForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { JournalEntryStatus, AccountType } from "@shared/schema";
import { exportToCSV, getFormattedDateForFilename } from "../lib/export-utils";

// Define interface for journal entry line
interface JournalEntryLine {
  id: number;
  journalEntryId: number;
  accountId: number;
  description: string | null;
  debit: string;
  credit: string;
}

// Define interface for journal entry
interface JournalEntry {
  id: number;
  entityId: number;
  reference: string;
  date: string;
  description: string | null;
  status: JournalEntryStatus;
  lines?: JournalEntryLine[];
  [key: string]: any;
}

// Define interface for account
interface Account {
  id: number;
  code: string;
  name: string;
  entityId: number;
  type: AccountType;
  description: string | null;
  active: boolean;
  createdAt: Date; // Make createdAt required, not optional
  subtype: string | null;
  isSubledger: boolean;
  subledgerType: string | null;
  parentId: number | null;
  [key: string]: any;
}

// Define interface for filter data
interface FilterData {
  accountId: string;
  startDate: string;
  endDate: string;
  status: string;
  [key: string]: string;
}

function JournalEntries() {
  const { currentEntity } = useEntity();
  const [showJournalEntryForm, setShowJournalEntryForm] = useState(false);
  const [filters, setFilters] = useState({
    accountId: "",
    startDate: "",
    endDate: "",
    status: ""
  });

  // Query accounts from API and transform them to match our interface requirements
  const { data: accountsData } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : ["no-entity-selected"],
    enabled: !!currentEntity
  });
  
  // Transform accounts data to ensure it matches our interface requirements
  const accounts = useMemo(() => {
    if (!accountsData) return [];
    return accountsData.map(account => ({
      ...account,
      // Ensure required fields have values if they are null/undefined in the API response
      createdAt: account.createdAt || new Date(),
      subtype: account.subtype || null,
      isSubledger: account.isSubledger || false,
      subledgerType: account.subledgerType || null,
      parentId: account.parentId || null
    })) as Account[];
  }, [accountsData]);

  const { data: journalEntries, isLoading, refetch } = useQuery<JournalEntry[]>({
    queryKey: [
      `/api/entities/${currentEntity?.id}/journal-entries`, 
      filters.status
    ],
    enabled: !!currentEntity,
  });

  // Memoize event handlers to prevent unnecessary re-renders
  const handleApplyFilters = useCallback((filterData: FilterData) => {
    setFilters(filterData);
  }, []);

  const [, setLocation] = useLocation();
  
  const handleNewJournalEntry = useCallback(() => {
    setLocation("/journal-entries/new");
  }, [setLocation]);

  const handleJournalEntrySubmit = useCallback(async () => {
    setShowJournalEntryForm(false);
    refetch();
  }, [refetch]);
  
  // Function to export journal entries to CSV with applied filters
  const handleExportToCSV = useCallback(() => {
    if (!journalEntries || !Array.isArray(journalEntries) || journalEntries.length === 0) return;
    
    // Prepare data for export
    const exportData = journalEntries.map((entry: JournalEntry) => {
      // Calculate totals for this entry
      const totalDebit = entry.lines && Array.isArray(entry.lines) 
        ? entry.lines.reduce((sum: number, line: JournalEntryLine) => sum + parseFloat(line.debit || '0'), 0) 
        : 0;
      
      const totalCredit = entry.lines && Array.isArray(entry.lines) 
        ? entry.lines.reduce((sum: number, line: JournalEntryLine) => sum + parseFloat(line.credit || '0'), 0) 
        : 0;
      
      return {
        reference: entry.reference || '',
        date: entry.date ? new Date(entry.date).toLocaleDateString() : '',
        description: entry.description || '',
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        status: entry.status || ''
      };
    });
    
    // Define the fields for the CSV
    const fields = [
      { key: 'reference', label: 'Reference' },
      { key: 'date', label: 'Date' },
      { key: 'description', label: 'Description' },
      { key: 'totalDebit', label: 'Total Debit' },
      { key: 'totalCredit', label: 'Total Credit' },
      { key: 'status', label: 'Status' }
    ];
    
    // Create a more descriptive filename based on applied filters
    let fileName = `journal_entries_${currentEntity?.name || 'export'}_${getFormattedDateForFilename()}`;
    
    // Add filter information to filename if filters are applied
    if (filters.status) {
      fileName += `_status-${filters.status}`;
    }
    if (filters.startDate && filters.endDate) {
      fileName += `_${filters.startDate}_to_${filters.endDate}`;
    } else if (filters.startDate) {
      fileName += `_from-${filters.startDate}`;
    } else if (filters.endDate) {
      fileName += `_until-${filters.endDate}`;
    }
    
    // Export to CSV
    exportToCSV(exportData, fileName, fields);
  }, [journalEntries, currentEntity?.name, filters]);

  // Memoize columns configuration to prevent unnecessary re-renders
  const columns = useMemo(() => [
    { header: "Reference", accessor: "reference", type: "text" },
    { header: "Date", accessor: "date", type: "date" },
    { header: "Description", accessor: "description", type: "text" },
    { 
      header: "Debits", 
      accessor: "lines", 
      type: "currency",
      render: (row: JournalEntry) => {
        const totalDebit = row.lines && Array.isArray(row.lines)
          ? row.lines.reduce((sum: number, line: JournalEntryLine) => sum + parseFloat(line.debit || '0'), 0)
          : 0;
        return `$${totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    },
    { 
      header: "Credits", 
      accessor: "lines", 
      type: "currency",
      render: (row: JournalEntry) => {
        const totalCredit = row.lines && Array.isArray(row.lines)
          ? row.lines.reduce((sum: number, line: JournalEntryLine) => sum + parseFloat(line.credit || '0'), 0)
          : 0;
        return `$${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    },
    { 
      header: "Status", 
      accessor: "status", 
      type: "status", 
      render: (row: JournalEntry) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          row.status === JournalEntryStatus.POSTED 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "id",
      type: "actions",
      render: (row: JournalEntry) => (
        <div className="text-right">
          <a 
            href={`/journal-entries/${row.id}`} 
            className="text-primary-600 hover:text-primary-900"
          >
            View
          </a>
        </div>
      )
    }
  ], []);

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
        title="Journal Entries" 
        description="Manage and create journal entries"
      >
        <div className="flex space-x-3">
          <Button 
            onClick={handleExportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={!journalEntries || journalEntries.length === 0}
          >
            <Download className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            Export CSV
          </Button>
          <Button 
            onClick={handleNewJournalEntry}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Journal Entry
          </Button>
          <Button 
            onClick={() => setLocation("/journal-entries/batch-upload")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Batch Upload
          </Button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <FilterSection 
          accounts={accounts || []} 
          onApplyFilters={handleApplyFilters} 
          showAccountField={false}
        />

        <div className="mt-6">
          <DataTable 
            columns={columns} 
            data={journalEntries || []} 
            isLoading={isLoading} 
          />
        </div>
      </div>

      <Dialog open={showJournalEntryForm} onOpenChange={setShowJournalEntryForm}>
        <DialogContent className="max-w-4xl">
          <JournalEntryForm 
            entityId={currentEntity.id}
            accounts={accounts || []}
            onSubmit={handleJournalEntrySubmit}
            onCancel={() => setShowJournalEntryForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default JournalEntries;
