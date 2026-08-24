import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Scale,
  Warehouse,
  RotateCcw,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { api } from '../services/api';
import type { CollectionRequest, HubCleaner, Incident } from '../types';

export default function CollectionsPage() {
  const qc = useQueryClient();
  const [selectedHubId, setSelectedHubId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assign Modal
  const [selectedJob, setSelectedJob] = useState<CollectionRequest | null>(null);
  const [selectedCleanerId, setSelectedCleanerId] = useState<number>(0);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Reschedule Modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState('Morning (08:00 - 11:00)');

  // Incidents
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'INCIDENTS' | 'TRACE'>('QUEUE');
  const [resolutionNote, setResolutionNote] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const { data: collections = [], isLoading: loadingColls } = useQuery({
    queryKey: ['collections'],
    queryFn: api.getCollections,
    refetchInterval: 4000,
  });

  const { data: hubs = [] } = useQuery({
    queryKey: ['hubs'],
    queryFn: api.getHubs,
  });

  const { data: cleaners = [] } = useQuery({
    queryKey: ['cleaners', selectedJob?.hubId],
    queryFn: () => api.getHubCleaners(selectedJob?.hubId),
    enabled: !!selectedJob,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: api.getIncidents,
    refetchInterval: 5000,
  });

  const assignCleanerMutation = useMutation({
    mutationFn: ({ collectionId, cleanerId }: { collectionId: number; cleanerId: number }) =>
      api.assignCleaner(collectionId, cleanerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      setIsAssignModalOpen(false);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ collectionId, date, time }: { collectionId: number; date: string; time: string }) =>
      api.rescheduleCollection({ collectionId, preferredDate: date, preferredTime: time }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      setIsRescheduleModalOpen(false);
    },
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: ({ incidentId, note }: { incidentId: number; note: string }) =>
      api.resolveIncident(incidentId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      setSelectedIncident(null);
    },
  });

  // Filter collections
  const filtered = collections.filter(c => {
    if (selectedHubId > 0 && c.hubId !== selectedHubId) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (c.address || '').toLowerCase().includes(q) ||
        (c.wasteType || '').toLowerCase().includes(q) ||
        (c.cleanerName && c.cleanerName.toLowerCase().includes(q)) ||
        (c.collectionId ? c.collectionId.toString().includes(q) : false)
      );
    }
    return true;
  });

  // Sorted by C Priority Score descending
  const priorityQueue = [...filtered].sort((a, b) => b.priorityScore - a.priorityScore);

  const urgentCount = collections.filter(c => c.priorityLevel === 'URGENT' && c.status !== 'COMPLETED').length;
  const missedCount = collections.filter(c => c.status === 'MISSED').length;
  const activeCount = collections.filter(c => c.status === 'EN_ROUTE' || c.status === 'ARRIVED' || c.status === 'COLLECTING').length;
  const completedCount = collections.filter(c => c.status === 'COMPLETED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Truck className="w-6 h-6" />
            </span>
            Operations Command Center
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Municipal waste collection queue, C priority scoring engine, cleaner assignment & incident resolution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'QUEUE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Priority Queue ({collections.length})
          </button>
          <button
            onClick={() => setActiveTab('INCIDENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'INCIDENTS' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Incidents
            {incidents.filter(i => i.status === 'OPEN').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-zinc-950 font-bold text-[10px]">
                {incidents.filter(i => i.status === 'OPEN').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('TRACE')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'TRACE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Traceability Chain
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{urgentCount}</div>
            <div className="text-xs text-zinc-500 font-medium">Urgent Collections</div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{missedCount}</div>
            <div className="text-xs text-zinc-500 font-medium">Missed Pickups</div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{activeCount}</div>
            <div className="text-xs text-zinc-500 font-medium">Active In-Field</div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{completedCount}</div>
            <div className="text-xs text-zinc-500 font-medium">Completed & Deposited</div>
          </div>
        </div>
      </div>

      {activeTab === 'QUEUE' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
                />
              </div>

              <select
                value={selectedHubId}
                onChange={e => setSelectedHubId(parseInt(e.target.value) || 0)}
                className="bg-zinc-800/60 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value={0}>All Local Hubs</option>
                {hubs.map(h => (
                  <option key={h.hubId} value={h.hubId}>{h.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-zinc-800/60 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="REQUESTED">REQUESTED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="EN_ROUTE">EN_ROUTE</option>
                <option value="COLLECTING">COLLECTING</option>
                <option value="COLLECTED">COLLECTED</option>
                <option value="MISSED">MISSED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Job ID</th>
                    <th className="py-3.5 px-4">Priority (Score)</th>
                    <th className="py-3.5 px-4">Resident & Address</th>
                    <th className="py-3.5 px-4">Waste Type</th>
                    <th className="py-3.5 px-4">Est / Actual Wt</th>
                    <th className="py-3.5 px-4">Assigned Cleaner</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {priorityQueue.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500">
                        No collection requests match your filters.
                      </td>
                    </tr>
                  ) : (
                    priorityQueue.map(req => (
                      <tr key={req.collectionId} className="hover:bg-zinc-800/30 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          #REQ-{req.collectionId}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            req.priorityLevel === 'URGENT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            req.priorityLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {req.priorityLevel} ({req.priorityScore})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white">{req.residentName || 'Household'}</div>
                          <div className="text-zinc-500 text-[11px] truncate max-w-xs">{req.address}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {req.wasteType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {req.actualWeightKg > 0 ? (
                            <span className="text-emerald-400 font-semibold">{req.actualWeightKg} kg (Act)</span>
                          ) : (
                            <span className="text-zinc-400">{req.estimatedWeightKg} kg (Est)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {req.cleanerName && req.cleanerName !== 'Unassigned' ? (
                            <span className="text-cyan-400 font-medium">{req.cleanerName}</span>
                          ) : (
                            <span className="text-zinc-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            req.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            req.status === 'MISSED' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            req.status === 'ASSIGNED' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {req.status === 'REQUESTED' || req.status === 'UNDER_REVIEW' || req.status === 'RESCHEDULED' ? (
                            <button
                              onClick={() => {
                                setSelectedJob(req);
                                setIsAssignModalOpen(true);
                              }}
                              className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow transition"
                            >
                              Assign Cleaner
                            </button>
                          ) : req.status === 'MISSED' ? (
                            <button
                              onClick={() => {
                                setSelectedJob(req);
                                setIsRescheduleModalOpen(true);
                              }}
                              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow transition"
                            >
                              Reschedule
                            </button>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">In Flow</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'INCIDENTS' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              Municipal Field Incidents & Missed Collections
            </h3>
            {incidents.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No active operational incidents.</p>
            ) : (
              <div className="divide-y divide-zinc-800/80">
                {incidents.map(inc => (
                  <div key={inc.incidentId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          inc.severity === 'HIGH' || inc.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {inc.type} ({inc.severity})
                        </span>
                        <span className="text-zinc-400">Collection #REQ-{inc.collectionId}</span>
                        <span className="text-zinc-500">• {inc.createdAt}</span>
                      </div>
                      <p className="text-zinc-200 font-medium">{inc.description}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full font-semibold ${
                        inc.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {inc.status}
                      </span>
                      {inc.status === 'OPEN' && (
                        <button
                          onClick={() => {
                            setSelectedIncident(inc);
                            setResolutionNote('Rescheduled and assigned cleaner');
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Traceability Tab */}
      {activeTab === 'TRACE' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-teal-400" />
              End-to-End Operational Waste Traceability
            </h3>
            <p className="text-xs text-zinc-400">
              Audit trail showing chain-of-custody from Household Request &rarr; Field Cleaner &rarr; Scale Verification &rarr; Local Hub Inbound Aggregate.
            </p>

            <div className="space-y-3 pt-2">
              {collections.filter(c => c.status === 'COMPLETED').slice(0, 10).map(c => (
                <div key={c.collectionId} className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-400">#REQ-{c.collectionId} — {c.wasteType}</span>
                    <span className="text-zinc-400 text-[11px]">Completed {c.completedAt}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-[11px] text-zinc-300">
                    <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">RESIDENT</div>
                      <div className="font-semibold">{c.residentName || 'Household'}</div>
                      <div className="text-zinc-400 truncate">{c.address}</div>
                    </div>
                    <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">ASSIGNED CLEANER</div>
                      <div className="font-semibold">{c.cleanerName || 'Cleaner'}</div>
                      <div className="text-zinc-400">Verified via GPS</div>
                    </div>
                    <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">WEIGHT SCALE</div>
                      <div className="font-semibold text-emerald-400">{c.actualWeightKg} kg</div>
                      <div className="text-zinc-400">{c.measurementSource || 'Digital Scale'}</div>
                    </div>
                    <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800">
                      <div className="text-zinc-500 text-[10px]">LOCAL HUB INBOUND</div>
                      <div className="font-semibold text-teal-300">{c.hubName || `Hub #${c.hubId}`}</div>
                      <div className="text-zinc-400">Ledger QR Verified</div>
                    </div>
                  </div>
                </div>
              ))}
              {collections.filter(c => c.status === 'COMPLETED').length === 0 && (
                <p className="text-xs text-zinc-500 text-center py-6">No completed collections in ledger.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      <AnimatePresence>
        {isAssignModalOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                  Assign Municipal Cleaner
                </h3>
                <button onClick={() => setIsAssignModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-zinc-400">
                  Select an active cleaner assigned to <strong>{selectedJob.hubName || `Hub #${selectedJob.hubId}`}</strong>:
                </p>

                {cleaners.length === 0 ? (
                  <p className="text-rose-400 py-3">No active cleaners assigned to this Local Hub.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cleaners.map(cl => (
                      <button
                        key={cl.userId}
                        type="button"
                        onClick={() => setSelectedCleanerId(cl.userId)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                          selectedCleanerId === cl.userId
                            ? 'bg-cyan-950/60 border-cyan-500 text-white font-semibold'
                            : 'bg-zinc-800/40 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{cl.name}</div>
                          <div className="text-zinc-500 text-[10px]">{cl.employmentStatus} • {cl.phone || 'No phone'}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800 text-xs">
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedCleanerId > 0) {
                      assignCleanerMutation.mutate({
                        collectionId: selectedJob.collectionId,
                        cleanerId: selectedCleanerId,
                      });
                    }
                  }}
                  disabled={selectedCleanerId === 0 || assignCleanerMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-50"
                >
                  {assignCleanerMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {isRescheduleModalOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-400" />
                  Reschedule Collection #REQ-{selectedJob.collectionId}
                </h3>
                <button onClick={() => setIsRescheduleModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">New Collection Date</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">New Time Slot</label>
                  <select
                    value={rescheduleTime}
                    onChange={e => setRescheduleTime(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Morning (08:00 - 11:00)">Morning (08:00 - 11:00)</option>
                    <option value="Noon (11:00 - 14:00)">Noon (11:00 - 14:00)</option>
                    <option value="Afternoon (14:00 - 17:00)">Afternoon (14:00 - 17:00)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800 text-xs">
                <button
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    rescheduleMutation.mutate({
                      collectionId: selectedJob.collectionId,
                      date: rescheduleDate,
                      time: rescheduleTime,
                    });
                  }}
                  disabled={rescheduleMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50"
                >
                  {rescheduleMutation.isPending ? 'Rescheduling...' : 'Approve & Reschedule'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resolve Incident Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Resolve Incident #{selectedIncident.incidentId}
                </h3>
                <button onClick={() => setSelectedIncident(null)} className="text-zinc-400 hover:text-white">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-zinc-400">{selectedIncident.description}</p>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Resolution Action Note</label>
                  <textarea
                    rows={3}
                    value={resolutionNote}
                    onChange={e => setResolutionNote(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white resize-none"
                    placeholder="Describe resolution taken..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800 text-xs">
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    resolveIncidentMutation.mutate({
                      incidentId: selectedIncident.incidentId,
                      note: resolutionNote,
                    });
                  }}
                  disabled={resolveIncidentMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
                >
                  {resolveIncidentMutation.isPending ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
