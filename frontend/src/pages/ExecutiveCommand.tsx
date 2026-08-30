import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { api } from '../services/api';
import type {
  AnalyticsSummary,
  CollectionAnalytics,
  HubAnalyticsItem,
  FleetAnalytics,
  RecyclingAnalytics,
  WasteTypeAnalyticsItem,
  DriverPerformanceItem,
  CleanerPerformanceItem,
  IncidentAnalytics,
  QRAnalytics,
  OperationalTrendItem,
  LiveFeedEvent
} from '../types';

export default function ExecutiveCommand() {
  const user = useAppStore(s => s.user);
  const [timeFilter, setTimeFilter] = useState<string>('last_7_days');
  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'hubs' | 'fleet' | 'recycling' | 'workforce' | 'incidents' | 'live'>('overview');

  const filterParams: Record<string, string | number> = {
    filter: timeFilter,
    role: user?.role || 'ADMIN',
    userId: user?.userId || 0,
  };

  // Queries
  const { data: summary, isLoading: sumLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['analyticsSummary', timeFilter, user?.role, user?.userId],
    queryFn: () => api.getAnalyticsSummary(filterParams),
  });

  const { data: collData } = useQuery<CollectionAnalytics>({
    queryKey: ['analyticsCollections', timeFilter, user?.role, user?.userId],
    queryFn: () => api.getAnalyticsCollections(filterParams),
  });

  const { data: hubList } = useQuery<HubAnalyticsItem[]>({
    queryKey: ['analyticsHubs', timeFilter, user?.role, user?.userId],
    queryFn: () => api.getAnalyticsHubs(filterParams),
  });

  const { data: fleetData } = useQuery<FleetAnalytics>({
    queryKey: ['analyticsFleet', timeFilter, user?.role, user?.userId],
    queryFn: () => api.getAnalyticsFleet(filterParams),
  });

  const { data: recData } = useQuery<RecyclingAnalytics>({
    queryKey: ['analyticsRecycling', timeFilter, user?.role, user?.userId],
    queryFn: () => api.getAnalyticsRecycling(filterParams),
  });

  const { data: wasteTypes } = useQuery<WasteTypeAnalyticsItem[]>({
    queryKey: ['analyticsWasteTypes', timeFilter],
    queryFn: () => api.getAnalyticsWasteTypes(filterParams),
  });

  const { data: drivers } = useQuery<DriverPerformanceItem[]>({
    queryKey: ['analyticsDrivers', timeFilter],
    queryFn: () => api.getAnalyticsDrivers(filterParams),
    enabled: user?.role === 'ADMIN' || user?.role === 'DRIVER',
  });

  const { data: cleaners } = useQuery<CleanerPerformanceItem[]>({
    queryKey: ['analyticsCleaners', timeFilter],
    queryFn: () => api.getAnalyticsCleaners(filterParams),
    enabled: user?.role === 'ADMIN' || user?.role === 'LOCAL_HUB_MANAGER' || user?.role === 'CLEANER',
  });

  const { data: incidents } = useQuery<IncidentAnalytics>({
    queryKey: ['analyticsIncidents', timeFilter],
    queryFn: () => api.getAnalyticsIncidents(filterParams),
  });

  const { data: qrStats } = useQuery<QRAnalytics>({
    queryKey: ['analyticsQR', timeFilter],
    queryFn: () => api.getAnalyticsQR(filterParams),
  });

  const { data: trends } = useQuery<OperationalTrendItem[]>({
    queryKey: ['analyticsTrends', timeFilter],
    queryFn: () => api.getAnalyticsTrends(filterParams),
  });

  const { data: liveFeed } = useQuery<LiveFeedEvent[]>({
    queryKey: ['analyticsLiveFeed'],
    queryFn: () => api.getAnalyticsLiveFeed(filterParams),
    refetchInterval: 5000,
  });

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    if (score >= 40) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Phase 9 Municipal Intelligence
              </span>
              <span className="text-xs text-slate-400">Role: <strong className="text-slate-200">{user?.role || 'ADMIN'}</strong></span>
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent mt-1">
              Executive Operations Command
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time audit-verified municipal operations, fleet efficiency & mass-balance analytics
            </p>
          </div>

          {/* Time Filter Controls */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last_7_days', label: '7 Days' },
              { id: 'last_30_days', label: '30 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeFilter(tf.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeFilter === tf.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </header>

        {/* Top-Level KPI Ribbon */}
        {sumLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-900/60 rounded-2xl border border-slate-800" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              title="Operational Efficiency"
              value={`${summary.operationalEfficiencyIndex.toFixed(1)}%`}
              subtitle="Municipal composite index"
              badge="MOEI"
              className={getEfficiencyColor(summary.operationalEfficiencyIndex)}
            />
            <KPICard
              title="Waste Collected"
              value={`${summary.totalWasteCollectedKg.toLocaleString()} kg`}
              subtitle={`${summary.completedCollections} completed requests`}
              badge="COLLECTIONS"
              color="emerald"
            />
            <KPICard
              title="Active Fleet"
              value={`${summary.activeVehicles} / ${summary.totalVehicles}`}
              subtitle={`${summary.activeRoutes} routes dispatched`}
              badge="FLEET"
              color="indigo"
            />
            <KPICard
              title="Recycling Recovery"
              value={`${summary.recyclingRecoveryRate.toFixed(1)}%`}
              subtitle={`${summary.totalRecoveredKg.toLocaleString()} kg recovered`}
              badge="MASS BALANCE"
              color="teal"
            />
            <KPICard
              title="QR Verification Rate"
              value={`${summary.qrComplianceRate.toFixed(1)}%`}
              subtitle={`${summary.successfulQrScans} / ${summary.totalQrScans} scans verified`}
              badge="COMPLIANCE"
              color="blue"
            />
            <KPICard
              title="Collection Hubs"
              value={`${summary.activeHubs} / ${summary.totalHubs}`}
              subtitle={summary.criticalHubs > 0 ? `${summary.criticalHubs} at critical capacity` : 'All hubs normal'}
              badge="HUBS"
              color={summary.criticalHubs > 0 ? 'rose' : 'emerald'}
            />
            <KPICard
              title="Open Incidents"
              value={summary.openIncidents}
              subtitle={`${summary.totalIncidents} total recorded`}
              badge="AUDIT"
              color={summary.openIncidents > 0 ? 'amber' : 'slate'}
            />
            <KPICard
              title="Active Residents"
              value={`${summary.activeResidents} / ${summary.totalResidents}`}
              subtitle={`${summary.pendingCollections} collections pending`}
              badge="CITIZENS"
              color="blue"
            />
          </div>
        ) : (
          <div className="p-8 bg-slate-900/50 rounded-2xl border border-slate-800 text-center text-slate-400">
            No operational statistics available for the selected filter.
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Executive Overview' },
            { id: 'collections', label: 'Collections Intelligence' },
            { id: 'hubs', label: 'Hub Capacity & Ledger' },
            { id: 'fleet', label: 'Fleet & Routing' },
            { id: 'recycling', label: 'Recycling Mass Balance' },
            { id: 'workforce', label: 'Workforce Performance' },
            { id: 'incidents', label: 'Incidents & QR Audits' },
            { id: 'live', label: 'Live Operations Feed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Daily Trend & Waste Stream Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 7-Day Trend Card */}
                <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800/80">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">Operational Trend (Last 7 Days)</h3>
                      <p className="text-xs text-slate-400">Daily collections vs completed volume</p>
                    </div>
                  </div>
                  {trends && trends.length > 0 ? (
                    <div className="space-y-4 pt-2">
                      {trends.map(t => (
                        <div key={t.date} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-300">{t.date}</span>
                            <span className="text-emerald-400">{t.completed} / {t.requests} requests ({t.wasteKg.toFixed(1)} kg)</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${t.requests > 0 ? (t.completed / t.requests) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 italic">No trend activity in this period.</div>
                  )}
                </div>

                {/* Waste Stream Breakdown */}
                <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800/80">
                  <h3 className="text-lg font-bold text-slate-100 mb-1">Waste Stream Breakdown</h3>
                  <p className="text-xs text-slate-400 mb-4">Collected material composition</p>
                  {wasteTypes && wasteTypes.length > 0 ? (
                    <div className="space-y-3">
                      {wasteTypes.map(wt => (
                        <div key={wt.wasteType} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-medium">{wt.wasteType}</span>
                            <span className="text-slate-400">{wt.collectedKg.toFixed(1)} kg ({wt.percentageOfTotal.toFixed(1)}%)</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${wt.percentageOfTotal}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 italic">No waste stream records.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'collections' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {collData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-bold text-slate-100 mb-4">Collection Statuses</h3>
                    <div className="space-y-3 text-sm">
                      <StatRow label="Total Requests" value={collData.totalRequests} />
                      <StatRow label="Completed Collections" value={collData.completedRequests} highlight="text-emerald-400" />
                      <StatRow label="Pending / En Route" value={collData.pendingRequests} highlight="text-blue-400" />
                      <StatRow label="Missed Collections" value={collData.missedRequests} highlight="text-rose-400" />
                      <StatRow label="Cancelled Collections" value={collData.cancelledRequests} />
                      <StatRow label="Success Rate" value={`${collData.collectionSuccessRate.toFixed(1)}%`} />
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-bold text-slate-100 mb-4">Priority Breakdown</h3>
                    <div className="space-y-3 text-sm">
                      <StatRow label="Urgent Priority" value={collData.priorities.urgent} highlight="text-rose-400 font-bold" />
                      <StatRow label="High Priority" value={collData.priorities.high} highlight="text-amber-400" />
                      <StatRow label="Normal Priority" value={collData.priorities.normal} highlight="text-blue-400" />
                      <StatRow label="Low Priority" value={collData.priorities.low} />
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-bold text-slate-100 mb-4">Weight & Metrics</h3>
                    <div className="space-y-3 text-sm">
                      <StatRow label="Total Volume" value={`${collData.totalCollectedKg.toLocaleString()} kg`} highlight="text-emerald-400 font-bold" />
                      <StatRow label="Avg Collection Weight" value={`${collData.averageCollectionWeightKg.toFixed(2)} kg`} />
                      <StatRow label="Avg Completion Time" value={`${collData.averageCompletionTimeMin.toFixed(0)} mins`} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-slate-900/50 rounded-2xl border border-slate-800 text-center text-slate-500">
                  No collection analytics available for this period.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'hubs' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {hubList && hubList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hubList.map(h => (
                    <div key={h.hubId} className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-blue-400 font-mono">{h.hubCode}</span>
                          <h4 className="text-lg font-bold text-slate-100">{h.name}</h4>
                        </div>
                        <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                          h.utilizationPercentage > 90 ? 'bg-rose-500/20 text-rose-400' :
                          h.utilizationPercentage > 70 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {h.utilizationPercentage.toFixed(1)}% Full
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            h.utilizationPercentage > 90 ? 'bg-rose-500' :
                            h.utilizationPercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, h.utilizationPercentage)}%` }}
                        />
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Inventory / Capacity:</span>
                          <span>{h.currentInventoryKg.toLocaleString()} / {h.maximumCapacityKg.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Inbound / Outbound:</span>
                          <span>+{h.inboundKg.toFixed(0)} kg / -{h.outboundKg.toFixed(0)} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Active Cleaners:</span>
                          <span>{h.activeCleaners}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-slate-900/50 rounded-2xl border border-slate-800 text-center text-slate-500">
                  No hubs found or registered.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'fleet' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {fleetData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <KPICard title="Total Fleet Size" value={fleetData.totalVehicles} color="indigo" />
                  <KPICard title="Active On Route" value={fleetData.onRouteVehicles} color="blue" />
                  <KPICard title="Under Maintenance" value={fleetData.underMaintenance} color="rose" />
                  <KPICard title="Fleet Utilization" value={`${fleetData.fleetUtilizationPercentage.toFixed(1)}%`} color="teal" />
                </div>
              )}
              {fleetData?.vehicles && fleetData.vehicles.length > 0 ? (
                <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="p-4">Reg Number</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Capacity</th>
                        <th className="p-4">Current Load</th>
                        <th className="p-4">Utilization</th>
                        <th className="p-4">Last Inspection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {fleetData.vehicles.map(v => (
                        <tr key={v.vehicleId} className="hover:bg-slate-800/40">
                          <td className="p-4 font-mono text-blue-400">{v.registrationNumber || `VEH-${v.vehicleId}`}</td>
                          <td className="p-4">{v.vehicleType}</td>
                          <td className="p-4">{v.capacityKg} kg</td>
                          <td className="p-4">{v.currentLoadKg} kg</td>
                          <td className="p-4">
                            <span className={v.utilizationPercentage > 85 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                              {v.utilizationPercentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-400">{v.lastInspectionDate || 'No record'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 bg-slate-900/50 rounded-2xl border border-slate-800 text-center text-slate-500">
                  No fleet vehicles currently recorded.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'recycling' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {recData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
                    <h3 className="text-lg font-bold text-slate-100">Mass Balance Summary</h3>
                    <StatRow label="Total Input Received" value={`${recData.totalInputKg.toLocaleString()} kg`} />
                    <StatRow label="Processed Volume" value={`${recData.totalProcessedKg.toLocaleString()} kg`} />
                    <StatRow label="Total Recovered" value={`${recData.totalRecoveredKg.toLocaleString()} kg`} highlight="text-emerald-400 font-bold" />
                    <StatRow label="Residual / Waste" value={`${recData.totalResidualKg.toLocaleString()} kg`} highlight="text-rose-400" />
                    <StatRow label="Processing Loss" value={`${recData.processingLossKg.toLocaleString()} kg`} />
                  </div>
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
                    <h3 className="text-lg font-bold text-slate-100">Efficiency Rates</h3>
                    <StatRow label="Recovery Rate" value={`${recData.recoveryRate.toFixed(1)}%`} highlight="text-emerald-400 font-bold" />
                    <StatRow label="Residual Rate" value={`${recData.residualRate.toFixed(1)}%`} />
                    <StatRow label="Loss Rate" value={`${recData.processingLossRate.toFixed(1)}%`} />
                  </div>
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
                    <h3 className="text-lg font-bold text-slate-100">Batch Processing</h3>
                    <StatRow label="Total Batches" value={recData.totalBatches} />
                    <StatRow label="Active Batches" value={recData.activeBatches} highlight="text-blue-400" />
                    <StatRow label="Completed Batches" value={recData.completedBatches} highlight="text-emerald-400" />
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-slate-900/50 rounded-2xl border border-slate-800 text-center text-slate-500">
                  No recycling batches or processing data recorded.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'workforce' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Drivers */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-lg font-bold text-slate-100 mb-4">Driver Operational Performance</h3>
                {drivers && drivers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drivers.map(d => (
                      <div key={d.driverId} className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-100">{d.name}</h4>
                            <span className="text-xs text-slate-400">ID: {d.driverId}</span>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">
                            DPS: {d.performanceScore.toFixed(0)}/100
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 space-y-1">
                          <div>Routes: {d.completedRoutes} / {d.assignedRoutes} completed</div>
                          <div>Stops: {d.completedStops} completed, {d.missedStops} missed</div>
                          <div>Total Weight: {d.totalCollectedKg.toFixed(1)} kg</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 italic">No driver records found.</div>
                )}
              </div>

              {/* Cleaners */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-lg font-bold text-slate-100 mb-4">Cleaner Field Performance</h3>
                {cleaners && cleaners.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cleaners.map(c => (
                      <div key={c.cleanerId} className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-100">{c.name}</h4>
                            <span className="text-xs text-slate-400">Hub ID: {c.assignedHubId}</span>
                          </div>
                          <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold">
                            CPS: {c.performanceScore.toFixed(0)}/100
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 space-y-1">
                          <div>Collections: {c.completedCollections} / {c.assignedCollections} completed</div>
                          <div>Total Collected: {c.totalCollectedKg.toFixed(1)} kg</div>
                          <div>Successful Deposits: {c.successfulDeposits}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 italic">No cleaner records found.</div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'incidents' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Incidents Card */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-lg font-bold text-slate-100">Incident Breakdown</h3>
                  {incidents ? (
                    <div className="space-y-2 text-sm">
                      <StatRow label="Total Incidents" value={incidents.totalIncidents} />
                      <StatRow label="Open / Investigating" value={incidents.openIncidents} highlight="text-amber-400 font-bold" />
                      <StatRow label="Resolved" value={incidents.resolvedIncidents} highlight="text-emerald-400" />
                      <StatRow label="Critical Severity" value={incidents.severity.critical} highlight="text-rose-400 font-bold" />
                      <StatRow label="Weight Variance Issues" value={incidents.types.weightVariance} />
                      <StatRow label="QR Scan Failures" value={incidents.types.qrFailure} />
                    </div>
                  ) : (
                    <div className="text-slate-500 italic">No incident statistics available.</div>
                  )}
                </div>

                {/* QR Compliance Card */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-lg font-bold text-slate-100">QR Verification Compliance</h3>
                  {qrStats ? (
                    <div className="space-y-2 text-sm">
                      <StatRow label="Total Scans" value={qrStats.totalScans} />
                      <StatRow label="Verified Scans" value={qrStats.successfulScans} highlight="text-emerald-400 font-bold" />
                      <StatRow label="Failed / Rejected Scans" value={qrStats.failedScans} highlight="text-rose-400" />
                      <StatRow label="Compliance Rate" value={`${qrStats.complianceRate.toFixed(1)}%`} highlight="text-blue-400 font-bold" />
                      <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
                        Vehicle: {qrStats.byType.vehicle} | Hub: {qrStats.byType.hub} | Stop: {qrStats.byType.stop} | Facility: {qrStats.byType.facility}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic">No QR verification scans logged.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'live' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Live Operational Feed</h3>
                    <p className="text-xs text-slate-400">Real-time municipal events & audit logs (auto-refreshing)</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                </div>

                {liveFeed && liveFeed.length > 0 ? (
                  <div className="space-y-3">
                    {liveFeed.map((evt, idx) => (
                      <div key={idx} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              evt.severity === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                              evt.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {evt.eventType}
                            </span>
                            <span className="text-sm font-semibold text-slate-200">{evt.title}</span>
                          </div>
                          <p className="text-xs text-slate-400">{evt.description}</p>
                        </div>
                        <span className="text-xs font-mono text-slate-500 whitespace-nowrap">{evt.timestamp}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 italic">Waiting for operational activity...</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, badge, color, className }: {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  color?: string;
  className?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-500/20 text-blue-400 bg-blue-500/5',
    emerald: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
    indigo: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5',
    teal: 'border-teal-500/20 text-teal-400 bg-teal-500/5',
    amber: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
    rose: 'border-rose-500/20 text-rose-400 bg-rose-500/5',
    slate: 'border-slate-800 text-slate-400 bg-slate-900/40',
  };

  const styleClass = className || colorMap[color || 'slate'];

  return (
    <div className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col justify-between ${styleClass}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {badge && <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300">{badge}</span>}
      </div>
      <div className="text-2xl font-extrabold text-slate-100">{value}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-800/60 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${highlight || 'text-slate-200'}`}>{value}</span>
    </div>
  );
}
