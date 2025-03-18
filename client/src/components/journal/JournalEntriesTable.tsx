// src/components/journal/JournalEntriesTable.tsx
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import JournalEntryRow from './JournalEntryRow';
import { AccountType } from '@shared/schema';

interface Totals {
  debit: number;
  credit: number;
  isBalanced: boolean;
}

interface JournalEntryLine {
  id: string;
  accountId: number;
  accountNo?: string;
  accountTitle?: string;
  description: string | null;
  debit: string;
  credit: string;
  vendor?: string;
  documentNo?: string;
  department?: string;
  project?: string;
}

interface JournalData {
  entries: JournalEntryLine[];
}

interface JournalEntriesTableProps {
  journalData: JournalData;
  entryErrors: Record<number, {
    accountId?: string;
    accountNo?: string;
    accountTitle?: string;
    amount?: string;
  }>;
  handleEntryChange: (id: string, field: string, value: string) => void;
  handleAccountSelect: (id: string, accountId: number) => void;
  removeEntryRow: (id: string) => void;
  totals: Totals;
  errors: {
    balance?: string;
  };
  showDetailFields: boolean;
  setShowDetailFields: (show: boolean) => void;
  showAdvancedFields: boolean;
  accountsList: Array<{
    id: number;
    code: string;
    name: string;
    type: AccountType;
    subtype: string | null;
    isSubledger: boolean;
  }>;
  getSubledgerBadge?: (accountNo: string | undefined) => React.ReactNode;
}

export default function JournalEntriesTable({
  journalData,
  entryErrors,
  handleEntryChange,
  handleAccountSelect,
  removeEntryRow,
  totals,
  errors,
  showDetailFields,
  setShowDetailFields,
  showAdvancedFields,
  accountsList,
  getSubledgerBadge
}: JournalEntriesTableProps) {
  return (
    <>
      {/* Detail Fields Toggle */}
      <div className="flex justify-end mb-2">
        <button 
          type="button"
          onClick={() => setShowDetailFields(!showDetailFields)}
          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
        >
          {showDetailFields ? <ChevronUp size={16} className="mr-1" /> : <ChevronDown size={16} className="mr-1" />}
          {showDetailFields ? 'Hide Detail Fields' : 'Show Detail Fields'}
        </button>
      </div>
      
      {/* Journal Entries Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-3 text-left text-sm font-medium text-gray-700 w-16">Line No</th>
              <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">Account *</th>
              {showDetailFields && (
                <>
                  <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">Vendor</th>
                  <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">Document No</th>
                  {showAdvancedFields && (
                    <>
                      <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">Department</th>
                      <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">Project</th>
                    </>
                  )}
                </>
              )}
              <th className="py-2 px-3 text-right text-sm font-medium text-gray-700">Debit</th>
              <th className="py-2 px-3 text-right text-sm font-medium text-gray-700">Credit</th>
              <th className="py-2 px-3 text-left text-sm font-medium text-gray-700">Description</th>
              <th className="py-2 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {journalData.entries.map((entry, index) => (
              <JournalEntryRow
                key={entry.id}
                entry={entry}
                entryErrors={entryErrors[index]}
                handleEntryChange={handleEntryChange}
                handleAccountSelect={handleAccountSelect}
                removeEntryRow={removeEntryRow}
                showDetailFields={showDetailFields}
                showAdvancedFields={showAdvancedFields}
                accountsList={accountsList}
                getSubledgerBadge={getSubledgerBadge}
              />
            ))}
            
            {/* Totals row */}
            <tr className="bg-gray-50 font-semibold">
              <td colSpan={showDetailFields ? (showAdvancedFields ? 6 : 4) : 2} className="py-3 px-3 text-right">Totals</td>
              <td className="py-3 px-3 text-right">${totals.debit.toFixed(2)}</td>
              <td className="py-3 px-3 text-right">${totals.credit.toFixed(2)}</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
        
        {/* Balance check */}
        <div className="p-3">
          {errors.balance && (
            <p className="text-red-500 font-medium">{errors.balance}</p>
          )}
          
          {totals.isBalanced && totals.debit > 0 && (
            <p className="text-green-600 font-medium">✓ Debits and credits are balanced</p>
          )}
        </div>
      </div>
    </>
  );
}