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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <EntityUrlSync />
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

export default AppLayout;