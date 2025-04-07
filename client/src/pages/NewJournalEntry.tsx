import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEntity } from "../contexts/EntityContext";
import PageHeader from "../components/PageHeader";
import JournalEntryForm from "../components/JournalEntryForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AccountType } from "@shared/schema";

// Define interface for account
interface Account {
  id: number;
  code: string;
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

  // Query accounts from API
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/accounts`] : ["no-entity-selected"],
    enabled: !!currentEntity
  });

  // Query locations from API
  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: currentEntity ? [`/api/entities/${currentEntity.id}/locations`] : ["no-entity-selected"],
    enabled: !!currentEntity
  });
  
  // Query entities from API
  const { data: entitiesData, isLoading: entitiesLoading } = useQuery({
    queryKey: [`/api/entities`],
    enabled: !!currentEntity
  });

  // Transform accounts data to ensure it matches our interface requirements
  const accounts = (accountsData && Array.isArray(accountsData)) 
    ? accountsData.map((account: any) => ({
        ...account,
        // Ensure required fields have values if they are null/undefined in the API response
        createdAt: account.createdAt ? new Date(account.createdAt) : new Date(),
        subtype: account.subtype || null,
        isSubledger: account.isSubledger || false,
        subledgerType: account.subledgerType || null,
        parentId: account.parentId || null
      })) as Account[]
    : [];

  // Transform locations data
  const locations = (locationsData && Array.isArray(locationsData))
    ? locationsData as Location[]
    : [];
    
  // Transform entities data
  const entities = (entitiesData && Array.isArray(entitiesData))
    ? entitiesData
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
        title="New Journal Entry" 
        description="Create a new journal entry"
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
            {accountsLoading || locationsLoading || entitiesLoading ? (
              <div className="py-10 text-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <JournalEntryForm 
                entityId={currentEntity.id}
                accounts={accounts || []}
                locations={locations || []}
                entities={entities || []}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default NewJournalEntry;