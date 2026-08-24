import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Scale,
  QrCode,
  AlertTriangle,
  Compass,
  History,
  User,
  Activity,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useAppStore } from '../store';

export default function DriverDashboard() {
  const qc = useQueryClient();
  const user = useAppStore(state => state.user);
  
  // Profile Form states (if profile is not complete)
  const [empCode, setEmpCode] = useState('');
  const [licenseCat, setLicenseCat] = useState('HMV');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Scanning / scale simulation states
  const [scannedQrVal, setScannedQrVal] = useState('');
  const [qrError, setQrError] = useState('');
  
  const [actualLoadedKg, setActualLoadedKg] = useState(0);
  const [measSource, setMeasSource] = useState('AUTOMATIC_SCALE');
  const [varReason, setVarReason] = useState('');

  const [actualDeliveredKg, setActualDeliveredKg] = useState(0);
  const [varExplanation, setVarExplanation] = useState('');

  const [showQrSim, setShowQrSim] = useState(false);
  const [showLoadSim, setShowLoadSim] = useState(false);
  const [showDeliverSim, setShowDeliverSim] = useState(false);

  // Fetch driver assignment and profile
  const { data: assignmentData, isLoading } = useQuery({
    queryKey: ['driver-assignment', user?.userId],
    queryFn: api.getMyDriverAssignment,
    enabled: !!user?.userId,
    refetchInterval: 5000,
  });

  // Fetch driver's transfer history
  const { data: historyTransfers = [] } = useQuery({
    queryKey: ['driver-transfers-history', user?.userId],
    queryFn: api.getMyTransfers,
    enabled: !!user?.userId,
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: api.updateDriverProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-assignment'] });
      setProfileSuccess('Profile completed! You are now marked AVAILABLE in dispatcher pool.');
    },
  });

  const checkinMutation = useMutation({
    mutationFn: ({ transferId, scannedQr }: { transferId: number; scannedQr: string }) =>
      api.driverCheckin(transferId, scannedQr),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-assignment'] });
      setShowQrSim(false);
      setScannedQrVal('');
      setQrError('');
    },
    onError: (err: any) => {
      setQrError(err.message || 'Verification failed. Hub QR Code mismatch.');
    }
  });

  const startLoadingMutation = useMutation({
    mutationFn: api.startLoading,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-assignment'] });
    },
  });

  const recordLoadMutation = useMutation({
    mutationFn: api.recordLoad,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-assignment'] });
      setShowLoadSim(false);
      setVarReason('');
    },
  });

  const departMutation = useMutation({
    mutationFn: api.depart,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-assignment'] });
    },
  });

  const arriveMutation = useMutation({
    mutationFn: api.arrive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-assignment'] });
    },
  });

  const recordDeliveryMutation = useMutation({
    mutationFn: api.recordDelivery,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-assignment'] });
      setShowDeliverSim(false);
      setVarExplanation('');
    },
  });

  const completeMutation = useMutation({
    mutationFn: api.completeTransfer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-assignment'] });
      qc.invalidateQueries({ queryKey: ['driver-transfers-history'] });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      employeeCode: empCode,
      licenseCategory: licenseCat,
    });
  };

  if (isLoading) {
    return <div className="text-center py-20 text-violet-400 font-mono">LOADING DRIVER DASHBOARD...</div>;
  }

  const profile = assignmentData?.driverProfile;
  const activeTransfer = assignmentData?.activeTransfer;
  const isProfileComplete = profile && profile.employeeCode;

  // Render profile completion if incomplete
  if (!isProfileComplete) {
    return (
      <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 my-10">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/25 mb-3">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Complete Driver profile</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Please register your commercial employee credentials to enter the active driver pool.
          </p>
        </div>

        {profileSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex gap-2">
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Employee Code (Municipal ID)</label>
            <input
              type="text"
              required
              placeholder="e.g. EMP-DRV-1024"
              value={empCode}
              onChange={e => setEmpCode(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Commercial License Category</label>
            <select
              value={licenseCat}
              onChange={e => setLicenseCat(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
            >
              <option value="HMV">Heavy Motor Vehicle (HMV)</option>
              <option value="TRANSPORT">Commercial Transport (Heavy Cargo)</option>
              <option value="LMV">Light Motor Vehicle (LMV)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition"
          >
            {updateProfileMutation.isPending ? 'Registering...' : 'Register Profile & Enter Pool'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Driver welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800 backdrop-blur-xl">
        <div className="flex gap-4 items-center">
          <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Driver Portal: {user?.name}</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Emp Code: <span className="font-mono text-zinc-300">{profile.employeeCode}</span> | License: <span className="font-mono text-zinc-300">{profile.licenseCategory}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
            profile.availability === 'AVAILABLE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            profile.availability === 'ON_ROUTE' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
            'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            Status: {profile.availability}
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Transfer panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-violet-500" />
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Compass className="w-4 h-4 text-violet-400" /> Active Dispatch Leg
            </h2>

            {!activeTransfer ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-sm text-zinc-500">No active outbound transfers assigned to you.</p>
                <div className="text-xs px-3 py-1.5 inline-block bg-zinc-950 text-zinc-400 rounded-lg border border-zinc-850">
                  Dispatcher pool status: Waiting for next route allocation.
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-between items-start border-b border-zinc-800/50 pb-4">
                  <div>
                    <span className="font-mono font-bold text-lg text-white">{activeTransfer.transferCode}</span>
                    <p className="text-xs text-zinc-400 mt-1">Cargo Type: <span className="text-zinc-200 font-semibold">{activeTransfer.wasteType} Waste</span></p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border bg-zinc-900 border-zinc-800 text-zinc-300">
                    {activeTransfer.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-800/30">
                    <span className="text-zinc-500 block mb-1">Source Collection Hub</span>
                    <span className="font-bold text-zinc-300 block">Hub #{activeTransfer.sourceHubId}</span>
                    <span className="text-[10px] text-zinc-500">Scan QR check-in required.</span>
                  </div>
                  <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-800/30">
                    <span className="text-zinc-500 block mb-1">Destination Processing Facility</span>
                    <span className="font-bold text-zinc-300 block">Facility #{activeTransfer.destinationFacilityId}</span>
                    <span className="text-[10px] text-zinc-500">Facility Type: {activeTransfer.destinationType}</span>
                  </div>
                </div>

                {/* State Machine Actions */}
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-850 space-y-3.5">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Route Actions Checklist</h4>

                  {/* Step 1: DRIVER_ASSIGNED -> DRIVER_CHECKED_IN */}
                  {activeTransfer.status === 'DRIVER_ASSIGNED' && (
                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl space-y-3">
                      <p className="text-xs text-zinc-400">Arrive at the source collection hub and scan the hub's QR code scale validator.</p>
                      <button
                        onClick={() => {
                          setScannedQrVal(`HUB:HUB-A:${activeTransfer.sourceHubId}`); // Simulate correct QR
                          setShowQrSim(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition"
                      >
                        <QrCode className="w-4 h-4" /> Scan Hub QR Code
                      </button>
                    </div>
                  )}

                  {/* Step 2: DRIVER_CHECKED_IN -> LOADING */}
                  {activeTransfer.status === 'DRIVER_CHECKED_IN' && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400">Check-in confirmed. Position vehicle under hopper/scales and tap "Start Loading Cargo".</p>
                      <button
                        onClick={() => startLoadingMutation.mutate(activeTransfer.transferId)}
                        disabled={startLoadingMutation.isPending}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition"
                      >
                        Start Loading Cargo
                      </button>
                    </div>
                  )}

                  {/* Step 3: LOADING -> LOADED (Requires Inputting weight scale, deducts hub inventory) */}
                  {activeTransfer.status === 'LOADING' && (
                    <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-xl space-y-3">
                      <p className="text-xs text-zinc-400">Cargo loaded. Retrieve physical weighbridge scale ticket and enter actual loaded net weight.</p>
                      <div className="text-[11px] text-zinc-500">Planned weight was: <span className="font-mono text-zinc-300">{activeTransfer.plannedWeightKg.toLocaleString()} kg</span></div>
                      <button
                        onClick={() => {
                          setActualLoadedKg(activeTransfer.plannedWeightKg);
                          setShowLoadSim(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition"
                      >
                        <Scale className="w-4 h-4" /> Record Loaded Scale Weight
                      </button>
                    </div>
                  )}

                  {/* Step 4: LOADED -> DEPARTED -> EN_ROUTE */}
                  {activeTransfer.status === 'LOADED' && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400">Inventory subtracted. Secure cargo container and tap "Log Departure" to begin route transit.</p>
                      <button
                        onClick={() => departMutation.mutate(activeTransfer.transferId)}
                        disabled={departMutation.isPending}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition"
                      >
                        Log Departure
                      </button>
                    </div>
                  )}

                  {/* Step 5: EN_ROUTE -> ARRIVED -> UNLOADING */}
                  {activeTransfer.status === 'EN_ROUTE' && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400">In Transit. Upon reaching destination processing facility gates, tap "Log Arrival".</p>
                      <button
                        onClick={() => arriveMutation.mutate(activeTransfer.transferId)}
                        disabled={arriveMutation.isPending}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition"
                      >
                        Log Arrival at Facility
                      </button>
                    </div>
                  )}

                  {/* Step 6: UNLOADING -> DELIVERED */}
                  {activeTransfer.status === 'UNLOADING' && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
                      <p className="text-xs text-zinc-400">Cargo unloaded. Input destination weighbridge scales ticket actual delivered weight.</p>
                      <div className="text-[11px] text-zinc-500">Loaded weight checkout was: <span className="font-mono text-zinc-300">{activeTransfer.actualLoadedWeightKg.toLocaleString()} kg</span></div>
                      <button
                        onClick={() => {
                          setActualDeliveredKg(activeTransfer.actualLoadedWeightKg); // default matching loaded
                          setShowDeliverSim(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition"
                      >
                        <Scale className="w-4 h-4" /> Record Delivered Scale Weight
                      </button>
                    </div>
                  )}

                  {/* Step 7: DELIVERED -> COMPLETED */}
                  {activeTransfer.status === 'DELIVERED' && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400">Weight audits verified. Complete transfer task and return driver status to AVAILABLE pool.</p>
                      <button
                        onClick={() => completeMutation.mutate(activeTransfer.transferId)}
                        disabled={completeMutation.isPending}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
                      >
                        Complete Transfer Task
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Driver Stats & History */}
        <div className="space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" /> Career Driver Stats
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 text-center">
                <span className="text-zinc-500 text-[10px] block uppercase font-semibold">Total KM Driven</span>
                <span className="font-bold text-xl text-white font-mono mt-1 block">{profile.totalKmDriven.toFixed(1)} km</span>
              </div>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 text-center">
                <span className="text-zinc-500 text-[10px] block uppercase font-semibold">Completed Runs</span>
                <span className="font-bold text-xl text-white font-mono mt-1 block">
                  {historyTransfers.filter(t => t.status === 'COMPLETED').length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-violet-400" /> Dispatch History
            </h2>

            {historyTransfers.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No completed dispatches.</p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {historyTransfers.map(h => (
                  <div key={h.transferId} className="bg-zinc-950 border border-zinc-850/80 rounded-xl p-3 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-mono font-bold text-zinc-200">{h.transferCode}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{h.wasteType} | {h.scheduledDate}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {h.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Scan simulation modal */}
      <AnimatePresence>
        {showQrSim && activeTransfer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-violet-400" /> Hub QR Scale Validator
                </h3>
                <button onClick={() => setShowQrSim(false)} className="text-zinc-400 hover:text-white transition">✕</button>
              </div>

              <div className="p-5 space-y-4">
                {qrError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{qrError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">Simulate Camera Scanning QR Code String</label>
                  <input
                    type="text"
                    value={scannedQrVal}
                    onChange={e => setScannedQrVal(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                    placeholder="e.g. HUB:<hubCode>:<hubId>"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">Expected correct format: HUB:HUB_CODE:{activeTransfer.sourceHubId}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setScannedQrVal(`HUB:HUB-A:${activeTransfer.sourceHubId}`)}
                    className="flex-1 py-1.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-750 rounded-lg text-[10px] font-semibold transition"
                  >
                    Auto Fill Correct QR
                  </button>
                  <button
                    onClick={() => checkinMutation.mutate({ transferId: activeTransfer.transferId, scannedQr: scannedQrVal })}
                    disabled={!scannedQrVal || checkinMutation.isPending}
                    className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Verify QR Code
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Loaded Scales simulation modal */}
      <AnimatePresence>
        {showLoadSim && activeTransfer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-violet-400" /> Weighbridge Scales Confirmation
                </h3>
                <button onClick={() => setShowLoadSim(false)} className="text-zinc-400 hover:text-white transition">✕</button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  recordLoadMutation.mutate({
                    transferId: activeTransfer.transferId,
                    actualLoadedWeightKg: actualLoadedKg,
                    measurementSource: measSource,
                    varianceReason: varReason || undefined,
                  });
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-zinc-400 mb-1">Scale Weight (kg)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={actualLoadedKg}
                    onChange={e => setActualLoadedKg(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-zinc-400 mb-1">Measurement Source</label>
                    <select
                      value={measSource}
                      onChange={e => setMeasSource(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white text-[11px] focus:outline-none"
                    >
                      <option value="AUTOMATIC_SCALE">Automatic Weighbridge</option>
                      <option value="MANUAL_SCALE">Manual Scale Ticket</option>
                      <option value="ESTIMATED">Volumetric Estimator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-400 mb-1">Planned Weight</label>
                    <div className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-zinc-500 font-mono text-sm">
                      {activeTransfer.plannedWeightKg} kg
                    </div>
                  </div>
                </div>

                {/* Variance text field shown if loaded differs from planned */}
                {Math.abs(actualLoadedKg - activeTransfer.plannedWeightKg) / activeTransfer.plannedWeightKg > 0.05 && (
                  <div className="space-y-1.5 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-amber-400">
                    <div className="flex gap-1.5 items-center font-bold">
                      <AlertTriangle className="w-4 h-4" /> Scale Variance Warning
                    </div>
                    <p className="text-[10px] text-zinc-400">The weight differs from planned by more than 5%. Please provide a justification.</p>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Moisture excess, density variance"
                      value={varReason}
                      onChange={e => setVarReason(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white text-xs mt-1.5 focus:outline-none"
                    />
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLoadSim(false)}
                    className="px-4 py-2 bg-zinc-850 text-zinc-300 rounded-xl font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordLoadMutation.isPending}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition"
                  >
                    Log Weight Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Delivery scales simulation modal */}
      <AnimatePresence>
        {showDeliverSim && activeTransfer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-violet-400" /> Destination Scale Audit
                </h3>
                <button onClick={() => setShowDeliverSim(false)} className="text-zinc-400 hover:text-white transition">✕</button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  recordDeliveryMutation.mutate({
                    transferId: activeTransfer.transferId,
                    actualDeliveredWeightKg: actualDeliveredKg,
                    varianceExplanation: varExplanation || undefined,
                  });
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-zinc-400 mb-1">Delivered Scale Weight (kg)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={actualDeliveredKg}
                    onChange={e => setActualDeliveredKg(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-zinc-400 mb-1">Loaded checkout Weight</label>
                    <div className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-zinc-500 font-mono text-sm">
                      {activeTransfer.actualLoadedWeightKg} kg
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-400 mb-1">Planned Weight</label>
                    <div className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-zinc-500 font-mono text-sm">
                      {activeTransfer.plannedWeightKg} kg
                    </div>
                  </div>
                </div>

                {/* Variance text field shown if delivered differs from loaded */}
                {Math.abs(actualDeliveredKg - activeTransfer.actualLoadedWeightKg) > 20 && (
                  <div className="space-y-1.5 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-amber-400">
                    <div className="flex gap-1.5 items-center font-bold">
                      <AlertTriangle className="w-4 h-4" /> Delivery Loss Variance Warning
                    </div>
                    <p className="text-[10px] text-zinc-400">The weight differs from checkout scales by more than 20kg. Please explain loss/leakage.</p>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spill during transit, moisture evaporation"
                      value={varExplanation}
                      onChange={e => setVarExplanation(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white text-xs mt-1.5 focus:outline-none"
                    />
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeliverSim(false)}
                    className="px-4 py-2 bg-zinc-850 text-zinc-300 rounded-xl font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordDeliveryMutation.isPending}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition"
                  >
                    Confirm Delivery
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
