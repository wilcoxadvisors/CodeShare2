// src/components/journal/JournalEntryRow.tsx
import React from 'react';
import { Trash2 } from 'lucide-react';
import { AccountType } from '@shared/schema';

interface JournalEntryRowProps {
  entry: {
    id: string;
    lineNo?: number;
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
  };
  entryErrors?: {
    accountId?: string;
    accountNo?: string;
    accountTitle?: string;
    amount?: string;
  };
  handleEntryChange: (id: string, field: string, value: string) => void;
  handleAccountSelect: (id: string, accountId: number) => void;
  removeEntryRow: (id: string) => void;
  showDetailFields: boolean;
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

export default function JournalEntryRow({
  entry,
  entryErrors,
  handleEntryChange,
  handleAccountSelect,
  removeEntryRow,
  showDetailFields,
  showAdvancedFields,
  accountsList,
  getSubledgerBadge
}: JournalEntryRowProps) {
  return (
    <tr className="border-b">
      <td className="py-2 px-3">
        <input
          type="text"
          value={entry.lineNo || ''}
          readOnly
          className="w-full bg-gray-50 border border-gray-300 rounded-md p-2"
        />
      </td>
      <td className="py-2 px-3">
        <div className="relative">
          <select
            value={entry.accountId || ''}
            onChange={(e) => handleAccountSelect(entry.id, parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Account</option>
            {accountsList.map(account => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
          {getSubledgerBadge && entry.accountNo && getSubledgerBadge(entry.accountNo)}
        </div>
        {entryErrors?.accountId && (
          <p className="text-red-500 text-sm">{entryErrors.accountId}</p>
        )}
      </td>
      {showDetailFields && (
        <>
          <td className="py-2 px-3">
            <input
              type="text"
              value={entry.vendor || ''}
              onChange={(e) => handleEntryChange(entry.id, 'vendor', e.target.value)}
              placeholder="Vendor name"
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </td>
          <td className="py-2 px-3">
            <input
              type="text"
              value={entry.documentNo || ''}
              onChange={(e) => handleEntryChange(entry.id, 'documentNo', e.target.value)}
              placeholder="INV-123"
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </td>
          {showAdvancedFields && (
            <>
              <td className="py-2 px-3">
                <input
                  type="text"
                  value={entry.department || ''}
                  onChange={(e) => handleEntryChange(entry.id, 'department', e.target.value)}
                  placeholder="Dept."
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </td>
              <td className="py-2 px-3">
                <input
                  type="text"
                  value={entry.project || ''}
                  onChange={(e) => handleEntryChange(entry.id, 'project', e.target.value)}
                  placeholder="Project"
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </td>
            </>
          )}
        </>
      )}
      <td className="py-2 px-3">
        <input
          type="number"
          value={entry.debit}
          onChange={(e) => handleEntryChange(entry.id, 'debit', e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
        />
      </td>
      <td className="py-2 px-3">
        <input
          type="number"
          value={entry.credit}
          onChange={(e) => handleEntryChange(entry.id, 'credit', e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
        />
        {entryErrors?.amount && (
          <p className="text-red-500 text-sm">{entryErrors.amount}</p>
        )}
      </td>
      <td className="py-2 px-3">
        <input
          type="text"
          value={entry.description || ''}
          onChange={(e) => handleEntryChange(entry.id, 'description', e.target.value)}
          placeholder="Line description"
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </td>
      <td className="py-2 px-3">
        <button
          type="button"
          onClick={() => removeEntryRow(entry.id)}
          className="text-red-500 hover:text-red-700 p-1"
          title="Remove line"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}