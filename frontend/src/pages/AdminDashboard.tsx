import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api2';
import { Card, StatCard, ProgressBar, EmptyState } from '../components/ui';
import { Users, Warehouse, Truck, AlertTriangle } from 'lucide-react';

const ROLE_ICON: Record<string, string> = {
  ADMIN: '🛡️', LOCAL_HUB_MANAGER: '🏭', CLEANER: '🧹', RECYCLING_MANAGER: '♻️', DRIVER: '🚚', RESIDENT: '🏠',
};

const AdminDashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard-admin'], queryFn: dashboardApi.admin, refetchInterval: 15000 });

  if (isLoading) return <div className="text-slate-400 text-sm">Loading system overview…</div>;
  if (error) return <div className="text-red-400 text-sm">Failed to load dashboard: {(error as Error).message}</div>;
  if (!data) return null;

  const totalUsers = data.userCounts.reduce((s: number, r: any) => s + r.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Administrator Overview</h1>
        <p className="text-xs text-slate-500 mt-1">Full-visibility, real-time view across every hub, vehicle, and account — nothing here is simulated.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total accounts" value={totalUsers} accent="#34d399" />
        <StatCard label="Pending pickups" value={data.pendingPickups} accent="#fbbf24" />
        <StatCard label="Active transfers" value={data.activeTransfers} accent="#22d3ee" />
        <StatCard label="Active alerts" value={data.activeAlerts} accent={data.activeAlerts > 0 ? '#f87171' : '#34d399'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-4 text-white font-semibold text-sm"><Users size={16} className="text-emerald-400" /> Accounts by role</div>
          <div className="space-y-2">
            {data.userCounts.map((r: any) => (
              <div key={r.role} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{ROLE_ICON[r.role]} {r.role.replace(/_/g, ' ')}</span>
                <span className="text-white font-mono font-bold">{r.count}</span>
              </div>
            ))}
          </div>
          <Link to="/staff" className="block mt-4 text-xs text-emerald-400 hover:underline">Manage staff & accounts →</Link>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4 text-white font-semibold text-sm"><Truck size={16} className="text-cyan-400" /> Fleet status</div>
          {data.vehicles.length === 0 ? <EmptyState message="No vehicles registered yet" /> : (
            <div className="space-y-2">
              {data.vehicles.map((v: any) => (
                <div key={v.status} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{v.status.replace(/_/g, ' ')}</span>
                  <span className="text-white font-mono font-bold">{v.count}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/vehicles" className="block mt-4 text-xs text-emerald-400 hover:underline">Manage vehicles →</Link>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4 text-white font-semibold text-sm"><Warehouse size={16} className="text-amber-400" /> Local hub capacity</div>
        {data.hubs.length === 0 ? (
          <EmptyState message="No local hubs created yet" hint="Create one from the Local Hubs page." />
        ) : (
          <div className="space-y-4">
            {data.hubs.map((h: any) => {
              const pct = h.capacity_kg > 0 ? (h.current_load_kg / h.capacity_kg) * 100 : 0;
              return (
                <div key={h.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-200 font-medium">{h.name}</span>
                    <span className="text-slate-400 font-mono">{h.current_load_kg}kg / {h.capacity_kg}kg ({pct.toFixed(0)}%)</span>
                  </div>
                  <ProgressBar pct={pct} />
                </div>
              );
            })}
          </div>
        )}
        <Link to="/hubs" className="block mt-4 text-xs text-emerald-400 hover:underline">Manage local hubs →</Link>
      </Card>

      {data.activeAlerts > 0 && (
        <Card className="border border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
            <AlertTriangle size={16} /> {data.activeAlerts} active alert{data.activeAlerts !== 1 ? 's' : ''} need attention
          </div>
          <Link to="/alerts" className="block mt-2 text-xs text-rose-300 hover:underline">Go to Alert Center →</Link>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
