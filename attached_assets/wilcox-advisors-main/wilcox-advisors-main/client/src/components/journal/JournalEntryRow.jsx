// src/components/journal/JournalEntryRow.jsx
import React from 'react';
import { Trash2 } from 'lucide-react';

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
}) {
  return (
    <tr className="border-b">
      <td className="py-2 px-3">
        <input
          type="text"
          value={entry.lineNo}
          readOnly
          className="w-full bg-gray-50 border border-gray-300 rounded-md p-2"
        />
      </td>
      <td className="py-2 px-3">
        <div className="relative">
          <input
            type="text"
            value={entry.accountNo}
            onChange={(e) => handleEntryChange(entry.id, 'accountNo', e.target.value)}
            placeholder="1000"
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            list={`accounts-${entry.id}`}
          />
          <datalist id={`accounts-${entry.id}`}>
            {accountsList.map(account => (
              <option key={account.accountNumber} value={account.accountNumber}>
                {account.accountName}
              </option>
            ))}
          </datalist>
          {getSubledgerBadge(entry.accountNo)}
        </div>
        {entryErrors?.accountNo && (
          <p className="text-red-500 text-sm">{entryErrors.accountNo}</p>
        )}
      </td>
      <td className="py-2 px-3">
        <input
          type="text"
          value={entry.accountTitle}
          onChange={(e) => handleEntryChange(entry.id, 'accountTitle', e.target.value)}
          placeholder="Cash"
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {entryErrors?.accountTitle && (
          <p className="text-red-500 text-sm">{entryErrors.accountTitle}</p>
        )}
      </td>
      {showDetailFields && (
        <>
          <td className="py-2 px-3">
            <input
              type="text"
              value={entry.vendor}
              onChange={(e) => handleEntryChange(entry.id, 'vendor', e.target.value)}
              placeholder="Vendor name"
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </td>
          <td className="py-2 px-3">
            <input
              type="text"
              value={entry.documentNo}
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
                  value={entry.department}
                  onChange={(e) => handleEntryChange(entry.id, 'department', e.target.value)}
                  placeholder="Dept."
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </td>
              <td className="py-2 px-3">
                <input
                  type="text"
                  value={entry.project}
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
          value={entry.description}
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
