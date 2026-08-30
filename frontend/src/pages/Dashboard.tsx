import React, { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useAppStore } from '../store';
import KPICard from '../components/cards/KPICard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { Bin } from '../types';

// Lazy-load the 3D scene to avoid SSR issues
const CityScene = React.lazy(() => import('../components/3d/CityScene'));

const BinStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    NORMAL: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    WARNING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
    OVERFLOW: 'bg-red-600/30 text-red-300 border-red-600/40 pulse-critical',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs border font-mono ${colors[status] ?? colors.NORMAL}`}>
      {status}
    </span>
  );
};

const Dashboard: React.FC = () => {
  const { is3DMode } = useAppStore();
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
    refetchInterval: 5000,
  });

  const { data: bins = [] } = useQuery({
    queryKey: ['bins'],
    queryFn: api.getBins,
    refetchInterval: 5000,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.getVehicles,
    refetchInterval: 5000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: api.getAlerts,
    refetchInterval: 6000,
  });

  const criticalAlerts = alerts.filter(a => !a.resolved && (a.type.includes('CRITICAL') || a.type.includes('OVERFLOW')));

  if (dashLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-2xl mb-3">♻</div>
          <div className="text-sm text-emerald-400 font-mono tracking-widest">LOADING...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-xs text-slate-500 mt-1">Smart City Waste Intelligence Dashboard</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
             style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
          <span className="text-xs text-emerald-400 font-mono">SYSTEM ONLINE</span>
        </div>
      </div>

      {/* 3D City View */}
      <div className="glass rounded-2xl overflow-hidden" style={{ height: is3DMode ? '400px' : '200px' }}>
        {is3DMode ? (
          <div style={{ height: '400px', position: 'relative' }}>
            <ErrorBoundary>
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <span className="text-emerald-400 text-xs font-mono tracking-widest">LOADING 3D SCENE...</span>
                </div>
              }>
                <CityScene bins={bins} vehicles={vehicles} onBinClick={setSelectedBin} />
              </Suspense>
            </ErrorBoundary>
            <div className="absolute top-4 left-4 text-xs text-slate-500 font-mono">
              3D SMART CITY VIEW — Click bins to inspect
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl mb-2">🗺</div>
              <div className="text-sm text-slate-400">2D Performance Mode Active</div>
              <div className="text-xs text-slate-600 mt-1">Enable 3D mode from sidebar</div>
            </div>
          </div>
        )}
      </div>

      {/* Bin popup overlay */}
      <AnimatePresence>
        {selectedBin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-8 right-8 z-50 p-5 rounded-2xl w-72"
            style={{ background: 'rgba(10,20,35,0.95)', border: '1px solid rgba(52,211,153,0.25)', boxShadow: '0 0 40px rgba(52,211,153,0.1)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-mono text-emerald-400 tracking-widest">BIN #{selectedBin.binId}</div>
              <button onClick={() => setSelectedBin(null)} className="text-slate-500 hover:text-white text-sm cursor-pointer">✕</button>
            </div>
            <div className="font-bold text-white text-lg mb-1">{selectedBin.location}</div>
            <BinStatusBadge status={selectedBin.status} />
            <div className="mt-4 space-y-2">
              {[
                { label: 'Fill Level', value: `${selectedBin.fillPercent.toFixed(1)}%` },
                { label: 'Waste Type', value: selectedBin.wasteType },
                { label: 'Capacity', value: `${selectedBin.currentLevel.toFixed(0)} / ${selectedBin.capacity.toFixed(0)} kg` },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-xs">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="text-white font-mono">{r.value}</span>
                </div>
              ))}
            </div>
            {/* Fill bar */}
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(selectedBin.fillPercent, 100)}%` }}
                style={{ background: selectedBin.status === 'NORMAL' ? '#34d399' : selectedBin.status === 'WARNING' ? '#fbbf24' : '#ef4444' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="TOTAL WASTE" value={dashboard?.totalWaste ?? 0} suffix="kg" color="#34d399" icon="🗑" decimal={0} />
        <KPICard label="RECYCLED" value={dashboard?.totalRecycled ?? 0} suffix="kg" color="#22d3ee" icon="♻" decimal={0} />
        <KPICard label="RECYCLING RATE" value={dashboard?.recyclingRate ?? 0} suffix="%" color="#a78bfa" icon="📊" decimal={1} />
        <KPICard label="CO₂ SAVED" value={dashboard?.co2Saved ?? 0} suffix="kg" color="#34d399" icon="🌍" decimal={0} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="CRITICAL BINS" value={dashboard?.criticalBins ?? 0} color="#ef4444" icon="🔴" />
        <KPICard label="OVERFLOW BINS" value={dashboard?.overflowBins ?? 0} color="#ef4444" icon="🚨" />
        <KPICard label="ACTIVE VEHICLES" value={dashboard?.onRouteVehicles ?? 0} color="#22d3ee" icon="🚛" />
        <KPICard label="ACTIVE ALERTS" value={dashboard?.activeAlerts ?? 0} color="#fbbf24" icon="⚠" />
      </div>

      {/* Bottom row: Bin Health + Collections + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bin Health */}
        <div className="glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">BIN HEALTH OVERVIEW</div>
          {[
            { label: 'Normal', count: dashboard?.normalBins ?? 0, color: '#34d399' },
            { label: 'Warning', count: dashboard?.warningBins ?? 0, color: '#fbbf24' },
            { label: 'Critical', count: dashboard?.criticalBins ?? 0, color: '#ef4444' },
            { label: 'Overflow', count: dashboard?.overflowBins ?? 0, color: '#dc2626' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              <div className="flex-1 text-xs text-slate-400">{item.label}</div>
              <div className="text-sm font-bold" style={{ color: item.color }}>{item.count}</div>
            </div>
          ))}
        </div>

        {/* Collections */}
        <div className="glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">COLLECTION STATUS</div>
          {[
            { label: 'Pending', count: dashboard?.pendingCollections ?? 0, color: '#fbbf24' },
            { label: 'Active / On Route', count: dashboard?.activeCollections ?? 0, color: '#22d3ee' },
            { label: 'Completed', count: dashboard?.completedCollections ?? 0, color: '#34d399' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              <div className="flex-1 text-xs text-slate-400">{item.label}</div>
              <div className="text-sm font-bold" style={{ color: item.color }}>{item.count}</div>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="text-xs text-slate-600">Available Vehicles</div>
            <div className="text-lg font-bold text-emerald-400">{dashboard?.availableVehicles ?? 0}</div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">ACTIVE ALERTS</div>
          {criticalAlerts.length === 0 ? (
            <div className="text-xs text-emerald-400 py-6 text-center">✓ No critical alerts</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {criticalAlerts.slice(0, 5).map(a => (
                <motion.div
                  key={a.alertId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <div className="text-xs text-red-400 font-mono tracking-wider">{a.type}</div>
                  <div className="text-xs text-slate-300 mt-1">{a.message}</div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
