import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  MapPin,
  Scale,
  QrCode,
  CheckCircle2,
  Clock,
  Play,
  Check,
  RefreshCw,
  Warehouse,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import type { CollectionRequest, LocalHub } from '../types';

export default function CleanerFieldOps() {
  const [jobs, setJobs] = useState<CollectionRequest[]>([]);
  const [hubs, setHubs] = useState<LocalHub[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'UPCOMING' | 'COMPLETED'>('ACTIVE');

  // Modals
  const [selectedJob, setSelectedJob] = useState<CollectionRequest | null>(null);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  // Weight form
  const [actualWeight, setActualWeight] = useState<number>(0);
  const [confirmedType, setConfirmedType] = useState<string>('');
  const [measurementSource, setMeasurementSource] = useState<string>('MANUAL_DIGITAL_SCALE');

  // Deposit form
  const [scannedQr, setScannedQr] = useState<string>('');
  const [depositedWeight, setDepositedWeight] = useState<number>(0);
  const [varianceReason, setVarianceReason] = useState<string>('');
  const [emergencyOverride, setEmergencyOverride] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const [jobList, hubList] = await Promise.all([
        api.getCleanerJobs(),
        api.getHubs(),
      ]);
      setJobs(jobList);
      setHubs(hubList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleUpdateStatus = async (collectionId: number, nextStatus: string) => {
    try {
      setSubmitting(true);
      const res = await api.updateCollectionStatus(collectionId, nextStatus);
      if (res.success) {
        await loadJobs();
      } else {
        setMsg({ text: res.message || 'Status transition rejected', type: 'error' });
      }
    } catch (e: any) {
      setMsg({ text: e.message || 'Error updating job', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    try {
      setSubmitting(true);
      const res = await api.recordCollectionWeight({
        collectionId: selectedJob.collectionId,
        actualWeightKg: actualWeight,
        measurementSource,
        wasteType: confirmedType,
      });
      if (res.success) {
        setMsg({ text: `Recorded ${actualWeight} kg collected waste. Ready for Hub deposit.`, type: 'success' });
        setIsWeightModalOpen(false);
        await loadJobs();
      } else {
        setMsg({ text: res.message || 'Failed to record weight', type: 'error' });
      }
    } catch (e: any) {
      setMsg({ text: e.message || 'Error recording weight', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDepositWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    try {
      setSubmitting(true);
      const res = await api.depositWasteAtHub({
        collectionId: selectedJob.collectionId,
        scannedQr,
        depositedWeightKg: depositedWeight,
        varianceReason,
        emergencyOverride,
      });
      if (res.success) {
        setMsg({ text: 'Waste deposit validated! Local Hub inventory updated.', type: 'success' });
        setIsDepositModalOpen(false);
        await loadJobs();
      } else {
        setMsg({ text: res.message || 'Deposit failed', type: 'error' });
      }
    } catch (e: any) {
      setMsg({ text: e.message || 'Error processing deposit', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const activeJobs = jobs.filter(
    j => j.status === 'ASSIGNED' || j.status === 'EN_ROUTE' || j.status === 'ARRIVED' || j.status === 'COLLECTING' || j.status === 'COLLECTED' || j.status === 'DEPOSIT_PENDING'
  );
  const upcomingJobs = jobs.filter(j => j.status === 'REQUESTED' || j.status === 'UNDER_REVIEW' || j.status === 'RESCHEDULED');
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED');

  const displayedJobs = activeTab === 'ACTIVE' ? activeJobs : activeTab === 'UPCOMING' ? upcomingJobs : completedJobs;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Truck className="w-6 h-6" />
            </span>
            Cleaner Field Operations
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time collection workflow, GPS route navigation, actual digital scale weights, and Hub QR verification.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadJobs}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'ACTIVE'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Active Tasks ({activeJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'UPCOMING'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Upcoming / Queue ({upcomingJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'COMPLETED'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Completed Today ({completedJobs.length})
        </button>
      </div>

      {/* Job Cards */}
      {displayedJobs.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No tasks in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedJobs.map(job => (
            <motion.div
              key={job.collectionId}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700/80 transition shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    #JOB-{job.collectionId}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    job.priorityLevel === 'URGENT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    job.priorityLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {job.priorityLevel} (Score: {job.priorityScore})
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  {job.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-zinc-300">
                <p className="font-semibold text-sm text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  {job.address}
                </p>
                <div className="flex items-center gap-4 text-zinc-400 text-xs pt-1">
                  <span>Waste: <strong className="text-zinc-200">{job.wasteType}</strong></span>
                  <span>Est. Weight: <strong className="text-zinc-200">{job.estimatedWeightKg} kg</strong></span>
                  {job.actualWeightKg > 0 && (
                    <span>Actual: <strong className="text-emerald-400">{job.actualWeightKg} kg</strong></span>
                  )}
                </div>
                <div className="text-zinc-500 text-[11px] flex items-center gap-3 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {job.preferredDate} ({job.preferredTime})
                  </span>
                  <span className="flex items-center gap-1">
                    <Warehouse className="w-3.5 h-3.5 text-teal-400" />
                    {job.hubName || `Hub #${job.hubId}`}
                  </span>
                </div>
              </div>

              {/* Action Buttons based on state */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                {job.status === 'ASSIGNED' && (
                  <button
                    onClick={() => handleUpdateStatus(job.collectionId, 'EN_ROUTE')}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-lg transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start Route to Resident
                  </button>
                )}

                {job.status === 'EN_ROUTE' && (
                  <button
                    onClick={() => handleUpdateStatus(job.collectionId, 'ARRIVED')}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-lg transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark Arrived at Location
                  </button>
                )}

                {job.status === 'ARRIVED' && (
                  <button
                    onClick={() => handleUpdateStatus(job.collectionId, 'COLLECTING')}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-lg transition"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Start Waste Collection
                  </button>
                )}

                {job.status === 'COLLECTING' && (
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setActualWeight(job.estimatedWeightKg);
                      setConfirmedType(job.wasteType);
                      setIsWeightModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg transition"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Record Actual Weight
                  </button>
                )}

                {(job.status === 'COLLECTED' || job.status === 'DEPOSIT_PENDING') && (
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setDepositedWeight(job.actualWeightKg);
                      const targetHub = hubs.find(h => h.hubId === job.hubId);
                      if (targetHub) {
                        setScannedQr(`HUB:${targetHub.hubCode}:${targetHub.hubId}`);
                      } else {
                        setScannedQr(`HUB:HUB-01:${job.hubId}`);
                      }
                      setIsDepositModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-medium text-xs shadow-lg transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Deposit at Local Hub (Scan QR)
                  </button>
                )}

                {job.status === 'COMPLETED' && (
                  <div className="w-full text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 py-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed & Aggregated ({job.depositedWeightKg} kg)
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Record Weight Modal */}
      <AnimatePresence>
        {isWeightModalOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  Record Digital Scale Weight
                </h3>
                <button onClick={() => setIsWeightModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleRecordWeight} className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Actual Measured Weight (kg)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="500"
                    step="0.1"
                    required
                    value={actualWeight}
                    onChange={e => setActualWeight(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-base font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Resident Estimated: {selectedJob.estimatedWeightKg} kg</p>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Confirm Waste Category</label>
                  <select
                    value={confirmedType}
                    onChange={e => setConfirmedType(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="GENERAL">General Waste</option>
                    <option value="PLASTIC">Plastic Recyclables</option>
                    <option value="ORGANIC">Organic / Wet</option>
                    <option value="PAPER">Paper & Cardboard</option>
                    <option value="METAL">Metal / Cans</option>
                    <option value="GLASS">Glass Containers</option>
                    <option value="E_WASTE">E-Waste</option>
                    <option value="MIXED">Mixed Dry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Scale / Measurement Source</label>
                  <select
                    value={measurementSource}
                    onChange={e => setMeasurementSource(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="MANUAL_DIGITAL_SCALE">Manual Field Digital Scale (Certified)</option>
                    <option value="VEHICLE_ONBOARD_LOAD_CELL">Vehicle Onboard Load Cell</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsWeightModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || actualWeight <= 0}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Confirm & Collect'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hub Deposit QR Modal */}
      <AnimatePresence>
        {isDepositModalOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-teal-400" />
                  Deposit Waste at Local Hub
                </h3>
                <button onClick={() => setIsDepositModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleDepositWaste} className="space-y-4 text-xs">
                {/* QR Scanner simulation */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <label className="block text-zinc-300 font-medium">Scanned Local Hub QR Payload</label>
                  <input
                    type="text"
                    required
                    value={scannedQr}
                    onChange={e => setScannedQr(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-center text-xs font-mono text-teal-300"
                    placeholder="HUB:<hubCode>:<hubId>"
                  />
                  <p className="text-[10px] text-zinc-500">Expected Hub: {selectedJob.hubName || `Hub #${selectedJob.hubId}`}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Collected Weight</label>
                    <input
                      type="text"
                      disabled
                      value={`${selectedJob.actualWeightKg} kg`}
                      className="w-full bg-zinc-800/40 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Deposited Weight (kg)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      required
                      value={depositedWeight}
                      onChange={e => setDepositedWeight(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                {Math.abs(depositedWeight - selectedJob.actualWeightKg) > 2 && (
                  <div>
                    <label className="block text-amber-300 font-medium mb-1">Variance Explanation (&gt;2kg difference)</label>
                    <input
                      type="text"
                      value={varianceReason}
                      onChange={e => setVarianceReason(e.target.value)}
                      className="w-full bg-zinc-800 border border-amber-800/60 rounded-xl px-3 py-2 text-white"
                      placeholder="E.g., Spill, moisture loss, partial unloading"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400">
                  <input
                    type="checkbox"
                    id="override"
                    checked={emergencyOverride}
                    onChange={e => setEmergencyOverride(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-teal-600"
                  />
                  <label htmlFor="override" className="flex items-center gap-1 cursor-pointer">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Manager Emergency Capacity Override (Audited)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsDepositModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || depositedWeight <= 0}
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submitting ? 'Verifying...' : 'Validate QR & Complete'}
                    <ArrowRight className="w-3.5 h-3.5" />
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
