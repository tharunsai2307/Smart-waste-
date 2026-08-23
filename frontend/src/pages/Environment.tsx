import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const EnvironmentPage: React.FC = () => {
  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: api.getDashboard, refetchInterval: 10000 });

  const metrics = [
    { label: 'CO₂ SAVED', value: dashboard?.co2Saved ?? 0, unit: 'kg', icon: '🌍', color: '#34d399', desc: 'Greenhouse gas prevented from entering atmosphere' },
    { label: 'LANDFILL AVOIDED', value: dashboard?.landfillAvoided ?? 0, unit: 'kg', icon: '🏗', color: '#22d3ee', desc: 'Waste diverted from landfill through recycling' },
    { label: 'MATERIAL RECOVERED', value: dashboard?.totalRecycled ?? 0, unit: 'kg', icon: '♻', color: '#a78bfa', desc: 'Raw materials recovered from waste stream' },
    { label: 'RECYCLING VALUE', value: dashboard?.recyclingValue ?? 0, unit: '₹', icon: '💰', color: '#fbbf24', desc: 'Estimated economic value of recovered materials', prefix: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Environmental Impact</h1>
        <p className="text-xs text-slate-500 mt-1">Measuring our positive impact on the planet</p>
      </div>

      {/* Hero metric */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-8 rounded-2xl text-center"
        style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(34,211,238,0.05))' }}
      >
        <div className="text-6xl mb-4">🌍</div>
        <div className="text-4xl font-bold text-white mb-2">
          {(dashboard?.recyclingRate ?? 0).toFixed(1)}%
        </div>
        <div className="text-emerald-400 tracking-widest text-sm font-mono">RECYCLING RATE</div>
        <div className="text-slate-500 text-xs mt-2">
          {dashboard?.totalRecycled?.toFixed(0) ?? 0} kg recovered • {dashboard?.totalWaste?.toFixed(0) ?? 0} kg total generated
        </div>
      </motion.div>

      {/* Impact grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass glass-hover p-6 rounded-2xl"
            style={{ borderLeft: `3px solid ${m.color}` }}
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl">{m.icon}</span>
              <div>
                <div className="text-xs text-slate-500 tracking-widest">{m.label}</div>
                <div className="text-2xl font-bold mt-0.5" style={{ color: m.color }}>
                  {m.prefix ? `${m.unit}${m.value.toFixed(0)}` : `${m.value.toFixed(0)} ${m.unit}`}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500">{m.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Tips */}
      <div className="glass p-5 rounded-2xl">
        <div className="text-xs text-slate-500 tracking-widest mb-4">ENVIRONMENTAL INTELLIGENCE</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '♻', title: 'Every 1 kg recycled', value: 'saves ~2.1 kg CO₂' },
            { icon: '🏗', title: 'Landfill diversion', value: 'reduces methane emissions' },
            { icon: '🌿', title: 'Material recovery', value: 'reduces mining demand' },
          ].map(tip => (
            <div key={tip.title} className="p-4 rounded-xl text-center"
                 style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)' }}>
              <div className="text-2xl mb-2">{tip.icon}</div>
              <div className="text-xs text-slate-400">{tip.title}</div>
              <div className="text-sm text-emerald-400 font-medium mt-1">{tip.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentPage;
