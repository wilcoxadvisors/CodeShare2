// src/components/journal/JournalEntriesTable.jsx
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import JournalEntryRow from './JournalEntryRow';

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
}) {
  return (
    <>
      {/* Detail Fields Toggle */}
      <div className="flex justify-end">
        <button 
          type="button"
          onClick={() => setShowDetailFields(!showDetailFields)}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          {showDetailFields ? <ChevronUp size={16} className="mr-1" /> : <ChevronDown size={16} className="mr-1" />}
          {showDetailFields ? 'Hide Detail Fields' : 'Show Detail Fields'}
        </button>
      </div>
      
      {/* Journal Entries Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-3 text-left w-16">Line No</th>
              <th className="py-2 px-3 text-left">Account No *</th>
              <th className="py-2 px-3 text-left">Account Title *</th>
              {showDetailFields && (
                <>
                  <th className="py-2 px-3 text-left">Vendor</th>
                  <th className="py-2 px-3 text-left">Document No</th>
                  {showAdvancedFields && (
                    <>
                      <th className="py-2 px-3 text-left">Department</th>
                      <th className="py-2 px-3 text-left">Project</th>
                    </>
                  )}
                </>
              )}
              <th className="py-2 px-3 text-right">Debit</th>
              <th className="py-2 px-3 text-right">Credit</th>
              <th className="py-2 px-3 text-left">Description</th>
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
              <td colSpan={showDetailFields ? (showAdvancedFields ? 7 : 5) : 3} className="py-2 px-3 text-right">Totals</td>
              <td className="py-2 px-3 text-right">${totals.debit.toFixed(2)}</td>
              <td className="py-2 px-3 text-right">${totals.credit.toFixed(2)}</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
        
        {/* Balance check */}
        {errors.balance && (
          <p className="text-red-500 mt-2 font-medium">{errors.balance}</p>
        )}
        
        {totals.isBalanced && totals.debit > 0 && (
          <p className="text-green-600 mt-2 font-medium">✓ Debits and credits are balanced</p>
        )}
      </div>
    </>
  );
}
