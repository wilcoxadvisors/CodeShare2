import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEntity } from '../contexts/EntityContext';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardEdit,
  BarChart2,
  Receipt,
  Wallet,
  Computer,
  Settings,
  LogOut,
  FileText,
  Sparkles,
  LineChart,
  BarChart,
  Users,
  FolderOpen,
  Briefcase,
  Grid3X3
} from 'lucide-react';

function Sidebar() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedClientId, currentEntity } = useEntity();

  const isActive = (path: string) => {
    // Handle both generic and client-specific paths for these modules
    if (path === '/journal-entries' && location.pathname.includes('/journal-entries')) {
      return true;
    }
    if (path === '/chart-of-accounts' && location.pathname.includes('/chart-of-accounts')) {
      return true;
    }
    if (path === '/manage/dimensions' && location.pathname.includes('/manage/dimensions')) {
      return true;
    }
    return location.pathname === path;
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
    navigate('/');
  };

  const NavItem = ({ path, icon, label }: { path: string, icon: React.ReactNode, label: string }) => {
    // For client-specific modules, construct URL with current client
    let targetPath = path;
    if (selectedClientId && (path === '/chart-of-accounts' || path === '/manage/dimensions')) {
      targetPath = `/clients/${selectedClientId}${path}`;
    }
    
    return (
      <Link 
        to={targetPath}
        className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md cursor-pointer ${
          isActive(path) 
            ? 'bg-primary-700 text-white font-semibold' 
            : 'text-white hover:bg-primary-800/60 hover:text-white'
        }`}
      >
        {icon}
        <span className="ml-1">{label}</span>
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-gradient-to-b from-blue-800 to-blue-900 shadow-xl">
        <div className="flex items-center justify-center h-16 px-4 border-b border-blue-700">
          <h1 className="text-xl font-bold text-white">Wilcox Advisors</h1>
        </div>
        
        <div className="flex flex-col flex-grow overflow-y-auto sidebar-scroll">
          <nav className="flex-1 px-3 py-4 space-y-1.5">
            <NavItem 
              path="/dashboard" 
              icon={<LayoutDashboard className="h-5 w-5 mr-2" />} 
              label="Dashboard" 
            />
            
            {/* General Ledger moved to Reports tab */}
            
            {/* Journal Entries link - always starts fresh for explicit client selection */}
            <NavItem 
              path="/journal-entries" 
              icon={<ClipboardEdit className="h-5 w-5 mr-2" />} 
              label="Journal Entries" 
            />
            
            <NavItem 
              path="/chart-of-accounts" 
              icon={<BarChart2 className="h-5 w-5 mr-2" />} 
              label="Chart of Accounts" 
            />
            
            <NavItem 
              path="/reports" 
              icon={<Receipt className="h-5 w-5 mr-2" />} 
              label="Reports" 
            />
            
            <NavItem 
              path="/trial-balance" 
              icon={<BarChart2 className="h-5 w-5 mr-2" />} 
              label="Trial Balance" 
            />
            
            <NavItem 
              path="/accounts-payable" 
              icon={<Wallet className="h-5 w-5 mr-2" />} 
              label="Accounts Payable" 
            />
            
            <NavItem 
              path="/accounts-receivable" 
              icon={<Wallet className="h-5 w-5 mr-2" />} 
              label="Accounts Receivable" 
            />
            
            <NavItem 
              path="/fixed-assets" 
              icon={<Computer className="h-5 w-5 mr-2" />} 
              label="Fixed Assets" 
            />
            
            <NavItem 
              path="/document-analysis" 
              icon={<FileText className="h-5 w-5 mr-2" />} 
              label="Document Analysis" 
            />
            
            <NavItem 
              path="/ai-analytics" 
              icon={<Sparkles className="h-5 w-5 mr-2" />} 
              label="AI Analytics" 
            />
            
            <NavItem 
              path="/budget-forecast-dashboard" 
              icon={<BarChart className="h-5 w-5 mr-2" />} 
              label="Budget & Forecast" 
            />
            
            <NavItem 
              path="/consolidation-management" 
              icon={<FolderOpen className="h-5 w-5 mr-2" />} 
              label="Consolidation" 
            />
            
            <NavItem 
              path="/manage/dimensions" 
              icon={<Grid3X3 className="h-5 w-5 mr-2" />} 
              label="Dimensions" 
            />
            
            <div className="mt-6 border-t border-blue-700 pt-4">
              <Link
                to="/settings"
                className="flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-white hover:bg-blue-700/60 cursor-pointer"
              >
                <Settings className="h-5 w-5 mr-2" />
                <span className="ml-1">Settings</span>
              </Link>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-white hover:bg-blue-700/60 cursor-pointer"
              >
                <LogOut className="h-5 w-5 mr-2" />
                <span className="ml-1">Logout</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
