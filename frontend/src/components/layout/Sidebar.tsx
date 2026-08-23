import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Trash2, Truck, Route, RecycleIcon,
  Bell, BarChart3, FileText, Users, LogOut, Box, Zap, Globe
} from 'lucide-react';
import { useAppStore } from '../../store';

const NAV_ITEMS = [
  { path: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/bins',        label: 'Smart Bins',   icon: Box },
  { path: '/waste',       label: 'Waste',        icon: Trash2 },
  { path: '/collections', label: 'Collections',  icon: Zap },
  { path: '/vehicles',    label: 'Vehicles',     icon: Truck },
  { path: '/routes',      label: 'Routes',       icon: Route },
  { path: '/recycling',   label: 'Recycling',    icon: RecycleIcon },
  { path: '/analytics',   label: 'Analytics',    icon: BarChart3 },
  { path: '/alerts',      label: 'Alert Center', icon: Bell },
  { path: '/residents',   label: 'Residents',    icon: Users },
  { path: '/reports',     label: 'Reports',      icon: FileText },
  { path: '/environment', label: 'Eco Impact',   icon: Globe },
];

const Sidebar: React.FC = () => {
  const { user, is3DMode, toggle3DMode, logout } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col w-[220px] min-h-screen flex-shrink-0"
      style={{
        background: 'rgba(10,15,26,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">♻</span>
          <div>
            <div className="text-xs font-bold text-white tracking-wider">WASTE</div>
            <div className="text-xs text-emerald-400 tracking-wider">INTELLIGENCE</div>
          </div>
        </div>
      </div>

      {/* User badge */}
      {user && (
        <div className="px-4 py-3 mx-3 mt-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.12)' }}>
          <div className="text-xs text-emerald-400 font-mono tracking-wider">{user.role}</div>
          <div className="text-sm text-white font-medium mt-0.5">{user.name}</div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200
               ${isActive
                 ? 'text-emerald-400 bg-emerald-500/10 border-l-2 border-emerald-500'
                 : 'text-slate-400 hover:text-white hover:bg-white/5'
               }`
            }
          >
            <item.icon size={15} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* 3D Toggle */}
      <div className="px-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <button
          onClick={toggle3DMode}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer"
          style={{
            background: is3DMode ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${is3DMode ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)'}`,
            color: is3DMode ? '#34d399' : '#64748b',
          }}
        >
          <span className="text-xs">{is3DMode ? '◉' : '○'}</span>
          {is3DMode ? '3D MODE ACTIVE' : '2D MODE'}
        </button>
      </div>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-slate-500
                     hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
