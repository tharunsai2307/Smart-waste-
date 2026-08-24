import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

type ReportType = 'collection' | 'hub' | 'fleet' | 'route' | 'recycling' | 'incident' | 'waste';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('collection');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [downloading, setDownloading] = useState<boolean>(false);

  const filterParams: Record<string, string | number> = {
    filter: timeFilter,
  };

  // Preview Queries
  const { data: collections } = useQuery({
    queryKey: ['reportCollections', timeFilter],
    queryFn: () => api.getAnalyticsCollections(filterParams),
    enabled: reportType === 'collection',
  });

  const { data: hubs } = useQuery({
    queryKey: ['reportHubs', timeFilter],
    queryFn: () => api.getAnalyticsHubs(filterParams),
    enabled: reportType === 'hub',
  });

  const { data: fleet } = useQuery({
    queryKey: ['reportFleet', timeFilter],
    queryFn: () => api.getAnalyticsFleet(filterParams),
    enabled: reportType === 'fleet',
  });

  const { data: routes } = useQuery({
    queryKey: ['reportRoutes', timeFilter],
    queryFn: () => api.getAnalyticsRoutes(filterParams),
    enabled: reportType === 'route',
  });

  const { data: recycling } = useQuery({
    queryKey: ['reportRecycling', timeFilter],
    queryFn: () => api.getAnalyticsRecycling(filterParams),
    enabled: reportType === 'recycling',
  });

  const { data: incidents } = useQuery({
    queryKey: ['reportIncidents', timeFilter],
    queryFn: () => api.getAnalyticsIncidents(filterParams),
    enabled: reportType === 'incident',
  });

  const { data: wasteStream } = useQuery({
    queryKey: ['reportWasteStream', timeFilter],
    queryFn: () => api.getAnalyticsWasteTypes(filterParams),
    enabled: reportType === 'waste',
  });

  const handleExportCSV = () => {
    setDownloading(true);
    const url = api.exportReportCSVUrl(reportType, filterParams);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${timeFilter}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            Phase 9 Export Center
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-1">Municipal Reports & CSV Export</h1>
          <p className="text-xs text-slate-400 mt-1">
            Server-side generated audit-verified operational reports from persisted records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Historical Records</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
          </select>

          <button
            onClick={handleExportCSV}
            disabled={downloading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span>{downloading ? 'Generating...' : 'Download CSV Report'}</span>
            <span>⬇️</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { id: 'collection', label: 'Collections', icon: '🗑️' },
          { id: 'hub', label: 'Hub Inventory', icon: '🏢' },
          { id: 'fleet', label: 'Fleet & Vehicle', icon: '🚛' },
          { id: 'route', label: 'Routes & Stops', icon: '🗺️' },
          { id: 'recycling', label: 'Recycling Batches', icon: '♻️' },
          { id: 'incident', label: 'Incidents Log', icon: '⚠️' },
          { id: 'waste', label: 'Waste Stream', icon: '📊' },
        ].map(rt => (
          <button
            key={rt.id}
            onClick={() => setReportType(rt.id as ReportType)}
            className={`p-3 rounded-xl border text-left transition-all ${
              reportType === rt.id
                ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
            }`}
          >
            <div className="text-lg mb-1">{rt.icon}</div>
            <div className="text-xs font-bold leading-tight">{rt.label}</div>
          </button>
        ))}
      </div>

      {/* Report Preview Panel */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Report Data Preview: <span className="text-blue-400">{reportType.toUpperCase()}</span>
          </h3>
          <span className="text-xs text-slate-500">Live backend calculation</span>
        </div>

        {/* Content per report type */}
        {reportType === 'collection' && collections && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">Total Volume</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">{collections.totalCollectedKg.toFixed(1)} kg</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">Completed Requests</span>
                <p className="text-lg font-bold text-blue-400 mt-1">{collections.completedRequests}</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">Success Rate</span>
                <p className="text-lg font-bold text-slate-200 mt-1">{collections.collectionSuccessRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">Missed Requests</span>
                <p className="text-lg font-bold text-rose-400 mt-1">{collections.missedRequests}</p>
              </div>
            </div>
          </div>
        )}

        {reportType === 'hub' && hubs && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 uppercase text-slate-400">
                <tr>
                  <th className="p-3">Hub Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Max Capacity</th>
                  <th className="p-3">Current Inventory</th>
                  <th className="p-3">Utilization</th>
                  <th className="p-3">Cleaners</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {hubs.map(h => (
                  <tr key={h.hubId}>
                    <td className="p-3 font-mono text-blue-400">{h.hubCode}</td>
                    <td className="p-3 font-medium">{h.name}</td>
                    <td className="p-3">{h.maximumCapacityKg} kg</td>
                    <td className="p-3">{h.currentInventoryKg.toFixed(1)} kg</td>
                    <td className="p-3 font-bold">{h.utilizationPercentage.toFixed(1)}%</td>
                    <td className="p-3">{h.activeCleaners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'fleet' && fleet && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 uppercase text-slate-400">
                <tr>
                  <th className="p-3">Vehicle ID</th>
                  <th className="p-3">Registration</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Load</th>
                  <th className="p-3">Utilization</th>
                  <th className="p-3">Last Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {fleet.vehicles?.map(v => (
                  <tr key={v.vehicleId}>
                    <td className="p-3 font-mono text-blue-400">VEH-{v.vehicleId}</td>
                    <td className="p-3">{v.registrationNumber}</td>
                    <td className="p-3">{v.vehicleType}</td>
                    <td className="p-3">{v.capacityKg} kg</td>
                    <td className="p-3">{v.currentLoadKg} kg</td>
                    <td className="p-3">{v.utilizationPercentage.toFixed(1)}%</td>
                    <td className="p-3 text-slate-400">{v.lastInspectionDate || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'route' && routes && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 uppercase text-slate-400">
                <tr>
                  <th className="p-3">Route ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Driver ID</th>
                  <th className="p-3">Planned Load</th>
                  <th className="p-3">Stops</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {routes.routes?.map(r => (
                  <tr key={r.routeId}>
                    <td className="p-3 font-mono text-blue-400">RT-{r.routeId}</td>
                    <td className="p-3">{r.routeType}</td>
                    <td className="p-3">Driver #{r.driverId}</td>
                    <td className="p-3">{r.totalWeightKg} kg</td>
                    <td className="p-3">{r.completedStopCount} / {r.stopCount}</td>
                    <td className="p-3">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'recycling' && recycling && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-400">Total Input</span>
              <p className="text-lg font-bold text-slate-200 mt-1">{recycling.totalInputKg.toFixed(1)} kg</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-400">Recovered Volume</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">{recycling.totalRecoveredKg.toFixed(1)} kg</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-400">Recovery Rate</span>
              <p className="text-lg font-bold text-teal-400 mt-1">{recycling.recoveryRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-400">Residual Volume</span>
              <p className="text-lg font-bold text-rose-400 mt-1">{recycling.totalResidualKg.toFixed(1)} kg</p>
            </div>
          </div>
        )}

        {reportType === 'incident' && incidents && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-400">Total Incidents</span>
              <p className="text-lg font-bold text-slate-200 mt-1">{incidents.totalIncidents}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-400">Open</span>
              <p className="text-lg font-bold text-amber-400 mt-1">{incidents.openIncidents}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-400">Resolved</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">{incidents.resolvedIncidents}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <span className="text-slate-400">Critical</span>
              <p className="text-lg font-bold text-rose-400 mt-1">{incidents.severity.critical}</p>
            </div>
          </div>
        )}

        {reportType === 'waste' && wasteStream && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 uppercase text-slate-400">
                <tr>
                  <th className="p-3">Material Category</th>
                  <th className="p-3">Collected (kg)</th>
                  <th className="p-3">Processed (kg)</th>
                  <th className="p-3">Recovered (kg)</th>
                  <th className="p-3">Residual (kg)</th>
                  <th className="p-3">Share of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {wasteStream.map(w => (
                  <tr key={w.wasteType}>
                    <td className="p-3 font-semibold text-slate-200">{w.wasteType}</td>
                    <td className="p-3">{w.collectedKg.toFixed(1)} kg</td>
                    <td className="p-3">{w.processedKg.toFixed(1)} kg</td>
                    <td className="p-3 text-emerald-400">{w.recoveredKg.toFixed(1)} kg</td>
                    <td className="p-3 text-rose-400">{w.residualKg.toFixed(1)} kg</td>
                    <td className="p-3 font-bold">{w.percentageOfTotal.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
