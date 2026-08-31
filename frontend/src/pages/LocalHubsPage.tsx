import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hubsApi, usersApi, transfersApi } from '../services/api2';
import { Card, PrimaryButton, Input, ProgressBar, EmptyState } from '../components/ui';
import QrDisplay from '../components/QrDisplay';
import { useAuthStore } from '../store/authStore';
import { Plus, Send, QrCode } from 'lucide-react';

const LocalHubsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['local-hubs'], queryFn: hubsApi.listLocal, refetchInterval: 10000 });
  const { data: managers } = useQuery({ queryKey: ['lhm-managers'], queryFn: () => usersApi.list('LOCAL_HUB_MANAGER'), enabled: user?.role === 'ADMIN' });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', area: '', capacityKg: '1000', managerId: '' });
  const [qrHub, setQrHub] = useState<{ name: string; qr: string } | null>(null);

  const createMutation = useMutation({
    mutationFn: () => hubsApi.createLocal({
      name: form.name, address: form.address || undefined, area: form.area || undefined,
      capacityKg: Number(form.capacityKg), managerId: form.managerId ? Number(form.managerId) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['local-hubs'] }); setShowCreate(false); setForm({ name: '', address: '', area: '', capacityKg: '1000', managerId: '' }); },
  });

  const requestTransferMutation = useMutation({
    mutationFn: (hubId: number) => transfersApi.request({ localHubId: hubId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }),
  });

  const hubs = data?.hubs || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Local Collection Hubs</h1>
          <p className="text-xs text-slate-500 mt-1">Where cleaners drop off resident waste. Fill level updates in real time from logged collections.</p>
        </div>
        {user?.role === 'ADMIN' && (
          <PrimaryButton onClick={() => setShowCreate((s) => !s)} className="flex items-center gap-1.5"><Plus size={14} /> New hub</PrimaryButton>
        )}
      </div>

      {showCreate && (
        <Card>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Hub name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="Capacity (kg)" type="number" value={form.capacityKg} onChange={(e) => setForm({ ...form, capacityKg: e.target.value })} required />
            <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} className="w-full px-3 py-2.5 rounded-lg text-white text-sm bg-white/5 border border-white/10 md:col-span-2">
              <option value="">Assign hub manager (optional)</option>
              {managers?.users.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.username})</option>)}
            </select>
            <PrimaryButton type="submit" disabled={createMutation.isPending} className="md:col-span-2 py-2.5">{createMutation.isPending ? 'Creating…' : 'Create hub'}</PrimaryButton>
          </form>
        </Card>
      )}

      {isLoading ? <div className="text-slate-400 text-sm">Loading hubs…</div> : hubs.length === 0 ? (
        <EmptyState message="No local hubs yet" hint={user?.role === 'ADMIN' ? 'Create the first one above.' : 'Ask your administrator to set one up.'} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {hubs.map((h) => {
            const pct = h.capacity_kg > 0 ? (h.current_load_kg / h.capacity_kg) * 100 : 0;
            const critical = pct >= h.critical_pct;
            return (
              <Card key={h.id} className={critical ? 'border border-rose-500/40' : ''}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-semibold text-sm">{h.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{h.code} {h.area ? `· ${h.area}` : ''}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Manager: {h.manager_name || 'Unassigned'} · Cleaners: {h.cleaner_count ?? 0}</div>
                  </div>
                  <button onClick={() => setQrHub({ name: h.name, qr: h.qr_code })} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300" title="Show hub QR">
                    <QrCode size={15} />
                  </button>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{h.current_load_kg}kg / {h.capacity_kg}kg</span>
                  <span className={critical ? 'text-rose-400 font-bold' : 'text-slate-400'}>{pct.toFixed(0)}%</span>
                </div>
                <ProgressBar pct={pct} warn={h.warning_pct} crit={h.critical_pct} />
                {(user?.role === 'ADMIN' || user?.localHubId === h.id) && pct >= h.warning_pct && (
                  <button
                    onClick={() => requestTransferMutation.mutate(h.id)}
                    disabled={requestTransferMutation.isPending}
                    className="mt-3 w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all disabled:opacity-50"
                  >
                    <Send size={13} /> Ping recycling manager for pickup truck
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {qrHub && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setQrHub(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-3">
            <div className="text-white font-semibold text-sm">{qrHub.name} — Gate QR</div>
            <QrDisplay value={qrHub.qr} size={200} />
            <p className="text-[11px] text-slate-500 text-center max-w-[220px]">Print and post this at the hub gate. Drivers scan it on arrival and again after loading.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalHubsPage;
