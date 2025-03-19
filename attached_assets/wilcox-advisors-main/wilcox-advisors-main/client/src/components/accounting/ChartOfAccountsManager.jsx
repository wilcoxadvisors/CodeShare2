import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Search, Download, FileText, Copy } from 'lucide-react';
import axios from 'axios';

const ChartOfAccountsManager = () => {
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [selectedChart, setSelectedChart] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('chart'); // 'chart', 'account', 'import'
  const [modalAction, setModalAction] = useState('add'); // 'add', 'edit'
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entityId: '',
    accountNumber: '',
    accountName: '',
    accountType: 'Asset',
    fslCategory: '',
    subledgerType: 'GL',
    description: '',
    customFields: {}
  });
  const [expandedTypes, setExpandedTypes] = useState({
    Asset: true,
    Liability: true,
    Equity: true,
    Revenue: true,
    Expense: true
  });
  const [entities, setEntities] = useState([]);
  const [fsliCategories, setFsliCategories] = useState({});
  const [sourceChartId, setSourceChartId] = useState('');
  const [customFieldsData, setCustomFieldsData] = useState([
    { name: '', value: '' }
  ]);

  // Mock data for customization options
  const accountTypes = [
    { id: 'Asset', label: 'Asset' },
    { id: 'Liability', label: 'Liability' },
    { id: 'Equity', label: 'Equity' },
    { id: 'Revenue', label: 'Revenue' },
    { id: 'Expense', label: 'Expense' }
  ];

  const subledgerTypes = [
    { id: 'GL', label: 'General Ledger' },
    { id: 'AP', label: 'Accounts Payable' },
    { id: 'AR', label: 'Accounts Receivable' },
    { id: 'Payroll', label: 'Payroll' },
    { id: 'Inventory', label: 'Inventory' },
    { id: 'Assets', label: 'Fixed Assets' }
  ];

  useEffect(() => {
    // Fetch entities for dropdown
    const fetchEntities = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/accounting/entities`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.data && response.data.entities) {
          setEntities(response.data.entities);
          
          // Set default entity if available
          if (response.data.entities.length > 0 && !formData.entityId) {
            setFormData(prev => ({
              ...prev,
              entityId: response.data.entities[0].id
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching entities:', error);
        // Set sample data for demo
        setEntities([
          { id: '1', name: 'Main Company' },
          { id: '2', name: 'Subsidiary A' },
          { id: '3', name: 'Subsidiary B' }
        ]);
      }
    };

    // Fetch FSLI categories
    const fetchFSLICategories = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/chart-of-accounts/fsli-categories`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.data && response.data.fsliCategories) {
          setFsliCategories(response.data.fsliCategories);
        }
      } catch (error) {
        console.error('Error fetching FSLI categories:', error);
        // Set sample data for demo
        setFsliCategories({
          Asset: [
            'Cash and Cash Equivalents',
            'Accounts Receivable',
            'Inventory',
            'Property, Plant and Equipment'
          ],
          Liability: [
            'Accounts Payable',
            'Accrued Liabilities',
            'Short-term Debt',
            'Long-term Debt'
          ],
          Equity: [
            'Common Stock',
            'Retained Earnings'
          ],
          Revenue: [
            'Revenue',
            'Other Income'
          ],
          Expense: [
            'Cost of Goods Sold',
            'Operating Expenses',
            'Income Tax Expense'
          ]
        });
      }
    };

    fetchEntities();
    fetchFSLICategories();
    fetchChartOfAccounts();
  }, []);

  useEffect(() => {
    // When selected chart changes, fetch its accounts
    if (selectedChart) {
      fetchAccounts(selectedChart.id);
    } else {
      setAccounts([]);
    }
  }, [selectedChart]);

  const fetchChartOfAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/chart-of-accounts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data && response.data.chartOfAccounts) {
        setChartOfAccounts(response.data.chartOfAccounts);
        
        // Select first chart if available
        if (response.data.chartOfAccounts.length > 0) {
          setSelectedChart(response.data.chartOfAccounts[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching chart of accounts:', error);
      // Set sample data for demo
      const sampleData = [
        { id: '1', name: 'Default Chart of Accounts', description: 'Standard accounts for the main company', entityId: '1', version: 1, isActive: true },
        { id: '2', name: 'Manufacturing CoA', description: 'Custom accounts for manufacturing operations', entityId: '2', version: 2, isActive: true }
      ];
      setChartOfAccounts(sampleData);
      setSelectedChart(sampleData[0]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async (chartId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/chart-of-accounts/${chartId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data && response.data.chartOfAccounts && response.data.chartOfAccounts.accounts) {
        setAccounts(response.data.chartOfAccounts.accounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      // Set sample data for demo
      setAccounts([
        { accountNumber: '1000', accountName: 'Cash', accountType: 'Asset', fslCategory: 'Cash and Cash Equivalents', subledgerType: 'GL' },
        { accountNumber: '1100', accountName: 'Accounts Receivable', accountType: 'Asset', fslCategory: 'Accounts Receivable', subledgerType: 'AR' },
        { accountNumber: '1200', accountName: 'Inventory', accountType: 'Asset', fslCategory: 'Inventory', subledgerType: 'Inventory' },
        { accountNumber: '1500', accountName: 'Fixed Assets', accountType: 'Asset', fslCategory: 'Property, Plant and Equipment', subledgerType: 'Assets' },
        { accountNumber: '2000', accountName: 'Accounts Payable', accountType: 'Liability', fslCategory: 'Accounts Payable', subledgerType: 'AP' },
        { accountNumber: '3000', accountName: 'Common Stock', accountType: 'Equity', fslCategory: 'Common Stock', subledgerType: 'GL' },
        { accountNumber: '4000', accountName: 'Sales Revenue', accountType: 'Revenue', fslCategory: 'Revenue', subledgerType: 'GL' },
        { accountNumber: '5000', accountName: 'Cost of Goods Sold', accountType: 'Expense', fslCategory: 'Cost of Goods Sold', subledgerType: 'GL' },
        { accountNumber: '6000', accountName: 'Salaries and Wages', accountType: 'Expense', fslCategory: 'Operating Expenses', subledgerType: 'Payroll' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChart = async () => {
    if (!formData.name || !formData.entityId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/chart-of-accounts`,
        {
          entityId: formData.entityId,
          name: formData.name,
          description: formData.description
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      fetchChartOfAccounts();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating chart of accounts:', error);
      alert('Failed to create chart of accounts');
      
      // For demo, simulate success
      const newChart = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        entityId: formData.entityId,
        version: 1,
        isActive: true
      };
      
      setChartOfAccounts(prev => [...prev, newChart]);
      setSelectedChart(newChart);
      setIsModalOpen(false);
    }
  };

  const handleCreateDefaultChart = async () => {
    if (!formData.entityId) {
      alert('Please select an entity');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/chart-of-accounts/default`,
        {
          entityId: formData.entityId,
          name: formData.name || 'Default Chart of Accounts'
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      fetchChartOfAccounts();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating default chart of accounts:', error);
      alert('Failed to create default chart of accounts');
      
      // For demo, simulate success
      const newChart = {
        id: Date.now().toString(),
        name: formData.name || 'Default Chart of Accounts',
        description: 'Standard chart of accounts',
        entityId: formData.entityId,
        version: 1,
        isActive: true
      };
      
      setChartOfAccounts(prev => [...prev, newChart]);
      setSelectedChart(newChart);
      setIsModalOpen(false);
    }
  };

  const handleAddAccount = async () => {
    if (!formData.accountNumber || !formData.accountName || !formData.fslCategory) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Convert custom fields array to object
      const customFields = {};
      customFieldsData.forEach(field => {
        if (field.name.trim() && field.value.trim()) {
          customFields[field.name.trim()] = field.value.trim();
        }
      });

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/chart-of-accounts/${selectedChart.id}/accounts`,
        {
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
          accountType: formData.accountType,
          fslCategory: formData.fslCategory,
          subledgerType: formData.subledgerType,
          description: formData.description,
          customFields
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      fetchAccounts(selectedChart.id);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding account:', error);
      alert('Failed to add account');
      
      // For demo, simulate success
      const newAccount = {
        accountNumber: formData.accountNumber,
        accountName: formData.accountName,
        accountType: formData.accountType,
        fslCategory: formData.fslCategory,
        subledgerType: formData.subledgerType,
        description: formData.description,
        customFields
      };
      
      setAccounts(prev => [...prev, newAccount]);
      setIsModalOpen(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!formData.accountName || !formData.fslCategory) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Convert custom fields array to object
      const customFields = {};
      customFieldsData.forEach(field => {
        if (field.name.trim() && field.value.trim()) {
          customFields[field.name.trim()] = field.value.trim();
        }
      });

      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/chart-of-accounts/${selectedChart.id}/accounts/${formData.accountNumber}`,
        {
          accountName: formData.accountName,
          fslCategory: formData.fslCategory,
          subledgerType: formData.subledgerType,
          description: formData.description,
          customFields
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      fetchAccounts(selectedChart.id);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account');
      
      // For demo, simulate success
      setAccounts(prev => prev.map(account => 
        account.accountNumber === formData.accountNumber
          ? { 
              ...account, 
              accountName: formData.accountName,
              fslCategory: formData.fslCategory,
              subledgerType: formData.subledgerType,
              description: formData.description
            }
          : account
      ));
      setIsModalOpen(false);
    }
  };

  const handleDeleteAccount = async (accountNumber) => {
    if (!confirm(`Are you sure you want to delete account ${accountNumber}?`)) {
      return;
    }

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/chart-of-accounts/${selectedChart.id}/accounts/${accountNumber}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      fetchAccounts(selectedChart.id);
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
      
      // For demo, simulate success
      setAccounts(prev => prev.filter(account => account.accountNumber !== accountNumber));
    }
  };

  const handleImportAccounts = async () => {
    if (!sourceChartId) {
      alert('Please select a source chart of accounts');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/chart-of-accounts/${selectedChart.id}/import`,
        { sourceChartId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      fetchAccounts(selectedChart.id);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error importing accounts:', error);
      alert('Failed to import accounts');
      
      // For demo, simulate success
      setIsModalOpen(false);
      fetchAccounts(selectedChart.id);
    }
  };

  const openAddChartModal = () => {
    setModalMode('chart');
    setModalAction('add');
    setFormData({
      name: '',
      description: '',
      entityId: entities.length > 0 ? entities[0].id : '',
      accountNumber: '',
      accountName: '',
      accountType: 'Asset',
      fslCategory: '',
      subledgerType: 'GL',
      description: ''
    });
    setIsModalOpen(true);
  };

  const openDefaultChartModal = () => {
    setModalMode('chart');
    setModalAction('default');
    setFormData({
      name: 'Default Chart of Accounts',
      description: '',
      entityId: entities.length > 0 ? entities[0].id : ''
    });
    setIsModalOpen(true);
  };

  const openAddAccountModal = () => {
    setModalMode('account');
    setModalAction('add');
    setFormData({
      ...formData,
      accountNumber: '',
      accountName: '',
      accountType: 'Asset',
      fslCategory: fsliCategories['Asset'] ? fsliCategories['Asset'][0] : '',
      subledgerType: 'GL',
      description: ''
    });
    setCustomFieldsData([{ name: '', value: '' }]);
    setIsModalOpen(true);
  };

  const openEditAccountModal = (account) => {
    setModalMode('account');
    setModalAction('edit');
    
    // Convert customFields object to array for form
    const customFieldsArray = [];
    if (account.customFields) {
      Object.entries(account.customFields).forEach(([name, value]) => {
        customFieldsArray.push({ name, value });
      });
    }
    
    if (customFieldsArray.length === 0) {
      customFieldsArray.push({ name: '', value: '' });
    }
    
    setFormData({
      ...formData,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      accountType: account.accountType,
      fslCategory: account.fslCategory,
      subledgerType: account.subledgerType || 'GL',
      description: account.description || ''
    });
    
    setCustomFieldsData(customFieldsArray);
    setIsModalOpen(true);
  };

  const openImportModal = () => {
    setModalMode('import');
    setSourceChartId('');
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special case for accountType, also update fslCategory
    if (name === 'accountType' && fsliCategories[value]) {
      setFormData({
        ...formData,
        [name]: value,
        fslCategory: fsliCategories[value][0] || ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleCustomFieldChange = (index, field, value) => {
    const newCustomFields = [...customFieldsData];
    newCustomFields[index] = {
      ...newCustomFields[index],
      [field]: value
    };
    
    setCustomFieldsData(newCustomFields);
  };

  const addCustomField = () => {
    setCustomFieldsData([...customFieldsData, { name: '', value: '' }]);
  };

  const removeCustomField = (index) => {
    if (customFieldsData.length === 1) {
      setCustomFieldsData([{ name: '', value: '' }]);
    } else {
      const newCustomFields = [...customFieldsData];
      newCustomFields.splice(index, 1);
      setCustomFieldsData(newCustomFields);
    }
  };

  const toggleExpandType = (type) => {
    setExpandedTypes({
      ...expandedTypes,
      [type]: !expandedTypes[type]
    });
  };

  const filteredAccounts = accounts.filter(account => {
    const searchLower = searchTerm.toLowerCase();
    return (
      account.accountNumber.toLowerCase().includes(searchLower) ||
      account.accountName.toLowerCase().includes(searchLower) ||
      account.fslCategory.toLowerCase().includes(searchLower)
    );
  });

  // Organize accounts by type
  const accountsByType = {};
  accountTypes.forEach(type => {
    accountsByType[type.id] = filteredAccounts.filter(account => account.accountType === type.id);
  });

  // Get entity name by ID
  const getEntityName = (entityId) => {
    const entity = entities.find(e => e.id === entityId);
    return entity ? entity.name : 'Unknown Entity';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Chart of Accounts</h1>
        <div className="flex space-x-2">
          <button
            onClick={openAddChartModal}
            className="flex items-center bg-blue-800 text-white px-3 py-2 rounded-md hover:bg-blue-900"
          >
            <Plus size={16} className="mr-1" /> New Chart
          </button>
          <button
            onClick={openDefaultChartModal}
            className="flex items-center bg-green-700 text-white px-3 py-2 rounded-md hover:bg-green-800"
          >
            <FileText size={16} className="mr-1" /> Default Chart
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Chart of Accounts List */}
        <div className="md:col-span-1 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Available Charts</h2>
          {loading && chartOfAccounts.length === 0 ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading charts...</p>
            </div>
          ) : chartOfAccounts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500">No charts available</p>
              <button
                onClick={openAddChartModal}
                className="mt-2 text-blue-800 hover:underline text-sm"
              >
                Create your first chart of accounts
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {chartOfAccounts.map((chart) => (
                <li 
                  key={chart.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    selectedChart && selectedChart.id === chart.id
                      ? 'bg-blue-100 border-l-4 border-blue-800'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedChart(chart)}
                >
                  <div className="font-medium text-gray-900">{chart.name}</div>
                  <div className="text-xs text-gray-500">
                    Entity: {getEntityName(chart.entityId)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Version: {chart.version}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Accounts Display */}
        <div className="md:col-span-3">
          {selectedChart ? (
            <>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedChart.name}</h2>
                    <p className="text-sm text-gray-500">
                      Entity: {getEntityName(selectedChart.entityId)} | Version: {selectedChart.version}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={openAddAccountModal}
                      className="flex items-center bg-blue-800 text-white px-3 py-2 rounded-md hover:bg-blue-900"
                    >
                      <Plus size={16} className="mr-1" /> Add Account
                    </button>
                    <button
                      onClick={openImportModal}
                      className="flex items-center bg-gray-700 text-white px-3 py-2 rounded-md hover:bg-gray-800"
                    >
                      <Copy size={16} className="mr-1" /> Import
                    </button>
                    <button
                      onClick={() => {}}
                      className="flex items-center bg-gray-100 text-gray-800 px-3 py-2 rounded-md hover:bg-gray-200"
                    >
                      <Download size={16} className="mr-1" /> Export
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-500">Loading accounts...</p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No accounts found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding your first account or importing existing ones.
                  </p>
                  <div className="mt-6 flex justify-center space-x-4">
                    <button
                      onClick={openAddAccountModal}
                      className="bg-blue-800 text-white px-4 py-2 rounded-md hover:bg-blue-900"
                    >
                      Add Account
                    </button>
                    <button
                      onClick={openImportModal}
                      className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800"
                    >
                      Import Accounts
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="border-b">
                      {/* Account Type Headers */}
                      {accountTypes.map((type) => (
                        <div key={type.id} className="border-t first:border-t-0">
                          <button
                            className={`w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 focus:outline-none flex justify-between items-center ${
                              expandedTypes[type.id] ? 'font-semibold' : ''
                            }`}
                            onClick={() => toggleExpandType(type.id)}
                          >
                            <span>{type.label} Accounts ({accountsByType[type.id].length})</span>
                            {expandedTypes[type.id] ? (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-500" />
                            )}
                          </button>
                          
                          {/* Account List */}
                          {expandedTypes[type.id] && (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Number
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Name
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      FSLI Category
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Subledger
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {accountsByType[type.id].map((account) => (
                                    <tr key={`${type.id}-${account.accountNumber}`} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {account.accountNumber}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                        {account.accountName}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                        {account.fslCategory}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                        {account.subledgerType || 'GL'}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                                        <button
                                          onClick={() => openEditAccountModal(account)}
                                          className="text-blue-800 hover:text-blue-900 mx-1"
                                          title="Edit account"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteAccount(account.accountNumber)}
                                          className="text-red-600 hover:text-red-700 mx-1"
                                          title="Delete account"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No Chart Selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a chart of accounts from the left or create a new one.
              </p>
              <div className="mt-6">
                <button
                  onClick={openAddChartModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-800 hover:bg-blue-900"
                >
                  <Plus size={16} className="-ml-1 mr-2" /> New Chart of Accounts
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for adding/editing charts and accounts */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            {/* Modal header */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {modalMode === 'chart' && modalAction === 'add' && 'Add New Chart of Accounts'}
                {modalMode === 'chart' && modalAction === 'default' && 'Create Default Chart of Accounts'}
                {modalMode === 'account' && modalAction === 'add' && 'Add New Account'}
                {modalMode === 'account' && modalAction === 'edit' && 'Edit Account'}
                {modalMode === 'import' && 'Import Accounts'}
              </h2>
            </div>

            {/* Modal content */}
            {modalMode === 'chart' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Entity
                  </label>
                  <select
                    name="entityId"
                    value={formData.entityId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="2"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  ></textarea>
                </div>
              </div>
            )}

            {modalMode === 'account' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleInputChange}
                      disabled={modalAction === 'edit'}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Type
                    </label>
                    <select
                      name="accountType"
                      value={formData.accountType}
                      onChange={handleInputChange}
                      disabled={modalAction === 'edit'}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      {accountTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Account Name
                  </label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    FSLI Category
                  </label>
                  <select
                    name="fslCategory"
                    value={formData.fslCategory}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {fsliCategories[formData.accountType] ? (
                      fsliCategories[formData.accountType].map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))
                    ) : (
                      <option value="">Loading categories...</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subledger Type
                  </label>
                  <select
                    name="subledgerType"
                    value={formData.subledgerType}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {subledgerTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="2"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  ></textarea>
                </div>

                {/* Custom Fields Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Custom Fields
                    </label>
                    <button
                      type="button"
                      onClick={addCustomField}
                      className="text-xs text-blue-800 hover:text-blue-900"
                    >
                      + Add Field
                    </button>
                  </div>
                  
                  {customFieldsData.map((field, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        placeholder="Field Name"
                        value={field.name}
                        onChange={(e) => handleCustomFieldChange(index, 'name', e.target.value)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Field Value"
                        value={field.value}
                        onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modalMode === 'import' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Source Chart of Accounts
                  </label>
                  <select
                    value={sourceChartId}
                    onChange={(e) => setSourceChartId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select source chart</option>
                    {chartOfAccounts
                      .filter(chart => chart.id !== selectedChart?.id)
                      .map((chart) => (
                        <option key={chart.id} value={chart.id}>
                          {chart.name} ({getEntityName(chart.entityId)})
                        </option>
                      ))}
                  </select>
                </div>
                <p className="text-sm text-gray-600">
                  This will import all accounts from the selected chart that don't already exist in the current chart.
                </p>
              </div>
            )}

            {/* Modal footer */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              {modalMode === 'chart' && modalAction === 'add' && (
                <button
                  type="button"
                  onClick={handleCreateChart}
                  className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900"
                >
                  Create Chart
                </button>
              )}

              {modalMode === 'chart' && modalAction === 'default' && (
                <button
                  type="button"
                  onClick={handleCreateDefaultChart}
                  className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800"
                >
                  Create Default Chart
                </button>
              )}

              {modalMode === 'account' && modalAction === 'add' && (
                <button
                  type="button"
                  onClick={handleAddAccount}
                  className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900"
                >
                  Add Account
                </button>
              )}

              {modalMode === 'account' && modalAction === 'edit' && (
                <button
                  type="button"
                  onClick={handleUpdateAccount}
                  className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900"
                >
                  Update Account
                </button>
              )}

              {modalMode === 'import' && (
                <button
                  type="button"
                  onClick={handleImportAccounts}
                  className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900"
                >
                  Import Accounts
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccountsManager;
