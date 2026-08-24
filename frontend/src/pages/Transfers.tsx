import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  CheckCircle,
  XCircle,
  Truck,
  Plus,
  Scale,
  FileSpreadsheet,
  AlertTriangle,
  History,
  UserCheck,
  Search,
  Layers,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import type { WasteTransfer } from '../types';
import { useAppStore } from '../store';

const statusGradients: Record<string, string> = {
  REQUESTED: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-400',
  APPROVED: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30 text-cyan-400',
  DRIVER_ASSIGNED: 'from-purple-500/10 to-violet-500/10 border-purple-500/30 text-purple-400',
  VEHICLE_ASSIGNED: 'from-violet-500/10 to-fuchsia-500/10 border-violet-500/30 text-violet-400',
  DRIVER_CHECKED_IN: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-400',
  LOADING: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30 text-yellow-400',
  LOADED: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-400',
  DEPARTED: 'from-orange-500/10 to-rose-500/10 border-orange-500/30 text-orange-400',
  EN_ROUTE: 'from-pink-500/10 to-rose-500/10 border-pink-500/30 text-pink-400',
  ARRIVED: 'from-teal-500/10 to-emerald-500/10 border-teal-500/30 text-teal-400',
  UNLOADING: 'from-cyan-500/10 to-teal-500/10 border-cyan-500/30 text-cyan-400',
  DELIVERED: 'from-emerald-500/10 to-green-500/10 border-emerald-500/30 text-emerald-400',
  COMPLETED: 'from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-400',
  CANCELLED: 'from-rose-500/10 to-red-500/10 border-rose-500/30 text-rose-400',
  DELAYED: 'from-red-500/10 to-orange-500/10 border-red-500/30 text-red-400',
};

export default function Transfers() {
  const qc = useQueryClient();
  const user = useAppStore(state => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'LOCAL_HUB_MANAGER';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);

  // Assignment Modal states
  const [assigningTransfer, setAssigningTransfer] = useState<WasteTransfer | null>(null);
  const [assignmentType, setAssignmentType] = useState<'DRIVER' | 'VEHICLE' | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number>(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(0);

  // New Transfer Request Form
  const [destFacility, setDestFacility] = useState(0);
  const [destType, setDestType] = useState('RECYCLING_HUB');
  const [wasteType, setWasteType] = useState('Organic');
  const [plannedWeight, setPlannedWeight] = useState(2500);
  const [priority, setPriority] = useState('NORMAL');
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [tCode, setTCode] = useState('');
  const [errMessage, setErrMessage] = useState('');

  // Fetch Transfers
  const { data: transfers = [], isLoading: isTransfersLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: api.getTransfers,
    refetchInterval: 5000,
  });

  // Fetch Analytics
  const { data: analytics } = useQuery({
    queryKey: ['transfers-analytics'],
    queryFn: api.getTransportAnalytics,
    refetchInterval: 10000,
  });

  // Fetch Facilities
  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: api.getFacilities,
  });

  // Fetch Available Drivers
  const { data: availableDrivers = [] } = useQuery({
    queryKey: ['drivers', 'available'],
    queryFn: api.getAvailableDrivers,
    enabled: !!assigningTransfer && assignmentType === 'DRIVER',
  });

  // Fetch Available Vehicles
  const { data: availableVehicles = [] } = useQuery({
    queryKey: ['vehicles', 'available', assigningTransfer?.sourceHubId],
    queryFn: () => api.getAvailableVehicles(assigningTransfer?.sourceHubId),
    enabled: !!assigningTransfer && assignmentType === 'VEHICLE',
  });

  // Fetch Chain of Custody Trace Details
  const { data: chainDetails, isLoading: isChainLoading } = useQuery({
    queryKey: ['transfer-chain', selectedChainId],
    queryFn: () => api.getTransferChain(selectedChainId!),
    enabled: selectedChainId !== null,
  });

  // Mutations
  const createTransferMutation = useMutation({
    mutationFn: api.createTransfer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['transfers-analytics'] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrMessage(err.message || 'Failed to request transfer. Check available hub load capacity.');
    }
  });

  const approveMutation = useMutation({
    mutationFn: api.approveTransfer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['transfers-analytics'] });
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: ({ transferId, driverId }: { transferId: number; driverId: number }) =>
      api.assignDriver(transferId, driverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      setAssigningTransfer(null);
      setAssignmentType(null);
      setSelectedDriverId(0);
    },
  });

  const assignVehicleMutation = useMutation({
    mutationFn: ({ transferId, vehicleId }: { transferId: number; vehicleId: number }) =>
      api.assignVehicle(transferId, vehicleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      setAssigningTransfer(null);
      setAssignmentType(null);
      setSelectedVehicleId(0);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: api.cancelTransfer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] });
      qc.invalidateQueries({ queryKey: ['transfers-analytics'] });
    },
  });

  const resetForm = () => {
    setDestFacility(0);
    setDestType('RECYCLING_HUB');
    setWasteType('Organic');
    setPlannedWeight(2500);
    setPriority('NORMAL');
    setScheduledDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setScheduledTime('09:00');
    setTCode('');
    setErrMessage('');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrMessage('');
    
    // Generate transfer code if empty
    const code = tCode.trim() || `TRF-${Math.floor(1000 + Math.random() * 9000)}`;

    createTransferMutation.mutate({
      destinationFacilityId: Number(destFacility),
      destinationType: destType,
      wasteType,
      plannedWeightKg: Number(plannedWeight),
      priority,
      scheduledDate,
      scheduledTime,
      transferCode: code,
      sourceHubId: isManager ? user?.assignedHub : undefined
    });
  };

  const filteredTransfers = transfers.filter(t => {
    const matchesSearch =
      t.transferCode.toLowerCase().includes(search.toLowerCase()) ||
      t.wasteType.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <TrendingUp className="w-6 h-6" />
            </span>
            Outbound Waste Transfers
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Dispatch bulk waste inventory from Local Hubs to processing and recycling facilities.
          </p>
        </div>
        {(isAdmin || isManager) && (
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Create Request
          </button>
        )}
      </div>

      {/* Transport Analytics */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Scheduled', value: analytics.totalTransfers, sub: 'All recorded transfer legs', icon: Layers, color: 'text-zinc-400' },
            { label: 'Completed Deliveries', value: analytics.completed, sub: 'Safely unloaded at destination', icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Active In-Transit', value: analytics.inProgress, sub: 'Outbound on route', icon: Truck, color: 'text-amber-400' },
            { label: 'Avg Scale Variance', value: `${analytics.avgLoadVariancePct.toFixed(1)}%`, sub: 'Difference from planned weight', icon: Scale, color: 'text-purple-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-zinc-400 font-semibold">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">{stat.value}</div>
              <div className="text-[10px] text-zinc-500 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Filters & Lists */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search transfer code, type..."
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
            <option value="REQUESTED">REQUESTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="DRIVER_ASSIGNED">DRIVER_ASSIGNED</option>
            <option value="VEHICLE_ASSIGNED">VEHICLE_ASSIGNED</option>
            <option value="DRIVER_CHECKED_IN">DRIVER_CHECKED_IN</option>
            <option value="LOADING">LOADING</option>
            <option value="LOADED">LOADED</option>
            <option value="EN_ROUTE">EN_ROUTE</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="DELAYED">DELAYED</option>
          </select>
        </div>
      </div>

      {/* Transfers List */}
      {isTransfersLoading ? (
        <div className="text-center py-20 text-violet-400 font-mono">LOADING DISPATCH QUEUE...</div>
      ) : filteredTransfers.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">No outbound transfers requested.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTransfers.map((t) => {
            const statusStyle = statusGradients[t.status] || statusGradients.CANCELLED;
            const progressPct =
              t.status === 'COMPLETED' ? 100 :
              t.status === 'DELIVERED' ? 90 :
              t.status === 'ARRIVED' ? 80 :
              t.status === 'EN_ROUTE' ? 65 :
              t.status === 'DEPARTED' ? 55 :
              t.status === 'LOADED' ? 45 :
              t.status === 'LOADING' ? 35 :
              t.status === 'DRIVER_CHECKED_IN' ? 25 :
              t.status === 'VEHICLE_ASSIGNED' ? 15 : 0;

            return (
              <div
                key={t.transferId}
                className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700/60 transition flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex items-center flex-wrap gap-2.5">
                    <span className="font-mono font-bold text-white text-base">{t.transferCode}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border bg-gradient-to-r ${statusStyle}`}>
                      {t.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                      t.priority === 'URGENT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      t.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {t.priority} PRIORITY
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Scheduled Departure</span>
                      <span className="text-zinc-300 font-semibold">{t.scheduledDate} @ {t.scheduledTime}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Cargo Type</span>
                      <span className="text-zinc-300 font-semibold">{t.wasteType} Waste</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Planned Scale weight</span>
                      <span className="text-zinc-300 font-semibold font-mono">{t.plannedWeightKg.toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Actual Net Weight</span>
                      <span className="text-zinc-300 font-semibold font-mono">
                        {t.actualDeliveredWeightKg > 0
                          ? `${t.actualDeliveredWeightKg.toLocaleString()} kg`
                          : t.actualLoadedWeightKg > 0
                            ? `${t.actualLoadedWeightKg.toLocaleString()} kg (Loaded)`
                            : 'Pending Scales'}
                      </span>
                    </div>
                  </div>

                  {/* Flow tracker bar */}
                  <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Operations & Dispatch Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto">
                  <button
                    onClick={() => setSelectedChainId(t.transferId)}
                    className="px-3.5 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold border border-zinc-800 transition flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5 text-zinc-400" />
                    Audited Chain
                  </button>

                  {/* Requested -> Approved (Admin/Manager only) */}
                  {t.status === 'REQUESTED' && (isAdmin || isManager) && (
                    <button
                      onClick={() => approveMutation.mutate(t.transferId)}
                      className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition"
                    >
                      Approve Leg
                    </button>
                  )}

                  {/* Approved -> Driver Assigned */}
                  {t.status === 'APPROVED' && (isAdmin || isManager) && (
                    <button
                      onClick={() => {
                        setAssigningTransfer(t);
                        setAssignmentType('DRIVER');
                      }}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Assign Driver
                    </button>
                  )}

                  {/* Driver Assigned -> Vehicle Assigned */}
                  {t.status === 'DRIVER_ASSIGNED' && (isAdmin || isManager) && (
                    <button
                      onClick={() => {
                        setAssigningTransfer(t);
                        setAssignmentType('VEHICLE');
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Assign Vehicle
                    </button>
                  )}

                  {/* Cancel / Reject Leg */}
                  {['REQUESTED', 'APPROVED', 'DRIVER_ASSIGNED', 'VEHICLE_ASSIGNED'].includes(t.status) && (isAdmin || isManager) && (
                    <button
                      onClick={() => {
                        if (confirm('Cancel this transfer request? Released resources will return to available pool.')) {
                          cancelMutation.mutate(t.transferId);
                        }
                      }}
                      className="p-2 bg-zinc-850 hover:bg-red-500/10 hover:text-red-400 border border-zinc-800 hover:border-red-500/20 text-zinc-400 rounded-xl transition"
                      title="Cancel Request"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Audited Chain of Custody Modal */}
      <AnimatePresence>
        {selectedChainId !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/20">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-violet-400" /> Audited Chain of Custody Trace
                </h2>
                <button
                  onClick={() => setSelectedChainId(null)}
                  className="text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              {isChainLoading ? (
                <div className="p-12 text-center text-violet-400 font-mono">RETRIEVING DATA CHAIN...</div>
              ) : chainDetails ? (
                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                  {/* Summary row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Source Hub</span>
                      <span className="font-bold text-zinc-200">{chainDetails.source?.name}</span>
                      <span className="font-mono text-zinc-500 block text-[10px]">{chainDetails.source?.hubCode}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Processing Destination</span>
                      <span className="font-bold text-zinc-200">{chainDetails.destination?.name}</span>
                      <span className="text-zinc-500 block text-[10px]">{chainDetails.destination?.type}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Assigned Driver</span>
                      <span className="font-bold text-zinc-200">{chainDetails.driver?.name || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Assigned Fleet Vehicle</span>
                      <span className="font-bold text-zinc-200 font-mono">{chainDetails.vehicle?.vehicleCode || 'Unassigned'}</span>
                    </div>
                  </div>

                  {/* Timeline workflow */}
                  <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800">
                    {[
                      { title: 'Requested Leg Scheduled', time: chainDetails.timeline?.created, desc: `Planned payload: ${chainDetails.weights?.planned?.toLocaleString()} kg of ${chainDetails.wasteType} Waste.` },
                      { title: 'Driver QR Check-in', time: chainDetails.timeline?.started, desc: 'Driver scanned QR code at local hub scales.' },
                      { title: 'Hub Inventory Subtract Scales Confirmed', time: chainDetails.timeline?.loaded, desc: `Payload scales logged: ${chainDetails.weights?.loaded?.toLocaleString()} kg. Scale Variance: ${chainDetails.weights?.loadVariancePct?.toFixed(1)}%. Outbound inventory deducted.` },
                      { title: 'Outbound Transit Departure', time: chainDetails.timeline?.departed, desc: 'Vehicle logged departing local hub bounds.' },
                      { title: 'Arrived Facility & Unloaded', time: chainDetails.timeline?.arrived, desc: 'Vehicle entered destination scales bounds.' },
                      { title: 'Transfer Completed', time: chainDetails.timeline?.completed, desc: `Delivery scale logged: ${chainDetails.weights?.delivered?.toLocaleString()} kg. Delivery Scale Loss Variance: ${chainDetails.weights?.deliveryVarianceKg?.toFixed(1)} kg.` },
                    ].map((step, idx) => {
                      const completed = !!step.time;
                      return (
                        <div key={idx} className="flex gap-4 relative pl-8 text-xs">
                          <div className={`absolute left-2.5 top-1.5 w-2.5 h-2.5 rounded-full -translate-x-1/2 border-2 ${completed ? 'bg-violet-500 border-violet-500 shadow-lg shadow-violet-500/50' : 'bg-zinc-950 border-zinc-800'}`} />
                          <div className="space-y-1 py-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${completed ? 'text-zinc-200' : 'text-zinc-500'}`}>{step.title}</span>
                              {completed && <span className="text-[10px] text-zinc-500 font-mono">({step.time})</span>}
                            </div>
                            <p className="text-zinc-400 text-[11px] leading-relaxed">{completed ? step.desc : 'Pending operational step.'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Discrepancy check */}
                  {chainDetails.weights?.loadVariancePct > 10 && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/15 text-amber-400 rounded-xl flex gap-3 text-xs">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <div>
                        <h4 className="font-bold">Significant Scale Discrepancy Flagged</h4>
                        <p className="text-zinc-400 mt-0.5">
                          The difference between planned weight and actual scales at checkout is {chainDetails.weights.loadVariancePct.toFixed(1)}%.
                        </p>
                        {chainDetails.varianceReason && (
                          <div className="mt-2 text-zinc-300 font-mono text-[11px]">
                            Reason: {chainDetails.varianceReason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-zinc-800 pt-4 flex justify-end">
                    <button
                      onClick={() => setSelectedChainId(null)}
                      className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl text-sm font-semibold transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">Failed to load trace audits.</div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Request Modal */}
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
                  <Plus className="w-5 h-5 text-violet-400" /> Request Outbound Waste Transfer
                </h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-white transition">✕</button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                {errMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{errMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Destination Type</label>
                    <select
                      value={destType}
                      onChange={e => setDestType(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    >
                      <option value="RECYCLING_HUB">Recycling Facility</option>
                      <option value="COMPOSTING_FACILITY">Composting Facility</option>
                      <option value="WASTE_TO_ENERGY">Waste-to-Energy Plant</option>
                      <option value="LANDFILL">Regulated Landfill</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Destination Facility</label>
                    <select
                      value={destFacility}
                      onChange={e => setDestFacility(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    >
                      <option value="0">Select Facility</option>
                      {facilities.map(f => (
                        <option key={f.facilityId} value={f.facilityId}>
                          {f.name} ({f.facilityCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Waste Type Category</label>
                    <select
                      value={wasteType}
                      onChange={e => setWasteType(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    >
                      <option value="Organic">Organic Waste</option>
                      <option value="Recyclable">Recyclable Waste</option>
                      <option value="Hazardous">Hazardous Waste</option>
                      <option value="Mixed">Mixed Waste</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Planned Load Weight (kg)</label>
                    <input
                      type="number"
                      required
                      min="100"
                      value={plannedWeight}
                      onChange={e => setPlannedWeight(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Scheduled Date</label>
                    <input
                      type="date"
                      required
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Time</label>
                    <input
                      type="time"
                      required
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Priority</label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    >
                      <option value="LOW">LOW</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Reference Code (optional)</label>
                    <input
                      type="text"
                      placeholder="Auto-generated if empty"
                      value={tCode}
                      onChange={e => setTCode(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    />
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
                    disabled={createTransferMutation.isPending}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
                  >
                    {createTransferMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Submit Transfer Leg
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assignment Modal (Driver or Vehicle) */}
      <AnimatePresence>
        {assigningTransfer !== null && assignmentType !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {assignmentType === 'DRIVER' ? (
                    <>
                      <UserCheck className="w-5 h-5 text-purple-400" /> Dispatch Assignment: Driver
                    </>
                  ) : (
                    <>
                      <Truck className="w-5 h-5 text-indigo-400" /> Dispatch Assignment: Compliant Vehicle
                    </>
                  )}
                </h2>
                <button
                  onClick={() => {
                    setAssigningTransfer(null);
                    setAssignmentType(null);
                  }}
                  className="text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                {assignmentType === 'DRIVER' ? (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2">Select Available Registered Driver</label>
                    {availableDrivers.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-4 text-center">No available driver profiles registered in pool.</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {availableDrivers.map(d => (
                          <div
                            key={d.userId}
                            onClick={() => setSelectedDriverId(d.userId)}
                            className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                              selectedDriverId === d.userId
                                ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-sm">{d.name}</div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Code: {d.driverProfile?.employeeCode || 'N/A'} | License: {d.driverProfile?.licenseCategory}</div>
                            </div>
                            {selectedDriverId === d.userId && <Check className="w-4 h-4 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2">Select Available Compliant Vehicle</label>
                    {availableVehicles.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-4 text-center">No available compliant fleet vehicles at local hub.</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {availableVehicles.map(v => (
                          <div
                            key={v.vehicleId}
                            onClick={() => setSelectedVehicleId(v.vehicleId)}
                            className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                              selectedVehicleId === v.vehicleId
                                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400'
                                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-sm">{v.vehicleCode} ({v.make} {v.model})</div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Capacity: {v.capacityKg.toLocaleString()} kg | Plate: {v.registrationNumber}</div>
                            </div>
                            {selectedVehicleId === v.vehicleId && <Check className="w-4 h-4 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-4 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setAssigningTransfer(null);
                      setAssignmentType(null);
                    }}
                    className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl text-sm font-semibold transition"
                  >
                    Cancel
                  </button>
                  {assignmentType === 'DRIVER' ? (
                    <button
                      onClick={() => assignDriverMutation.mutate({ transferId: assigningTransfer.transferId, driverId: selectedDriverId })}
                      disabled={selectedDriverId === 0 || assignDriverMutation.isPending}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition"
                    >
                      Confirm Driver
                    </button>
                  ) : (
                    <button
                      onClick={() => assignVehicleMutation.mutate({ transferId: assigningTransfer.transferId, vehicleId: selectedVehicleId })}
                      disabled={selectedVehicleId === 0 || assignVehicleMutation.isPending}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition"
                    >
                      Confirm Vehicle
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
