import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transfersApi, usersApi, vehiclesApi, hubsApi } from '../services/api2';
import { Card, Badge, EmptyState, Select, PrimaryButton } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { Truck, User2 } from 'lucide-react';

const STATUS_FLOW = ['REQUESTED', 'DRIVER_ASSIGNED', 'ON_THE_JOB', 'ARRIVED_AT_HUB', 'LOADED', 'EN_ROUTE', 'ARRIVED_AT_RECYCLING', 'COMPLETED'];

const DispatchBoard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['transfers'], queryFn: transfersApi.list, refetchInterval: 8000 });
  const { data: hubs } = useQuery({ queryKey: ['local-hubs-lite'], queryFn: hubsApi.listLocal });
  const { data: drivers } = useQuery({ queryKey: ['available-drivers'], queryFn: usersApi.drivers, enabled: user?.role === 'ADMIN' || user?.role === 'RECYCLING_MANAGER' });
  const { data: vehicles } = useQuery({ queryKey: ['idle-vehicles'], queryFn: vehiclesApi.list, enabled: user?.role === 'ADMIN' || user?.role === 'RECYCLING_MANAGER' });

  const [assignPicks, setAssignPicks] = useState<Record<number, { driverId: string; vehicleId: string }>>({});

  const assignMutation = useMutation({
    mutationFn: ({ id, driverId, vehicleId }: { id: number; driverId: number; vehicleId: number }) => transfersApi.assign(id, { driverId, vehicleId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }),
  });

  const transfers = data?.transfers || [];
  const hubById = new Map((hubs?.hubs || []).map((h) => [h.id, h]));
  const canAssign = user?.role === 'ADMIN' || user?.role === 'RECYCLING_MANAGER';
  const availableDrivers = (drivers?.drivers || []).filter((d) => d.availability === 'AVAILABLE');
  const idleVehicles = (vehicles?.vehicles || []).filter((v) => v.status === 'IDLE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dispatch Board</h1>
        <p className="text-xs text-slate-500 mt-1">Full visibility: who is collecting from whom, who's assigned, and who has completed the job.</p>
      </div>

      {isLoading ? <div className="text-slate-400 text-sm">Loading…</div> : transfers.length === 0 ? (
        <EmptyState message="No transfers yet" hint="Local hub managers request a truck when their hub nears capacity." />
      ) : (
        <div className="space-y-3">
          {transfers.map((t) => {
            const hub = hubById.get(t.local_hub_id);
            const stepIdx = STATUS_FLOW.indexOf(t.status);
            const pick = assignPicks[t.id] || { driverId: '', vehicleId: '' };
            return (
              <Card key={t.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="text-sm text-white font-semibold">
                    Transfer #{t.id} — {hub?.name || `Hub ${t.local_hub_id}`} <span className="text-slate-500">→</span> {t.recycling_hub_name || 'Recycling facility'}
                  </div>
                  <Badge status={t.status} />
                </div>

                {/* Progress rail */}
                <div className="flex items-center gap-1 mb-3">
                  {STATUS_FLOW.map((s, i) => (
                    <div key={s} className="flex-1 h-1.5 rounded-full" style={{ background: i <= stepIdx ? '#34d399' : 'rgba(255,255,255,0.08)' }} title={s} />
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-400 mb-2">
                  <div>Planned: <span className="text-white font-mono">{t.planned_weight_kg ?? '—'}kg</span></div>
                  <div>Loaded: <span className="text-white font-mono">{t.loaded_weight_kg ?? '—'}kg</span></div>
                  <div>Received: <span className="text-white font-mono">{t.received_weight_kg ?? '—'}kg</span></div>
                  <div className="flex items-center gap-1"><User2 size={12} /> Driver: <span className="text-white">{t.driver_id ? `#${t.driver_id}` : 'Unassigned'}</span></div>
                </div>

                {t.status === 'REQUESTED' && canAssign && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                    <Select value={pick.driverId} onChange={(e) => setAssignPicks({ ...assignPicks, [t.id]: { ...pick, driverId: e.target.value } })} className="!w-auto min-w-[160px]">
                      <option value="">Select driver</option>
                      {availableDrivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                    <Select value={pick.vehicleId} onChange={(e) => setAssignPicks({ ...assignPicks, [t.id]: { ...pick, vehicleId: e.target.value } })} className="!w-auto min-w-[160px]">
                      <option value="">Select vehicle</option>
                      {idleVehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_number} ({v.capacity_kg}kg)</option>)}
                    </Select>
                    <PrimaryButton
                      disabled={!pick.driverId || !pick.vehicleId || assignMutation.isPending}
                      onClick={() => assignMutation.mutate({ id: t.id, driverId: Number(pick.driverId), vehicleId: Number(pick.vehicleId) })}
                      className="flex items-center gap-1.5"
                    >
                      <Truck size={13} /> Assign
                    </PrimaryButton>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DispatchBoard;
