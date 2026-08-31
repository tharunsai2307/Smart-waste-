import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { alertsApi } from '../../services/api2';
import { useAuthStore } from '../../store/authStore';

const TopbarV2: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['activeAlerts'],
    queryFn: () => alertsApi.list('ACTIVE'),
    refetchInterval: 15000,
    enabled: !!user,
  });
  const count = data?.alerts?.length || 0;

  return (
    <header className="flex items-center justify-between px-6 py-3 flex-shrink-0 bg-slate-950/90 border-b border-slate-800/80">
      <div className="flex items-center gap-2">
        <span className="pulse-dot w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs text-emerald-400 font-mono tracking-widest">LIVE · REAL DATA</span>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
        >
          <Bell size={16} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold bg-rose-600 text-white rounded-full border border-slate-950">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default TopbarV2;
