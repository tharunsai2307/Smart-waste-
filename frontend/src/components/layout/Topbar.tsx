import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAppStore } from '../../store';
import { Bell } from 'lucide-react';

const Topbar: React.FC = () => {
  const { user } = useAppStore();
  const [systemOnline] = useState(true);

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: api.getAlerts,
    refetchInterval: 8000,
  });

  const activeAlerts = alerts?.filter(a => !a.resolved).length ?? 0;

  const SYSTEMS = [
    { label: 'BIN NETWORK', online: true },
    { label: 'COLLECTION ENGINE', online: true },
    { label: 'ROUTE ENGINE', online: true },
    { label: 'RECYCLING', online: true },
    { label: 'DATABASE', online: systemOnline },
  ];

  return (
    <header className="flex items-center justify-between px-6 py-3 flex-shrink-0"
            style={{ background: 'rgba(10,15,26,0.9)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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

        {/* Alert count */}
        {activeAlerts > 0 && (
          <div className="relative">
            <Bell size={16} className="text-amber-400" />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center leading-none">
              {activeAlerts > 9 ? '9+' : activeAlerts}
            </span>
          </div>
        )}

        {/* User badge */}
        {user && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
               style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">
              {user.name[0]}
            </span>
            <span className="text-xs text-white">{user.name}</span>
            <span className="text-xs text-slate-500">{user.role}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
