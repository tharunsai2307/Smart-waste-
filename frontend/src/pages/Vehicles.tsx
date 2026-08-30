import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const vehicleStatusColors: Record<string, string> = {
  AVAILABLE: '#34d399', ASSIGNED: '#22d3ee', ON_ROUTE: '#a78bfa',
  FULL: '#fbbf24', MAINTENANCE: '#ef4444',
};

const VehiclesPage: React.FC = () => {
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.getVehicles,
    refetchInterval: 5000,
  });

  if (isLoading) return <div className="text-center py-20 text-emerald-400 font-mono">LOADING FLEET...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Vehicle Control Center</h1>
        <p className="text-xs text-slate-500 mt-1">{vehicles.length} vehicles in fleet</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vehicles.map((v, i) => {
          const color = vehicleStatusColors[v.status] ?? '#475569';
          const cap = v.capacityKg ?? v.capacity ?? 1;
          const calculatedLoad = v.loadPercent ?? (cap > 0 ? (v.currentLoad / cap) * 100 : 0);
          const loadPct = Math.min(calculatedLoad, 100);
          return (
            <motion.div
              key={v.vehicleId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass glass-hover p-5 rounded-2xl"
              style={{ borderTop: `2px solid ${color}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-bold text-white font-mono">{v.vehicleNumber}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{v.vehicleType || v.vehicleCode || 'Fleet Asset'}</div>
                </div>
                <span className="px-2 py-1 rounded-lg text-xs font-mono border"
                      style={{ color, background: `${color}15`, borderColor: `${color}30` }}>
                  {v.status}
                </span>
              </div>

              {/* Load bar */}
              <div className="mb-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Load Capacity</span>
                  <span className="font-mono" style={{ color }}>{loadPct.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${loadPct}%` }}
                    transition={{ duration: 1, delay: i * 0.07 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {[
                  { label: 'Current', value: `${v.currentLoad.toFixed(0)} kg` },
                  { label: 'Capacity', value: `${cap.toFixed(0)} kg` },
                ].map(r => (
                  <div key={r.label}>
                    <div className="text-xs text-slate-600">{r.label}</div>
                    <div className="text-sm font-mono text-white">{r.value}</div>
                  </div>
                ))}
              </div>

              {v.status === 'ON_ROUTE' && (
                <div className="mt-3 text-xs py-2 rounded-lg text-center font-mono"
                     style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                  🚛 ACTIVE COLLECTION ROUTE
                </div>
              )}
              {v.status === 'MAINTENANCE' && (
                <div className="mt-3 text-xs py-2 rounded-lg text-center font-mono"
                     style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  ⚙ UNDER MAINTENANCE
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default VehiclesPage;
