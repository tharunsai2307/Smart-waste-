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
import VehiclesPage from './pages/Vehicles';
import RoutesPage from './pages/Routes';
import RecyclingPage from './pages/Recycling';
import AlertsPage from './pages/Alerts';
import AnalyticsPage from './pages/Analytics';
import ResidentsPage from './pages/Residents';
import EnvironmentPage from './pages/Environment';
import ReportsPage from './pages/Reports';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 3000 } }
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppContent() {
  const user = useAppStore(s => s.user);
  const [booted, setBooted] = useState(false);
  const [bootDismissed, setBootDismissed] = useState(false);

  // Show boot screen only once per session (when no user logged in)
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
              <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
              <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard"   element={<Dashboard />} />
                <Route path="bins"        element={<BinsPage />} />
                <Route path="waste"       element={<WastePage />} />
                <Route path="collections" element={<CollectionsPage />} />
                <Route path="vehicles"    element={<VehiclesPage />} />
                <Route path="routes"      element={<RoutesPage />} />
                <Route path="recycling"   element={<RecyclingPage />} />
                <Route path="alerts"      element={<AlertsPage />} />
                <Route path="analytics"   element={<AnalyticsPage />} />
                <Route path="residents"   element={<ResidentsPage />} />
                <Route path="environment" element={<EnvironmentPage />} />
                <Route path="reports"     element={<ReportsPage />} />
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
