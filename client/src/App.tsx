import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate, Navigate, Outlet, useParams } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { EntityProvider, useEntity } from "@/contexts/EntityContext";
import { UIProvider, useUI } from "@/contexts/UIContext";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import GeneralLedger from "@/pages/GeneralLedger";
import { JournalEntries, JournalEntryDetail, NewJournalEntry, BatchUpload } from "@/features/journal-entries";
import ChartOfAccounts from "@/pages/ChartOfAccounts";
import Reports from "@/pages/Reports";
import TrialBalance from "@/pages/TrialBalance";
import AccountsPayable from "@/pages/AccountsPayable";
import AccountsReceivable from "@/pages/AccountsReceivable";
import FixedAssets from "@/pages/FixedAssets";
import DocumentAnalysis from "@/pages/DocumentAnalysis";
import AIAnalytics from "@/pages/AIAnalytics";
import BudgetForecastDashboard from "@/pages/BudgetForecastDashboard";
import ClientOnboarding from "@/pages/ClientOnboarding";
import ConsolidationManagement from "@/pages/ConsolidationManagement";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Home from "@/pages/Home";
import Blog from "@/pages/Blog";
import ChatWidget from "@/components/common/ChatWidget";
import ConsultationFormModal from "@/components/ConsultationFormModal";
import LoginModal from "@/components/LoginModal";
import Redirect from "@/components/Redirect";
import JournalRedirector from "@/components/JournalRedirector";
import DeleteJournalEntry from "@/features/journal-entries/pages/DeleteJournalEntry";
import EntityLayout from "@/components/layout/EntityLayout";

// Public website header component
const PublicHeader: React.FC = () => {
  const { setShowLoginModal } = useUI();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Add scroll effect for better UX
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSectionClick = (section: string) => {
    // Check if we're on the home page
    if (window.location.pathname === '/' || window.location.pathname === '') {
      // If on home page, scroll to section
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If not on home page, navigate to home page with section hash
      navigate(`/#${section}`);
    }
    setIsMenuOpen(false);
  };

  return (
    <nav 
      className={`bg-white shadow-sm sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'py-2' : 'py-4'
      }`}
      role="navigation" 
      aria-label="Main navigation"
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <a href="/" className="text-xl md:text-2xl text-[#1E3A8A] font-bold hover:text-blue-900 transition duration-200">
              Wilcox Advisors
            </a>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <button 
              onClick={() => handleSectionClick('services')} 
              className="text-gray-700 hover:text-[#1E3A8A] font-medium" 
            >
              Services
            </button>
            <button 
              onClick={() => handleSectionClick('about')} 
              className="text-gray-700 hover:text-[#1E3A8A] font-medium" 
            >
              About
            </button>
            <button 
              onClick={() => handleSectionClick('testimonials')} 
              className="text-gray-700 hover:text-[#1E3A8A] font-medium" 
            >
              Testimonials
            </button>
            <button 
              onClick={() => handleSectionClick('contact')} 
              className="text-gray-700 hover:text-[#1E3A8A] font-medium" 
            >
              Contact
            </button>
            <button 
              onClick={() => navigate("/blog")} 
              className="text-gray-700 hover:text-[#1E3A8A] font-medium" 
            >
              Blog
            </button>
            <button 
              onClick={() => setShowLoginModal(true)} 
              className="px-4 py-2 bg-[#1E3A8A] text-white rounded hover:bg-[#1E40AF] transition duration-200" 
              aria-label="Login"
            >
              Login
            </button>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="text-gray-700 hover:text-[#1E3A8A] p-2 focus:outline-none" 
              aria-label="Toggle mobile menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className={`md:hidden transition-all duration-300 overflow-hidden ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="py-3 space-y-2 bg-white" role="menu">
            <button 
              onClick={() => handleSectionClick('services')} 
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-[#1E3A8A]"
            >
              Services
            </button>
            <button 
              onClick={() => handleSectionClick('about')} 
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-[#1E3A8A]"
            >
              About
            </button>
            <button 
              onClick={() => handleSectionClick('testimonials')} 
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-[#1E3A8A]"
            >
              Testimonials
            </button>
            <button 
              onClick={() => handleSectionClick('contact')} 
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-[#1E3A8A]"
            >
              Contact
            </button>
            <button 
              onClick={() => navigate("/blog")} 
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-[#1E3A8A]"
            >
              Blog
            </button>
            <button 
              onClick={() => {
                setShowLoginModal(true);
                setIsMenuOpen(false);
              }} 
              className="block w-full text-left px-4 py-2 mt-2 bg-[#1E3A8A] text-white hover:bg-[#1E40AF]"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Public website footer component
const PublicFooter = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const isHomePage = location.pathname === '/' || location.pathname === '';
  
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-medium mb-4">Wilcox Advisors</h3>
            <p className="text-gray-400">
              Professional accounting and financial services for small businesses.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Contact</h3>
            <p className="text-gray-400 mb-2">123 Financial District</p>
            <p className="text-gray-400 mb-2">New York, NY 10004</p>
            <p className="text-gray-400">(212) 555-1234</p>
          </div>
          
          {isHomePage && (
            <div>
              <h3 className="text-lg font-medium mb-4">Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/#services" className="hover:text-white transition-colors">Services</a></li>
                <li><a href="/#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-6 text-center">
          <p className="text-gray-400">© {currentYear} Wilcox Advisors. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Public website layout
function PublicLayout({ children }: { children: React.ReactNode }) {
  const { showConsultationForm } = useUI();

  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        {children}
      </main>
      <PublicFooter />
      {showConsultationForm && (
        <ConsultationFormModal />
      )}
      {/* Chat widget will be handled by the Home component */}
    </div>
  );
}

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Use useEffect to handle navigation after render
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <div className="flex h-screen items-center justify-center">Redirecting to login...</div>;
  }

  if (adminOnly && user.role !== 'admin') {
    return <div className="flex h-screen items-center justify-center">You don't have permission to access this page.</div>;
  }

  return <Component />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      
      <Route path="/dashboard" element={
        <AppLayout>
          <ProtectedRoute component={Dashboard} />
        </AppLayout>
      } />
      
      <Route path="/" element={
        <PublicLayout>
          <Home />
        </PublicLayout>
      } />
      
      <Route path="/blog" element={
        <PublicLayout>
          <Blog />
        </PublicLayout>
      } />
      
      {/* General Ledger moved to Reports tab */}
      
      {/* Batch upload route remains outside of entity context */}
      <Route path="/journal-entries/batch-upload" element={
        <AppLayout>
          <ProtectedRoute component={BatchUpload} />
        </AppLayout>
      } />
      
      {/* Hierarchical routes for entities - list pages that need EntityLayout */}
      <Route path="/clients/:clientId/entities/:entityId" element={<EntityLayout />}>
        <Route path="journal-entries" element={<ProtectedRoute component={JournalEntries} />} />
        {/* Keep entity-related pages that need EntityLayout here */}
      </Route>
      
      {/* Detail/edit routes for journal entries - OUTSIDE EntityLayout to avoid double filtering */}
      <Route path="/clients/:clientId/entities/:entityId/journal-entries/new" element={
        <AppLayout>
          <ProtectedRoute component={NewJournalEntry} />
        </AppLayout>
      } />
      <Route path="/clients/:clientId/entities/:entityId/journal-entries/:id" element={
        <AppLayout>
          <ProtectedRoute component={JournalEntryDetail} />
        </AppLayout>
      } />
      <Route path="/clients/:clientId/entities/:entityId/journal-entries/:id/edit" element={
        <AppLayout>
          <ProtectedRoute component={NewJournalEntry} />
        </AppLayout>
      } />
      <Route path="/clients/:clientId/entities/:entityId/journal-entries/:id/delete" element={
        <AppLayout>
          <ProtectedRoute component={DeleteJournalEntry} />
        </AppLayout>
      } />
      
      <Route path="/chart-of-accounts" element={
        <AppLayout>
          <ProtectedRoute component={ChartOfAccounts} />
        </AppLayout>
      } />
      
      <Route path="/reports" element={
        <AppLayout>
          <ProtectedRoute component={Reports} />
        </AppLayout>
      } />
      
      <Route path="/trial-balance" element={
        <AppLayout>
          <ProtectedRoute component={TrialBalance} />
        </AppLayout>
      } />
      
      <Route path="/accounts-payable" element={
        <AppLayout>
          <ProtectedRoute component={AccountsPayable} />
        </AppLayout>
      } />
      
      <Route path="/accounts-receivable" element={
        <AppLayout>
          <ProtectedRoute component={AccountsReceivable} />
        </AppLayout>
      } />
      
      <Route path="/fixed-assets" element={
        <AppLayout>
          <ProtectedRoute component={FixedAssets} />
        </AppLayout>
      } />
      
      <Route path="/document-analysis" element={
        <AppLayout>
          <ProtectedRoute component={DocumentAnalysis} />
        </AppLayout>
      } />
      
      <Route path="/ai-analytics" element={
        <AppLayout>
          <ProtectedRoute component={AIAnalytics} />
        </AppLayout>
      } />
      
      <Route path="/budget-forecast-dashboard" element={
        <AppLayout>
          <ProtectedRoute component={BudgetForecastDashboard} />
        </AppLayout>
      } />

      <Route path="/client-onboarding" element={
        <AppLayout>
          <ProtectedRoute component={ClientOnboarding} adminOnly={true} />
        </AppLayout>
      } />

      <Route path="/consolidation-management" element={
        <AppLayout>
          <ProtectedRoute component={ConsolidationManagement} />
        </AppLayout>
      } />
      
      {/* Redirect to the consolidated JournalEntryForm implementation */}
      <Route path="/journal-entries/create" element={
        <AppLayout>
          <ProtectedRoute component={NewJournalEntry} />
        </AppLayout>
      } />

      {/* Legacy journal entries routes - using JournalRedirector with nested routes */}
      <Route path="/journal-entries" element={
        <AppLayout>
          <JournalRedirector />
        </AppLayout>
      }>
        {/* Index route shows journal entries list when entity is selected */}
        <Route index element={<ProtectedRoute component={JournalEntries} />} />
        <Route path="list/:entityId" element={<ProtectedRoute component={JournalEntries} />} />
        <Route path="new/:entityId" element={<ProtectedRoute component={NewJournalEntry} />} />
        <Route path="detail/:jeId" element={<ProtectedRoute component={JournalEntryDetail} />} />
        <Route path="edit/:jeId" element={<ProtectedRoute component={NewJournalEntry} />} />
        <Route path="delete/:jeId" element={<ProtectedRoute component={DeleteJournalEntry} />} />
        <Route path="batch-upload" element={<ProtectedRoute component={BatchUpload} />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppWithAuth() {
  const { showConsultationForm, showLoginModal } = useUI();
  
  return (
    <>
      <Router />
      {showConsultationForm && <ConsultationFormModal />}
      {showLoginModal && <LoginModal />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EntityProvider>
          <UIProvider>
            <AppWithAuth />
            <Toaster />
          </UIProvider>
        </EntityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
