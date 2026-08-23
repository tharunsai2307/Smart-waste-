import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { useAppStore } from '../store';
import type { AuthUser } from '../types';

const LoginPage: React.FC = () => {
  const setUser = useAppStore((s) => s.setUser);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(username, password);
      if (res.success && res.role) {
        setUser({
          userId: res.userId!,
          name: res.name!,
          username: res.username!,
          role: res.role as AuthUser['role'],
        });
      } else {
        setError(res.message || 'Invalid credentials');
      }
    } catch {
      setError('Cannot connect to backend. Ensure server.exe is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{ background: 'radial-gradient(ellipse at 30% 50%, #0d2040 0%, #020810 70%)' }}>
      
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10"
           style={{
             backgroundImage: 'linear-gradient(rgba(52,211,153,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.3) 1px, transparent 1px)',
             backgroundSize: '60px 60px'
           }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
           style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
           style={{ background: 'radial-gradient(circle, #22d3ee, transparent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md p-8 glass"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">♻</div>
          <h1 className="text-2xl font-bold text-white tracking-wide">WASTE INTELLIGENCE</h1>
          <p className="text-xs text-emerald-400 tracking-[0.3em] mt-1">COMMAND CENTER ACCESS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs text-slate-400 tracking-widest mb-2">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-white text-sm font-mono
                         focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                         transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="admin01"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 tracking-widest mb-2">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-white text-sm font-mono
                         focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                         transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="pass123"
              required
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-lg text-red-400 text-xs text-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-lg font-semibold text-sm tracking-widest transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
          >
            {loading ? 'AUTHENTICATING...' : 'ENTER COMMAND CENTER'}
          </motion.button>
        </form>

        {/* Demo credentials hint */}
        <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-xs text-slate-600 mb-2">DEMO CREDENTIALS</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'ADMIN', user: 'admin01' },
              { role: 'MANAGER', user: 'manager01' },
              { role: 'OPERATOR', user: 'operator01' },
              { role: 'RESIDENT', user: 'resident01' },
            ].map((c) => (
              <button
                key={c.user}
                onClick={() => { setUsername(c.user); setPassword('pass123'); }}
                className="text-xs py-2 px-3 rounded text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {c.role}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
