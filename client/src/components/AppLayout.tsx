import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import EntityUrlSync from './EntityUrlSync';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Standard application layout with sidebar and header
 */
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <EntityUrlSync />
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;