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
import ChartOfAccounts from "./pages/ChartOfAccounts";
import Reports from "./pages/Reports";
import AccountsPayable from "./pages/AccountsPayable";
import AccountsReceivable from "./pages/AccountsReceivable";
import FixedAssets from "./pages/FixedAssets";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
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
    <Switch>
      <Route path="/login">
        {user ? <Dashboard /> : <Login />}
      </Route>
      
      <Route path="/">
        <AppLayout>
          <ProtectedRoute component={Dashboard} />
        </AppLayout>
      </Route>
      
      <Route path="/general-ledger">
        <AppLayout>
          <ProtectedRoute component={GeneralLedger} />
        </AppLayout>
      </Route>
      
      <Route path="/journal-entries">
        <AppLayout>
          <ProtectedRoute component={JournalEntries} />
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
