// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  Home, Users, FileText, Database, FileSpreadsheet, Settings, Globe, 
  Upload, Image, Layout, Edit, Info, Bookmark, Phone, Save, CheckCircle, 
  LogOut, PlusCircle 
} from 'lucide-react';
import Sidebar from './Sidebar';
import WebsiteContentManager from './WebsiteContentManager';

function AdminDashboard() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({
    blogDrafts: [],
    hero: { headline: '', subtext: '' },
    about: '',
    stats: {
      consultations: 0,
      checklists: 0,
      contacts: 0,
      chats: 0,
      files: 0
    }
  });
  const [editingBlog, setEditingBlog] = useState(null);
  const [editingContent, setEditingContent] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'https://wilcox-advisors-backend.onrender.com'}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const handleBlogEdit = (draft) => setEditingBlog({ ...draft });

  const handleBlogSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (editingBlog._id) {
        await axios.put(`${process.env.REACT_APP_API_URL || 'https://wilcox-advisors-backend.onrender.com'}/api/blog/${editingBlog._id}`, editingBlog, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL || 'https://wilcox-advisors-backend.onrender.com'}/api/blog`, editingBlog, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setEditingBlog(null);
      fetchDashboardData();
      alert('Blog post saved!');
    } catch (error) {
      alert('Failed to save blog post.');
    }
  };

  const handleContentEdit = (section) => setEditingContent({ section, value: dashboardData[section] });

  const handleContentSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_API_URL || 'https://wilcox-advisors-backend.onrender.com'}/api/admin/content`, editingContent, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboardData(prev => ({ ...prev, [editingContent.section]: editingContent.value }));
      setEditingContent(null);
      alert('Content saved!');
    } catch (error) {
      alert('Failed to save content.');
    }
  };
  
  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(URL.createObjectURL(e.target.files[0]));
    }
  };
  
  const handleWebsiteSave = () => {
    setSaved(true);
    // In a real implementation, save data to backend here
    setTimeout(() => setSaved(false), 3000);
  };

  const renderModule = () => {
    switch(activeModule) {
      case 'dashboard':
        return (
          <section className="py-16 px-6">
            <h2 className="text-3xl font-bold text-blue-800 mb-10">Admin Dashboard</h2>
            <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Consultations</p>
                    <p className="text-2xl font-bold text-blue-800">{dashboardData.stats?.consultations || 0}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Checklist Downloads</p>
                    <p className="text-2xl font-bold text-green-700">{dashboardData.stats?.checklists || 0}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Contact Requests</p>
                    <p className="text-2xl font-bold text-purple-700">{dashboardData.stats?.contacts || 0}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Quick Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setActiveModule('blogs')}
                    className="bg-blue-100 text-blue-800 p-4 rounded-lg hover:bg-blue-200"
                  >
                    Manage Blog Posts
                  </button>
                  <button 
                    onClick={() => setActiveModule('website')}
                    className="bg-blue-100 text-blue-800 p-4 rounded-lg hover:bg-blue-200"
                  >
                    Edit Website Content
                  </button>
                  <button 
                    onClick={() => setActiveModule('accounting')}
                    className="bg-blue-100 text-blue-800 p-4 rounded-lg hover:bg-blue-200"
                  >
                    Accounting System
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Recent Activity</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">No recent activity to display.</p>
                </div>
              </div>
            </div>
          </section>
        );
      
      case 'blogs':
        return (
          <section className="py-16 px-6">
            <h2 className="text-3xl font-bold text-blue-800 mb-10">Blog Management</h2>
            <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Blog Posts</h3>
                {editingBlog ? (
                  <div>
                    <input
                      type="text"
                      value={editingBlog.title}
                      onChange={(e) => setEditingBlog({ ...editingBlog, title: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-2 border p-2"
                      placeholder="Blog Title"
                    />
                    <ReactQuill 
                      value={editingBlog.content} 
                      onChange={(content) => setEditingBlog({ ...editingBlog, content })} 
                      className="mb-4" 
                    />
                    <div className="flex space-x-4">
                      <button 
                        onClick={handleBlogSave} 
                        className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 transition duration-200"
                      >
                        Save Post
                      </button>
                      <button 
                        onClick={() => setEditingBlog(null)} 
                        className="text-gray-700 hover:text-blue-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.blogDrafts && dashboardData.blogDrafts.map((draft, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                        <h4 className="font-semibold text-gray-900">{draft.title}</h4>
                        <div dangerouslySetInnerHTML={{ __html: draft.content.substring(0, 100) + '...' }} />
                        <div className="mt-2 flex space-x-2">
                          <button 
                            onClick={() => handleBlogEdit(draft)} 
                            className="text-blue-800 hover:underline"
                          >
                            Edit
                          </button>
                          <button 
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => setEditingBlog({ title: '', content: '' })} 
                      className="flex items-center text-blue-800 hover:underline mt-4"
                    >
                      <PlusCircle size={16} className="mr-1" /> Add New Blog Post
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      
      case 'accounting':
        return (
          <section className="py-10 px-6">
            <h2 className="text-3xl font-bold text-blue-800 mb-6">Accounting System</h2>
            
            {/* Client Selector */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Client</label>
              <select className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500">
                <option value="">-- Select a Client --</option>
                <option value="client1">Acme Corporation</option>
                <option value="client2">Globex Industries</option>
                <option value="client3">Stark Enterprises</option>
                <option value="client4">Wayne Industries</option>
              </select>
            </div>
            
            {/* Accounting Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">General Ledger (GL)</h3>
                <p className="text-gray-700 mb-3">Manage journal entries and multi-currency/entity support.</p>
                <button className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900">
                  Access GL Module
                </button>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Accounts Payable/Receivable</h3>
                <p className="text-gray-700 mb-3">Manage invoices, bills, and payments.</p>
                <button className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800">
                  Access AP/AR Module
                </button>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Financial Reporting</h3>
                <p className="text-gray-700 mb-3">Generate financial statements and dashboards.</p>
                <button className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-800">
                  Access Reporting
                </button>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Budgeting/Forecasting</h3>
                <p className="text-gray-700 mb-3">Create and track budgets and forecasts.</p>
                <button className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">
                  Access Budgeting
                </button>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Inventory/Supply Chain</h3>
                <p className="text-gray-700 mb-3">Manage inventory and supply chain operations.</p>
                <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                  Access Inventory
                </button>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Automation</h3>
                <p className="text-gray-700 mb-3">Automate journal entries and bank reconciliation.</p>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                  Access Automation
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Compliance/Audit</h3>
                <p className="text-gray-700 mb-3">Manage audit trails and compliance documentation.</p>
                <button className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800">
                  Access Compliance
                </button>
              </div>
              
              <div className="bg-teal-50 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2">Integration</h3>
                <p className="text-gray-700 mb-3">Connect with external APIs (Plaid, Stripe, etc.).</p>
                <button className="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-800">
                  Manage Integrations
                </button>
              </div>
            </div>
            
            {/* Multi-Entity/Currency Settings */}
            <div className="mt-6 bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Multi-Entity Support</h4>
                  <button className="bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200">
                    Manage Entities
                  </button>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Multi-Currency Support</h4>
                  <button className="bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200">
                    Manage Currencies
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      
      case 'website':
        return <WebsiteContentManager />;
      
      case 'clients':
        return (
          <section className="py-16 px-6">
            <h2 className="text-3xl font-bold text-blue-800 mb-10">Client Management</h2>
            <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Clients</h3>
                  <button className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 flex items-center">
                    <PlusCircle size={16} className="mr-1" /> Add New Client
                  </button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">No clients to display. Add your first client to get started.</p>
                </div>
              </div>
            </div>
          </section>
        );
      
      case 'reports':
        return (
          <section className="py-16 px-6">
            <h2 className="text-3xl font-bold text-blue-800 mb-10">Financial Reports</h2>
            <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Income Statement</h4>
                    <p className="text-sm text-gray-600 mb-3">View revenue, expenses, and profit/loss over time.</p>
                    <button className="text-blue-800 hover:underline">Generate Report</button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Balance Sheet</h4>
                    <p className="text-sm text-gray-600 mb-3">View assets, liabilities, and equity at a point in time.</p>
                    <button className="text-blue-800 hover:underline">Generate Report</button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Cash Flow Statement</h4>
                    <p className="text-sm text-gray-600 mb-3">View cash inflows and outflows over time.</p>
                    <button className="text-blue-800 hover:underline">Generate Report</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      
      case 'settings':
        return (
          <section className="py-16 px-6">
            <h2 className="text-3xl font-bold text-blue-800 mb-10">System Settings</h2>
            <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">User Management</h3>
                <button className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 flex items-center">
                  <PlusCircle size={16} className="mr-1" /> Add New User
                </button>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">API Integrations</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">Configure integrations with third-party services.</p>
                </div>
              </div>
            </div>
          </section>
        );
      
      default:
        return (
          <section className="py-16 px-6">
            <h2 className="text-3xl font-bold text-blue-800 mb-10">Module Not Found</h2>
            <p>The requested module '{activeModule}' does not exist.</p>
          </section>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      <div className="flex-1 overflow-auto">
        {renderModule()}
      </div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 flex items-center ${
        active 
          ? 'border-b-2 border-blue-800 text-blue-800' 
          : 'text-gray-600 hover:text-blue-800'
      }`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );
}

export default AdminDashboard;
