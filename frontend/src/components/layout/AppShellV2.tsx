import React from 'react';
import { Outlet } from 'react-router-dom';
import SidebarV2 from './SidebarV2';
import TopbarV2 from './TopbarV2';
import { ErrorBoundary } from '../ErrorBoundary';

const AppShellV2: React.FC = () => {
  return (
    <div className="flex min-h-screen" style={{ background: '#0a0f1a' }}>
      <SidebarV2 />
      <div className="flex flex-col flex-1 min-w-0">
        <TopbarV2 />
        <main className="flex-1 overflow-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AppShellV2;
