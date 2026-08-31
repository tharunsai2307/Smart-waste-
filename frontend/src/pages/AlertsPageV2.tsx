import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../services/api2';
import { Card, Badge, EmptyState, SecondaryButton } from '../components/ui';

const TABS: { key: string; label: string }[] = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { key: 'RESOLVED', label: 'Resolved' },
];

const AlertsPageV2: React.FC = () => {
  const [tab, setTab] = useState('ACTIVE');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['alerts', tab], queryFn: () => alertsApi.list(tab), refetchInterval: 10000 });

  const ackMutation = useMutation({ mutationFn: alertsApi.acknowledge, onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }) });
  const resolveMutation = useMutation({ mutationFn: alertsApi.resolve, onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); qc.invalidateQueries({ queryKey: ['activeAlerts'] }); } });

  const alerts = data?.alerts || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Alert Center</h1>
        <p className="text-xs text-slate-500 mt-1">Every alert here is triggered by real thresholds — hub capacity, missed SLAs, weight variance.</p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.key ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? <div className="text-slate-400 text-sm">Loading…</div> : alerts.length === 0 ? (
        <EmptyState message={`No ${tab.toLowerCase()} alerts`} />
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={a.severity} />
                    <span className="text-[11px] text-slate-500 font-mono">{a.type}</span>
                  </div>
                  <div className="text-sm text-slate-200">{a.message}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                {tab === 'ACTIVE' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <SecondaryButton onClick={() => ackMutation.mutate(a.id)}>Acknowledge</SecondaryButton>
                    <SecondaryButton onClick={() => resolveMutation.mutate(a.id)}>Resolve</SecondaryButton>
                  </div>
                )}
                {tab === 'ACKNOWLEDGED' && <SecondaryButton onClick={() => resolveMutation.mutate(a.id)}>Resolve</SecondaryButton>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPageV2;
