import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi, hubsApi } from '../services/api2';
import { Card, PrimaryButton, Input, Select, Badge, EmptyState } from '../components/ui';
import QrDisplay from '../components/QrDisplay';
import { useAuthStore } from '../store/authStore';
import { Plus, QrCode } from 'lucide-react';

const TYPES = ['MINI_TRUCK', 'COMPACTOR', 'TIPPER', 'E_RICKSHAW'];

const VehiclesPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: vehiclesApi.list, refetchInterval: 15000 });
  const { data: recyclingHubs } = useQuery({ queryKey: ['recycling-hubs-lite'], queryFn: hubsApi.listRecycling });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ plateNumber: '', vehicleType: 'MINI_TRUCK', capacityKg: '1000', homeRecyclingHubId: '' });
  const [qrVeh, setQrVeh] = useState<{ plate: string; qr: string } | null>(null);
  const [editing, setEditing] = useState<{ id: number; capacityKg: string } | null>(null);

  const createMutation = useMutation({
    mutationFn: () => vehiclesApi.create({
      plateNumber: form.plateNumber, vehicleType: form.vehicleType, capacityKg: Number(form.capacityKg),
      homeRecyclingHubId: form.homeRecyclingHubId ? Number(form.homeRecyclingHubId) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); setShowCreate(false); setForm({ plateNumber: '', vehicleType: 'MINI_TRUCK', capacityKg: '1000', homeRecyclingHubId: '' }); },
  });

  const updateCapacityMutation = useMutation({
    mutationFn: ({ id, capacityKg }: { id: number; capacityKg: number }) => vehiclesApi.update(id, { capacityKg }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); setEditing(null); },
  });

  const vehicles = data?.vehicles || [];
  const canManage = user?.role === 'ADMIN' || user?.role === 'RECYCLING_MANAGER' || user?.role === 'LOCAL_HUB_MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Fleet & Vehicles</h1>
          <p className="text-xs text-slate-500 mt-1">Load capacity is enforced during hub loading — drivers cannot log more than a vehicle can carry.</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'RECYCLING_MANAGER') && (
          <PrimaryButton onClick={() => setShowCreate((s) => !s)} className="flex items-center gap-1.5"><Plus size={14} /> Register vehicle</PrimaryButton>
        )}
      </div>

      {showCreate && (
        <Card>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Plate number" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} required />
            <Select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </Select>
            <Input placeholder="Capacity (kg)" type="number" value={form.capacityKg} onChange={(e) => setForm({ ...form, capacityKg: e.target.value })} required />
            <Select value={form.homeRecyclingHubId} onChange={(e) => setForm({ ...form, homeRecyclingHubId: e.target.value })}>
              <option value="">Home recycling hub (optional)</option>
              {recyclingHubs?.hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
            <PrimaryButton type="submit" disabled={createMutation.isPending} className="md:col-span-2 py-2.5">{createMutation.isPending ? 'Registering…' : 'Register vehicle'}</PrimaryButton>
          </form>
        </Card>
      )}

      {isLoading ? <div className="text-slate-400 text-sm">Loading…</div> : vehicles.length === 0 ? (
        <EmptyState message="No vehicles registered yet" />
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Card key={v.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-white font-semibold text-sm font-mono">{v.plate_number}</div>
                  <div className="text-[11px] text-slate-500">{v.vehicle_type.replace(/_/g, ' ')}</div>
                </div>
                <button onClick={() => setQrVeh({ plate: v.plate_number, qr: v.qr_code })} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"><QrCode size={14} /></button>
              </div>
              <Badge status={v.status} />
              <div className="mt-3 text-xs text-slate-400 space-y-1">
                {editing?.id === v.id ? (
                  <div className="flex items-center gap-2">
                    <Input type="number" value={editing.capacityKg} onChange={(e) => setEditing({ id: v.id, capacityKg: e.target.value })} className="!py-1.5" />
                    <button onClick={() => updateCapacityMutation.mutate({ id: v.id, capacityKg: Number(editing.capacityKg) })} className="text-emerald-400 text-[11px]">Save</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>Capacity: <span className="text-white font-mono">{v.capacity_kg}kg</span></span>
                    {canManage && <button onClick={() => setEditing({ id: v.id, capacityKg: String(v.capacity_kg) })} className="text-emerald-400 text-[11px]">Edit</button>}
                  </div>
                )}
                <div>Current load: <span className="text-white font-mono">{v.current_load_kg}kg</span></div>
                <div>Lifetime hauled: <span className="text-white font-mono">{Number(v.total_kg_hauled).toFixed(0)}kg</span> over {v.total_trips} trips</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {qrVeh && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setQrVeh(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-3">
            <div className="text-white font-semibold text-sm">{qrVeh.plate} — Vehicle QR</div>
            <QrDisplay value={qrVeh.qr} size={200} />
            <p className="text-[11px] text-slate-500 text-center max-w-[220px]">The assigned driver scans this to go "on the job."</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesPage;
