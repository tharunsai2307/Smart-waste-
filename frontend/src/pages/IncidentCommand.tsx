import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useAppStore } from '../store';
import type { Incident, IncidentTimelineEntry } from '../types';

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  HIGH:     { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  MEDIUM:   { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
  LOW:      { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  INFO:     { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/40' },
};

const KANBAN_STAGES = [
  { id: 'OPEN', label: 'Open', color: 'border-rose-500/40' },
  { id: 'ACKNOWLEDGED', label: 'Acknowledged', color: 'border-amber-500/40' },
  { id: 'ASSIGNED', label: 'Assigned', color: 'border-blue-500/40' },
  { id: 'INVESTIGATING', label: 'Investigating', color: 'border-indigo-500/40' },
  { id: 'ACTION_REQUIRED', label: 'Action Required', color: 'border-purple-500/40' },
  { id: 'RESOLVED', label: 'Resolved', color: 'border-emerald-500/40' },
  { id: 'CLOSED', label: 'Closed', color: 'border-slate-700' },
];

export default function IncidentCommand() {
  const queryClient = useQueryClient();
  const user = useAppStore(s => s.user);

  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [newComment, setNewComment] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    incidentType: 'SAFETY_HAZARD',
    severity: 'MEDIUM',
    description: '',
    location: '',
  });

  // Polling interval (default 10s)
  const [pollInterval, setPollInterval] = useState<number>(10000);

  // Queries
  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ['incidents', severityFilter],
    queryFn: () => api.getIncidents(severityFilter !== 'ALL' ? { severity: severityFilter } : {}),
    refetchInterval: pollInterval > 0 ? pollInterval : false,
  });

  const { data: timeline = [] } = useQuery<IncidentTimelineEntry[]>({
    queryKey: ['incidentTimeline', selectedIncident?.incidentId],
    queryFn: () => (selectedIncident ? api.getIncidentTimeline(selectedIncident.incidentId) : Promise.resolve([])),
    enabled: Boolean(selectedIncident),
    refetchInterval: 5000,
  });

  // Mutations
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
    queryClient.invalidateQueries({ queryKey: ['incidentTimeline'] });
    queryClient.invalidateQueries({ queryKey: ['unreadAlerts'] });
  };

  const ackMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.acknowledgeIncident(id, { actorId: user?.userId || 1, actorRole: user?.role || 'ADMIN', note }),
    onSuccess: invalidate,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, targetUser, targetRole, note }: { id: number; targetUser: number; targetRole: string; note: string }) =>
      api.assignIncident(id, { actorId: user?.userId || 1, actorRole: user?.role || 'ADMIN', assignToUserId: targetUser, targetRole, note }),
    onSuccess: invalidate,
  });

  const invMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.investigateIncident(id, { actorId: user?.userId || 1, actorRole: user?.role || 'ADMIN', note }),
    onSuccess: invalidate,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, actionTaken, note }: { id: number; actionTaken: string; note: string }) =>
      api.actionIncident(id, { actorId: user?.userId || 1, actorRole: user?.role || 'ADMIN', actionTaken, note }),
    onSuccess: invalidate,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.resolveIncident(id, { actorId: user?.userId || 1, actorRole: user?.role || 'ADMIN', note }),
    onSuccess: invalidate,
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.closeIncident(id, { actorId: user?.userId || 1, actorRole: user?.role || 'ADMIN', note }),
    onSuccess: invalidate,
  });

  const reopenMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.reopenIncident(id, { actorId: user?.userId || 1, actorRole: user?.role || 'ADMIN', note }),
    onSuccess: invalidate,
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.addIncidentComment(id, { actorId: user?.userId || 1, actorRole: user?.role || 'ADMIN', comment }),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['incidentTimeline'] });
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: (data: Partial<Incident>) => api.createIncident(data),
    onSuccess: () => {
      invalidate();
      setShowCreateModal(false);
      setCreateForm({ title: '', incidentType: 'SAFETY_HAZARD', severity: 'MEDIUM', description: '', location: '' });
    },
  });

  // KPIs
  const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED' && i.status !== 'REJECTED' && i.status !== 'CANCELLED');
  const criticalCount = activeIncidents.filter(i => i.severity === 'CRITICAL').length;
  const highCount = activeIncidents.filter(i => i.severity === 'HIGH').length;
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto text-slate-100 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
              Phase 10 Operations
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Municipal Incident Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time rule-evaluated operational incident lifecycle & emergency dispatch
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Polling Controller */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <span className="text-slate-500">Sync:</span>
            <select
              value={pollInterval}
              onChange={e => setPollInterval(Number(e.target.value))}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value={10000} className="bg-slate-900">10s (Live)</option>
              <option value={30000} className="bg-slate-900">30s</option>
              <option value={60000} className="bg-slate-900">60s</option>
              <option value={0} className="bg-slate-900">Paused</option>
            </select>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <span>+ Report Incident</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Incidents</span>
          <p className="text-2xl font-black font-mono text-white mt-1">{activeIncidents.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Critical Priority</span>
          <p className="text-2xl font-black font-mono text-rose-400 mt-1">{criticalCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">High Priority</span>
          <p className="text-2xl font-black font-mono text-amber-400 mt-1">{highCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Resolved Today</span>
          <p className="text-2xl font-black font-mono text-emerald-400 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                severityFilter === sev
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Showing {incidents.length} Total Telemetry Records
        </span>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-start min-h-[500px]">
        {KANBAN_STAGES.map(stage => {
          const stageIncidents = incidents.filter(i => (i.status || 'OPEN') === stage.id);
          return (
            <div key={stage.id} className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-3 flex flex-col gap-3 min-h-[450px]">
              <div className={`flex justify-between items-center border-b pb-2 ${stage.color}`}>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {stage.label}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 text-slate-300">
                  {stageIncidents.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {stageIncidents.length === 0 ? (
                  <div className="text-center py-10 text-slate-600 text-xs italic">
                    No incidents in {stage.label}
                  </div>
                ) : (
                  stageIncidents.map(inc => {
                    const sevStyle = SEVERITY_COLORS[inc.severity] || SEVERITY_COLORS.MEDIUM;
                    return (
                      <motion.div
                        key={inc.incidentId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedIncident(inc)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] bg-slate-900/90 hover:border-slate-600 shadow-md ${
                          inc.severity === 'CRITICAL' ? 'border-rose-500/60 shadow-rose-950/20' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-mono text-[10px] text-blue-400 font-bold">
                            INC-{inc.incidentId}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded border ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}>
                            {inc.severity}
                          </span>
                        </div>

                        <div className="font-bold text-xs text-white leading-tight mb-1">
                          {inc.type}
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                          {inc.description}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-2">
                          <span>{inc.assignedRole || 'ADMIN'}</span>
                          {inc.escalationLevel ? (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-950 text-rose-300 rounded border border-rose-800">
                              ESC L{inc.escalationLevel}
                            </span>
                          ) : (
                            <span>{inc.createdAt.split(' ')[0]}</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Incident Detail & State Machine Action Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-950 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-blue-400 font-bold">
                      INCIDENT #{selectedIncident.incidentId}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded border ${
                      SEVERITY_COLORS[selectedIncident.severity]?.bg || ''
                    } ${SEVERITY_COLORS[selectedIncident.severity]?.text || ''} ${
                      SEVERITY_COLORS[selectedIncident.severity]?.border || ''
                    }`}>
                      {selectedIncident.severity}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-slate-800 text-slate-300">
                      {selectedIncident.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1.5">{selectedIncident.type}</h2>
                  <p className="text-xs text-slate-400 mt-1">{selectedIncident.description}</p>
                </div>
                <button
                  onClick={() => { setSelectedIncident(null); setActionNote(''); }}
                  className="text-slate-400 hover:text-white text-lg p-1"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-6 flex-1">
                {/* State Machine Action Trigger Buttons */}
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    State Machine Lifecycle Actions
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {selectedIncident.status === 'OPEN' && (
                      <button
                        onClick={() => ackMutation.mutate({ id: selectedIncident.incidentId, note: actionNote || 'Acknowledged' })}
                        disabled={ackMutation.isPending}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        Acknowledge Incident
                      </button>
                    )}

                    {(selectedIncident.status === 'OPEN' || selectedIncident.status === 'ACKNOWLEDGED') && (
                      <button
                        onClick={() => assignMutation.mutate({ id: selectedIncident.incidentId, targetUser: 1, targetRole: 'LOCAL_HUB_MANAGER', note: actionNote || 'Assigned to Manager' })}
                        disabled={assignMutation.isPending}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        Assign to Hub Manager
                      </button>
                    )}

                    {(selectedIncident.status === 'ASSIGNED' || selectedIncident.status === 'ACKNOWLEDGED') && (
                      <button
                        onClick={() => invMutation.mutate({ id: selectedIncident.incidentId, note: actionNote || 'Investigation launched' })}
                        disabled={invMutation.isPending}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        Start Investigation
                      </button>
                    )}

                    {(selectedIncident.status === 'INVESTIGATING' || selectedIncident.status === 'ASSIGNED') && (
                      <button
                        onClick={() => actionMutation.mutate({ id: selectedIncident.incidentId, actionTaken: 'Emergency Dispatch', note: actionNote || 'Truck dispatched' })}
                        disabled={actionMutation.isPending}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        Log Action Taken
                      </button>
                    )}

                    {selectedIncident.status !== 'RESOLVED' && selectedIncident.status !== 'CLOSED' && (
                      <button
                        onClick={() => resolveMutation.mutate({ id: selectedIncident.incidentId, note: actionNote || 'Resolved operational normal' })}
                        disabled={resolveMutation.isPending}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        Mark Resolved
                      </button>
                    )}

                    {selectedIncident.status === 'RESOLVED' && (
                      <button
                        onClick={() => closeMutation.mutate({ id: selectedIncident.incidentId, note: actionNote || 'Closed after audit' })}
                        disabled={closeMutation.isPending}
                        className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        Close Incident
                      </button>
                    )}

                    {(selectedIncident.status === 'CLOSED' || selectedIncident.status === 'RESOLVED') && (
                      <button
                        onClick={() => reopenMutation.mutate({ id: selectedIncident.incidentId, note: actionNote || 'Reopened due to recurrence' })}
                        disabled={reopenMutation.isPending}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        Reopen Incident
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Optional transition note or rationale..."
                    value={actionNote}
                    onChange={e => setActionNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Audit Timeline History */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Immutable Audit Timeline ({timeline.length} Events)
                  </h3>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {timeline.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No timeline entries recorded yet.</p>
                    ) : (
                      timeline.map(entry => (
                        <div key={entry.timelineId} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-blue-400 font-bold uppercase">{entry.action}</span>
                            <span className="text-slate-500 text-[10px]">{entry.timestamp}</span>
                          </div>
                          <p className="text-slate-300 mt-1 text-[11px]">{entry.comment}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                            <span>Actor: User #{entry.actorId} ({entry.actorRole})</span>
                            {entry.previousStatus && <span>Status: {entry.previousStatus} → {entry.newStatus}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add investigation comment..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => commentMutation.mutate({ id: selectedIncident.incidentId, comment: newComment })}
                      disabled={commentMutation.isPending || !newComment.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Report New Incident */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg p-6 rounded-2xl glass border border-slate-700 bg-slate-900"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white">Report New Incident</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  createIncidentMutation.mutate({
                    type: createForm.incidentType,
                    severity: createForm.severity,
                    description: createForm.description,
                    reportedBy: user?.userId || 1,
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-slate-400 mb-1">INCIDENT TITLE</label>
                  <input
                    type="text"
                    required
                    value={createForm.title}
                    onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="e.g. Broken hydraulic lift on Truck #04"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">TYPE</label>
                    <select
                      value={createForm.incidentType}
                      onChange={e => setCreateForm({ ...createForm, incidentType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="MISSED_COLLECTION">Missed Collection</option>
                      <option value="WEIGHT_VARIANCE">Weight Variance</option>
                      <option value="VEHICLE_BREAKDOWN">Vehicle Breakdown</option>
                      <option value="SAFETY_HAZARD">Safety Hazard</option>
                      <option value="CAPACITY_OVERFLOW">Capacity Overflow</option>
                      <option value="QR_SCAN_FAILURE">QR Scan Failure</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">SEVERITY</label>
                    <select
                      value={createForm.severity}
                      onChange={e => setCreateForm({ ...createForm, severity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                      <option value="INFO">Info</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">LOCATION / ASSET</label>
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={e => setCreateForm({ ...createForm, location: e.target.value })}
                    placeholder="e.g. Sector 7 Collection Hub"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">DESCRIPTION</label>
                  <textarea
                    rows={3}
                    required
                    value={createForm.description}
                    onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Describe the incident, immediate impact, and conditions observed..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createIncidentMutation.isPending}
                    className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                  >
                    {createIncidentMutation.isPending ? 'Submitting...' : 'Submit Incident'}
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
