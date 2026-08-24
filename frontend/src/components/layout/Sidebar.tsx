import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Trash2, Truck, Route, RecycleIcon,
  Bell, BarChart3, FileText, Users, LogOut, Box, Zap, Globe, Warehouse, Map,
  Home, ClipboardCheck, TrendingUp
} from 'lucide-react';
import { useAppStore } from '../../store';

const ALL_NAV_ITEMS = [
  // Resident items
  { path: '/resident-portal', label: 'My Pickups', icon: Home, roles: ['RESIDENT', 'ADMIN'] },
  // Cleaner items
  { path: '/cleaner-ops', label: 'Field Ops', icon: ClipboardCheck, roles: ['CLEANER', 'ADMIN', 'LOCAL_HUB_MANAGER'] },
  // Driver items
  { path: '/driver-dashboard', label: 'Driver Portal', icon: ClipboardCheck, roles: ['DRIVER', 'ADMIN'] },
  // Core Management items
  { path: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'DRIVER', 'RECYCLING_MANAGER'] },
  { path: '/hubs',        label: 'Local Hubs',   icon: Warehouse, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'CLEANER', 'RESIDENT'] },
  { path: '/collections', label: 'Operations',   icon: Zap, roles: ['ADMIN', 'LOCAL_HUB_MANAGER'] },
  { path: '/bins',        label: 'Smart Bins',   icon: Box, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'CLEANER'] },
  { path: '/waste',       label: 'Waste Ledger', icon: Trash2, roles: ['ADMIN', 'LOCAL_HUB_MANAGER'] },
  { path: '/vehicles',    label: 'Vehicles',     icon: Truck, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'DRIVER'] },
  { path: '/transfers',   label: 'Transfers',    icon: TrendingUp, roles: ['ADMIN', 'LOCAL_HUB_MANAGER'] },
  { path: '/routes',      label: 'Routes',       icon: Route, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'DRIVER', 'CLEANER'] },
  { path: '/recycling',   label: 'Recycling',    icon: RecycleIcon, roles: ['ADMIN', 'RECYCLING_MANAGER'] },
  { path: '/alerts',      label: 'Alert Center', icon: Bell, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'CLEANER', 'RESIDENT'] },
  { path: '/gis',         label: 'GIS Command',  icon: Map, roles: ['ADMIN', 'LOCAL_HUB_MANAGER'] },
  { path: '/analytics',   label: 'Analytics',    icon: BarChart3, roles: ['ADMIN', 'LOCAL_HUB_MANAGER'] },
  { path: '/residents',   label: 'Residents',    icon: Users, roles: ['ADMIN', 'LOCAL_HUB_MANAGER'] },
  { path: '/environment', label: 'Eco Impact',   icon: Globe, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'RESIDENT'] },
  { path: '/reports',     label: 'Reports',      icon: FileText, roles: ['ADMIN', 'LOCAL_HUB_MANAGER'] },
];

const Sidebar: React.FC = () => {
  const { user, is3DMode, toggle3DMode, logout } = useAppStore();
  const navigate = useNavigate();

  const navItems = ALL_NAV_ITEMS.filter(item => !user || !item.roles || item.roles.includes(user.role));

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
        {navItems.map((item) => (
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
