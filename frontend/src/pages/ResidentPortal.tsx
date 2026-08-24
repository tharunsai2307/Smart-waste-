import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Scale,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Plus,
  RefreshCw,
  Warehouse,
  History
} from 'lucide-react';
import { api } from '../services/api';
import type { CollectionRequest, LocalHub, CollectionStatus } from '../types';

const WASTE_CATEGORIES = [
  { id: 'GENERAL', label: 'General Waste', icon: '🗑️', color: 'bg-zinc-800 text-zinc-300' },
  { id: 'PLASTIC', label: 'Plastic Recyclables', icon: '🧴', color: 'bg-blue-900/40 text-blue-300 border-blue-800' },
  { id: 'ORGANIC', label: 'Organic / Wet Waste', icon: '🍏', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-800' },
  { id: 'PAPER', label: 'Paper & Cardboard', icon: '📦', color: 'bg-amber-900/40 text-amber-300 border-amber-800' },
  { id: 'METAL', label: 'Metal / Cans', icon: '🥫', color: 'bg-cyan-900/40 text-cyan-300 border-cyan-800' },
  { id: 'GLASS', label: 'Glass Containers', icon: '🍾', color: 'bg-teal-900/40 text-teal-300 border-teal-800' },
  { id: 'E_WASTE', label: 'E-Waste / Electronics', icon: '🔌', color: 'bg-purple-900/40 text-purple-300 border-purple-800' },
  { id: 'MIXED', label: 'Mixed Dry Waste', icon: '♻️', color: 'bg-indigo-900/40 text-indigo-300 border-indigo-800' },
];

const STAGES: { key: CollectionStatus; label: string; icon: any }[] = [
  { key: 'REQUESTED', label: 'Requested', icon: Calendar },
  { key: 'ASSIGNED', label: 'Cleaner Assigned', icon: CheckCircle2 },
  { key: 'EN_ROUTE', label: 'Cleaner En Route', icon: Truck },
  { key: 'COLLECTING', label: 'Collecting', icon: Scale },
  { key: 'COMPLETED', label: 'Completed & Deposited', icon: Warehouse },
];

export default function ResidentPortal() {
  const [collections, setCollections] = useState<CollectionRequest[]>([]);
  const [hubs, setHubs] = useState<LocalHub[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isMissedModalOpen, setIsMissedModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CollectionRequest | null>(null);
  const [missedReason, setMissedReason] = useState('Cleaner did not arrive');

  // Request form state
  const [formData, setFormData] = useState({
    wasteType: 'MIXED',
    estimatedWeightKg: 5.0,
    preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    preferredTime: 'Morning (08:00 - 11:00)',
    description: '',
    address: '101 Green Avenue, North Zone',
    urgency: 'NORMAL',
    hubId: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [colls, hubList] = await Promise.all([
        api.getResidentCollections(),
        api.getHubs(),
      ]);
      setCollections(colls);
      setHubs(hubList);
      if (hubList.length > 0 && formData.hubId === 0) {
        setFormData(prev => ({ ...prev, hubId: hubList[0].hubId }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await api.createCollectionRequest(formData);
      if (res.success) {
        setMsg({ text: 'Waste collection request successfully scheduled!', type: 'success' });
        setIsRequestModalOpen(false);
        await loadData();
      } else {
        setMsg({ text: res.message || 'Failed to submit request', type: 'error' });
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Error communicating with server', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportMissed = async () => {
    if (!selectedCollection) return;
    setSubmitting(true);
    try {
      const res = await api.reportMissedCollection(selectedCollection.collectionId, missedReason);
      if (res.success) {
        setMsg({ text: 'Missed collection reported. Operations manager alerted.', type: 'success' });
        setIsMissedModalOpen(false);
        await loadData();
      }
    } catch (e: any) {
      setMsg({ text: e.message || 'Failed to submit report', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const activeRequest = collections.find(
    c => c.status !== 'COMPLETED' && c.status !== 'CANCELLED' && c.status !== 'REJECTED'
  );

  const history = collections.filter(
    c => c.status === 'COMPLETED' || c.status === 'CANCELLED' || c.status === 'REJECTED'
  );

  const getStageIndex = (status: CollectionStatus) => {
    if (status === 'REQUESTED' || status === 'UNDER_REVIEW') return 0;
    if (status === 'ASSIGNED') return 1;
    if (status === 'EN_ROUTE' || status === 'ARRIVED') return 2;
    if (status === 'COLLECTING' || status === 'COLLECTED' || status === 'DEPOSIT_PENDING' || status === 'DEPOSITED_AT_HUB') return 3;
    if (status === 'COMPLETED') return 4;
    return 0;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800/80 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Trash2 className="w-6 h-6" />
            </span>
            Household Waste Collection Service
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Schedule door-to-door municipal waste collection, track active cleaner dispatch, and verify eco-deposits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-lg shadow-emerald-900/30 transition"
          >
            <Plus className="w-4 h-4" />
            Request Pickup
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          msg.type === 'success' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-xs underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Active Request Live Tracker */}
      {activeRequest ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6 space-y-6 shadow-xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Dispatch #REQ-{activeRequest.collectionId}
                </span>
                <span className="text-xs text-zinc-400">
                  Scheduled for {activeRequest.preferredDate} ({activeRequest.preferredTime})
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white mt-2">
                {activeRequest.wasteType} Collection — Est. {activeRequest.estimatedWeightKg} kg
              </h2>
            </div>
            {activeRequest.status === 'MISSED' ? (
              <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold">
                MISSED PICKUP REPORTED
              </span>
            ) : (
              <button
                onClick={() => {
                  setSelectedCollection(activeRequest);
                  setIsMissedModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Report Missed Pickup
              </button>
            )}
          </div>

          {/* Stepper */}
          <div className="py-2">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {STAGES.map((s, idx) => {
                const currentIdx = getStageIndex(activeRequest.status);
                const isPassed = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                        isCurrent
                          ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-110'
                          : isPassed
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                          : 'bg-zinc-800/60 text-zinc-500 border-zinc-700/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-medium ${isCurrent ? 'text-emerald-400' : isPassed ? 'text-zinc-200' : 'text-zinc-500'}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-zinc-500" />
              <span>Location: <strong className="text-zinc-200">{activeRequest.address}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-zinc-500" />
              <span>Assigned Cleaner: <strong className="text-zinc-200">{activeRequest.cleanerName || 'Assigning...'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-zinc-500" />
              <span>Assigned Hub: <strong className="text-zinc-200">{activeRequest.hubName || 'Local Hub'}</strong></span>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/60 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-200">No Active Collection In Progress</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Your household has no pending pickups. Click "Request Pickup" to schedule waste aggregation.
            </p>
          </div>
        </div>
      )}

      {/* Local Hub Information & Service Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-zinc-900/60 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              Collection History
            </h3>
            <span className="text-xs text-zinc-400">{history.length} completed requests</span>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">No past collection records found.</p>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {history.map(item => (
                <div key={item.collectionId} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-zinc-200">{item.wasteType} ({item.actualWeightKg > 0 ? `${item.actualWeightKg} kg` : `${item.estimatedWeightKg} kg`})</span>
                    <p className="text-zinc-500 mt-0.5">{item.address} • {item.completedAt || item.preferredDate}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full font-medium ${
                    item.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nearest Hub Details */}
        <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-teal-400" />
            Designated Local Hub
          </h3>
          {hubs.length > 0 ? (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{hubs[0].name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {hubs[0].status}
                  </span>
                </div>
                <p className="text-zinc-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  {hubs[0].address}
                </p>
                <div className="pt-2 border-t border-zinc-800/60 flex justify-between text-zinc-400">
                  <span>Capacity: {hubs[0].currentLoadKg || 0} / {hubs[0].maximumCapacityKg} kg</span>
                  <span>{hubs[0].utilizationPercent || 0}%</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500">
                Municipal cleaners collect household waste and transport it directly to this temporary aggregation hub.
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No active local hubs available.</p>
          )}
        </div>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-emerald-400" />
                  Schedule Household Waste Collection
                </h3>
                <button
                  onClick={() => setIsRequestModalOpen(false)}
                  className="text-zinc-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
                {/* Waste Category Selection */}
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">Waste Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {WASTE_CATEGORIES.map(cat => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setFormData({ ...formData, wasteType: cat.id })}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                          formData.wasteType === cat.id
                            ? 'bg-emerald-950/60 border-emerald-500 text-white font-medium'
                            : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Estimated Weight (kg)</label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      step="0.5"
                      required
                      value={formData.estimatedWeightKg}
                      onChange={e => setFormData({ ...formData, estimatedWeightKg: parseFloat(e.target.value) || 1 })}
                      className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Urgency</label>
                    <select
                      value={formData.urgency}
                      onChange={e => setFormData({ ...formData, urgency: e.target.value })}
                      className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="LOW">Low (Standard)</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">Urgent (Safety / Bulk)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Preferred Date</label>
                    <input
                      type="date"
                      required
                      value={formData.preferredDate}
                      onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                      className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Preferred Time Slot</label>
                    <select
                      value={formData.preferredTime}
                      onChange={e => setFormData({ ...formData, preferredTime: e.target.value })}
                      className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="Morning (08:00 - 11:00)">Morning (08:00 - 11:00)</option>
                      <option value="Noon (11:00 - 14:00)">Noon (11:00 - 14:00)</option>
                      <option value="Afternoon (14:00 - 17:00)">Afternoon (14:00 - 17:00)</option>
                      <option value="Evening (17:00 - 20:00)">Evening (17:00 - 20:00)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Collection Address</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                    placeholder="Enter street address"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Special Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-white resize-none"
                    placeholder="E.g., Gate code, waste kept at side entrance"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Confirm Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Missed Collection Modal */}
      <AnimatePresence>
        {isMissedModalOpen && selectedCollection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  Report Missed Collection
                </h3>
                <button onClick={() => setIsMissedModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
              </div>

              <p className="text-xs text-zinc-400">
                Reporting a missed collection creates an operational incident for Hub Manager review and rapid rescheduling.
              </p>

              <div className="space-y-2 text-xs">
                <label className="block text-zinc-300 font-medium">Reason for Missed Collection</label>
                <select
                  value={missedReason}
                  onChange={e => setMissedReason(e.target.value)}
                  className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Cleaner did not arrive in scheduled window">Cleaner did not arrive in scheduled window</option>
                  <option value="Waste left outside was skipped">Waste left outside was skipped</option>
                  <option value="Address was inaccessible">Address was inaccessible</option>
                  <option value="Other operational failure">Other operational failure</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800 text-xs">
                <button
                  onClick={() => setIsMissedModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportMissed}
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Incident Report'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
