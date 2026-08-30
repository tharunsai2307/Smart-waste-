import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Plus,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Layers,
  Search,
  History
} from 'lucide-react';
import { api } from '../services/api';
import { useAppStore } from '../store';

const vehicleTypeIcons: Record<string, any> = {
  TRUCK: Truck,
  COMPACT: Truck,
  TIPPER: Truck,
  CONTAINER: Layers,
};

const statusColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  AVAILABLE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
  ASSIGNED: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
  LOADING: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
  ON_ROUTE: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
  MAINTENANCE: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', glow: 'shadow-rose-500/20' },
  OUT_OF_SERVICE: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', glow: 'shadow-zinc-500/20' },
};

export default function VehicleManagement() {
  const qc = useQueryClient();
  const user = useAppStore(state => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'LOCAL_HUB_MANAGER';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [complianceFilter, setComplianceFilter] = useState<'ALL' | 'COMPLIANT' | 'NON_COMPLIANT'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [regNum, setRegNum] = useState('');
  const [vCode, setVCode] = useState('');
  const [vType, setVType] = useState('TRUCK');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [mYear, setMYear] = useState(new Date().getFullYear());
  const [capacity, setCapacity] = useState(5000);
  const [assignedHub, setAssignedHub] = useState(0);
  const [insExp, setInsExp] = useState('');
  const [inspExp, setInspExp] = useState('');
  const [lastSvc, setLastSvc] = useState('');

  // Fetch all vehicles (or hub vehicles if manager)
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', user?.assignedHub, user?.role],
    queryFn: () => {
      if (isManager && user?.assignedHub) {
        return api.getHubVehicles(user.assignedHub);
      }
      return api.getVehicles(); // ADMIN gets all
    },
    refetchInterval: 5000,
  });

  const { data: hubs = [] } = useQuery({
    queryKey: ['hubs'],
    queryFn: api.getHubs,
    enabled: isAdmin,
  });

  const createVehicleMutation = useMutation({
    mutationFn: api.createVehicle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setIsAddModalOpen(false);
      resetForm();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ vehicleId, status }: { vehicleId: number; status: string }) =>
      api.setVehicleStatus(vehicleId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const resetForm = () => {
    setRegNum('');
    setVCode('');
    setVType('TRUCK');
    setMake('');
    setModel('');
    setMYear(new Date().getFullYear());
    setCapacity(5000);
    setAssignedHub(0);
    setInsExp('');
    setInspExp('');
    setLastSvc('');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVehicleMutation.mutate({
      registrationNumber: regNum,
      vehicleCode: vCode,
      vehicleType: vType,
      make,
      model,
      manufactureYear: Number(mYear),
      capacityKg: Number(capacity),
      assignedHubId: Number(assignedHub),
      insuranceExpiry: insExp,
      inspectionExpiry: inspExp,
      lastServiceDate: lastSvc,
    });
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch =
      v.vehicleCode.toLowerCase().includes(search.toLowerCase()) ||
      v.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.make.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    
    let matchesCompliance = true;
    if (complianceFilter === 'COMPLIANT') matchesCompliance = v.compliant;
    if (complianceFilter === 'NON_COMPLIANT') matchesCompliance = !v.compliant;

    return matchesSearch && matchesStatus && matchesCompliance;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Truck className="w-6 h-6" />
            </span>
            Fleet & Transport Management
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time compliance validation, vehicle status dispatching, and temporary load auditing.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Register Vehicle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search code, plate, make, model..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="LOADING">LOADING</option>
            <option value="ON_ROUTE">ON_ROUTE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
          </select>
          <select
            value={complianceFilter}
            onChange={e => setComplianceFilter(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Compliance</option>
            <option value="COMPLIANT">Compliant Only</option>
            <option value="NON_COMPLIANT">Non-Compliant Only</option>
          </select>
        </div>
      </div>

      {/* Vehicle Grid */}
      {isLoading ? (
        <div className="text-center py-20 text-violet-400 font-mono">LOADING FLEET STATUS...</div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">No vehicles match the filters.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => {
            const colors = statusColors[v.status] || statusColors.OUT_OF_SERVICE;
            const Icon = vehicleTypeIcons[v.vehicleType] || Truck;
            return (
              <motion.div
                key={v.vehicleId}
                layout
                className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700/60 transition shadow-sm relative overflow-hidden"
              >
                {/* Status indicator bar */}
                <div className={`absolute top-0 left-0 w-full h-1 ${colors.text.replace('text-', 'bg-')}`} />

                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white font-mono text-sm">{v.vehicleCode}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{v.make} {v.model} ({v.manufactureYear})</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                    {v.status}
                  </span>
                </div>

                <div className="space-y-3.5 my-4">
                  {/* Load metric */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-500">Temporary Route Load</span>
                      <span className="font-mono text-zinc-300">
                        {v.currentLoad.toLocaleString()} / {v.capacityKg.toLocaleString()} kg
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-850 overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${Math.min((v.currentLoad / v.capacityKg) * 100 || 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/40 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Registration Plate</span>
                      <span className="font-mono text-zinc-200">{v.registrationNumber}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Odometer</span>
                      <span className="font-mono text-zinc-200">{v.odometerKm.toLocaleString()} km</span>
                    </div>
                  </div>

                  {/* Compliance Card */}
                  <div className={`p-3 rounded-xl border flex gap-2.5 items-start ${v.compliant ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-rose-500/5 border-rose-500/10 text-rose-400'}`}>
                    {v.compliant ? (
                      <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <div className="text-xs">
                      <span className="font-bold block text-[11px] uppercase tracking-wide">
                        {v.compliant ? 'Compliant & Valid' : 'Compliance Warning'}
                      </span>
                      <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                        {v.compliant ? 'All municipal safety audits & certificates valid.' : v.complianceNote}
                      </p>
                    </div>
                  </div>

                  {/* Expirations list */}
                  <div className="space-y-1.5 border-t border-zinc-800/50 pt-3 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-zinc-500" /> Insurance Exp</span>
                      <span className="font-mono text-zinc-300">{v.insuranceExpiry}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-zinc-500" /> Inspection Exp</span>
                      <span className="font-mono text-zinc-300">{v.inspectionExpiry}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-zinc-500" /> Last Service</span>
                      <span className="font-mono text-zinc-300">{v.lastServiceDate}</span>
                    </div>
                  </div>
                </div>

                {/* Actions (Admin/Manager only) */}
                {(isAdmin || isManager) && (
                  <div className="flex gap-2 border-t border-zinc-850 pt-3">
                    {v.status === 'AVAILABLE' ? (
                      <button
                        onClick={() => updateStatusMutation.mutate({ vehicleId: v.vehicleId, status: 'MAINTENANCE' })}
                        className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition"
                      >
                        Send to Maintenance
                      </button>
                    ) : v.status === 'MAINTENANCE' ? (
                      <button
                        onClick={() => updateStatusMutation.mutate({ vehicleId: v.vehicleId, status: 'AVAILABLE' })}
                        className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition"
                      >
                        Complete Maintenance
                      </button>
                    ) : (
                      <div className="text-[11px] text-zinc-500 text-center flex-1 py-1 font-mono bg-zinc-950/20 border border-zinc-850 rounded-lg">
                        Status Locked: {v.status}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Register Vehicle Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-violet-400" /> Register New Vehicle
                </h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-zinc-400 hover:text-white transition text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Vehicle Code (unique)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VEH-005"
                      value={vCode}
                      onChange={e => setVCode(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Registration Plate</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KA-03-MC-1234"
                      value={regNum}
                      onChange={e => setRegNum(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Vehicle Type</label>
                    <select
                      value={vType}
                      onChange={e => setVType(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    >
                      <option value="TRUCK">Heavy Duty Truck</option>
                      <option value="COMPACT">Compact Collector</option>
                      <option value="TIPPER">Dumper / Tipper</option>
                      <option value="CONTAINER">Container Carrier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Capacity (kg)</label>
                    <input
                      type="number"
                      required
                      min="100"
                      value={capacity}
                      onChange={e => setCapacity(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Make</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tata"
                      value={make}
                      onChange={e => setMake(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Model</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prima"
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Year</label>
                    <input
                      type="number"
                      required
                      min="2000"
                      max="2027"
                      value={mYear}
                      onChange={e => setMYear(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Assigned Local Hub</label>
                    <select
                      value={assignedHub}
                      onChange={e => setAssignedHub(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    >
                      <option value="0">Unassigned (General Fleet)</option>
                      {hubs.map(h => (
                        <option key={h.hubId} value={h.hubId}>
                          {h.name} ({h.hubCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="border-t border-zinc-800/60 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Compliance & Expiry Certificates</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Insurance Expiry</label>
                      <input
                        type="date"
                        required
                        value={insExp}
                        onChange={e => setInsExp(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Inspection Expiry</label>
                      <input
                        type="date"
                        required
                        value={inspExp}
                        onChange={e => setInspExp(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Last Service Date</label>
                      <input
                        type="date"
                        required
                        value={lastSvc}
                        onChange={e => setLastSvc(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl text-sm font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createVehicleMutation.isPending}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
                  >
                    {createVehicleMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Confirm Registration
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
