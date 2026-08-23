import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const ReportsPage: React.FC = () => {
  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: api.getDashboard });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Reports</h1>
        <p className="text-xs text-slate-500 mt-1">Comprehensive operational summary</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Summary table */}
        <div className="glass p-6 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">SYSTEM SUMMARY</div>
          {[
            { section: 'RESIDENTS & NETWORK', rows: [
              { label: 'Total Residents', value: dashboard?.residents ?? 0, unit: '' },
              { label: 'Total Bins', value: dashboard?.bins ?? 0, unit: '' },
              { label: 'Total Vehicles', value: dashboard?.vehicles ?? 0, unit: '' },
            ]},
            { section: 'WASTE METRICS', rows: [
              { label: 'Total Waste Generated', value: (dashboard?.totalWaste ?? 0).toFixed(1), unit: ' kg' },
              { label: 'Total Recyclable', value: (dashboard?.totalRecyclable ?? 0).toFixed(1), unit: ' kg' },
              { label: 'Total Recycled', value: (dashboard?.totalRecycled ?? 0).toFixed(1), unit: ' kg' },
              { label: 'Recycling Rate', value: (dashboard?.recyclingRate ?? 0).toFixed(1), unit: '%' },
            ]},
            { section: 'ENVIRONMENTAL', rows: [
              { label: 'CO₂ Saved (est.)', value: (dashboard?.co2Saved ?? 0).toFixed(1), unit: ' kg' },
              { label: 'Landfill Avoided', value: (dashboard?.landfillAvoided ?? 0).toFixed(1), unit: ' kg' },
              { label: 'Recycling Value', value: (dashboard?.recyclingValue ?? 0).toFixed(0), unit: ' ₹' },
            ]},
          ].map(group => (
            <div key={group.section} className="mb-5">
              <div className="text-xs text-emerald-500 tracking-widest mb-2 font-mono">{group.section}</div>
              {group.rows.map(row => (
                <div key={row.label} className="flex justify-between py-1.5 border-b"
                     style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-xs text-slate-500">{row.label}</span>
                  <span className="text-xs text-white font-mono">{row.value}{row.unit}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Bin status report */}
        <div className="glass p-6 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">COLLECTION REPORT</div>
          {[
            { section: 'BIN STATUS', rows: [
              { label: 'Normal Bins', value: dashboard?.normalBins ?? 0, color: '#34d399' },
              { label: 'Warning Bins', value: dashboard?.warningBins ?? 0, color: '#fbbf24' },
              { label: 'Critical Bins', value: dashboard?.criticalBins ?? 0, color: '#ef4444' },
              { label: 'Overflow Bins', value: dashboard?.overflowBins ?? 0, color: '#dc2626' },
            ]},
            { section: 'COLLECTION STATUS', rows: [
              { label: 'Pending Collections', value: dashboard?.pendingCollections ?? 0, color: '#fbbf24' },
              { label: 'Active Collections', value: dashboard?.activeCollections ?? 0, color: '#22d3ee' },
              { label: 'Completed Collections', value: dashboard?.completedCollections ?? 0, color: '#34d399' },
            ]},
            { section: 'VEHICLE STATUS', rows: [
              { label: 'Available Vehicles', value: dashboard?.availableVehicles ?? 0, color: '#34d399' },
              { label: 'On Route / Assigned', value: dashboard?.onRouteVehicles ?? 0, color: '#22d3ee' },
            ]},
          ].map(group => (
            <div key={group.section} className="mb-5">
              <div className="text-xs text-emerald-500 tracking-widest mb-2 font-mono">{group.section}</div>
              {group.rows.map((row: {label:string;value:number;color:string}) => (
                <div key={row.label} className="flex justify-between py-1.5 border-b items-center"
                     style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-xs text-slate-500">{row.label}</span>
                  <span className="text-sm font-bold font-mono" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Active Alerts */}
          <div className="text-xs text-emerald-500 tracking-widest mb-2 font-mono">ALERTS</div>
          <div className="flex justify-between py-1.5">
            <span className="text-xs text-slate-500">Active Alerts</span>
            <span className="text-sm font-bold font-mono" style={{ color: (dashboard?.activeAlerts ?? 0) > 0 ? '#ef4444' : '#34d399' }}>
              {dashboard?.activeAlerts ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
