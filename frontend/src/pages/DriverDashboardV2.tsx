import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transfersApi, vehiclesApi } from '../services/api2';
import { Card, Badge, EmptyState, PrimaryButton, Input } from '../components/ui';
import QrScanner from '../components/QrScanner';
import { useAuthStore } from '../store/authStore';
import { QrCode, MapPin, PackageCheck } from 'lucide-react';

const STEP_LABEL: Record<string, string> = {
  DRIVER_ASSIGNED: 'Scan your vehicle QR to start the job',
  ON_THE_JOB: 'Head to the local hub and scan its gate QR on arrival',
  ARRIVED_AT_HUB: 'Load the waste, then scan the hub QR again to confirm weight',
  EN_ROUTE: 'Head to the recycling facility and scan its gate QR on arrival',
  ARRIVED_AT_RECYCLING: 'Hand off the load — waiting for facility to confirm received weight',
};

const DriverDashboardV2: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['my-transfers'], queryFn: transfersApi.list, refetchInterval: 8000 });
  const { data: routeData } = useQuery({ queryKey: ['my-route', user?.id], queryFn: () => vehiclesApi.routes(user!.id), enabled: !!user });

  const [scanning, setScanning] = useState<{ transferId: number; kind: 'start-job' | 'arrive-hub' | 'loaded' | 'arrive-recycling' } | null>(null);
  const [pendingWeight, setPendingWeight] = useState<{ transferId: number; qr: string } | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [error, setError] = useState('');

  const scanMutation = useMutation({
    mutationFn: ({ transferId, kind, qr }: { transferId: number; kind: string; qr: string }) => {
      if (kind === 'start-job') return transfersApi.scanStartJob(transferId, qr);
      if (kind === 'arrive-hub') return transfersApi.scanArriveHub(transferId, qr);
      if (kind === 'arrive-recycling') return transfersApi.scanArriveRecycling(transferId, qr);
      throw new Error('unsupported');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-transfers'] }); setScanning(null); setError(''); },
    onError: (e: any) => setError(e.message || 'Scan failed'),
  });

  const loadedMutation = useMutation({
    mutationFn: ({ transferId, qr, kg }: { transferId: number; qr: string; kg: number }) => transfersApi.scanLoaded(transferId, qr, kg),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-transfers'] }); setPendingWeight(null); setWeightInput(''); setError(''); },
    onError: (e: any) => setError(e.message || 'Failed to confirm load'),
  });

  const jobs = (data?.transfers || []).filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status));
  const completed = (data?.transfers || []).filter((t) => t.status === 'COMPLETED');

  const handleScanResult = (transferId: number, kind: 'start-job' | 'arrive-hub' | 'loaded' | 'arrive-recycling', qr: string) => {
    if (kind === 'loaded') {
      setScanning(null);
      setPendingWeight({ transferId, qr });
      return;
    }
    scanMutation.mutate({ transferId, kind, qr });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Driver Portal</h1>
        <p className="text-xs text-slate-500 mt-1">Scan QR codes at each step — no step can be skipped.</p>
      </div>

      {error && <div className="p-3 rounded-lg text-red-300 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>{error}</div>}

      <Card>
        <div className="text-white font-semibold text-sm mb-4">Active jobs</div>
        {jobs.length === 0 ? <EmptyState message="No active jobs assigned to you" /> : (
          <div className="space-y-3">
            {jobs.map((t) => {
              let scanKind: 'start-job' | 'arrive-hub' | 'loaded' | 'arrive-recycling' | null = null;
              if (t.status === 'DRIVER_ASSIGNED') scanKind = 'start-job';
              else if (t.status === 'ON_THE_JOB') scanKind = 'arrive-hub';
              else if (t.status === 'ARRIVED_AT_HUB') scanKind = 'loaded';
              else if (t.status === 'EN_ROUTE') scanKind = 'arrive-recycling';

              return (
                <div key={t.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-white font-semibold">Transfer #{t.id}</div>
                    <Badge status={t.status} />
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-3"><MapPin size={12} /> {STEP_LABEL[t.status] || 'Awaiting next step'}</div>
                  {scanKind && (
                    <PrimaryButton onClick={() => setScanning({ transferId: t.id, kind: scanKind! })} className="flex items-center gap-1.5">
                      <QrCode size={14} /> {scanKind === 'loaded' ? 'Scan hub QR to confirm load' : 'Scan QR'}
                    </PrimaryButton>
                  )}
                  {t.status === 'ARRIVED_AT_RECYCLING' && (
                    <div className="text-xs text-amber-300 flex items-center gap-1.5"><PackageCheck size={13} /> Waiting on facility to record received weight.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {routeData && routeData.route.length > 0 && (
        <Card>
          <div className="text-white font-semibold text-sm mb-3">Your route (live)</div>
          <div className="space-y-2">
            {routeData.route.map((r: any) => (
              <div key={r.transferId} className="text-xs text-slate-300 p-2.5 rounded-lg bg-white/5">
                Transfer #{r.transferId}: {r.nextStop?.label} {r.nextStop?.address ? `— ${r.nextStop.address}` : ''}
              </div>
            ))}
          </div>
        </Card>
      )}

      {completed.length > 0 && (
        <Card>
          <div className="text-white font-semibold text-sm mb-3">Completed jobs</div>
          <div className="space-y-2">
            {completed.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs text-slate-400 p-2.5 rounded-lg bg-white/5">
                <span>Transfer #{t.id}</span>
                <span className="text-white font-mono">{t.received_weight_kg}kg</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {scanning && (
        <QrScanner
          title={scanning.kind === 'start-job' ? 'Scan your vehicle QR' : scanning.kind === 'loaded' ? 'Scan hub QR to confirm load' : 'Scan gate QR'}
          onClose={() => setScanning(null)}
          onScan={(text) => handleScanResult(scanning.transferId, scanning.kind, text)}
        />
      )}

      {pendingWeight && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-white font-semibold text-sm">How much did you load?</div>
            <Input type="number" step="0.1" placeholder="Loaded weight (kg)" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setPendingWeight(null)} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">Cancel</button>
              <PrimaryButton
                className="flex-1"
                disabled={!weightInput || loadedMutation.isPending}
                onClick={() => loadedMutation.mutate({ transferId: pendingWeight.transferId, qr: pendingWeight.qr, kg: Number(weightInput) })}
              >
                {loadedMutation.isPending ? 'Saving…' : 'Confirm real weight'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboardV2;
