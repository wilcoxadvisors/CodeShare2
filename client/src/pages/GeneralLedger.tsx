import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntity } from "../contexts/EntityContext";
import PageHeader from "../components/PageHeader";
import FilterSection from "../components/FilterSection";
import DataTable from "../components/DataTable";
import JournalEntryForm from "@/features/journal-entries/components/JournalEntryForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { JournalEntryStatus } from "@shared/schema";

function GeneralLedger() {
  const { currentEntity } = useEntity();
  const [showJournalEntryForm, setShowJournalEntryForm] = useState(false);
  const [filters, setFilters] = useState({
    accountId: "",
    startDate: "",
    endDate: "",
    status: ""
  });

  const { data: accounts } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : null,
    enabled: !!currentEntity
  });

  const { data: glEntries, isLoading, refetch } = useQuery({
    queryKey: [
      `/api/entities/${currentEntity?.id}/general-ledger`, 
      filters.accountId,
      filters.startDate,
      filters.endDate,
      filters.status
    ],
    enabled: !!currentEntity,
  });

  const handleApplyFilters = (filterData) => {
    setFilters(filterData);
  };

  const handleNewJournalEntry = () => {
    setShowJournalEntryForm(true);
  };

  const handleJournalEntrySubmit = async () => {
    setShowJournalEntryForm(false);
    refetch();
  };

  const columns = [
    { header: "Date", accessor: "date", type: "date" },
    { header: "Journal ID", accessor: "journalId", type: "text" },
    { header: "Account", accessor: "accountName", type: "text", render: (row) => `${row.accountCode} - ${row.accountName}` },
    { header: "Description", accessor: "description", type: "text" },
    { header: "Debit", accessor: "debit", type: "currency" },
    { header: "Credit", accessor: "credit", type: "currency" },
    { header: "Balance", accessor: "balance", type: "currency" },
    { 
      header: "Status", 
      accessor: "status", 
      type: "status", 
      render: (row) => (
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
      render: (row) => (
        <div className="text-right">
          <a href="#" className="text-primary-600 hover:text-primary-900">View</a>
        </div>
      )
    }
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
        title="General Ledger" 
        description="Manage and review all general ledger entries"
      >
        <div className="flex space-x-3">
          <button 
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export
          </button>
          <button 
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={handleNewJournalEntry}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Journal Entry
          </button>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <FilterSection 
          accounts={accounts || []} 
          onApplyFilters={handleApplyFilters} 
        />

        <div className="mt-6">
          <DataTable 
            columns={columns} 
            data={glEntries || []} 
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

export default GeneralLedger;
