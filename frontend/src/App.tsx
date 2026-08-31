import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';

import AppShellV2 from './components/layout/AppShellV2';
import LoginPageNew from './pages/LoginNew';
import ForcePasswordChange from './pages/ForcePasswordChange';
import CompleteProfile from './pages/CompleteProfile';
import DashboardRouter from './pages/DashboardRouter';
import StaffManagement from './pages/StaffManagement';
import LocalHubsPage from './pages/LocalHubsPage';
import RecyclingHubsPage from './pages/RecyclingHubsPage';
import VehiclesPage from './pages/VehiclesPage';
import DispatchBoard from './pages/DispatchBoard';
import PickupRequestsPage from './pages/PickupRequestsPage';
import AlertsPageV2 from './pages/AlertsPageV2';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 3000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/force-password-change" replace />;
  if (user.role === 'RESIDENT' && !user.profileComplete) return <Navigate to="/complete-profile" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { token, user } = useAuthStore();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={token && user ? <Navigate to="/" replace /> : <LoginPageNew />} />
          <Route path="/force-password-change" element={token ? <ForcePasswordChange /> : <Navigate to="/login" replace />} />
          <Route path="/complete-profile" element={token ? <CompleteProfile /> : <Navigate to="/login" replace />} />

          <Route path="/" element={<ProtectedRoute><AppShellV2 /></ProtectedRoute>}>
            <Route index element={<DashboardRouter />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="hubs" element={<LocalHubsPage />} />
            <Route path="recycling-hubs" element={<RecyclingHubsPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="transfers" element={<DispatchBoard />} />
            <Route path="pickups" element={<PickupRequestsPage />} />
            <Route path="alerts" element={<AlertsPageV2 />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </motion.div>
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
