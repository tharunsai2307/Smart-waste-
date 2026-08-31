import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, transfersApi } from '../services/api2';
import { Card, StatCard, ProgressBar, Badge, EmptyState, PrimaryButton } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { Send } from 'lucide-react';

const LocalHubDashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-local-hub', user?.localHubId],
    queryFn: () => dashboardApi.localHub(user?.localHubId || undefined),
    refetchInterval: 10000,
    enabled: !!user,
  });

  const requestTransferMutation = useMutation({
    mutationFn: () => transfersApi.request({ localHubId: user!.localHubId as number }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-local-hub'] }),
  });

  if (!user?.localHubId) return <EmptyState message="You are not yet assigned to a local hub" hint="Ask your administrator to assign you to one." />;
  if (isLoading) return <div className="text-slate-400 text-sm">Loading…</div>;
  if (error) return <div className="text-red-400 text-sm">{(error as Error).message}</div>;
  if (!data) return null;

  const { hub, cleaners, pendingRequests, transfers, fillPct } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">{hub.name}</h1>
          <p className="text-xs text-slate-500 mt-1">{hub.address} {hub.area ? `· ${hub.area}` : ''}</p>
        </div>
        {fillPct >= hub.warning_pct && (
          <PrimaryButton onClick={() => requestTransferMutation.mutate()} disabled={requestTransferMutation.isPending} className="flex items-center gap-1.5">
            <Send size={13} /> Ping recycling manager for pickup
          </PrimaryButton>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Current load" value={`${hub.current_load_kg}kg`} sub={`of ${hub.capacity_kg}kg`} accent={fillPct >= hub.critical_pct ? '#f87171' : '#34d399'} />
        <StatCard label="Fill level" value={`${fillPct}%`} accent={fillPct >= hub.critical_pct ? '#f87171' : fillPct >= hub.warning_pct ? '#fbbf24' : '#34d399'} />
        <StatCard label="Cleaners" value={cleaners.length} accent="#22d3ee" />
        <StatCard label="Pending requests" value={pendingRequests.length} accent="#fbbf24" />
      </div>

      <Card>
        <div className="text-white font-semibold text-sm mb-3">Capacity</div>
        <ProgressBar pct={fillPct} warn={hub.warning_pct} crit={hub.critical_pct} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="text-white font-semibold text-sm mb-4">Cleaner workload</div>
          {cleaners.length === 0 ? <EmptyState message="No cleaners assigned" /> : (
            <div className="space-y-2">
              {cleaners.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-white/5">
                  <span className="text-slate-200">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.active_jobs} active job{c.active_jobs !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="text-white font-semibold text-sm mb-4">Recent transfers</div>
          {transfers.length === 0 ? <EmptyState message="No transfers yet" /> : (
            <div className="space-y-2">
              {transfers.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/5">
                  <span className="text-slate-300">Transfer #{t.id}</span>
                  <Badge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LocalHubDashboard;
