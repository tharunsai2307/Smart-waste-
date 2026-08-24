import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const WastePage: React.FC = () => {
  const { data: waste = [], refetch } = useQuery({ queryKey: ['waste'], queryFn: api.getWaste, refetchInterval: 8000 });
  const { data: bins = [] } = useQuery({ queryKey: ['bins'], queryFn: api.getBins });

  const [form, setForm] = useState({ residentId: 1, binId: 101, wasteType: 'Mixed', quantity: 10, recyclable: 1, dataSource: 'Manual' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.addWaste({ ...form, date: new Date().toISOString().split('T')[0] });
      setSuccess('Waste report submitted! Bin level updated.');
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch { setSuccess('Error submitting.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Waste Management</h1>
        <p className="text-xs text-slate-500 mt-1">{waste.length} waste records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Report form */}
        <div className="glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">REPORT WASTE</div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Resident ID', key: 'residentId', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={(form as Record<string, number | string>)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            ))}

            <div>
              <label className="block text-xs text-slate-500 mb-1">Bin</label>
              <select value={form.binId} onChange={e => setForm(p => ({ ...p, binId: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ background: '#0d1423', border: '1px solid rgba(255,255,255,0.1)' }}>
                {bins.map(b => <option key={b.binId} value={b.binId}>{b.binId}: {b.location}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Waste Type</label>
              <select value={form.wasteType} onChange={e => setForm(p => ({ ...p, wasteType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ background: '#0d1423', border: '1px solid rgba(255,255,255,0.1)' }}>
                {['Mixed', 'Plastic', 'Paper', 'Metal', 'E-Waste', 'Organic'].map(t =>
                  <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Quantity (kg)</label>
              <input type="number" value={form.quantity} min={1} max={500}
                     onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                     className="w-full px-3 py-2 rounded-lg text-sm text-white font-mono"
                     style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Data Source</label>
              <select value={form.dataSource} onChange={e => setForm(p => ({ ...p, dataSource: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ background: '#0d1423', border: '1px solid rgba(255,255,255,0.1)' }}>
                {['Manual', 'IoT'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {success && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="p-2 rounded-lg text-xs text-center text-emerald-400"
                          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                {success}
              </motion.div>
            )}

            <button type="submit" disabled={submitting}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #059669, #0891b2)', color: 'white' }}>
              {submitting ? 'SUBMITTING...' : '🗑 SUBMIT WASTE REPORT'}
            </button>
          </form>
        </div>

        {/* Records list */}
        <div className="md:col-span-2 glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">WASTE RECORDS</div>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {waste.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-sm">No operational records available.</div>
            ) : waste.slice().reverse().slice(0, 20).map((w, i) => (
              <motion.div key={w.wasteId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-4 p-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-sm font-mono text-slate-500 w-16">#{w.wasteId}</div>
                <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#34d39920', color: '#34d399' }}>{w.wasteType}</span>
                <div className="flex-1 text-xs text-slate-400">Bin #{w.binId}</div>
                <div className="text-sm font-bold font-mono text-white">{w.quantity.toFixed(1)} kg</div>
                <div className="text-xs text-slate-600">{w.date}</div>
                {w.dataSource && (
                   <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider text-slate-400" 
                         style={{ background: 'rgba(255,255,255,0.1)' }}>
                     Source: {w.dataSource}
                   </span>
                )}
                {w.recyclable && <span className="text-xs text-emerald-500">♻</span>}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WastePage;
