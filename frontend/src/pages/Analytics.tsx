import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

const AnalyticsPage: React.FC = () => {
  const { data: waste = [] } = useQuery({ queryKey: ['waste'], queryFn: api.getWaste });
  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: api.getDashboard, refetchInterval: 8000 });
  const { data: recycling = [] } = useQuery({ queryKey: ['recycling'], queryFn: api.getRecycling });

  // Aggregate waste by type
  const byType: Record<string, number> = {};
  for (const w of waste) {
    byType[w.wasteType] = (byType[w.wasteType] ?? 0) + w.quantity;
  }
  const typeData = Object.entries(byType).map(([name, qty]) => ({ name, qty: Math.round(qty) }))
    .sort((a, b) => b.qty - a.qty);

  // Recycling trend (by record order, as proxy for time)
  const recyclingTrend = recycling.map((r, i) => ({
    index: i + 1,
    recycled: r.recycledQuantity,
    rejected: r.rejectedQuantity,
  }));

  const tooltipStyle = { background: '#0d1423', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics Workspace</h1>
        <p className="text-xs text-slate-500 mt-1">Advanced waste intelligence analytics</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL WASTE', value: `${(dashboard?.totalWaste ?? 0).toFixed(0)} kg`, color: '#34d399' },
          { label: 'RECYCLED', value: `${(dashboard?.totalRecycled ?? 0).toFixed(0)} kg`, color: '#22d3ee' },
          { label: 'LANDFILL AVOIDED', value: `${(dashboard?.landfillAvoided ?? 0).toFixed(0)} kg`, color: '#a78bfa' },
          { label: 'CO₂ SAVED', value: `${(dashboard?.co2Saved ?? 0).toFixed(1)} kg`, color: '#34d399' },
        ].map(kpi => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      className="glass p-4 rounded-2xl">
            <div className="text-xs text-slate-500 tracking-widest mb-2">{kpi.label}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Waste by type bar */}
        <div className="glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">WASTE BY TYPE</div>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={typeData}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#e2e8f0' }} formatter={(v: any) => [`${v} kg`, 'Quantity']} />
                <Bar dataKey="qty" fill="#34d399" radius={[4, 4, 0, 0]} name="Quantity (kg)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-slate-700 text-sm">No waste records yet</div>
          )}
        </div>

        {/* Recycling trend area */}
        <div className="glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">RECYCLING TREND</div>
          {recyclingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={recyclingTrend}>
                <defs>
                  <linearGradient id="recycledGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="index" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#94a3b8' }} />
                <Area type="monotone" dataKey="recycled" stroke="#34d399" strokeWidth={2}
                      fill="url(#recycledGrad)" name="Recycled (kg)" />
                <Area type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={1.5}
                      fill="transparent" strokeDasharray="4 2" name="Rejected (kg)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-slate-700 text-sm">No recycling records yet</div>
          )}
        </div>
      </div>

      {/* Bin distribution */}
      <div className="glass p-5 rounded-2xl">
        <div className="text-xs text-slate-500 tracking-widest mb-4">BIN NETWORK HEALTH</div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Normal', count: dashboard?.normalBins ?? 0, color: '#34d399', pct: (dashboard?.normalBins ?? 0) / Math.max(dashboard?.bins ?? 1, 1) * 100 },
            { label: 'Warning', count: dashboard?.warningBins ?? 0, color: '#fbbf24', pct: (dashboard?.warningBins ?? 0) / Math.max(dashboard?.bins ?? 1, 1) * 100 },
            { label: 'Critical', count: dashboard?.criticalBins ?? 0, color: '#ef4444', pct: (dashboard?.criticalBins ?? 0) / Math.max(dashboard?.bins ?? 1, 1) * 100 },
            { label: 'Overflow', count: dashboard?.overflowBins ?? 0, color: '#dc2626', pct: (dashboard?.overflowBins ?? 0) / Math.max(dashboard?.bins ?? 1, 1) * 100 },
          ].map(item => (
            <div key={item.label} className="text-center p-4 rounded-xl" style={{ background: `${item.color}08`, border: `1px solid ${item.color}20` }}>
              <div className="text-3xl font-bold" style={{ color: item.color }}>{item.count}</div>
              <div className="text-xs text-slate-500 mt-1">{item.label}</div>
              <div className="text-xs font-mono mt-0.5" style={{ color: item.color }}>{item.pct.toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
