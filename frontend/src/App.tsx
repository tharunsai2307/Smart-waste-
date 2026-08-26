import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store';

import BootScreen from './components/BootScreen';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import BinsPage from './pages/Bins';
import WastePage from './pages/Waste';
import CollectionsPage from './pages/Collections';
import RoutesPage from './pages/Routes';
import RecyclingCommand from './pages/RecyclingCommand';
import AlertsPage from './pages/Alerts';
import AnalyticsPage from './pages/Analytics';
import ExecutiveCommand from './pages/ExecutiveCommand';
import IncidentCommand from './pages/IncidentCommand';
import ResidentsPage from './pages/Residents';
import EnvironmentPage from './pages/Environment';
import ReportsPage from './pages/Reports';
import HubsPage from './pages/Hubs';
import ResidentPortal from './pages/ResidentPortal';
import CleanerFieldOps from './pages/CleanerFieldOps';
import DriverDashboard from './pages/DriverDashboard';
import Transfers from './pages/Transfers';
import VehicleManagement from './pages/VehicleManagement';
import WorkspaceManagement from './pages/WorkspaceManagement';
import { GISCommand } from './pages/GISCommand';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 3000 } }
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleDefaultRedirect() {
  const user = useAppStore(s => s.user);
  if (user?.role === 'RESIDENT') return <Navigate to="/resident-portal" replace />;
  if (user?.role === 'CLEANER') return <Navigate to="/cleaner-ops" replace />;
  if (user?.role === 'DRIVER') return <Navigate to="/driver-dashboard" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/executive-command" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppContent() {
  const user = useAppStore(s => s.user);
  const [booted, setBooted] = useState(false);
  const [bootDismissed, setBootDismissed] = useState(false);

  const showBoot = !booted && !user;

  return (
    <>
      <AnimatePresence>
        {showBoot && (
          <BootScreen onComplete={() => { setBooted(true); setBootDismissed(true); }} />
        )}
      </AnimatePresence>

      {(!showBoot || bootDismissed) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={user ? <RoleDefaultRedirect /> : <LoginPage />} />
              <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route index element={<RoleDefaultRedirect />} />
                <Route path="executive-command" element={<ExecutiveCommand />} />
                <Route path="workspaces" element={<WorkspaceManagement />} />
                <Route path="incident-command"  element={<IncidentCommand />} />
                <Route path="incidents"         element={<IncidentCommand />} />
                <Route path="dashboard"        element={<Dashboard />} />
                <Route path="resident-portal" element={<ResidentPortal />} />
                <Route path="cleaner-ops"      element={<CleanerFieldOps />} />
                <Route path="driver-dashboard" element={<DriverDashboard />} />
                <Route path="hubs"             element={<HubsPage />} />
                <Route path="bins"             element={<BinsPage />} />
                <Route path="waste"            element={<WastePage />} />
                <Route path="collections"      element={<CollectionsPage />} />
                <Route path="vehicles"         element={<VehicleManagement />} />
                <Route path="transfers"        element={<Transfers />} />
                <Route path="routes"           element={<RoutesPage />} />
                <Route path="recycling"        element={<RecyclingCommand />} />
                <Route path="gis"              element={<GISCommand />} />
                <Route path="alerts"           element={<AlertsPage />} />
                <Route path="analytics"        element={<ExecutiveCommand />} />
                <Route path="analytics-legacy" element={<AnalyticsPage />} />
                <Route path="residents"        element={<ResidentsPage />} />
                <Route path="environment"      element={<EnvironmentPage />} />
                <Route path="reports"          element={<ReportsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </motion.div>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
