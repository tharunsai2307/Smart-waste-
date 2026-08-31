import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi, hubsApi } from '../services/api2';
import { useAuthStore } from '../store/authStore';
import type { LocalHub } from '../types/api';

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [hubs, setHubs] = useState<LocalHub[]>([]);
  const [form, setForm] = useState({ addressLine: '', area: '', city: '', postalCode: '', preferredLocalHubId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hubsApi.listLocal().then((r) => setHubs(r.hubs)).catch(() => setHubs([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.completeResidentProfile({
        addressLine: form.addressLine,
        area: form.area,
        city: form.city,
        postalCode: form.postalCode || undefined,
        preferredLocalHubId: form.preferredLocalHubId ? Number(form.preferredLocalHubId) : undefined,
      });
      updateUser({ profileComplete: true });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 30% 20%, #10241d 0%, #030807 65%)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 w-full max-w-md">
        <h2 className="text-lg text-white font-semibold text-center mb-1">Welcome! Complete your profile</h2>
        <p className="text-xs text-slate-400 text-center mb-6">We need your address so pickups get routed to the right local hub.</p>
        {error && <div className="p-3 mb-4 rounded-lg text-red-300 text-xs text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <input placeholder="Address line" value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-white text-sm bg-white/5 border border-white/10" required />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-white text-sm bg-white/5 border border-white/10" required />
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-white text-sm bg-white/5 border border-white/10" required />
          </div>
          <input placeholder="Postal code (optional)" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-white text-sm bg-white/5 border border-white/10" />
          <select value={form.preferredLocalHubId} onChange={(e) => setForm({ ...form, preferredLocalHubId: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-white text-sm bg-white/5 border border-white/10">
            <option value="">Select nearest local hub (optional)</option>
            {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}{h.area ? ` — ${h.area}` : ''}</option>)}
          </select>
          <button type="submit" disabled={loading} className="w-full py-3 mt-2 rounded-lg font-semibold text-sm text-slate-950 disabled:opacity-50" style={{ background: '#34d399' }}>
            {loading ? 'Saving…' : 'Finish setup'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default CompleteProfile;
