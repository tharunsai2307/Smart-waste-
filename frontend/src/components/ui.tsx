import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`glass p-5 ${className}`}>{children}</div>
);

export const StatCard: React.FC<{ label: string; value: React.ReactNode; sub?: string; accent?: string }> = ({ label, value, sub, accent = '#34d399' }) => (
  <Card>
    <div className="text-[11px] uppercase tracking-widest text-slate-400 mb-2">{label}</div>
    <div className="text-2xl font-bold text-white" style={{ color: accent }}>{value}</div>
    {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
  </Card>
);

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#34d399', PENDING: '#fbbf24', ASSIGNED: '#22d3ee', COLLECTED: '#34d399', MISSED: '#f87171', CANCELLED: '#64748b',
  REQUESTED: '#94a3b8', DRIVER_ASSIGNED: '#22d3ee', ON_THE_JOB: '#818cf8', ARRIVED_AT_HUB: '#a78bfa', LOADED: '#f59e0b',
  EN_ROUTE: '#38bdf8', ARRIVED_AT_RECYCLING: '#c084fc', RECEIVED: '#34d399', COMPLETED: '#34d399',
  IDLE: '#94a3b8', EN_ROUTE_V: '#38bdf8', MAINTENANCE: '#f59e0b', OUT_OF_SERVICE: '#f87171',
  LOW: '#94a3b8', MEDIUM: '#fbbf24', HIGH: '#fb923c', CRITICAL: '#f87171',
  RESOLVED: '#64748b', ACKNOWLEDGED: '#22d3ee',
  SUSPENDED: '#f87171',
};

export const Badge: React.FC<{ status: string; children?: React.ReactNode }> = ({ status, children }) => {
  const color = STATUS_COLORS[status] || '#94a3b8';
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {children || status.replace(/_/g, ' ')}
    </span>
  );
};

export const ProgressBar: React.FC<{ pct: number; warn?: number; crit?: number }> = ({ pct, warn = 75, crit = 90 }) => {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped >= crit ? '#f87171' : clamped >= warn ? '#fbbf24' : '#34d399';
  return (
    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
};

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...rest }) => (
  <button
    {...rest}
    className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...rest }) => (
  <button
    {...rest}
    className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition-all disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...rest }) => (
  <input {...rest} className={`w-full px-3 py-2.5 rounded-lg text-white text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500/50 ${className}`} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...rest }) => (
  <select {...rest} className={`w-full px-3 py-2.5 rounded-lg text-white text-sm bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500/50 ${className}`}>
    {children}
  </select>
);

export const EmptyState: React.FC<{ message: string; hint?: string }> = ({ message, hint }) => (
  <div className="text-center py-12 text-slate-500">
    <div className="text-3xl mb-2">📭</div>
    <div className="text-sm font-medium">{message}</div>
    {hint && <div className="text-xs mt-1 text-slate-600">{hint}</div>}
  </div>
);

export const DangerButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...rest }) => (
  <button
    {...rest}
    className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide bg-rose-500 text-white hover:bg-rose-400 transition-all disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(2,6,23,0.78)' }}
    onClick={onClose}
  >
    <div
      className={`glass p-6 rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-white font-semibold text-sm">{title}</div>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 text-xs">✕</button>
      </div>
      {children}
    </div>
  </div>
);
