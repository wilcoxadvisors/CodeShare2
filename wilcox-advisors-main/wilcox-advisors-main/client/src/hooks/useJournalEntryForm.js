// src/hooks/useJournalEntryForm.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function useJournalEntryForm(onSuccess) {
  const [journalData, setJournalData] = useState({
    date: '',
    transactionNo: '',
    description: '',
    entries: [
      { 
        id: 1, 
        accountNo: '', 
        accountTitle: '', 
        debit: '', 
        credit: '', 
        lineNo: '1', 
        vendor: '',
        documentNo: '',
        department: '',
        project: '',
        description: '' 
      },
      { 
        id: 2, 
        accountNo: '', 
        accountTitle: '', 
        debit: '', 
        credit: '', 
        lineNo: '2', 
        vendor: '',
        documentNo: '',
        department: '',
        project: '',
        description: '' 
      }
    ]
  });
  
  const [errors, setErrors] = useState({});
  const [entryErrors, setEntryErrors] = useState([]);
  const [statusMessage, setStatusMessage] = useState({ type: null, text: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totals, setTotals] = useState({ debit: 0, credit: 0, isBalanced: false });
  const [supportingDocs, setSupportingDocs] = useState([]);
  const [accountsList, setAccountsList] = useState([]);

  // Fetch accounts when component mounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:10000'}/api/accounting/accounts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAccountsList(response.data.accounts);
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      }
    };
    
    fetchAccounts();
  }, []);

  // Calculate totals when entries change
  useEffect(() => {
    const debitTotal = journalData.entries.reduce((sum, entry) => {
      const value = parseFloat(entry.debit) || 0;
      return sum + value;
    }, 0);
    
    const creditTotal = journalData.entries.reduce((sum, entry) => {
      const value = parseFloat(entry.credit) || 0;
      return sum + value;
    }, 0);
    
    setTotals({
      debit: debitTotal,
      credit: creditTotal,
      isBalanced: debitTotal.toFixed(2) === creditTotal.toFixed(2) && debitTotal > 0
    });
  }, [journalData.entries]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJournalData(prev => ({ ...prev, [name]: value }));
  };

  const handleEntryChange = (id, field, value) => {
    const updatedEntries = journalData.entries.map(entry => {
      if (entry.id === id) {
        if (field === 'debit' && value !== '' && entry.credit !== '') {
          return { ...entry, [field]: value, credit: '' };
        } else if (field === 'credit' && value !== '' && entry.debit !== '') {
          return { ...entry, [field]: value, debit: '' };
        } else {
          return { ...entry, [field]: value };
        }
      }
      return entry;
    });

    setJournalData({
      ...journalData,
      entries: updatedEntries
    });
    
    // Auto-fill account title if account number changes
    if (field === 'accountNo') {
      const selectedAccount = accountsList.find(a => a.accountNumber === value);
      if (selectedAccount) {
        handleEntryChange(id, 'accountTitle', selectedAccount.accountName);
      }
    }
  };

  const handleAccountSelect = (id, accountNo) => {
    const selectedAccount = accountsList.find(a => a.accountNumber === accountNo);
    if (selectedAccount) {
      handleEntryChange(id, 'accountTitle', selectedAccount.accountName);
    }
  };

  const addEntryRow = () => {
    const newId = journalData.entries.length > 0 
      ? Math.max(...journalData.entries.map(e => e.id)) + 1 
      : 1;
    
    const newLineNo = journalData.entries.length > 0
      ? (parseInt(journalData.entries[journalData.entries.length - 1].lineNo) + 1).toString()
      : '1';
      
    setJournalData({
      ...journalData,
      entries: [
        ...journalData.entries,
        { 
          id: newId, 
          accountNo: '', 
          accountTitle: '', 
          debit: '', 
          credit: '', 
          lineNo: newLineNo, 
          vendor: '',
          documentNo: '',
          department: '',
          project: '',
          description: '' 
        }
      ]
    });
    
    setEntryErrors([...entryErrors, {}]);
  };

  const removeEntryRow = (id) => {
    if (journalData.entries.length <= 1) return;
    
    const newEntries = journalData.entries.filter(entry => entry.id !== id);
    const entryIndex = journalData.entries.findIndex(entry => entry.id === id);
    
    const renumberedEntries = newEntries.map((entry, idx) => ({
      ...entry,
      lineNo: (idx + 1).toString()
    }));
    
    setJournalData({
      ...journalData,
      entries: renumberedEntries
    });
    
    const newEntryErrors = [...entryErrors];
    newEntryErrors.splice(entryIndex, 1);
    setEntryErrors(newEntryErrors);
  };

  const validateForm = () => {
    const newErrors = {};
    const newEntryErrors = journalData.entries.map(() => ({}));
    let isValid = true;
    
    if (!journalData.date) {
      newErrors.date = 'Date is required';
      isValid = false;
    }
    
    if (!journalData.description) {
      newErrors.description = 'Description is required';
      isValid = false;
    }
    
    journalData.entries.forEach((entry, index) => {
      if (!entry.accountNo) {
        newEntryErrors[index].accountNo = 'Account number is required';
        isValid = false;
      }
      
      if (!entry.accountTitle) {
        newEntryErrors[index].accountTitle = 'Account title is required';
        isValid = false;
      }
      
      if ((!entry.debit || entry.debit === '0') && (!entry.credit || entry.credit === '0')) {
        newEntryErrors[index].amount = 'Either debit or credit amount is required';
        isValid = false;
      }
    });
    
    if (totals.debit.toFixed(2) !== totals.credit.toFixed(2)) {
      newErrors.balance = 'Debits must equal credits';
      isValid = false;
    }
    
    setErrors(newErrors);
    setEntryErrors(newEntryErrors);
    return isValid;
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    setSupportingDocs(prev => [...prev, file]);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:10000'}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      setStatusMessage({ type: 'success', text: `File "${file.name}" uploaded successfully!` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to upload file: ${err.message}` });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    const formattedData = {
      date: journalData.date,
      transactionNo: journalData.transactionNo,
      description: journalData.description,
      entries: journalData.entries.map(entry => ({
        accountNo: entry.accountNo,
        accountTitle: entry.accountTitle,
        amount: parseFloat(entry.debit || entry.credit),
        isDebit: entry.debit ? true : false,
        lineNo: entry.lineNo,
        vendor: entry.vendor,
        documentNo: entry.documentNo,
        department: entry.department,
        project: entry.project,
        description: entry.description
      })),
      supportingDocs: supportingDocs.map(doc => doc.name)
    };
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:10000'}/api/accounting/journal-entry`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formattedData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save journal entry');
      }
      
      const data = await response.json();
      
      setStatusMessage({ type: 'success', text: 'Journal entry saved successfully!' });
      
      setJournalData({
        date: '',
        transactionNo: '',
        description: '',
        entries: [
          { 
            id: 1, 
            accountNo: '', 
            accountTitle: '', 
            debit: '', 
            credit: '', 
            lineNo: '1', 
            vendor: '',
            documentNo: '',
            department: '',
            project: '',
            description: '' 
          },
          { 
            id: 2, 
            accountNo: '', 
            accountTitle: '', 
            debit: '', 
            credit: '', 
            lineNo: '2', 
            vendor: '',
            documentNo: '',
            department: '',
            project: '',
            description: '' 
          }
        ]
      });
      setSupportingDocs([]);
      
      if (onSuccess) onSuccess(data.journalEntry);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save journal entry' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    journalData,
    errors,
    entryErrors,
    statusMessage,
    isSubmitting,
    totals,
    supportingDocs,
    accountsList,
    handleChange,
    handleEntryChange,
    handleAccountSelect,
    addEntryRow,
    removeEntryRow,
    handleFileUpload,
    handleSubmit,
    setSupportingDocs
  };
}
