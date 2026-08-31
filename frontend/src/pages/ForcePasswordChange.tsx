import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../services/api2';
import { useAuthStore } from '../store/authStore';

const ForcePasswordChange: React.FC = () => {
  const navigate = useNavigate();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await authApi.changePassword({ newPassword });
      updateUser({ mustChangePassword: false });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 30% 20%, #241d10 0%, #030807 65%)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 w-full max-w-sm">
        <h2 className="text-lg text-white font-semibold text-center mb-1">Set a new password</h2>
        <p className="text-xs text-slate-400 text-center mb-6">Your administrator issued a temporary password. Choose a new one to continue.</p>
        {error && <div className="p-3 mb-4 rounded-lg text-red-300 text-xs text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white text-sm bg-white/5 border border-white/10" required />
          <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white text-sm bg-white/5 border border-white/10" required />
          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold text-sm text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
            {loading ? 'Saving…' : 'Update password & continue'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ForcePasswordChange;
