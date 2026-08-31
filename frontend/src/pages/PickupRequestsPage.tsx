import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pickupsApi, usersApi } from '../services/api2';
import { Card, Badge, EmptyState, PrimaryButton, SecondaryButton, Select } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

const PickupRequestsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['pickups'], queryFn: () => pickupsApi.list(), refetchInterval: 10000 });
  const { data: cleaners } = useQuery({
    queryKey: ['hub-cleaners', user?.localHubId],
    queryFn: () => usersApi.hubCleaners(user!.localHubId as number),
    enabled: !!user?.localHubId && (user?.role === 'LOCAL_HUB_MANAGER' || user?.role === 'ADMIN'),
  });

  const [picks, setPicks] = useState<Record<number, string>>({});

  const assignMutation = useMutation({
    mutationFn: ({ id, cleanerId }: { id: number; cleanerId: number }) => pickupsApi.assign(id, cleanerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pickups'] }),
  });

  const escalateMutation = useMutation({
    mutationFn: pickupsApi.escalate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pickups'] }); qc.invalidateQueries({ queryKey: ['activeAlerts'] }); },
  });

  const requests = data?.requests || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">Pickup Requests</h1>
          <p className="text-xs text-slate-500 mt-1">Ordered by dispatch priority. Missed SLAs auto-escalate into urgent follow-ups.</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'LOCAL_HUB_MANAGER' || user?.role === 'RECYCLING_MANAGER') && (
          <SecondaryButton onClick={() => escalateMutation.mutate()} disabled={escalateMutation.isPending} className="flex items-center gap-1.5">
            <RefreshCcw size={13} /> Run missed-pickup sweep
          </SecondaryButton>
        )}
      </div>

      {escalateMutation.data && escalateMutation.data.escalatedCount > 0 && (
        <div className="p-3 rounded-lg text-amber-300 text-xs flex items-center gap-2" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <AlertOctagon size={14} /> {escalateMutation.data.escalatedCount} request(s) missed their SLA and were escalated with a new urgent follow-up.
        </div>
      )}

      {isLoading ? <div className="text-slate-400 text-sm">Loading…</div> : requests.length === 0 ? (
        <EmptyState message="No pickup requests" />
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <Card key={r.id} className={r.request_type === 'MISSED_REPORT' ? 'border border-rose-500/30' : ''}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-semibold">#{r.id} · {r.waste_type.replace(/_/g, ' ')}</span>
                    <Badge status={r.status} />
                    {r.request_type === 'MISSED_REPORT' && <Badge status="CRITICAL">ESCALATED L{r.escalation_level}</Badge>}
                    {r.request_type === 'ON_DEMAND' && <Badge status="HIGH">ON-DEMAND</Badge>}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{r.address_line}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Priority score: {r.priority_score} · Est. {r.estimated_kg}kg · SLA due {r.sla_due_at ? new Date(r.sla_due_at).toLocaleString() : '—'}</div>
                </div>
                {(user?.role === 'LOCAL_HUB_MANAGER' || user?.role === 'ADMIN') && (r.status === 'PENDING' || r.status === 'ASSIGNED') && (
                  <div className="flex items-center gap-2">
                    <Select value={picks[r.id] || String(r.assigned_cleaner_id || '')} onChange={(e) => setPicks({ ...picks, [r.id]: e.target.value })} className="!w-auto min-w-[140px]">
                      <option value="">Assign cleaner</option>
                      {cleaners?.cleaners.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <PrimaryButton
                      disabled={!picks[r.id] || assignMutation.isPending}
                      onClick={() => assignMutation.mutate({ id: r.id, cleanerId: Number(picks[r.id]) })}
                    >
                      Assign
                    </PrimaryButton>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PickupRequestsPage;
