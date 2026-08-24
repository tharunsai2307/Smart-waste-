import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const statusColor: Record<string, string> = {
  NORMAL: '#34d399',
  WARNING: '#fbbf24',
  CRITICAL: '#ef4444',
  OVERFLOW: '#dc2626',
};

const BinsPage: React.FC = () => {
  const { data: bins = [], isLoading } = useQuery({
    queryKey: ['bins'],
    queryFn: api.getBins,
    refetchInterval: 5000,
  });

  if (isLoading) return <div className="text-center py-20 text-emerald-400 font-mono">LOADING BIN NETWORK...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Smart Bin Network</h1>
        <p className="text-xs text-slate-500 mt-1">{bins.length} bins monitored • Real-time from C backend</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {bins.map((bin, i) => {
          const color = statusColor[bin.status] ?? '#34d399';
          const fillPct = Math.min(bin.fillPercent, 100);
          return (
            <motion.div
              key={bin.binId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass glass-hover p-5 rounded-2xl"
              style={{ borderLeft: `2px solid ${color}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-500">BIN #{bin.binId}</span>
                <div className="flex items-center gap-2">
                  {bin.dataSource && (
                    <span className="px-2 py-0.5 rounded text-xs font-mono border" style={{ color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', borderColor: 'rgba(14, 165, 233, 0.3)' }}>
                      Source: {bin.dataSource}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-mono border`}
                        style={{ color, background: `${color}15`, borderColor: `${color}30` }}>
                    {bin.status}
                  </span>
                </div>
              </div>

              <div className="font-bold text-white text-lg mb-1">{bin.location}</div>
              <div className="text-xs text-slate-500 mb-4">{bin.wasteType}</div>

              {/* Fill level bar */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${fillPct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.04 }}
                    style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
                  />
                </div>
                <span className="text-sm font-bold font-mono" style={{ color }}>{fillPct.toFixed(1)}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="text-xs text-slate-500">Current Load</div>
                <div className="text-xs text-right text-slate-300 font-mono">{bin.currentLevel.toFixed(0)} kg</div>
                <div className="text-xs text-slate-500">Capacity</div>
                <div className="text-xs text-right text-slate-300 font-mono">{bin.capacity.toFixed(0)} kg</div>
              </div>

              {/* Overflow indicator */}
              {bin.status === 'OVERFLOW' && (
                <div className="mt-3 text-xs text-center py-2 rounded-lg font-mono pulse-critical"
                     style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                  ⚠ OVERFLOW — IMMEDIATE COLLECTION REQUIRED
                </div>
              )}
              {bin.status === 'CRITICAL' && (
                <div className="mt-3 text-xs text-center py-2 rounded-lg font-mono"
                     style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  CRITICAL — COLLECTION RECOMMENDED
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BinsPage;
