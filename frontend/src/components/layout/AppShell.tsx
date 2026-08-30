import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { ErrorBoundary } from '../ErrorBoundary';

const AppShell: React.FC = () => {
  return (
    <div className="flex min-h-screen" style={{ background: '#0a0f1a' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
