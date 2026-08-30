import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import type { Alert } from '../types';

export default function AlertCenter() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['unreadAlerts'],
    queryFn: api.getUnreadAlerts,
    refetchInterval: 10000,
  });

  const { data: prefs } = useQuery({
    queryKey: ['notifPrefs'],
    queryFn: () => api.getNotificationPreferences(),
    enabled: showPrefs,
  });

  const ackMutation = useMutation({
    mutationFn: (alertId: number) => api.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  const savePrefsMutation = useMutation({
    mutationFn: api.saveNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifPrefs'] });
      setShowPrefs(false);
    },
  });

  const unreadCount = alerts.length;

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all shadow-sm flex items-center justify-center"
        title="Municipal Alert Center"
      >
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold bg-rose-600 text-white rounded-full animate-pulse border border-slate-950">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-96 max-w-[90vw] bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-slate-100 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Municipal Alerts
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md">
                  {unreadCount} Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrefs(true)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  title="Notification Preferences"
                >
                  ⚙️
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Alert List */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <p className="text-xl mb-1">🛡️</p>
                  <p className="font-semibold uppercase tracking-wider text-[11px]">NO ACTIVE ALERTS</p>
                  <p className="text-[10px] mt-0.5">All municipal telemetry normal</p>
                </div>
              ) : (
                alerts.map(a => {
                  const isCrit = a.type.includes('OVERFLOW') || a.type.includes('CRITICAL') || a.type.includes('FAILURE') || a.type.includes('EXCEPTION');
                  return (
                    <div
                      key={a.alertId}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        isCrit
                          ? 'bg-rose-950/40 border-rose-800/80 text-rose-200 shadow-sm shadow-rose-950/50'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`font-mono text-[10px] uppercase font-bold tracking-wider ${isCrit ? 'text-rose-400' : 'text-amber-400'}`}>
                          {a.type}
                        </span>
                        <span className="text-[10px] text-slate-500">{a.date}</span>
                      </div>
                      <p className="mt-1 text-slate-200 text-[11px] leading-relaxed">{a.message}</p>
                      <div className="mt-2.5 flex justify-end">
                        <button
                          onClick={() => ackMutation.mutate(a.alertId)}
                          disabled={ackMutation.isPending}
                          className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all border border-slate-700"
                        >
                          Acknowledge ✓
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences Modal */}
      <AnimatePresence>
        {showPrefs && prefs && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Notification Preferences
                </h3>
                <button onClick={() => setShowPrefs(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { key: 'criticalAlerts', label: 'Mandatory Critical Alerts (Always Active)', disabled: true },
                  { key: 'highSeverityAlerts', label: 'High Severity Alerts' },
                  { key: 'assignedIncidentsOnly', label: 'Only Incidents Assigned to Me' },
                  { key: 'hubAlerts', label: 'Hub Capacity & Overflow Alerts' },
                  { key: 'vehicleAlerts', label: 'Fleet & Vehicle Breakdown Alerts' },
                  { key: 'collectionExceptions', label: 'Missed Collection & Variance Alerts' },
                  { key: 'recyclingExceptions', label: 'Recycling Mass Balance & Quarantine Alerts' },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 cursor-pointer">
                    <span className="text-slate-300">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean((prefs as any)[item.key])}
                      disabled={item.disabled}
                      onChange={e => {
                        savePrefsMutation.mutate({
                          ...prefs,
                          [item.key]: e.target.checked ? 1 : 0,
                        });
                      }}
                      className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                    />
                  </label>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowPrefs(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white transition-all shadow-md shadow-blue-600/20"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
