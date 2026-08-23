import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const ResidentsPage: React.FC = () => {
  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: api.getResidents,
  });

  const sorted = [...residents].sort((a, b) => b.ecoPoints - a.ecoPoints);
  const maxPoints = sorted[0]?.ecoPoints ?? 1;

  const getEcoTier = (pts: number) => {
    if (pts >= 200) return { label: 'ECO CHAMPION', color: '#34d399' };
    if (pts >= 100) return { label: 'GREEN STAR', color: '#22d3ee' };
    if (pts >= 50)  return { label: 'RECYCLER', color: '#a78bfa' };
    return { label: 'BEGINNER', color: '#64748b' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Eco Leaderboard</h1>
        <p className="text-xs text-slate-500 mt-1">{residents.length} registered residents</p>
      </div>

      {sorted.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center text-slate-600">
          No residents registered yet. Run the C application to initialize demo data.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r, i) => {
            const tier = getEcoTier(r.ecoPoints);
            const pct = (r.ecoPoints / maxPoints) * 100;
            return (
              <motion.div
                key={r.residentId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass p-4 rounded-2xl flex items-center gap-4"
              >
                {/* Rank */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                     style={{
                       background: i === 0 ? 'rgba(251,191,36,0.2)' : i === 1 ? 'rgba(148,163,184,0.15)' : i === 2 ? 'rgba(180,120,60,0.15)' : 'rgba(255,255,255,0.05)',
                       color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b47a3c' : '#475569',
                       border: `1px solid ${i < 3 ? 'currentColor' : 'rgba(255,255,255,0.08)'}`,
                     }}>
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white mb-0.5">{r.area || `Resident #${r.residentId}`}</div>
                  <div className="text-xs text-slate-500 truncate">{r.address}</div>
                  {/* Eco bar */}
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.04 }}
                      style={{ background: tier.color }}
                    />
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold font-mono" style={{ color: tier.color }}>{r.ecoPoints}</div>
                  <div className="text-xs" style={{ color: tier.color }}>{tier.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResidentsPage;
