import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Warehouse, Scale, ArrowDownLeft, ArrowUpRight, AlertTriangle, Users,
  Plus, Edit, ShieldAlert, CheckCircle2, RefreshCw, X, ChevronDown, PackageCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useAppStore } from '../store';

const WASTE_TYPES = ['Mixed Solid Waste', 'Organic Waste', 'Plastic Recyclables', 'Paper & Cardboard', 'Metal Scraps', 'E-Waste'];

const HubsPage: React.FC = () => {
  const user = useAppStore((s) => s.user);
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'LOCAL_HUB_MANAGER';

  const [selectedHubId, setSelectedHubId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'CLEANERS' | 'ALERTS'>('LEDGER');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showOutboundModal, setShowOutboundModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Form states
  const [hubForm, setHubForm] = useState({
    hubCode: '', name: '', address: '', latitude: 12.9716, longitude: 77.5946,
    maximumCapacityKg: 5000, warningThresholdPercent: 75, criticalThresholdPercent: 90, managerId: 0
  });

  const [inboundForm, setInboundForm] = useState({
    quantityKg: '', wasteType: WASTE_TYPES[0], sourceType: 'CLEANER',
    sourceId: 0, measurementSource: 'DIGITAL_SCALE', emergencyOverride: false
  });

  const [outboundForm, setOutboundForm] = useState({
    quantityKg: '', wasteType: WASTE_TYPES[0], destinationType: 'RECYCLING_FACILITY',
    destinationId: 1, measurementSource: 'SCALE_WEIGHBRIDGE'
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    quantityKg: '', wasteType: WASTE_TYPES[0], sourceType: 'ADJUSTMENT_AUDIT',
    measurementSource: 'PHYSICAL_INVENTORY_COUNT'
  });

  const [actionError, setActionError] = useState('');

  // Queries
  const { data: hubs = [], isLoading: hubsLoading, refetch: refetchHubs } = useQuery({
    queryKey: ['hubs'],
    queryFn: api.getHubs,
  });

  // Effective hub ID: if manager, pick their assigned hub or default
  const effectiveHubId = selectedHubId || (hubs.length > 0 ? (isManager ? (hubs.find(h => h.managerId === user?.userId)?.hubId || hubs[0].hubId) : hubs[0].hubId) : null);
  const currentHub = hubs.find((h) => h.hubId === effectiveHubId);

  const { data: dashboardStats } = useQuery({
    queryKey: ['hubDashboard', effectiveHubId],
    queryFn: () => (effectiveHubId ? api.getHubDashboard(effectiveHubId) : Promise.resolve(null)),
    enabled: !!effectiveHubId,
    refetchInterval: 3000,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['hubTransactions', effectiveHubId],
    queryFn: () => (effectiveHubId ? api.getHubTransactions(effectiveHubId) : Promise.resolve([])),
    enabled: !!effectiveHubId,
    refetchInterval: 3000,
  });

  const { data: cleaners = [] } = useQuery({
    queryKey: ['hubCleaners', effectiveHubId],
    queryFn: () => (effectiveHubId ? api.getHubCleaners(effectiveHubId) : Promise.resolve([])),
    enabled: !!effectiveHubId,
  });

  const { data: allAlerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: api.getAlerts,
    refetchInterval: 3000,
  });

  const hubAlerts = allAlerts.filter(a => effectiveHubId && a.referenceId === effectiveHubId);

  // Mutations
  const createHubMutation = useMutation({
    mutationFn: api.createHub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] });
      setShowCreateModal(false);
      setActionError('');
    },
    onError: (err: any) => setActionError(err.message || 'Failed to create hub'),
  });

  const transactionMutation = useMutation({
    mutationFn: api.recordHubTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] });
      queryClient.invalidateQueries({ queryKey: ['hubDashboard', effectiveHubId] });
      queryClient.invalidateQueries({ queryKey: ['hubTransactions', effectiveHubId] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setShowInboundModal(false);
      setShowOutboundModal(false);
      setShowAdjustmentModal(false);
      setActionError('');
      setInboundForm({ quantityKg: '', wasteType: WASTE_TYPES[0], sourceType: 'CLEANER', sourceId: 0, measurementSource: 'DIGITAL_SCALE', emergencyOverride: false });
      setOutboundForm({ quantityKg: '', wasteType: WASTE_TYPES[0], destinationType: 'RECYCLING_FACILITY', destinationId: 1, measurementSource: 'SCALE_WEIGHBRIDGE' });
      setAdjustmentForm({ quantityKg: '', wasteType: WASTE_TYPES[0], sourceType: 'ADJUSTMENT_AUDIT', measurementSource: 'PHYSICAL_INVENTORY_COUNT' });
    },
    onError: (err: any) => setActionError(err.message || 'Transaction rejected'),
  });

  // Calculate status styling
  const getStatusBadge = (status: string, util: number) => {
    if (status === 'TEMPORARILY_CLOSED') {
      return <span className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 text-slate-400 border border-slate-700">TEMPORARILY CLOSED</span>;
    }
    if (util >= 100 || status === 'AT_CAPACITY') {
      return <span className="px-2.5 py-1 text-xs font-mono rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">AT CAPACITY (100%+)</span>;
    }
    if (util >= (currentHub?.criticalThresholdPercent || 90) || status === 'CRITICAL') {
      return <span className="px-2.5 py-1 text-xs font-mono rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">CRITICAL ({util.toFixed(1)}%)</span>;
    }
    if (util >= (currentHub?.warningThresholdPercent || 75) || status === 'WARNING') {
      return <span className="px-2.5 py-1 text-xs font-mono rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">WARNING ({util.toFixed(1)}%)</span>;
    }
    return <span className="px-2.5 py-1 text-xs font-mono rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">NORMAL ({util.toFixed(1)}%)</span>;
  };

  const getProgressBarColor = (util: number) => {
    if (util >= 100) return 'bg-red-500';
    if (util >= 90) return 'bg-orange-500';
    if (util >= 75) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  const handleInboundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveHubId) return;
    const qty = parseFloat(inboundForm.quantityKg);
    if (isNaN(qty) || qty <= 0) {
      setActionError('Please enter a valid weight in kg');
      return;
    }
    transactionMutation.mutate({
      hubId: effectiveHubId,
      transactionType: 'INBOUND_COLLECTION',
      quantityKg: qty,
      wasteType: inboundForm.wasteType,
      sourceType: inboundForm.sourceType,
      sourceId: inboundForm.sourceId,
      measurementSource: inboundForm.measurementSource,
      emergencyOverride: inboundForm.emergencyOverride,
    });
  };

  const handleOutboundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveHubId) return;
    const qty = parseFloat(outboundForm.quantityKg);
    if (isNaN(qty) || qty <= 0) {
      setActionError('Please enter a valid transfer weight in kg');
      return;
    }
    transactionMutation.mutate({
      hubId: effectiveHubId,
      transactionType: 'OUTBOUND_TRANSFER',
      quantityKg: qty,
      wasteType: outboundForm.wasteType,
      sourceType: 'LOCAL_HUB',
      sourceId: effectiveHubId,
      destinationType: outboundForm.destinationType,
      destinationId: outboundForm.destinationId,
      measurementSource: outboundForm.measurementSource,
    });
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveHubId) return;
    const qty = parseFloat(adjustmentForm.quantityKg);
    if (isNaN(qty) || qty === 0) {
      setActionError('Adjustment quantity cannot be 0');
      return;
    }
    transactionMutation.mutate({
      hubId: effectiveHubId,
      transactionType: 'ADJUSTMENT',
      quantityKg: qty,
      wasteType: adjustmentForm.wasteType,
      sourceType: adjustmentForm.sourceType,
      measurementSource: adjustmentForm.measurementSource,
    });
  };

  // Check if inbound form input exceeds remaining capacity
  const incomingWeightNum = parseFloat(inboundForm.quantityKg) || 0;
  const availableKg = dashboardStats?.availableCapacity ?? (currentHub ? currentHub.maximumCapacityKg - currentHub.currentLoadKg : 0);
  const willExceedCapacity = incomingWeightNum > availableKg;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Warehouse size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">LOCAL COLLECTION HUBS</h1>
            <p className="text-xs text-slate-400">Municipal Temporary Waste Aggregation & Live Inventory</p>
          </div>
        </div>

        {/* Action Controls & Hub Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          {hubs.length > 0 && (
            <div className="relative">
              <select
                value={effectiveHubId || ''}
                onChange={(e) => setSelectedHubId(Number(e.target.value))}
                disabled={isManager && !!user?.assignedHub}
                className="appearance-none bg-slate-900/90 text-white text-xs font-medium px-4 py-2.5 pr-8 rounded-lg border border-white/10 focus:outline-none focus:border-emerald-500"
              >
                {hubs.map((h) => (
                  <option key={h.hubId} value={h.hubId}>
                    {h.hubCode} — {h.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setHubForm({
                  hubCode: `HUB-${String(hubs.length + 1).padStart(2, '0')}`,
                  name: '', address: '', latitude: 12.9716, longitude: 77.5946,
                  maximumCapacityKg: 5000, warningThresholdPercent: 75, criticalThresholdPercent: 90, managerId: 0
                });
                setActionError('');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
            >
              <Plus size={15} />
              NEW HUB
            </button>
          )}

          {isAdmin && currentHub && (
            <button
              onClick={() => {
                setHubForm({
                  hubCode: currentHub.hubCode,
                  name: currentHub.name,
                  address: currentHub.address,
                  latitude: currentHub.latitude,
                  longitude: currentHub.longitude,
                  maximumCapacityKg: currentHub.maximumCapacityKg,
                  warningThresholdPercent: currentHub.warningThresholdPercent,
                  criticalThresholdPercent: currentHub.criticalThresholdPercent,
                  managerId: currentHub.managerId,
                });
                setActionError('');
                setShowEditModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer"
            >
              <Edit size={14} />
              EDIT HUB
            </button>
          )}

          <button
            onClick={() => refetchHubs()}
            className="p-2.5 rounded-lg text-slate-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Zero State if No Hubs */}
      {hubs.length === 0 && !hubsLoading && (
        <div className="p-12 text-center rounded-2xl glass border border-white/10">
          <Warehouse size={48} className="mx-auto text-slate-600 mb-4" />
          <h2 className="text-lg font-bold text-white mb-1">No Local Collection Hubs Provisioned</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Local Hubs aggregate waste collected by municipal cleaners before transfer. Create your first operational hub to begin transaction-based tracking.
          </p>
          {isAdmin ? (
            <button
              onClick={() => {
                setHubForm({
                  hubCode: 'HUB-01', name: 'Central District Collection Hub',
                  address: '100 Municipal Way, Central Sector', latitude: 12.9716, longitude: 77.5946,
                  maximumCapacityKg: 5000, warningThresholdPercent: 75, criticalThresholdPercent: 90, managerId: 0
                });
                setShowCreateModal(true);
              }}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              CREATE FIRST HUB
            </button>
          ) : (
            <p className="text-xs text-amber-400">Please contact an Administrator to provision a hub.</p>
          )}
        </div>
      )}

      {/* Main Hub Content */}
      {currentHub && (
        <>
          {/* Capacity & Live Utilization Banner */}
          <div className="p-6 rounded-2xl glass border border-white/10 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white tracking-wide">{currentHub.name}</h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                    {currentHub.hubCode}
                  </span>
                  {getStatusBadge(dashboardStats?.status || currentHub.status, dashboardStats?.utilizationPercent || currentHub.utilizationPercent)}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>📍 {currentHub.address}</span>
                  <span>•</span>
                  <span>Manager: <strong className="text-slate-300">{currentHub.managerName || 'Unassigned'}</strong></span>
                </p>
              </div>

              {/* Action Buttons for Inbound / Outbound / Adjust */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => { setActionError(''); setShowInboundModal(true); }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all cursor-pointer"
                >
                  <ArrowDownLeft size={15} />
                  RECORD INBOUND
                </button>

                <button
                  onClick={() => { setActionError(''); setShowOutboundModal(true); }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-all cursor-pointer"
                >
                  <ArrowUpRight size={15} />
                  TRANSFER OUT
                </button>

                <button
                  onClick={() => { setActionError(''); setShowAdjustmentModal(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                >
                  <Scale size={14} />
                  ADJUST
                </button>
              </div>
            </div>

            {/* Capacity Progress Bar with Thresholds */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 font-mono mb-2">
                <span>
                  LOAD: <strong className="text-white">{(dashboardStats?.currentLoad ?? currentHub.currentLoadKg).toFixed(1)} kg</strong>
                </span>
                <span>
                  AVAILABLE: <strong className="text-emerald-400">{(dashboardStats?.availableCapacity ?? (currentHub.maximumCapacityKg - currentHub.currentLoadKg)).toFixed(1)} kg</strong>
                </span>
                <span>
                  MAX CAPACITY: <strong className="text-slate-300">{currentHub.maximumCapacityKg.toFixed(1)} kg</strong>
                </span>
              </div>

              <div className="relative w-full h-4 bg-slate-900/80 rounded-full overflow-hidden border border-white/10">
                {/* 75% Warning Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 opacity-70"
                  style={{ left: `${currentHub.warningThresholdPercent}%` }}
                  title={`Warning Threshold: ${currentHub.warningThresholdPercent}%`}
                />
                {/* 90% Critical Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 opacity-70"
                  style={{ left: `${currentHub.criticalThresholdPercent}%` }}
                  title={`Critical Threshold: ${currentHub.criticalThresholdPercent}%`}
                />

                {/* Fill */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, dashboardStats?.utilizationPercent ?? currentHub.utilizationPercent)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full ${getProgressBarColor(dashboardStats?.utilizationPercent ?? currentHub.utilizationPercent)} transition-colors`}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1.5">
                <span>0%</span>
                <span style={{ marginLeft: `${currentHub.warningThresholdPercent - 15}%` }}>Warning ({currentHub.warningThresholdPercent}%)</span>
                <span>Critical ({currentHub.criticalThresholdPercent}%)</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Operational Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl glass border border-white/10">
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mb-1">UTILIZATION</div>
              <div className="text-xl font-bold text-white">
                {(dashboardStats?.utilizationPercent ?? currentHub.utilizationPercent).toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">of max limit</div>
            </div>

            <div className="p-4 rounded-xl glass border border-white/10">
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mb-1">INBOUND TODAY</div>
              <div className="text-xl font-bold text-emerald-400">
                {(dashboardStats?.inboundToday ?? 0).toFixed(1)} <span className="text-xs text-slate-400 font-normal">kg</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">collected today</div>
            </div>

            <div className="p-4 rounded-xl glass border border-white/10">
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mb-1">OUTBOUND TODAY</div>
              <div className="text-xl font-bold text-blue-400">
                {(dashboardStats?.outboundToday ?? 0).toFixed(1)} <span className="text-xs text-slate-400 font-normal">kg</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">transferred out</div>
            </div>

            <div className="p-4 rounded-xl glass border border-white/10">
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mb-1">ACTIVE CLEANERS</div>
              <div className="text-xl font-bold text-white flex items-center gap-1.5">
                <Users size={16} className="text-slate-400" />
                {dashboardStats?.activeCleaners ?? cleaners.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">assigned to hub</div>
            </div>

            <div className="p-4 rounded-xl glass border border-white/10">
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mb-1">COLLECTIONS</div>
              <div className="text-xl font-bold text-amber-400">
                {dashboardStats?.pendingCollections ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">in queue</div>
            </div>

            <div className="p-4 rounded-xl glass border border-white/10">
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mb-1">TRANSFER REQS</div>
              <div className="text-xl font-bold text-purple-400">
                {dashboardStats?.pendingTransferRequests ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">to processing</div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                activeTab === 'LEDGER' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              TRANSACTION LEDGER ({transactions.length})
            </button>

            <button
              onClick={() => setActiveTab('CLEANERS')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                activeTab === 'CLEANERS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              CLEANERS & STAFF ({cleaners.length})
            </button>

            <button
              onClick={() => setActiveTab('ALERTS')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                activeTab === 'ALERTS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              HUB ALERTS ({hubAlerts.length})
            </button>
          </div>

          {/* Tab Content: LEDGER */}
          {activeTab === 'LEDGER' && (
            <div className="p-5 rounded-2xl glass border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                  <PackageCheck size={16} className="text-emerald-400" />
                  INVENTORY TRANSACTIONS
                </h3>
                <span className="text-xs text-slate-400">Formula: Inbound - Outbound ± Adjustments</span>
              </div>

              {transactions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No inventory transactions recorded for this hub yet.
                  <br />Click <strong>RECORD INBOUND</strong> above to add incoming waste.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3">TX ID</th>
                        <th className="py-2.5 px-3">TYPE</th>
                        <th className="py-2.5 px-3">WEIGHT</th>
                        <th className="py-2.5 px-3">WASTE CATEGORY</th>
                        <th className="py-2.5 px-3">SOURCE / DEST</th>
                        <th className="py-2.5 px-3">METHOD</th>
                        <th className="py-2.5 px-3">TIMESTAMP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map((tx) => (
                        <tr key={tx.transactionId} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400">#{tx.transactionId}</td>
                          <td className="py-2.5 px-3 font-semibold">
                            {tx.transactionType === 'INBOUND_COLLECTION' && (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <ArrowDownLeft size={12} /> INBOUND
                              </span>
                            )}
                            {tx.transactionType === 'OUTBOUND_TRANSFER' && (
                              <span className="text-blue-400 flex items-center gap-1">
                                <ArrowUpRight size={12} /> OUTBOUND
                              </span>
                            )}
                            {tx.transactionType === 'ADJUSTMENT' && (
                              <span className="text-amber-400 flex items-center gap-1">
                                <Scale size={12} /> ADJUSTMENT
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            {tx.transactionType === 'OUTBOUND_TRANSFER' ? '-' : '+'}
                            {tx.quantityKg.toFixed(2)} kg
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{tx.wasteType}</td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {tx.transactionType === 'INBOUND_COLLECTION' ? `${tx.sourceType} (#${tx.sourceId})` : `${tx.destinationType} (#${tx.destinationId})`}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{tx.measurementSource}</td>
                          <td className="py-2.5 px-3 text-slate-400">{tx.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab Content: CLEANERS */}
          {activeTab === 'CLEANERS' && (
            <div className="p-5 rounded-2xl glass border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                <Users size={16} className="text-emerald-400" />
                ASSIGNED CLEANERS & COLLECTION STAFF
              </h3>

              {cleaners.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No cleaners assigned to this collection hub.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cleaners.map((c) => (
                    <div key={c.userId} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{c.name}</span>
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {c.employmentStatus || 'ACTIVE'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-0.5 font-mono">
                        <div>Username: <span className="text-slate-300">{c.username}</span></div>
                        <div>Phone: <span className="text-slate-300">{c.phone || 'N/A'}</span></div>
                        <div>Email: <span className="text-slate-300">{c.email || 'N/A'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: ALERTS */}
          {activeTab === 'ALERTS' && (
            <div className="p-5 rounded-2xl glass border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-400" />
                OPERATIONAL CAPACITY ALERTS
              </h3>

              {hubAlerts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 size={24} className="text-emerald-400" />
                  No active capacity warnings or overflow alerts for this hub.
                </div>
              ) : (
                <div className="space-y-2">
                  {hubAlerts.map((a) => (
                    <div key={a.alertId} className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                      <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-red-400">{a.type}</span>
                          <span className="text-slate-500 font-mono">{a.date}</span>
                        </div>
                        <p className="text-slate-300">{a.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Record Inbound Waste */}
      <AnimatePresence>
        {showInboundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg p-6 rounded-2xl glass border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowDownLeft size={18} className="text-emerald-400" />
                  Record Inbound Waste Collection
                </h3>
                <button onClick={() => setShowInboundModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>

              {actionError && (
                <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleInboundSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">WEIGHT (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inboundForm.quantityKg}
                    onChange={(e) => setInboundForm({ ...inboundForm, quantityKg: e.target.value })}
                    required
                    placeholder="e.g. 250.5"
                    className="w-full px-3 py-2.5 rounded-lg text-white font-mono bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="mt-1 text-[11px] flex justify-between font-mono">
                    <span className="text-slate-400">Available Space: <strong>{availableKg.toFixed(1)} kg</strong></span>
                    {willExceedCapacity && (
                      <span className="text-red-400 font-bold">⚠️ EXCEEDS CAPACITY BY {(incomingWeightNum - availableKg).toFixed(1)} kg</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">WASTE CATEGORY</label>
                    <select
                      value={inboundForm.wasteType}
                      onChange={(e) => setInboundForm({ ...inboundForm, wasteType: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-white bg-slate-900 border border-white/10 focus:border-emerald-500 focus:outline-none"
                    >
                      {WASTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">SOURCE TYPE</label>
                    <select
                      value={inboundForm.sourceType}
                      onChange={(e) => setInboundForm({ ...inboundForm, sourceType: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-white bg-slate-900 border border-white/10 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="CLEANER">Municipal Cleaner</option>
                      <option value="RESIDENT_DROPOFF">Resident Drop-off</option>
                      <option value="SMART_BIN">Smart Bin Route</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">MEASUREMENT SOURCE</label>
                    <select
                      value={inboundForm.measurementSource}
                      onChange={(e) => setInboundForm({ ...inboundForm, measurementSource: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-white bg-slate-900 border border-white/10 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="DIGITAL_SCALE">Digital Scale</option>
                      <option value="MANUAL_WEIGHING">Manual Weighing</option>
                      <option value="IOT_BIN_SENSOR">IoT Sensor Estimate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">SOURCE ID (OPTIONAL)</label>
                    <input
                      type="number"
                      value={inboundForm.sourceId || ''}
                      onChange={(e) => setInboundForm({ ...inboundForm, sourceId: Number(e.target.value) })}
                      placeholder="Cleaner ID or Bin ID"
                      className="w-full px-3 py-2.5 rounded-lg text-white font-mono bg-white/5 border border-white/10 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {willExceedCapacity && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-red-400 font-bold">
                      <ShieldAlert size={16} />
                      EMERGENCY CAPACITY OVERRIDE REQUIRED
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Standard collection cannot exceed 100% maximum capacity. Check the box below to authorize an emergency intake override (logged in audit trail).
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={inboundForm.emergencyOverride}
                        onChange={(e) => setInboundForm({ ...inboundForm, emergencyOverride: e.target.checked })}
                        className="rounded border-slate-700 text-red-500 focus:ring-red-500"
                      />
                      <span className="text-white font-semibold">Authorize Emergency Capacity Override</span>
                    </label>
                  </div>
                )}

                <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowInboundModal(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10">CANCEL</button>
                  <button type="submit" disabled={transactionMutation.isPending} className="px-5 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50">
                    {transactionMutation.isPending ? 'RECORDING...' : 'RECORD INBOUND'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Outbound Transfer Request */}
      <AnimatePresence>
        {showOutboundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg p-6 rounded-2xl glass border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowUpRight size={18} className="text-blue-400" />
                  Create Outbound Transfer Request
                </h3>
                <button onClick={() => setShowOutboundModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>

              {actionError && (
                <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleOutboundSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">TRANSFER WEIGHT (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={outboundForm.quantityKg}
                    onChange={(e) => setOutboundForm({ ...outboundForm, quantityKg: e.target.value })}
                    required
                    placeholder="e.g. 500.0"
                    className="w-full px-3 py-2.5 rounded-lg text-white font-mono bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="mt-1 text-[11px] text-slate-400 font-mono">
                    Current Hub Stock: <strong>{(dashboardStats?.currentLoad ?? currentHub.currentLoadKg).toFixed(1)} kg</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">DESTINATION TYPE</label>
                    <select
                      value={outboundForm.destinationType}
                      onChange={(e) => setOutboundForm({ ...outboundForm, destinationType: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-white bg-slate-900 border border-white/10 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="RECYCLING_FACILITY">Recycling Facility</option>
                      <option value="WASTE_TO_ENERGY">Waste-to-Energy Plant</option>
                      <option value="COMPOST_PLANT">Central Composting Plant</option>
                      <option value="ENGINEERED_LANDFILL">Engineered Landfill</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">WASTE CATEGORY</label>
                    <select
                      value={outboundForm.wasteType}
                      onChange={(e) => setOutboundForm({ ...outboundForm, wasteType: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-white bg-slate-900 border border-white/10 focus:border-blue-500 focus:outline-none"
                    >
                      {WASTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowOutboundModal(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10">CANCEL</button>
                  <button type="submit" disabled={transactionMutation.isPending} className="px-5 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50">
                    {transactionMutation.isPending ? 'PROCESSING...' : 'DISPATCH TRANSFER'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Inventory Adjustment */}
      <AnimatePresence>
        {showAdjustmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md p-6 rounded-2xl glass border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Scale size={18} className="text-amber-400" />
                  Inventory Audit Adjustment
                </h3>
                <button onClick={() => setShowAdjustmentModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>

              {actionError && (
                <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleAdjustmentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">ADJUSTMENT QUANTITY (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={adjustmentForm.quantityKg}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantityKg: e.target.value })}
                    required
                    placeholder="Use positive to add, negative to deduct (e.g. -15.5)"
                    className="w-full px-3 py-2.5 rounded-lg text-white font-mono bg-white/5 border border-white/10 focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Use negative values for write-offs, positive for unrecorded intake.</p>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">WASTE CATEGORY</label>
                  <select
                    value={adjustmentForm.wasteType}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, wasteType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-white bg-slate-900 border border-white/10 focus:border-amber-500 focus:outline-none"
                  >
                    {WASTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAdjustmentModal(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10">CANCEL</button>
                  <button type="submit" disabled={transactionMutation.isPending} className="px-5 py-2 rounded-lg font-semibold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50">
                    {transactionMutation.isPending ? 'SAVING...' : 'APPLY ADJUSTMENT'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Create Hub (Admin Only) */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg p-6 rounded-2xl glass border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Warehouse size={18} className="text-emerald-400" />
                  Provision Local Collection Hub
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>

              {actionError && (
                <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {actionError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createHubMutation.mutate(hubForm);
                }}
                className="space-y-3 text-xs"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">HUB CODE</label>
                    <input
                      type="text"
                      value={hubForm.hubCode}
                      onChange={(e) => setHubForm({ ...hubForm, hubCode: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-lg text-white font-mono bg-white/5 border border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">HUB NAME</label>
                    <input
                      type="text"
                      value={hubForm.name}
                      onChange={(e) => setHubForm({ ...hubForm, name: e.target.value })}
                      required
                      placeholder="e.g. North Zone Hub"
                      className="w-full px-3 py-2 rounded-lg text-white bg-white/5 border border-white/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">STREET ADDRESS</label>
                  <input
                    type="text"
                    value={hubForm.address}
                    onChange={(e) => setHubForm({ ...hubForm, address: e.target.value })}
                    required
                    placeholder="e.g. 42 Main Avenue, North Ward"
                    className="w-full px-3 py-2 rounded-lg text-white bg-white/5 border border-white/10"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">MAX CAPACITY (KG)</label>
                    <input
                      type="number"
                      value={hubForm.maximumCapacityKg}
                      onChange={(e) => setHubForm({ ...hubForm, maximumCapacityKg: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 rounded-lg text-white font-mono bg-white/5 border border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">WARNING THRESHOLD</label>
                    <input
                      type="number"
                      value={hubForm.warningThresholdPercent}
                      onChange={(e) => setHubForm({ ...hubForm, warningThresholdPercent: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 rounded-lg text-white font-mono bg-white/5 border border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">CRITICAL THRESHOLD</label>
                    <input
                      type="number"
                      value={hubForm.criticalThresholdPercent}
                      onChange={(e) => setHubForm({ ...hubForm, criticalThresholdPercent: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 rounded-lg text-white font-mono bg-white/5 border border-white/10"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10">CANCEL</button>
                  <button type="submit" disabled={createHubMutation.isPending} className="px-5 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50">
                    {createHubMutation.isPending ? 'CREATING...' : 'PROVISION HUB'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HubsPage;
