import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEntity } from "@/contexts/EntityContext";
import PageHeader from "@/components/PageHeader";
import JournalEntryForm from "@/features/journal-entries/components/JournalEntryForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AccountType } from "@shared/schema";
import { useEditJournalEntry } from "@/features/journal-entries/hooks/useEditJournalEntry";

// Define interface for account
interface Account {
  id: number;
  accountCode: string;  // Use accountCode to match the server schema
  name: string;
  entityId: number;
  type: AccountType;
  description: string | null;
  active: boolean;
  createdAt?: Date;
  subtype?: string | null;
  isSubledger?: boolean;
  subledgerType?: string | null;
  parentId?: number | null;
  [key: string]: any;
}

// Define interface for location
interface Location {
  id: number;
  name: string;
  code?: string;
  description?: string | null;
  active: boolean;
}

function NewJournalEntry() {
  const { currentEntity } = useEntity();
  const [, setLocation] = useLocation();
  
  // Use the edit hook to fetch journal entry data if in edit mode
  const { journalEntry: existingEntry, isLoading: entryLoading, isEditMode } = useEditJournalEntry();

  // Get client ID from current entity or directly from EntityContext
  const { selectedClientId } = useEntity();
  const clientId = currentEntity?.clientId || selectedClientId;
  // Convert to number or undefined (not null) for proper prop passing
  const safeClientId = clientId ? Number(clientId) : undefined;

  // Define the response type explicitly for proper TypeScript typing
  interface AccountsResponse {
    accounts: any[];
  }
  
  // Query accounts from API at client level (not entity level)
  // This will fetch accounts as soon as the clientId is available, even before an entity is selected
  const { 
    data: accountsData, 
    isLoading: accountsLoading, 
    error: accountsError 
  } = useQuery<AccountsResponse>({
    queryKey: clientId ? [`/api/clients/${clientId}/accounts`] : ["no-client-selected"],
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce unnecessary refetches
  });
  
  // Add separate effect for debugging the query result
  useEffect(() => {
    if (accountsData) {
      console.log("DEBUG NewJournalEntry - Accounts API success response:", accountsData);
      console.log("DEBUG NewJournalEntry - Response has accounts array:", !!accountsData.accounts);
      console.log("DEBUG NewJournalEntry - Accounts array length:", accountsData.accounts?.length || 0);
    }
    if (accountsError) {
      console.error("DEBUG NewJournalEntry - Accounts API error:", accountsError);
    }
  }, [accountsData, accountsError]);
  
  // Define entities response type
  interface EntitiesResponse {
    entities: any[];
  }
  
  // Query entities from API - explicitly filtered by client
  const { 
    data: entitiesData, 
    isLoading: entitiesLoading,
    error: entitiesError
  } = useQuery<EntitiesResponse>({
    queryKey: clientId ? [`/api/clients/${clientId}/entities`] : ["no-client-entities"],
    enabled: !!clientId,
  });
  
  // Add debugging for entities response
  useEffect(() => {
    if (entitiesData) {
      console.log("DEBUG NewJournalEntry - Entities API success response:", entitiesData);
      console.log("DEBUG NewJournalEntry - Response has entities array:", !!entitiesData.entities);
      console.log("DEBUG NewJournalEntry - Entities array length:", entitiesData.entities?.length || 0);
    }
    if (entitiesError) {
      console.error("DEBUG NewJournalEntry - Entities API error:", entitiesError);
    }
  }, [entitiesData, entitiesError]);

  // Add debugging around accounts transformation
  console.log("DEBUG NewJournalEntry - Raw accountsData:", accountsData);
  
  // Transform accounts data to ensure it matches our interface requirements
  let accounts: Account[] = [];
  
  if (accountsData && accountsData.accounts && Array.isArray(accountsData.accounts)) {
    console.log("DEBUG NewJournalEntry - accountsData.accounts exists and is an array with length:", accountsData.accounts.length);
    
    // Filter active accounts
    const activeAccounts = accountsData.accounts.filter((account: any) => account.active);
    console.log("DEBUG NewJournalEntry - After filtering active accounts:", activeAccounts.length);
    
    // Map to ensure all required fields
    accounts = activeAccounts.map((account: any) => {
      const mappedAccount = {
        id: account.id,
        accountCode: account.accountCode, // Make sure this uses accountCode, not code
        name: account.name,
        entityId: account.entityId || 0,
        type: account.type,
        description: account.description || null,
        active: account.active !== false, // Default to true if not specified
        // Optional fields with defaults
        createdAt: account.createdAt ? new Date(account.createdAt) : new Date(),
        subtype: account.subtype || null,
        isSubledger: account.isSubledger || false,
        subledgerType: account.subledgerType || null,
        parentId: account.parentId || null
      };
      return mappedAccount;
    }) as Account[];
    
    console.log("DEBUG NewJournalEntry - Final accounts array after mapping:", accounts.length);
  } else {
    console.log("DEBUG NewJournalEntry - accountsData.accounts is missing or not an array:", 
                accountsData ? Object.keys(accountsData).join(', ') : 'accountsData is null/undefined');
  }

  // Create empty locations array (to satisfy interface)
  const locations: Location[] = [];
    
  // Transform entities data - ensure we properly extract entities from the API response
  const entities = (entitiesData && entitiesData.entities && Array.isArray(entitiesData.entities))
    ? entitiesData.entities.filter((entity: any) => entity.active)
    : [];

  const handleSubmit = () => {
    // Navigate back to journal entries list
    setLocation("/journal-entries");
  };

  const handleCancel = () => {
    // Navigate back to journal entries list
    setLocation("/journal-entries");
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
    <>
      <PageHeader 
        title={isEditMode ? "Edit Journal Entry" : "New Journal Entry"} 
        description={isEditMode ? "Edit an existing journal entry" : "Create a new journal entry"}
      >
        <Button 
          onClick={handleCancel}
          variant="outline"
          className="inline-flex items-center px-4 py-2"
        >
          <ArrowLeft className="-ml-1 mr-2 h-5 w-5" />
          Back to Journal Entries
        </Button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {accountsLoading || entitiesLoading || (isEditMode && entryLoading) ? (
              <div className="py-10 text-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <JournalEntryForm 
                entityId={currentEntity.id}
                accounts={accounts || []}
                locations={locations}
                entities={entities || []}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                clientId={safeClientId}
                existingEntry={existingEntry}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default NewJournalEntry;