import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, transfersApi, recyclingApi } from '../services/api2';
import { Card, StatCard, Badge, EmptyState, PrimaryButton, Input, Select } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import type { WasteType } from '../types/api';
import { PackageCheck, Recycle } from 'lucide-react';

const WASTE_TYPES: WasteType[] = ['PLASTIC', 'PAPER', 'METAL', 'E_WASTE', 'BIODEGRADABLE', 'HAZARDOUS', 'MIXED'];

const RecyclingHubDashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-recycling-hub', user?.recyclingHubId],
    queryFn: () => dashboardApi.recyclingHub(user?.recyclingHubId || undefined),
    refetchInterval: 10000,
    enabled: !!user,
  });
  const { data: batches } = useQuery({ queryKey: ['recycling-batches'], queryFn: recyclingApi.listBatches, enabled: !!user });

  const [receiveInputs, setReceiveInputs] = useState<Record<number, string>>({});
  const [classifyForm, setClassifyForm] = useState<{ batchId: number | null; rows: { category: WasteType; weightKg: string; marketRatePerKg: string }[] }>({ batchId: null, rows: [] });
  const [processForm, setProcessForm] = useState<{ batchId: number | null; processed: string; recovered: string; residual: string }>({ batchId: null, processed: '', recovered: '', residual: '' });

  const receiveMutation = useMutation({
    mutationFn: ({ id, kg }: { id: number; kg: number }) => transfersApi.receive(id, kg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-recycling-hub'] }),
  });

  const createBatchMutation = useMutation({
    mutationFn: (transferId: number) => recyclingApi.createBatch({ recyclingHubId: user!.recyclingHubId as number, transferId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recycling-batches'] }),
  });

  const classifyMutation = useMutation({
    mutationFn: () => recyclingApi.classify(classifyForm.batchId as number, classifyForm.rows.filter((r) => r.weightKg).map((r) => ({ category: r.category, weightKg: Number(r.weightKg), marketRatePerKg: Number(r.marketRatePerKg || 0) }))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recycling-batches'] }); setClassifyForm({ batchId: null, rows: [] }); },
  });

  const processMutation = useMutation({
    mutationFn: () => recyclingApi.process(processForm.batchId as number, { processedWeightKg: Number(processForm.processed), recoveredWeightKg: Number(processForm.recovered), residualWeightKg: Number(processForm.residual) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recycling-batches'] }); setProcessForm({ batchId: null, processed: '', recovered: '', residual: '' }); },
  });

  if (isLoading) return <div className="text-slate-400 text-sm">Loading…</div>;
  if (!data) return null;

  const { inbound, availableDrivers, idleVehicles, recentBatches } = data;
  const allBatches = batches?.batches || recentBatches || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Recycle Commander</h1>
        <p className="text-xs text-slate-500 mt-1">Every kilogram here is manually confirmed or scale-logged — no simulated numbers.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Inbound transfers" value={inbound.length} accent="#22d3ee" />
        <StatCard label="Available drivers" value={availableDrivers.length} accent="#34d399" />
        <StatCard label="Idle vehicles" value={idleVehicles.length} accent="#94a3b8" />
        <StatCard label="Batches logged" value={allBatches.length} accent="#f472b6" />
      </div>

      <Card>
        <div className="text-white font-semibold text-sm mb-4">Inbound / in-progress transfers</div>
        {inbound.length === 0 ? <EmptyState message="No transfers in progress" /> : (
          <div className="space-y-3">
            {inbound.map((t: any) => (
              <div key={t.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">Transfer #{t.id}</span>
                  <Badge status={t.status} />
                </div>
                {t.status === 'ARRIVED_AT_RECYCLING' && (
                  <div className="flex items-center gap-2">
                    <Input placeholder="Received weight (kg)" type="number" step="0.1" value={receiveInputs[t.id] || ''} onChange={(e) => setReceiveInputs({ ...receiveInputs, [t.id]: e.target.value })} />
                    <PrimaryButton
                      disabled={!receiveInputs[t.id] || receiveMutation.isPending}
                      onClick={() => receiveMutation.mutate({ id: t.id, kg: Number(receiveInputs[t.id]) })}
                      className="flex items-center gap-1.5 flex-shrink-0"
                    >
                      <PackageCheck size={13} /> Confirm receipt
                    </PrimaryButton>
                  </div>
                )}
                {t.status === 'COMPLETED' && !allBatches.some((b: any) => b.transfer_id === t.id) && (
                  <button onClick={() => createBatchMutation.mutate(t.id)} className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
                    <Recycle size={12} /> Create recycling batch from this transfer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="text-white font-semibold text-sm mb-4">Recycling batches</div>
        {allBatches.length === 0 ? <EmptyState message="No batches yet" /> : (
          <div className="space-y-3">
            {allBatches.map((b: any) => (
              <div key={b.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-mono">{b.batch_code}</span>
                  <Badge status={b.status} />
                </div>
                <div className="text-xs text-slate-400 mb-2">Input: {b.input_weight_kg}kg {b.status !== 'RECEIVED' && `· Recovered ${b.recovered_weight_kg}kg · Residual ${b.residual_weight_kg}kg`}</div>

                {b.status === 'RECEIVED' && (
                  <button onClick={() => setClassifyForm({ batchId: b.id, rows: [{ category: 'PLASTIC', weightKg: '', marketRatePerKg: '' }] })} className="text-xs text-cyan-400 hover:underline">
                    Classify batch
                  </button>
                )}
                {classifyForm.batchId === b.id && (
                  <div className="mt-2 space-y-2">
                    {classifyForm.rows.map((row, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Select value={row.category} onChange={(e) => {
                          const rows = [...classifyForm.rows]; rows[idx].category = e.target.value as WasteType; setClassifyForm({ ...classifyForm, rows });
                        }}>
                          {WASTE_TYPES.map((w) => <option key={w} value={w}>{w.replace(/_/g, ' ')}</option>)}
                        </Select>
                        <Input placeholder="kg" type="number" value={row.weightKg} onChange={(e) => {
                          const rows = [...classifyForm.rows]; rows[idx].weightKg = e.target.value; setClassifyForm({ ...classifyForm, rows });
                        }} />
                        <Input placeholder="₹/kg" type="number" value={row.marketRatePerKg} onChange={(e) => {
                          const rows = [...classifyForm.rows]; rows[idx].marketRatePerKg = e.target.value; setClassifyForm({ ...classifyForm, rows });
                        }} />
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button onClick={() => setClassifyForm({ ...classifyForm, rows: [...classifyForm.rows, { category: 'MIXED', weightKg: '', marketRatePerKg: '' }] })} className="text-xs text-slate-400 hover:underline">+ Add category</button>
                      <PrimaryButton onClick={() => classifyMutation.mutate()} disabled={classifyMutation.isPending}>Save classification</PrimaryButton>
                    </div>
                  </div>
                )}

                {b.status === 'CLASSIFIED' && processForm.batchId !== b.id && (
                  <button onClick={() => setProcessForm({ batchId: b.id, processed: String(b.input_weight_kg), recovered: '', residual: '' })} className="text-xs text-cyan-400 hover:underline">
                    Log processing outcome
                  </button>
                )}
                {processForm.batchId === b.id && (
                  <div className="mt-2 flex gap-2">
                    <Input placeholder="Processed kg" type="number" value={processForm.processed} onChange={(e) => setProcessForm({ ...processForm, processed: e.target.value })} />
                    <Input placeholder="Recovered kg" type="number" value={processForm.recovered} onChange={(e) => setProcessForm({ ...processForm, recovered: e.target.value })} />
                    <Input placeholder="Residual kg" type="number" value={processForm.residual} onChange={(e) => setProcessForm({ ...processForm, residual: e.target.value })} />
                    <PrimaryButton onClick={() => processMutation.mutate()} disabled={processMutation.isPending} className="flex-shrink-0">Save</PrimaryButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default RecyclingHubDashboard;
