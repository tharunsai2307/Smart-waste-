import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pickupsApi, collectionsApi, hubsApi } from '../services/api2';
import { Card, StatCard, Badge, EmptyState, PrimaryButton, Input, Select, ProgressBar } from '../components/ui';
import type { WasteType } from '../types/api';
import { Weight, CheckCircle2, Building2, ClipboardList } from 'lucide-react';

const WASTE_TYPES: WasteType[] = ['MIXED', 'PLASTIC', 'PAPER', 'METAL', 'E_WASTE', 'BIODEGRADABLE', 'HAZARDOUS'];

const CleanerDashboard: React.FC = () => {
  const qc = useQueryClient();
  const { data: pickups } = useQuery({ queryKey: ['my-pickups'], queryFn: () => pickupsApi.list(), refetchInterval: 10000 });
  const { data: collections } = useQuery({ queryKey: ['my-collections'], queryFn: collectionsApi.list });
  const { data: hubData } = useQuery({ queryKey: ['my-hub'], queryFn: hubsApi.listLocal });
  // Backend scopes /hubs/local to the cleaner's own hub — take the first row.
  const myHub = (hubData?.hubs || [])[0];

  const [logForm, setLogForm] = useState<{ pickupRequestId?: number; wasteType: WasteType; weightKg: string }>({ wasteType: 'MIXED', weightKg: '' });
  const [logError, setLogError] = useState('');

  const logMutation = useMutation({
    mutationFn: () => collectionsApi.log({
      pickupRequestId: logForm.pickupRequestId,
      wasteType: logForm.wasteType,
      weightKg: Number(logForm.weightKg),
    }),
    onSuccess: () => {
      setLogError('');
      qc.invalidateQueries({ queryKey: ['my-pickups'] });
      qc.invalidateQueries({ queryKey: ['my-collections'] });
      qc.invalidateQueries({ queryKey: ['my-hub'] });
      setLogForm({ wasteType: 'MIXED', weightKg: '' });
    },
    onError: (e: any) => setLogError(e?.message || 'Failed to log collection'),
  });

  const assigned = (pickups?.requests || []).filter((r) => r.status === 'ASSIGNED');
  const myCollections = collections?.collections || [];
  const todayKg = myCollections
    .filter((c) => new Date(c.collected_at).toDateString() === new Date().toDateString())
    .reduce((sum, c) => sum + Number(c.weight_kg), 0);

  const hubFill = myHub ? (myHub.current_load_kg / (myHub.capacity_kg || 1)) * 100 : 0;

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
        <div className="flex items-center gap-2 text-white font-semibold text-sm mb-4"><Building2 size={16} className="text-cyan-400" /> My local hub</div>
        {myHub ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white">{myHub.name}</div>
              <div className="text-xs text-slate-400">{myHub.current_load_kg.toFixed(1)} / {myHub.capacity_kg} kg</div>
            </div>
            <ProgressBar pct={hubFill} warn={myHub.warning_pct} crit={myHub.critical_pct} />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Fill level</span>
              <span className={hubFill >= myHub.critical_pct ? 'text-red-400 font-semibold' : hubFill >= myHub.warning_pct ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {hubFill.toFixed(1)}% {hubFill >= myHub.critical_pct ? '— critical, transfer needed' : hubFill >= myHub.warning_pct ? '— nearing capacity' : ''}
              </span>
            </div>
          </div>
        ) : (
          <EmptyState message="No local hub assigned yet" hint="Ask an admin to assign you to a local hub — collections can only be logged against your hub." />
        )}
      </Card>

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
                    onClick={() => { setLogError(''); setLogForm({ pickupRequestId: r.id, wasteType: r.waste_type, weightKg: '' }); }}
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
        <form onSubmit={(e) => { e.preventDefault(); setLogError(''); logMutation.mutate(); }} className="grid md:grid-cols-3 gap-3">
          <Select value={logForm.wasteType} onChange={(e) => setLogForm({ ...logForm, wasteType: e.target.value as WasteType })}>
            {WASTE_TYPES.map((w) => <option key={w} value={w}>{w.replace(/_/g, ' ')}</option>)}
          </Select>
          <Input placeholder="Real weight (kg)" type="number" step="0.1" min="0.1" value={logForm.weightKg} onChange={(e) => setLogForm({ ...logForm, weightKg: e.target.value })} required />
          <PrimaryButton type="submit" disabled={logMutation.isPending || !logForm.weightKg} className="flex items-center justify-center gap-1.5">
            <CheckCircle2 size={14} /> {logMutation.isPending ? 'Logging…' : 'Log real weight'}
          </PrimaryButton>
        </form>
        {logForm.pickupRequestId && <div className="text-[11px] text-slate-500 mt-2">Linked to pickup #{logForm.pickupRequestId}</div>}
        {logError && (
          <div className="mt-3 p-3 rounded-lg text-xs text-red-300" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            {logError}
          </div>
        )}
        {logMutation.data && (
          <div className="mt-3 p-3 rounded-lg text-xs text-emerald-200" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
            Logged {logMutation.data.collection.weight_kg}kg. {logMutation.data.hub?.name ? `${logMutation.data.hub.name} is now` : 'Hub now at'} {logMutation.data.fillPct}% capacity.
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-white font-semibold text-sm mb-4"><ClipboardList size={16} className="text-cyan-400" /> My collections log</div>
        {myCollections.length === 0 ? <EmptyState message="No collections logged yet" hint="Every logged weight updates your hub's load in real time." /> : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {myCollections.slice(0, 30).map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <div className="text-sm text-white">
                    {c.waste_type.replace(/_/g, ' ')} · <span className="font-semibold">{Number(c.weight_kg).toFixed(1)}kg</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(c.collected_at).toLocaleString()} · {c.hub_name || 'hub'}
                    {c.resident_name ? ` · for ${c.resident_name}` : ''}
                    {c.pickup_request_id ? ` · pickup #${c.pickup_request_id}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.eco_points_awarded > 0 && <span className="text-[11px] text-emerald-400 font-semibold">+{c.eco_points_awarded} pts</span>}
                  <Badge status="COLLECTED" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CleanerDashboard;
