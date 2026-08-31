import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hubsApi, usersApi, recyclingApi } from '../services/api2';
import { Card, PrimaryButton, Input, EmptyState } from '../components/ui';
import QrDisplay from '../components/QrDisplay';
import { useAuthStore } from '../store/authStore';
import { Plus, QrCode, TrendingUp } from 'lucide-react';

const RecyclingHubsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['recycling-hubs'], queryFn: hubsApi.listRecycling });
  const { data: managers } = useQuery({ queryKey: ['rm-managers'], queryFn: () => usersApi.list('RECYCLING_MANAGER'), enabled: user?.role === 'ADMIN' });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', dailyCapacityKg: '5000', managerId: '' });
  const [qrHub, setQrHub] = useState<{ name: string; qr: string } | null>(null);

  const createMutation = useMutation({
    mutationFn: () => hubsApi.createRecycling({
      name: form.name, address: form.address || undefined,
      dailyCapacityKg: Number(form.dailyCapacityKg), managerId: form.managerId ? Number(form.managerId) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recycling-hubs'] }); setShowCreate(false); setForm({ name: '', address: '', dailyCapacityKg: '5000', managerId: '' }); },
  });

  const hubs = data?.hubs || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Recycling Facilities</h1>
          <p className="text-xs text-slate-500 mt-1">Where trucks deliver hub waste for classification and processing.</p>
        </div>
        {user?.role === 'ADMIN' && (
          <PrimaryButton onClick={() => setShowCreate((s) => !s)} className="flex items-center gap-1.5"><Plus size={14} /> New facility</PrimaryButton>
        )}
      </div>

      {showCreate && (
        <Card>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Facility name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="Daily capacity (kg)" type="number" value={form.dailyCapacityKg} onChange={(e) => setForm({ ...form, dailyCapacityKg: e.target.value })} required />
            <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-white text-sm bg-white/5 border border-white/10">
              <option value="">Assign recycling manager (optional)</option>
              {managers?.users.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.username})</option>)}
            </select>
            <PrimaryButton type="submit" disabled={createMutation.isPending} className="md:col-span-2 py-2.5">{createMutation.isPending ? 'Creating…' : 'Create facility'}</PrimaryButton>
          </form>
        </Card>
      )}

      {isLoading ? <div className="text-slate-400 text-sm">Loading…</div> : hubs.length === 0 ? (
        <EmptyState message="No recycling facilities yet" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {hubs.map((h) => <RecyclingHubCard key={h.id} hub={h} onShowQr={() => setQrHub({ name: h.name, qr: h.qr_code })} />)}
        </div>
      )}

      {qrHub && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setQrHub(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-3">
            <div className="text-white font-semibold text-sm">{qrHub.name} — Gate QR</div>
            <QrDisplay value={qrHub.qr} size={200} />
            <p className="text-[11px] text-slate-500 text-center max-w-[220px]">Drivers scan this on arrival to mark the transfer as delivered.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const RecyclingHubCard: React.FC<{ hub: any; onShowQr: () => void }> = ({ hub, onShowQr }) => {
  const { data: stats } = useQuery({ queryKey: ['recycling-stats', hub.id], queryFn: () => recyclingApi.hubStats(hub.id) });
  const totals = stats?.totals;
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-white font-semibold text-sm">{hub.name}</div>
          <div className="text-[11px] text-slate-500 font-mono">{hub.code}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Manager: {hub.manager_name || 'Unassigned'}</div>
        </div>
        <button onClick={onShowQr} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300" title="Show gate QR"><QrCode size={15} /></button>
      </div>
      <div className="text-[11px] text-slate-400 mb-1">Daily capacity: {hub.daily_capacity_kg}kg</div>
      {totals && (
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div className="p-2 rounded-lg bg-white/5"><div className="text-slate-500">Total received</div><div className="text-white font-bold">{Number(totals.total_input_kg).toFixed(0)}kg</div></div>
          <div className="p-2 rounded-lg bg-white/5"><div className="text-slate-500">Recovered</div><div className="text-emerald-400 font-bold">{Number(totals.total_recovered_kg).toFixed(0)}kg</div></div>
          <div className="p-2 rounded-lg bg-white/5"><div className="text-slate-500">Residual</div><div className="text-amber-400 font-bold">{Number(totals.total_residual_kg).toFixed(0)}kg</div></div>
          <div className="p-2 rounded-lg bg-white/5"><div className="text-slate-500 flex items-center gap-1"><TrendingUp size={11} /> Batches</div><div className="text-white font-bold">{totals.batch_count}</div></div>
        </div>
      )}
    </Card>
  );
};

export default RecyclingHubsPage;
