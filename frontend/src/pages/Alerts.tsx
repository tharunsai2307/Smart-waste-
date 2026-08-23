import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const AlertsPage: React.FC = () => {
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: api.getAlerts,
    refetchInterval: 5000,
  });

  const active = alerts.filter(a => !a.resolved);
  const resolved = alerts.filter(a => a.resolved);

  const typeColors: Record<string, string> = {
    BIN_OVERFLOW: '#ef4444', BIN_CRITICAL: '#f97316',
    SYSTEM_WARNING: '#fbbf24', COLLECTION_DELAYED: '#22d3ee',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alert Center</h1>
          <p className="text-xs text-slate-500 mt-1">{active.length} active • {resolved.length} resolved</p>
        </div>
        {active.length === 0 && (
          <div className="px-4 py-2 rounded-xl text-sm text-emerald-400"
               style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
            ✓ System Clear
          </div>
        )}
      </div>

      {active.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 tracking-widest mb-3">ACTIVE ALERTS</div>
          <div className="space-y-3">
            {active.map((a, i) => {
              const color = typeColors[a.type] ?? '#fbbf24';
              return (
                <motion.div
                  key={a.alertId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-2xl"
                  style={{ background: `${color}08`, border: `1px solid ${color}25` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 pulse-dot" style={{ background: color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-mono tracking-wider" style={{ color }}>{a.type}</span>
                        <span className="text-xs text-slate-600">Ref #{a.referenceId}</span>
                        <span className="text-xs text-slate-600 ml-auto">{a.date}</span>
                      </div>
                      <div className="text-sm text-white">{a.message}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 tracking-widest mb-3">RESOLVED ALERTS</div>
          <div className="space-y-2">
            {resolved.map((a, i) => (
              <motion.div
                key={a.alertId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="p-3 rounded-xl flex items-center gap-3 opacity-40"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="text-emerald-500">✓</span>
                <span className="text-xs text-slate-500 font-mono">{a.type}</span>
                <span className="text-xs text-slate-600 flex-1">{a.message}</span>
                <span className="text-xs text-slate-700">{a.date}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
