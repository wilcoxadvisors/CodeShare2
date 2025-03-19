// src/components/accounting/FixedAssetManager.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, ChevronDown, ChevronUp, Printer, Download } from 'lucide-react';
import axios from 'axios';

const FixedAssetManager = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assetCategory: 'equipment',
    acquisitionDate: '',
    acquisitionCost: '',
    depreciationMethod: 'straight-line',
    usefulLife: '',
    salvageValue: '0',
  });

  const categories = [
    { id: 'equipment', label: 'Equipment' },
    { id: 'furniture', label: 'Furniture & Fixtures' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'buildings', label: 'Buildings' },
    { id: 'land', label: 'Land' },
    { id: 'computers', label: 'Computers & IT' },
    { id: 'software', label: 'Software' },
    { id: 'other', label: 'Other' }
  ];

  const depreciationMethods = [
    { id: 'straight-line', label: 'Straight Line' },
    { id: 'declining-balance', label: 'Declining Balance' },
    { id: 'units-of-production', label: 'Units of Production' }
  ];

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      // This will need to be replaced with your actual API endpoint
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/accounting/fixed-assets`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && response.data.assets) {
        setAssets(response.data.assets);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      // For demo/development, use sample data
      setAssets([
        {
          id: '1',
          name: 'Dell XPS Laptop',
          description: 'Development laptop for engineering team',
          assetCategory: 'computers',
          acquisitionDate: '2024-01-15',
          acquisitionCost: 1899.99,
          depreciationMethod: 'straight-line',
          usefulLife: 36, // months
          salvageValue: 300,
          currentBookValue: 1766.66,
          disposed: false
        },
        {
          id: '2',
          name: 'Office Furniture Set',
          description: 'Reception area furniture',
          assetCategory: 'furniture',
          acquisitionDate: '2023-11-05',
          acquisitionCost: 4500,
          depreciationMethod: 'straight-line',
          usefulLife: 60, // months
          salvageValue: 500,
          currentBookValue: 4300,
          disposed: false
        },
        {
          id: '3',
          name: 'Company Vehicle',
          description: 'Ford Transit delivery van',
          assetCategory: 'vehicles',
          acquisitionDate: '2023-08-20',
          acquisitionCost: 32000,
          depreciationMethod: 'declining-balance',
          usefulLife: 84, // months
          salvageValue: 5000,
          currentBookValue: 29142.86,
          disposed: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const sortedAssets = () => {
    let filtered = [...assets];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(asset => asset.assetCategory === categoryFilter);
    }
    
    // Sort the filtered results
    return filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setSelectedAsset(null);
    setFormData({
      name: '',
      description: '',
      assetCategory: 'equipment',
      acquisitionDate: '',
      acquisitionCost: '',
      depreciationMethod: 'straight-line',
      usefulLife: '',
      salvageValue: '0',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setFormData({
      name: asset.name,
      description: asset.description,
      assetCategory: asset.assetCategory,
      acquisitionDate: asset.acquisitionDate,
      acquisitionCost: asset.acquisitionCost.toString(),
      depreciationMethod: asset.depreciationMethod,
      usefulLife: asset.usefulLife.toString(),
      salvageValue: asset.salvageValue.toString(),
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (asset) => {
    setSelectedAsset(asset);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name || !formData.acquisitionDate || !formData.acquisitionCost || !formData.usefulLife) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        acquisitionCost: parseFloat(formData.acquisitionCost),
        usefulLife: parseInt(formData.usefulLife),
        salvageValue: parseFloat(formData.salvageValue) || 0
      };
      
      if (selectedAsset) {
        // Update existing asset
        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/accounting/fixed-assets/${selectedAsset.id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
      } else {
        // Create new asset
        await axios.post(
          `${process.env.REACT_APP_API_URL}/api/accounting/fixed-assets`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
      }
      
      // Refresh the asset list
      fetchAssets();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Failed to save asset. Please try again.');
      
      // For demo purposes, simulate successful save
      if (selectedAsset) {
        setAssets(prev => prev.map(a => a.id === selectedAsset.id ? {...a, ...formData} : a));
      } else {
        const newAsset = {
          id: Date.now().toString(),
          ...formData,
          acquisitionCost: parseFloat(formData.acquisitionCost),
          usefulLife: parseInt(formData.usefulLife),
          salvageValue: parseFloat(formData.salvageValue) || 0,
          currentBookValue: parseFloat(formData.acquisitionCost),
          disposed: false
        };
        setAssets(prev => [...prev, newAsset]);
      }
      setIsModalOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/accounting/fixed-assets/${selectedAsset.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Refresh the asset list
      fetchAssets();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset. Please try again.');
      
      // For demo purposes, simulate successful delete
      setAssets(prev => prev.filter(a => a.id !== selectedAsset.id));
      setIsDeleteModalOpen(false);
    }
  };

  const handleDispose = async (asset) => {
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/accounting/fixed-assets/${asset.id}/dispose`,
        {
          disposalDate: new Date().toISOString().split('T')[0],
          disposalValue: 0
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Refresh the asset list
      fetchAssets();
    } catch (error) {
      console.error('Error disposing asset:', error);
      alert('Failed to dispose asset. Please try again.');
      
      // For demo purposes, simulate successful dispose
      setAssets(prev => prev.map(a => a.id === asset.id ? {...a, disposed: true} : a));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.label : categoryId;
  };

  const getDepreciationMethodName = (methodId) => {
    const method = depreciationMethods.find(m => m.id === methodId);
    return method ? method.label : methodId;
  };

  // Calculate total book value of all assets
  const totalBookValue = assets.reduce((sum, asset) => sum + (asset.disposed ? 0 : asset.currentBookValue), 0);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fixed Asset Management</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {}}
            className="px-3 py-2 flex items-center text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <Printer className="w-4 h-4 mr-1" />
            <span>Print</span>
          </button>
          <button
            onClick={() => {}}
            className="px-3 py-2 flex items-center text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <Download className="w-4 h-4 mr-1" />
            <span>Export</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-3 py-2 flex items-center text-white bg-blue-800 rounded-md hover:bg-blue-900"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label htmlFor="category-filter" className="text-sm font-medium text-gray-700">Category:</label>
            <select
              id="category-filter"
              className="bg-white border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Assets</h3>
            <p className="text-2xl font-semibold text-gray-900">{assets.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Active Assets</h3>
            <p className="text-2xl font-semibold text-gray-900">{assets.filter(a => !a.disposed).length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Disposed Assets</h3>
            <p className="text-2xl font-semibold text-gray-900">{assets.filter(a => a.disposed).length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Book Value</h3>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalBookValue)}</p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
        </div>
      ) : (
        <>
          {assets.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">No assets found</h3>
              <p className="text-gray-500 mt-2">Get started by adding your first asset.</p>
              <button
                onClick={openAddModal}
                className="mt-4 px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900"
              >
                Add Asset
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>
                      <div className="flex items-center">
                        Asset Name
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('assetCategory')}>
                      <div className="flex items-center">
                        Category
                        {getSortIcon('assetCategory')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('acquisitionDate')}>
                      <div className="flex items-center">
                        Purchase Date
                        {getSortIcon('acquisitionDate')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('acquisitionCost')}>
                      <div className="flex items-center">
                        Cost
                        {getSortIcon('acquisitionCost')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('currentBookValue')}>
                      <div className="flex items-center">
                        Book Value
                        {getSortIcon('currentBookValue')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAssets().map((asset) => (
                    <tr key={asset.id} className={asset.disposed ? "bg-gray-50" : ""}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                            <div className="text-sm text-gray-500">{asset.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getCategoryName(asset.assetCategory)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(asset.acquisitionDate)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(asset.acquisitionCost)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(asset.currentBookValue)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          asset.disposed
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {asset.disposed ? 'Disposed' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(asset)}
                            className="text-blue-800 hover:text-blue-900"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!asset.disposed && (
                            <button
                              onClick={() => handleDispose(asset)}
                              className="text-yellow-600 hover:text-yellow-700"
                              title="Mark as disposed"
                            >
                              Dispose
                            </button>
                          )}
                          <button
                            onClick={() => openDeleteModal(asset)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      
      {/* Add/Edit Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{selectedAsset ? 'Edit Asset' : 'Add New Asset'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Asset Name*</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="2"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category*</label>
                  <select
                    name="assetCategory"
                    value={formData.assetCategory}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Acquisition Date*</label>
                  <input
                    type="date"
                    name="acquisitionDate"
                    value={formData.acquisitionDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Acquisition Cost*</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      name="acquisitionCost"
                      value={formData.acquisitionCost}
                      onChange={handleInputChange}
                      className="block w-full pl-7 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Depreciation Method*</label>
                  <select
                    name="depreciationMethod"
                    value={formData.depreciationMethod}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {depreciationMethods.map((method) => (
                      <option key={method.id} value={method.id}>{method.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Useful Life (months)*</label>
                  <input
                    type="number"
                    name="usefulLife"
                    value={formData.usefulLife}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salvage Value</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      name="salvageValue"
                      value={formData.salvageValue}
                      onChange={handleInputChange}
                      className="block w-full pl-7 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900"
                >
                  {selectedAsset ? 'Update Asset' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="mb-4">
              Are you sure you want to delete <span className="font-semibold">{selectedAsset.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedAssetManager;
