import React from 'react';
import { useAuthStore } from '../store/authStore';
import AdminDashboard from './AdminDashboard';
import LocalHubDashboard from './LocalHubDashboard';
import RecyclingHubDashboard from './RecyclingHubDashboard';
import CleanerDashboard from './CleanerDashboard';
import DriverDashboardV2 from './DriverDashboardV2';
import ResidentDashboard from './ResidentDashboard';

/** Every role lands on "/" and sees a dashboard built for their job — never a generic shell. */
const DashboardRouter: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  switch (user.role) {
    case 'ADMIN': return <AdminDashboard />;
    case 'LOCAL_HUB_MANAGER': return <LocalHubDashboard />;
    case 'RECYCLING_MANAGER': return <RecyclingHubDashboard />;
    case 'CLEANER': return <CleanerDashboard />;
    case 'DRIVER': return <DriverDashboardV2 />;
    case 'RESIDENT': return <ResidentDashboard />;
    default: return null;
  }
};

export default DashboardRouter;
