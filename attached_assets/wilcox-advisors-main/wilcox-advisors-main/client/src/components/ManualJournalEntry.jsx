// src/components/ManualJournalEntry.jsx
import React, { useState, useEffect } from 'react';
import useJournalEntryForm from '../hooks/useJournalEntryForm';
import { Plus, Trash2, Download, Upload, Save, Info } from 'lucide-react';
import axios from 'axios';

function JournalEntrySystem() {
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [accountsList, setAccountsList] = useState([]);
  const [showTips, setShowTips] = useState(false);
  
  useEffect(() => {
    fetchAccounts();
  }, []);
  
  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/accounting/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccountsList(response.data.accounts);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };
  
  const {
    journalData, errors, entryErrors, isSubmitting, totals,
    supportingDocs, handleChange, handleEntryChange, 
    addEntryRow, removeEntryRow, handleFileUpload, handleSubmit
  } = useJournalEntryForm();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-blue-800">Journal Entry</h2>
        <button 
          onClick={() => setShowTips(!showTips)}
          className="flex items-center text-blue-600 text-sm"
        >
          <Info size={16} className="mr-1" />
          {showTips ? "Hide Tips" : "Show Tips"}
        </button>
      </div>
      
      {showTips && (
        <div className="bg-blue-50 p-4 rounded-md mb-6 text-sm">
          <h3 className="font-semibold text-blue-800 mb-2">Quick Tips:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Enter debits first, followed by credits</li>
            <li>Total debits must equal total credits</li>
            <li>Use account numbers that begin with 1xxx for assets, 2xxx for liabilities, 3xxx for equity, 4xxx for revenue, 5-9xxx for expenses</li>
            <li>Add supporting documentation for audit purposes</li>
          </ul>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Journal Entry Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex flex-col">
            <label htmlFor="date" className="text-gray-700 font-medium mb-1">Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={journalData.date}
              onChange={handleChange}
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-required="true"
            />
            {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="transactionNo" className="text-gray-700 font-medium mb-1">Transaction No.</label>
            <input
              type="text"
              id="transactionNo"
              name="transactionNo"
              value={journalData.transactionNo}
              onChange={handleChange}
              className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex flex-col md:items-end justify-end">
            <button 
              type="button"
              onClick={() => setShowAdvancedFields(!showAdvancedFields)}
              className="text-blue-600 hover:text-blue-800 flex items-center self-end mt-2 text-sm"
            >
              {showAdvancedFields ? "Hide Advanced Fields" : "Show Advanced Fields"}
            </button>
          </div>
          
          <div className="md:col-span-3">
            <label htmlFor="description" className="text-gray-700 font-medium mb-1">Description *</label>
            <textarea
              id="description"
              name="description"
              value={journalData.description}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-required="true"
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>
        </div>
        
        {/* Journal Entry Table */}
        <div className="overflow-x-auto bg-white rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-3 text-left">Account</th>
                <th className="py-2 px-3 text-left">Description</th>
                {showAdvancedFields && (
                  <>
                    <th className="py-2 px-3 text-left">Reference</th>
                    <th className="py-2 px-3 text-left">Subledger</th>
                  </>
                )}
                <th className="py-2 px-3 text-right">Debit</th>
                <th className="py-2 px-3 text-right">Credit</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {journalData.entries.map((entry, index) => (
                <tr key={entry.id} className="border-t">
                  <td className="py-2 px-3">
                    <div className="flex flex-col">
                      <select
                        value={entry.accountNo}
                        onChange={(e) => {
                          handleEntryChange(entry.id, 'accountNo', e.target.value);
                          const selectedAccount = accountsList.find(a => a.accountNumber === e.target.value);
                          if (selectedAccount) {
                            handleEntryChange(entry.id, 'accountTitle', selectedAccount.accountName);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Account</option>
                        {accountsList.map(account => (
                          <option key={account.accountNumber} value={account.accountNumber}>
                            {account.accountNumber} - {account.accountName}
                          </option>
                        ))}
                      </select>
                      {entryErrors[index]?.accountNo && (
                        <p className="text-red-500 text-xs mt-1">{entryErrors[index].accountNo}</p>
                      )}
                    </div>
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
                  {showAdvancedFields && (
                    <>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={entry.reference || ''}
                          onChange={(e) => handleEntryChange(entry.id, 'reference', e.target.value)}
                          placeholder="Invoice #, etc."
                          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={entry.subledger || ''}
                          onChange={(e) => handleEntryChange(entry.id, 'subledger', e.target.value)}
                          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">None</option>
                          <option value="AP">Accounts Payable</option>
                          <option value="AR">Accounts Receivable</option>
                          <option value="Payroll">Payroll</option>
                          <option value="Inventory">Inventory</option>
                          <option value="Assets">Fixed Assets</option>
                        </select>
                      </td>
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
                    {entryErrors[index]?.amount && (
                      <p className="text-red-500 text-xs mt-1">{entryErrors[index].amount}</p>
                    )}
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
              ))}
              
              {/* Totals row */}
              <tr className="bg-gray-50 font-semibold border-t">
                <td colSpan={showAdvancedFields ? 4 : 2} className="py-2 px-3 text-right">Totals</td>
                <td className="py-2 px-3 text-right">${totals.debit.toFixed(2)}</td>
                <td className="py-2 px-3 text-right">${totals.credit.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Balance check */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={addEntryRow}
            className="flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-md"
          >
            <Plus size={18} className="mr-1" /> Add Line
          </button>
          
          <div>
            {errors.balance && (
              <p className="text-red-500 font-medium">{errors.balance}</p>
            )}
            
            {totals.isBalanced && totals.debit > 0 && (
              <p className="text-green-600 font-medium">✓ Balanced</p>
            )}
          </div>
        </div>
        
        {/* Supporting Documents */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Supporting Documents</h3>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {supportingDocs.map((doc, idx) => (
              <div key={idx} className="bg-white px-3 py-2 rounded-md flex items-center text-sm">
                <span className="truncate max-w-xs">{doc.name}</span>
                <button 
                  type="button"
                  onClick={() => {
                    const newDocs = [...supportingDocs];
                    newDocs.splice(idx, 1);
                    // Call function to update supporting docs
                  }} 
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            
            {supportingDocs.length === 0 && (
              <p className="text-gray-500 text-sm">No documents attached</p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center bg-white border border-gray-300 rounded-md px-4 py-2 cursor-pointer hover:bg-gray-50">
              <Upload className="mr-2 h-5 w-5 text-blue-800" />
              <span>Upload Document</span>
              <input 
                type="file"
                onChange={(e) => handleFileUpload(e.target.files[0])} 
                className="hidden"
                accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
              />
            </label>
            
            <button 
              type="button"
              className="flex items-center bg-white border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50"
            >
              <Download className="mr-2 h-5 w-5 text-blue-800" />
              <span>Entry Template</span>
            </button>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`
              flex items-center bg-blue-800 text-white px-6 py-3 rounded-md
              ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-900'}
              transition duration-200
            `}
          >
            {isSubmitting ? 'Posting...' : 'Post Journal Entry'}
            <Save className="ml-2 h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default JournalEntrySystem;
