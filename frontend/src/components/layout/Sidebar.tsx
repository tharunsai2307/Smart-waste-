import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Trash2, Truck, Route, RecycleIcon,
  Bell, BarChart3, FileText, Users, LogOut, Box, Zap, Globe, Warehouse, Map,
  Home, ClipboardCheck, TrendingUp, ShieldAlert, Building2, Database
} from 'lucide-react';
import { useAppStore } from '../../store';
import { api } from '../../services/api';
import { setActiveWorkspaceOverride } from '../../services/api';

const ALL_NAV_ITEMS = [
  // Resident items
  { path: '/resident-portal', label: 'My Pickups', icon: Home, roles: ['RESIDENT', 'ADMIN'] },
  // Cleaner items
  { path: '/cleaner-ops', label: 'Field Ops', icon: ClipboardCheck, roles: ['CLEANER', 'ADMIN', 'LOCAL_HUB_MANAGER'] },
  // Driver items
  { path: '/driver-dashboard', label: 'Driver Portal', icon: ClipboardCheck, roles: ['DRIVER', 'ADMIN'] },
  // Core Management items
  { path: '/executive-command', label: 'Command Center', icon: LayoutDashboard, roles: ['ADMIN'] },
  { path: '/workspaces', label: 'Workspaces', icon: Building2, roles: ['ADMIN', 'MUNICIPAL_ADMIN'] },
  { path: '/governance', label: 'Data Governance', icon: Database, roles: ['ADMIN', 'MUNICIPAL_ADMIN'] },
  { path: '/incident-command', label: 'Incident Command', icon: ShieldAlert, roles: ['ADMIN', 'LOCAL_HUB_MANAGER', 'DRIVER', 'RECYCLING_MANAGER'] },
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

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Session may already be expired; local logout still applies.
    }
    setActiveWorkspaceOverride(null);
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col w-[220px] min-h-screen flex-shrink-0 bg-slate-950/95 border-r border-slate-800/80"
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20">
            ♻
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-wide leading-none">SmartCity</div>
            <div className="text-[10px] text-emerald-400 font-mono tracking-widest leading-none mt-1">WASTE OS</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md shadow-blue-600/10'
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

      {/* Footer controls */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <button
          onClick={toggle3DMode}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
        >
          <span>3D Visuals</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${is3DMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
            {is3DMode ? 'ON' : 'OFF'}
          </span>
        </button>

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

export default Sidebar;
