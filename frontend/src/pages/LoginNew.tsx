import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Recycle, Truck, Warehouse, Wrench, UserCircle2, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { authApi } from '../services/api2';
import { useAuthStore } from '../store/authStore';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import type { Role } from '../types/api';

// Each "panel" is a distinct login section. Residents get Google-only.
// Every staff role shares the same username/password mechanic (admin-issued),
// just themed differently so the operator instantly knows which seat they're in.
const PANELS: { role: Role; title: string; subtitle: string; icon: LucideIcon; accent: string }[] = [
  { role: 'RESIDENT', title: 'Resident', subtitle: 'Request pickups, track your impact', icon: UserCircle2, accent: '#34d399' },
  { role: 'CLEANER', title: 'Cleaner', subtitle: 'Field collection & hub drop-off', icon: Wrench, accent: '#f59e0b' },
  { role: 'LOCAL_HUB_MANAGER', title: 'Local Hub Manager', subtitle: 'Manage a collection hub & crew', icon: Warehouse, accent: '#22d3ee' },
  { role: 'DRIVER', title: 'Driver', subtitle: 'Scan, haul, deliver', icon: Truck, accent: '#818cf8' },
  { role: 'RECYCLING_MANAGER', title: 'Recycling Manager', subtitle: 'Dispatch fleet, process material', icon: Recycle, accent: '#f472b6' },
  { role: 'ADMIN', title: 'Administrator', subtitle: 'Full system oversight', icon: ShieldCheck, accent: '#facc15' },
];

const LoginPageNew: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const active = PANELS[index];
  const Icon = active.icon;

  const goTo = (i: number) => {
    setError('');
    setIndex((i + PANELS.length) % PANELS.length);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.loginStaff(username, password);
      setSession(res.token, res.user);
      if (res.user.mustChangePassword) {
        navigate('/force-password-change', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;
      const res = await authApi.loginGoogle({
        googleUid: gUser.uid,
        email: gUser.email || '',
        name: gUser.displayName || 'Resident',
        avatarUrl: gUser.photoURL || undefined,
      });
      setSession(res.token, res.user);
      if (!res.user.profileComplete) {
        navigate('/complete-profile', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.code === 'auth/unauthorized-domain'
          ? 'Google sign-in is not yet authorized for this preview domain. It will work once deployed to a registered domain.'
          : err.message || 'Google sign-in failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const dragConstraints = useMemo(() => ({ left: 0, right: 0 }), []);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{ background: 'radial-gradient(ellipse at 30% 20%, #10241d 0%, #030807 65%)' }}>

      <div className="absolute inset-0 opacity-[0.07]"
           style={{
             backgroundImage: 'linear-gradient(rgba(52,211,153,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.4) 1px, transparent 1px)',
             backgroundSize: '54px 54px'
           }} />
      <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full opacity-20 blur-3xl transition-colors duration-700"
           style={{ background: `radial-gradient(circle, ${active.accent}, transparent)` }} />
      <div className="absolute -bottom-32 -right-32 w-[26rem] h-[26rem] rounded-full opacity-10 blur-3xl"
           style={{ background: 'radial-gradient(circle, #22d3ee, transparent)' }} />

      <div className="relative z-10 w-full max-w-lg px-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">♻</div>
          <h1 className="text-2xl font-bold text-white tracking-wide">SMART WASTE INTELLIGENCE</h1>
          <p className="text-[11px] text-emerald-400 tracking-[0.35em] mt-1 uppercase">Real-time civic operations platform</p>
        </div>

        {/* Panel slider */}
        <div className="relative">
          <button
            onClick={() => goTo(index - 1)}
            aria-label="Previous role"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all backdrop-blur"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => goTo(index + 1)}
            aria-label="Next role"
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all backdrop-blur"
          >
            <ChevronRight size={18} />
          </button>

          <AnimatePresence mode="wait" custom={index}>
            <motion.div
              key={active.role}
              custom={index}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              drag="x"
              dragConstraints={dragConstraints}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) goTo(index + 1);
                else if (info.offset.x > 80) goTo(index - 1);
              }}
              className="glass p-8 flex flex-col min-h-[430px] cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `${active.accent}22`, border: `1px solid ${active.accent}44` }}>
                  <Icon size={22} color={active.accent} />
                </div>
                <div>
                  <div className="text-lg font-semibold text-white leading-tight">{active.title}</div>
                  <div className="text-xs text-slate-400 leading-tight mt-0.5">{active.subtitle}</div>
                </div>
              </div>

              {error && (
                <div className="p-3 mb-4 rounded-lg text-red-300 text-xs text-center"
                     style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  {error}
                </div>
              )}

              {active.role === 'RESIDENT' ? (
                <div className="flex-1 flex flex-col">
                  <p className="text-sm text-slate-300 text-center mb-6 leading-relaxed">
                    Residents sign in exclusively with Google — no separate password to manage.
                    First-time sign-in will ask for your address so pickups reach the right hub.
                  </p>
                  <div className="mt-auto pt-2">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full py-3 rounded-lg font-semibold text-sm tracking-wide flex items-center justify-center gap-2 transition-all bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      {loading ? 'Signing in…' : 'Continue with Google'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleStaffLogin} className="flex-1 flex flex-col space-y-4">
                  <p className="text-xs text-slate-400 -mt-2 mb-1">
                    Credentials for this role are issued by your system administrator.
                  </p>
                  <div>
                    <label className="block text-xs text-slate-400 tracking-widest mb-1.5">USERNAME</label>
                    <input
                      type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                      className="w-full px-4 py-3 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-1 transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 tracking-widest mb-1.5">PASSWORD</label>
                    <input
                      type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="w-full px-4 py-3 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-1 transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <div className="mt-auto pt-2">
                    <button
                      type="submit" disabled={loading}
                      className="w-full py-3 rounded-lg font-semibold text-sm tracking-widest text-slate-950 transition-all disabled:opacity-50"
                      style={{ background: active.accent }}
                    >
                      {loading ? 'Authenticating…' : `Sign in as ${active.title}`}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {PANELS.map((p, i) => (
            <button
              key={p.role}
              onClick={() => goTo(i)}
              aria-label={`Go to ${p.title}`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? '22px' : '7px',
                background: i === index ? active.accent : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPageNew;
