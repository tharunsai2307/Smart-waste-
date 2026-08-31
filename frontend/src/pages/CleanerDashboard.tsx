import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pickupsApi, collectionsApi } from '../services/api2';
import { Card, StatCard, Badge, EmptyState, PrimaryButton, Input, Select } from '../components/ui';
import type { WasteType } from '../types/api';
import { Weight, CheckCircle2 } from 'lucide-react';

const WASTE_TYPES: WasteType[] = ['MIXED', 'PLASTIC', 'PAPER', 'METAL', 'E_WASTE', 'BIODEGRADABLE', 'HAZARDOUS'];

const CleanerDashboard: React.FC = () => {
  const qc = useQueryClient();
  const { data: pickups } = useQuery({ queryKey: ['my-pickups'], queryFn: () => pickupsApi.list(), refetchInterval: 10000 });
  const { data: collections } = useQuery({ queryKey: ['my-collections'], queryFn: collectionsApi.list });

  const [logForm, setLogForm] = useState<{ pickupRequestId?: number; wasteType: WasteType; weightKg: string }>({ wasteType: 'MIXED', weightKg: '' });

  const logMutation = useMutation({
    mutationFn: () => collectionsApi.log({
      pickupRequestId: logForm.pickupRequestId,
      wasteType: logForm.wasteType,
      weightKg: Number(logForm.weightKg),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-pickups'] });
      qc.invalidateQueries({ queryKey: ['my-collections'] });
      setLogForm({ wasteType: 'MIXED', weightKg: '' });
    },
  });

  const assigned = (pickups?.requests || []).filter((r) => r.status === 'ASSIGNED');
  const todayKg = (collections?.collections || [])
    .filter((c) => new Date(c.collected_at).toDateString() === new Date().toDateString())
    .reduce((sum, c) => sum + Number(c.weight_kg), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Field Operations</h1>
        <p className="text-xs text-slate-500 mt-1">Collect from residents, drop off at your local hub, log every real weight.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Assigned jobs" value={assigned.length} accent="#22d3ee" />
        <StatCard label="Collected today" value={`${todayKg.toFixed(1)}kg`} accent="#34d399" />
      </div>

      <Card>
        <div className="text-white font-semibold text-sm mb-4">Assigned pickups</div>
        {assigned.length === 0 ? <EmptyState message="No assigned pickups right now" /> : (
          <div className="space-y-2">
            {assigned.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <div className="text-sm text-white">{r.address_line}</div>
                  <div className="text-[11px] text-slate-500">{r.waste_type.replace(/_/g, ' ')} · est. {r.estimated_kg}kg</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={r.status} />
                  <button
                    onClick={() => setLogForm({ pickupRequestId: r.id, wasteType: r.waste_type, weightKg: '' })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                  >
                    Log collection
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-white font-semibold text-sm mb-4"><Weight size={16} className="text-emerald-400" /> Log a collection at your hub</div>
        <form onSubmit={(e) => { e.preventDefault(); logMutation.mutate(); }} className="grid md:grid-cols-3 gap-3">
          <Select value={logForm.wasteType} onChange={(e) => setLogForm({ ...logForm, wasteType: e.target.value as WasteType })}>
            {WASTE_TYPES.map((w) => <option key={w} value={w}>{w.replace(/_/g, ' ')}</option>)}
          </Select>
          <Input placeholder="Real weight (kg)" type="number" step="0.1" value={logForm.weightKg} onChange={(e) => setLogForm({ ...logForm, weightKg: e.target.value })} required />
          <PrimaryButton type="submit" disabled={logMutation.isPending || !logForm.weightKg} className="flex items-center justify-center gap-1.5">
            <CheckCircle2 size={14} /> {logMutation.isPending ? 'Logging…' : 'Log real weight'}
          </PrimaryButton>
        </form>
        {logForm.pickupRequestId && <div className="text-[11px] text-slate-500 mt-2">Linked to pickup #{logForm.pickupRequestId}</div>}
        {logMutation.data && (
          <div className="mt-3 p-3 rounded-lg text-xs text-emerald-200" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
            Logged {logMutation.data.collection.weight_kg}kg. Hub now at {logMutation.data.fillPct}% capacity.
          </div>
        )}
      </Card>
    </div>
  );
};

export default CleanerDashboard;
