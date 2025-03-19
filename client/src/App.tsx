import React, { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "./contexts/AuthContext";
import { AuthProvider } from "./contexts/AuthContext";
import { EntityProvider } from "./contexts/EntityContext";
import NotFound from "@/pages/not-found";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import GeneralLedger from "./pages/GeneralLedger";
import JournalEntries from "./pages/JournalEntries";
import JournalEntryDetail from "./pages/JournalEntryDetail";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import Reports from "./pages/Reports";
import TrialBalance from "./pages/TrialBalance";
import AccountsPayable from "./pages/AccountsPayable";
import AccountsReceivable from "./pages/AccountsReceivable";
import FixedAssets from "./pages/FixedAssets";
import DocumentAnalysis from "./pages/DocumentAnalysis";
import ManualJournalEntry from "./components/ManualJournalEntry";
import BatchJournalUpload from "./components/BatchJournalUpload";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Home from "./pages/Home";
import ChatWidget from "./components/common/ChatWidget";

// Public website header component
const PublicHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [_, navigate] = useLocation();

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <a href="/" className="text-2xl font-bold text-blue-800">Wilcox Advisors</a>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#services" className="text-gray-700 hover:text-blue-800">Services</a>
            <a href="#about" className="text-gray-700 hover:text-blue-800">About Us</a>
            <a href="#blog" className="text-gray-700 hover:text-blue-800">Blog</a>
            <a href="#contact" className="text-gray-700 hover:text-blue-800">Contact</a>
            <button 
              onClick={() => navigate("/login")} 
              className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Client Login
            </button>
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700"
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
        {isMenuOpen && (
          <div className="md:hidden mt-4">
            <div className="flex flex-col space-y-4">
              <a href="#services" className="text-gray-700 hover:text-blue-800">Services</a>
              <a href="#about" className="text-gray-700 hover:text-blue-800">About Us</a>
              <a href="#blog" className="text-gray-700 hover:text-blue-800">Blog</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-800">Contact</a>
              <button 
                onClick={() => navigate("/login")} 
                className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Client Login
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

// Public website footer component
const PublicFooter = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Wilcox Advisors</h3>
            <p className="text-gray-400">
              Professional financial advisory services for businesses and individuals.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Financial Planning</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Tax Services</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Accounting</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Business Advisory</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Team</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <address className="text-gray-400 not-italic">
              123 Financial District<br />
              New York, NY 10004<br />
              <a href="tel:+12125551234" className="hover:text-white transition-colors">+1 (212) 555-1234</a><br />
              <a href="mailto:info@wilcoxadvisors.com" className="hover:text-white transition-colors">info@wilcoxadvisors.com</a>
            </address>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400">© 2023 Wilcox Advisors. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <span className="sr-only">Facebook</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <span className="sr-only">LinkedIn</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Public website layout
function PublicLayout({ children }) {
  const [showConsultationForm, setShowConsultationForm] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow">
        {children}
      </main>
      <PublicFooter />
      <ChatWidget />
    </div>
  );
}

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

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
  const [showConsultationForm, setShowConsultationForm] = useState(false);

  return (
    <Switch>
      <Route path="/login">
        {user ? <Dashboard /> : <Login />}
      </Route>
      
      <Route path="/" exact>
        <PublicLayout>
          <Home setShowConsultationForm={setShowConsultationForm} />
        </PublicLayout>
      </Route>
      
      <Route path="/dashboard">
        <AppLayout>
          <ProtectedRoute component={Dashboard} />
        </AppLayout>
      </Route>
      
      {/* General Ledger moved to Reports tab */}
      
      <Route path="/journal-entries">
        <AppLayout>
          <ProtectedRoute component={JournalEntries} />
        </AppLayout>
      </Route>
      
      <Route path="/journal-entries/new">
        <AppLayout>
          <ProtectedRoute component={ManualJournalEntry} />
        </AppLayout>
      </Route>
      
      <Route path="/journal-entries/batch-upload">
        <AppLayout>
          <ProtectedRoute component={BatchJournalUpload} />
        </AppLayout>
      </Route>
      
      <Route path="/journal-entries/:id">
        <AppLayout>
          <ProtectedRoute component={JournalEntryDetail} />
        </AppLayout>
      </Route>
      
      <Route path="/chart-of-accounts">
        <AppLayout>
          <ProtectedRoute component={ChartOfAccounts} />
        </AppLayout>
      </Route>
      
      <Route path="/reports">
        <AppLayout>
          <ProtectedRoute component={Reports} />
        </AppLayout>
      </Route>
      
      <Route path="/trial-balance">
        <AppLayout>
          <ProtectedRoute component={TrialBalance} />
        </AppLayout>
      </Route>
      
      <Route path="/accounts-payable">
        <AppLayout>
          <ProtectedRoute component={AccountsPayable} />
        </AppLayout>
      </Route>
      
      <Route path="/accounts-receivable">
        <AppLayout>
          <ProtectedRoute component={AccountsReceivable} />
        </AppLayout>
      </Route>
      
      <Route path="/fixed-assets">
        <AppLayout>
          <ProtectedRoute component={FixedAssets} />
        </AppLayout>
      </Route>
      
      <Route path="/document-analysis">
        <AppLayout>
          <ProtectedRoute component={DocumentAnalysis} />
        </AppLayout>
      </Route>
      
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function AppWithAuth() {
  return (
    <Router />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EntityProvider>
          <AppWithAuth />
          <Toaster />
        </EntityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
