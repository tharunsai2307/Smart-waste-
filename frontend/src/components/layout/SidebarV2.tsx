import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Warehouse, Recycle, Truck, Users, Bell, LogOut, ClipboardList, MapPinned, ScrollText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import type { Role } from '../../types/api';

interface NavItem { path: string; label: string; icon: LucideIcon; roles: Role[]; }

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'CLEANER', 'RECYCLING_MANAGER', 'DRIVER', 'RESIDENT'] },
  { path: '/staff', label: 'Staff & Accounts', icon: Users, roles: ['ADMIN'] },
  { path: '/activity', label: 'Activity Log', icon: ScrollText, roles: ['ADMIN'] },
  { path: '/hubs', label: 'Local Hubs', icon: Warehouse, roles: ['ADMIN', 'LOCAL_HUB_MANAGER'] },
  { path: '/recycling-hubs', label: 'Recycling Hubs', icon: Recycle, roles: ['ADMIN', 'RECYCLING_MANAGER'] },
  { path: '/vehicles', label: 'Vehicles', icon: Truck, roles: ['ADMIN', 'RECYCLING_MANAGER', 'LOCAL_HUB_MANAGER'] },
  { path: '/transfers', label: 'Dispatch Board', icon: MapPinned, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'RECYCLING_MANAGER', 'DRIVER'] },
  { path: '/pickups', label: 'Pickup Requests', icon: ClipboardList, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'CLEANER'] },
  { path: '/alerts', label: 'Alert Center', icon: Bell, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'CLEANER', 'RECYCLING_MANAGER', 'DRIVER', 'RESIDENT'] },
];

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  LOCAL_HUB_MANAGER: 'Local Hub Manager',
  CLEANER: 'Cleaner',
  RECYCLING_MANAGER: 'Recycling Manager',
  DRIVER: 'Driver',
  RESIDENT: 'Resident',
};

const SidebarV2: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const navItems = NAV_ITEMS.filter((item) => !user || item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col w-[230px] min-h-screen flex-shrink-0 bg-slate-950/95 border-r border-slate-800/80"
    >
      <div className="px-5 py-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20">♻</div>
          <div>
            <div className="font-bold text-sm text-white tracking-wide leading-none">SmartCity</div>
            <div className="text-[10px] text-emerald-400 font-mono tracking-widest leading-none mt-1">WASTE OS</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-600/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {user && (
          <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs font-semibold text-white truncate">{user.name}</div>
            <div className="text-[10px] text-emerald-400 font-mono tracking-wider">{ROLE_LABEL[user.role]}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </motion.aside>
  );
};

export default SidebarV2;
