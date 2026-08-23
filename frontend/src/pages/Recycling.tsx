import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

const MATERIAL_COLORS: Record<string, string> = {
  Plastic: '#22d3ee', Paper: '#34d399', Metal: '#a78bfa',
  'E-Waste': '#fbbf24', Organic: '#86efac', Mixed: '#94a3b8',
};

const RecyclingPage: React.FC = () => {
  const { data: recycling = [] } = useQuery({
    queryKey: ['recycling'],
    queryFn: api.getRecycling,
    refetchInterval: 8000,
  });
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  });

  // Aggregate by waste type
  const byType: Record<string, { recycled: number; rejected: number; value: number }> = {};
  for (const r of recycling) {
    if (!byType[r.wasteType]) byType[r.wasteType] = { recycled: 0, rejected: 0, value: 0 };
    byType[r.wasteType].recycled += r.recycledQuantity;
    byType[r.wasteType].rejected += r.rejectedQuantity;
    byType[r.wasteType].value += r.value;
  }

  const pieData = Object.entries(byType).map(([name, d]) => ({ name, value: Math.round(d.recycled) }));
  const barData = Object.entries(byType).map(([name, d]) => ({
    name, recycled: Math.round(d.recycled), rejected: Math.round(d.rejected), value: Math.round(d.value),
  }));

  const totalRecycled = recycling.reduce((sum, r) => sum + r.recycledQuantity, 0);
  const totalValue = recycling.reduce((sum, r) => sum + r.value, 0);
  const recyclingRate = dashboard?.recyclingRate ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Recycling Command Center</h1>
        <p className="text-xs text-slate-500 mt-1">Material recovery analytics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: 'RECYCLING RATE', value: `${recyclingRate.toFixed(1)}%`, color: '#34d399', icon: '♻' },
          { label: 'TOTAL RECYCLED', value: `${totalRecycled.toFixed(0)} kg`, color: '#22d3ee', icon: '⚖' },
          { label: 'RECOVERY VALUE', value: `₹${totalValue.toFixed(0)}`, color: '#a78bfa', icon: '💰' },
        ].map(kpi => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-6 rounded-2xl text-center"
            style={{ borderBottom: `2px solid ${kpi.color}` }}
          >
            <div className="text-3xl mb-2">{kpi.icon}</div>
            <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-xs text-slate-500 tracking-widest mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut */}
        <div className="glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">MATERIAL BREAKDOWN</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                     paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={MATERIAL_COLORS[entry.name] ?? '#475569'} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0d1423', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(v: any) => [`${v} kg`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-600 text-sm">No recycling data yet</div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full" style={{ background: MATERIAL_COLORS[d.name] ?? '#475569' }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">RECYCLED vs REJECTED</div>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} barGap={2}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0d1423', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="recycled" fill="#34d399" radius={[4, 4, 0, 0]} name="Recycled (kg)" />
                <Bar dataKey="rejected" fill="#ef4444" radius={[4, 4, 0, 0]} name="Rejected (kg)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-600 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Records table */}
      {recycling.length > 0 && (
        <div className="glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">RECYCLING RECORDS</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-600 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  {['ID', 'Collection', 'Material', 'Recyclable', 'Recycled', 'Rejected', 'Value'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 font-medium tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recycling.slice(0, 10).map((r, i) => (
                  <motion.tr
                    key={r.recyclingId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b text-slate-400"
                    style={{ borderColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <td className="py-2.5 pr-4 font-mono text-slate-600">{r.recyclingId}</td>
                    <td className="pr-4">{r.collectionId}</td>
                    <td className="pr-4">
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: `${MATERIAL_COLORS[r.wasteType] ?? '#475569'}20`, color: MATERIAL_COLORS[r.wasteType] ?? '#94a3b8' }}>
                        {r.wasteType}
                      </span>
                    </td>
                    <td className="pr-4 font-mono">{r.recyclableQuantity.toFixed(1)}</td>
                    <td className="pr-4 font-mono text-emerald-400">{r.recycledQuantity.toFixed(1)}</td>
                    <td className="pr-4 font-mono text-red-400">{r.rejectedQuantity.toFixed(1)}</td>
                    <td className="font-mono text-amber-400">₹{r.value.toFixed(0)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecyclingPage;
