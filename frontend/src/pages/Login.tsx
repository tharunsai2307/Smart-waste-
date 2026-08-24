import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useAppStore } from '../store';
import type { AuthUser } from '../types';

type LoginTab = 'RESIDENT' | 'STAFF';

const LoginPage: React.FC = () => {
  const setUser = useAppStore((s) => s.setUser);
  const [tab, setTab] = useState<LoginTab>('RESIDENT');
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Google Mock State
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  
  // Step State
  const [step, setStep] = useState<'LOGIN' | 'RESIDENT_PROFILE' | 'STAFF_PASSWORD'>('LOGIN');
  
  // Profile Forms
  const [resProfile, setResProfile] = useState({ address: '', area: '', city: '', postalCode: '', location: '', phone: '' });
  const [staffPwd, setStaffPwd] = useState({ oldPassword: '', newPassword: '' });

  const finishLogin = (userParams: any) => {
    setUser({
      userId: userParams.userId,
      name: userParams.name,
      username: userParams.username,
      role: userParams.role as AuthUser['role'],
    });
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(username, password);
      if (res.success && res.role) {
        if (res.requiresPasswordChange) {
          // Temporarily set user in store so api calls have token
          useAppStore.setState({ user: { userId: res.userId!, name: res.name!, username: res.username!, role: res.role as AuthUser['role'] } });
          setStep('STAFF_PASSWORD');
          setStaffPwd({ ...staffPwd, oldPassword: password });
        } else {
          finishLogin(res);
        }
      } else {
        setError(res.message || 'Invalid credentials');
      }
    } catch {
      setError('Cannot connect to backend. Ensure server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginMock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.googleLogin(googleEmail, googleName);
      if (res.success) {
        useAppStore.setState({ user: { userId: res.userId!, name: res.name!, username: res.username!, role: res.role as AuthUser['role'] } });
        if (!res.profileComplete) {
          setStep('RESIDENT_PROFILE');
        } else {
          finishLogin(res);
        }
      } else {
        setError(res.message || 'Google login failed');
      }
    } catch {
      setError('Cannot connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.completeResidentProfile(resProfile);
      if (res.success) {
        // trigger full login reload basically by just allowing user to proceed
        const user = useAppStore.getState().user;
        finishLogin(user);
      } else {
        setError(res.message || 'Failed to update profile');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.changePassword(staffPwd.oldPassword, staffPwd.newPassword);
      if (res.success) {
        const user = useAppStore.getState().user;
        finishLogin(user);
      } else {
        setError(res.message || 'Failed to change password');
      }
    } catch {
      setError('Connection error');
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
        className="relative z-10 w-full max-w-md p-8 glass flex flex-col min-h-[500px]"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">♻</div>
          <h1 className="text-2xl font-bold text-white tracking-wide">WASTE INTELLIGENCE</h1>
          <p className="text-xs text-emerald-400 tracking-[0.3em] mt-1">COMMAND CENTER ACCESS</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 mb-4 rounded-lg text-red-400 text-xs text-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            {error}
          </motion.div>
        )}

        {step === 'LOGIN' && (
          <>
            {/* Animated Tab Slider */}
            <div className="relative flex rounded-lg p-1 mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div 
                className="absolute inset-y-1 rounded-md transition-all duration-300 ease-out z-0"
                style={{ 
                  background: 'rgba(52,211,153,0.2)',
                  width: 'calc(50% - 4px)',
                  left: tab === 'RESIDENT' ? '4px' : '50%'
                }}
              />
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold tracking-wider z-10 transition-colors ${tab === 'RESIDENT' ? 'text-emerald-400' : 'text-slate-400'}`}
                onClick={() => { setTab('RESIDENT'); setError(''); }}
              >
                RESIDENT
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-semibold tracking-wider z-10 transition-colors ${tab === 'STAFF' ? 'text-emerald-400' : 'text-slate-400'}`}
                onClick={() => { setTab('STAFF'); setError(''); }}
              >
                STAFF
              </button>
            </div>

            <AnimatePresence mode="wait">
              {tab === 'RESIDENT' ? (
                <motion.form
                  key="resident"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleGoogleLoginMock}
                  className="space-y-4 flex-1 flex flex-col"
                >
                  <div className="text-center text-sm text-slate-300 mb-4">
                    Sign in with your Google account to manage waste and earn Eco Points.
                  </div>
                  <div>
                    <input type="email" value={googleEmail} onChange={e => setGoogleEmail(e.target.value)} required placeholder="Email Address" className="w-full px-4 py-3 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <input type="text" value={googleName} onChange={e => setGoogleName(e.target.value)} required placeholder="Full Name" className="w-full px-4 py-3 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div className="mt-auto pt-4">
                    <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold text-sm tracking-widest flex items-center justify-center gap-2 transition-all bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50">
                      <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                      {loading ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="staff"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleStaffLogin}
                  className="space-y-4 flex-1 flex flex-col"
                >
                  <div>
                    <label className="block text-xs text-slate-400 tracking-widest mb-2">USERNAME</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} required />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 tracking-widest mb-2">PASSWORD</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} required />
                  </div>
                  <div className="mt-auto pt-4">
                    <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold text-sm tracking-widest transition-all text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}>
                      {loading ? 'AUTHENTICATING...' : 'SECURE LOGIN'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </>
        )}

        {step === 'RESIDENT_PROFILE' && (
          <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleCompleteResident} className="space-y-3 flex-1 flex flex-col">
            <h2 className="text-lg text-white text-center mb-2 font-semibold">Complete Your Profile</h2>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={resProfile.address} onChange={e => setResProfile({...resProfile, address: e.target.value})} placeholder="Address" required className="col-span-2 w-full px-3 py-2 rounded-lg text-white text-sm bg-white/5 border border-white/10" />
              <input type="text" value={resProfile.area} onChange={e => setResProfile({...resProfile, area: e.target.value})} placeholder="Area" required className="w-full px-3 py-2 rounded-lg text-white text-sm bg-white/5 border border-white/10" />
              <input type="text" value={resProfile.city} onChange={e => setResProfile({...resProfile, city: e.target.value})} placeholder="City" required className="w-full px-3 py-2 rounded-lg text-white text-sm bg-white/5 border border-white/10" />
              <input type="text" value={resProfile.postalCode} onChange={e => setResProfile({...resProfile, postalCode: e.target.value})} placeholder="Postal Code" required className="w-full px-3 py-2 rounded-lg text-white text-sm bg-white/5 border border-white/10" />
              <input type="text" value={resProfile.phone} onChange={e => setResProfile({...resProfile, phone: e.target.value})} placeholder="Phone" required className="w-full px-3 py-2 rounded-lg text-white text-sm bg-white/5 border border-white/10" />
            </div>
            <div className="mt-auto pt-4">
              <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold text-sm tracking-widest text-white" style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}>
                {loading ? 'SAVING...' : 'COMPLETE SETUP'}
              </button>
            </div>
          </motion.form>
        )}

        {step === 'STAFF_PASSWORD' && (
          <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleStaffPasswordChange} className="space-y-4 flex-1 flex flex-col">
            <h2 className="text-lg text-white text-center mb-2 font-semibold text-orange-400">Security Requirement</h2>
            <p className="text-xs text-slate-300 text-center mb-4">You are required to change your password on first login.</p>
            <div>
              <label className="block text-xs text-slate-400 tracking-widest mb-1">NEW PASSWORD</label>
              <input type="password" value={staffPwd.newPassword} onChange={e => setStaffPwd({...staffPwd, newPassword: e.target.value})} required className="w-full px-4 py-3 rounded-lg text-white text-sm bg-white/5 border border-white/10" />
            </div>
            <div className="mt-auto pt-4">
              <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold text-sm tracking-widest text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
                {loading ? 'UPDATING...' : 'CHANGE PASSWORD'}
              </button>
            </div>
          </motion.form>
        )}

      </motion.div>
    </div>
  );
};

export default LoginPage;
