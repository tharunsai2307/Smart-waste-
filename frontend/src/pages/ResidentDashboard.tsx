import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, pickupsApi } from '../services/api2';
import { Card, StatCard, Badge, EmptyState, PrimaryButton, SecondaryButton, Input, Select } from '../components/ui';
import type { WasteType } from '../types/api';
import { Leaf, PhoneCall, AlertTriangle } from 'lucide-react';

const WASTE_TYPES: WasteType[] = ['MIXED', 'PLASTIC', 'PAPER', 'METAL', 'E_WASTE', 'BIODEGRADABLE', 'HAZARDOUS'];

const ResidentDashboard: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard-resident'], queryFn: dashboardApi.resident, refetchInterval: 10000 });

  const [form, setForm] = useState({ addressLine: '', wasteType: 'MIXED' as WasteType, estimatedKg: '5', notes: '' });
  const [showForm, setShowForm] = useState<'ON_DEMAND' | 'MISSED_REPORT' | null>(null);

  const createMutation = useMutation({
    mutationFn: () => pickupsApi.create({
      requestType: showForm || 'ON_DEMAND',
      wasteType: form.wasteType,
      estimatedKg: Number(form.estimatedKg) || 5,
      notes: form.notes || undefined,
      addressLine: form.addressLine,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-resident'] });
      setShowForm(null);
      setForm({ addressLine: '', wasteType: 'MIXED', estimatedKg: '5', notes: '' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => pickupsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-resident'] }),
  });

  if (isLoading) return <div className="text-slate-400 text-sm">Loading…</div>;
  if (!data) return null;

  const { profile, recentCollections, activeRequests } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">My Pickups</h1>
        <p className="text-xs text-slate-500 mt-1">Request collection, report a missed pickup, and track your recycling impact.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Eco points" value={profile?.eco_points ?? 0} accent="#34d399" />
        <StatCard label="Total recycled" value={`${(profile?.total_kg_recycled ?? 0).toFixed(1)}kg`} accent="#22d3ee" />
        <StatCard label="Active requests" value={activeRequests.length} accent="#fbbf24" />
      </div>

      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={() => setShowForm('ON_DEMAND')} className="flex items-center gap-1.5"><PhoneCall size={14} /> Call for a cleaner now</PrimaryButton>
        <SecondaryButton onClick={() => setShowForm('MISSED_REPORT')} className="flex items-center gap-1.5 !text-rose-300 !border-rose-500/30"><AlertTriangle size={14} /> Report a missed pickup</SecondaryButton>
      </div>

      {showForm && (
        <Card>
          <div className="text-white font-semibold text-sm mb-3">{showForm === 'MISSED_REPORT' ? 'Report a missed pickup' : 'Request an on-demand pickup'}</div>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Your address" value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} required className="md:col-span-2" />
            <Select value={form.wasteType} onChange={(e) => setForm({ ...form, wasteType: e.target.value as WasteType })}>
              {WASTE_TYPES.map((w) => <option key={w} value={w}>{w.replace(/_/g, ' ')}</option>)}
            </Select>
            <Input placeholder="Estimated kg" type="number" value={form.estimatedKg} onChange={(e) => setForm({ ...form, estimatedKg: e.target.value })} />
            <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="md:col-span-2" />
            <div className="md:col-span-2 flex gap-2">
              <PrimaryButton type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Submitting…' : 'Submit request'}</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setShowForm(null)}>Cancel</SecondaryButton>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="text-white font-semibold text-sm mb-4">Active requests</div>
        {activeRequests.length === 0 ? <EmptyState message="No active requests" /> : (
          <div className="space-y-2">
            {activeRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <div className="text-sm text-white">{r.waste_type.replace(/_/g, ' ')} · {r.address_line}</div>
                  <div className="text-[11px] text-slate-500">{r.request_type.replace(/_/g, ' ')} · created {new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={r.status} />
                  {r.status === 'PENDING' && <button onClick={() => cancelMutation.mutate(r.id)} className="text-[11px] text-rose-400 hover:underline">Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-white font-semibold text-sm mb-4"><Leaf size={16} className="text-emerald-400" /> Recent collections</div>
        {recentCollections.length === 0 ? <EmptyState message="No collections logged yet" /> : (
          <div className="space-y-2">
            {recentCollections.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/5">
                <span className="text-slate-300">{c.waste_type.replace(/_/g, ' ')} · {new Date(c.collected_at).toLocaleDateString()}</span>
                <span className="text-white font-mono">{c.weight_kg}kg (+{c.eco_points_awarded} pts)</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ResidentDashboard;
