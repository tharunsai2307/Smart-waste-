import React, { useState } from 'react';
import { useAppStore } from '../../store';
import AlertCenter from '../AlertCenter';

const Topbar: React.FC = () => {
  const { user } = useAppStore();
  const [systemOnline] = useState(true);

  const SYSTEMS = [
    { label: 'BIN NETWORK', online: true },
    { label: 'COLLECTION ENGINE', online: true },
    { label: 'ROUTE ENGINE', online: true },
    { label: 'RECYCLING', online: true },
    { label: 'DATABASE', online: systemOnline },
  ];

  return (
    <header className="flex items-center justify-between px-6 py-3 flex-shrink-0 bg-slate-950/90 border-b border-slate-800/80">
      {/* System statuses */}
      <div className="flex items-center gap-4 overflow-x-auto">
        {SYSTEMS.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`pulse-dot w-1.5 h-1.5 rounded-full ${s.online ? 'bg-emerald-400' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-500 tracking-wider font-mono">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="pulse-dot w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400 font-mono tracking-widest">LIVE</span>
        </div>

        {/* Phase 10 Alert Center Dropdown */}
        <AlertCenter />

        {/* User badge */}
        {user && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-200">{user.username}</span>
              <span className="text-[10px] text-slate-400 font-mono">{user.role}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
