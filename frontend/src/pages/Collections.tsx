import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const statusColor: Record<string, string> = {
  PENDING: '#fbbf24', ASSIGNED: '#22d3ee', ON_ROUTE: '#a78bfa',
  COLLECTING: '#34d399', COMPLETED: '#475569', CANCELLED: '#ef4444',
};

const CollectionsPage: React.FC = () => {
  const qc = useQueryClient();

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: api.getCollections,
    refetchInterval: 5000,
  });

  const processNext = useMutation({
    mutationFn: api.processCollection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.invalidateQueries({ queryKey: ['bins'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const groups: Record<string, typeof collections> = {};
  for (const c of collections) {
    groups[c.status] = [...(groups[c.status] ?? []), c];
  }

  const stages = ['PENDING', 'ASSIGNED', 'ON_ROUTE', 'COLLECTING', 'COMPLETED'];

  // Priority queue visual (pending sorted by priority score desc)
  const priorityQueue = [...(groups['PENDING'] ?? [])].sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Collection Command Center</h1>
          <p className="text-xs text-slate-500 mt-1">Priority queue + workflow management</p>
        </div>
        <motion.button
          onClick={() => processNext.mutate()}
          disabled={processNext.isPending || (groups['PENDING'] ?? []).length === 0}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wider transition-all cursor-pointer disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #059669, #0891b2)', color: 'white' }}
        >
          {processNext.isPending ? 'PROCESSING...' : '⚡ PROCESS NEXT (MAX HEAP)'}
        </motion.button>
      </div>

      {/* Priority Queue Visualization */}
      {priorityQueue.length > 0 && (
        <div className="glass p-5 rounded-2xl">
          <div className="text-xs text-slate-500 tracking-widest mb-4">PRIORITY QUEUE — BINARY MAX HEAP ORDER</div>
          <div className="space-y-2">
            {priorityQueue.slice(0, 8).map((req, i) => (
              <motion.div
                key={req.collectionId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-xl"
                style={{ background: i === 0 ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}` }}
              >
                <div className="text-xl font-bold text-emerald-400 w-6 text-center">{i + 1}</div>
                <div className="flex-1">
                  <div className="text-sm text-white font-medium">BIN #{req.binId} — Collection #{req.collectionId}</div>
                  <div className="text-xs text-slate-500">Qty: {req.quantity.toFixed(1)} kg • {req.priorityLevel}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" style={{ color: req.priorityScore > 80 ? '#ef4444' : req.priorityScore > 60 ? '#fbbf24' : '#34d399' }}>
                    {req.priorityScore}
                  </div>
                  <div className="text-xs text-slate-500">SCORE</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban pipeline */}
      <div className="grid grid-cols-5 gap-3">
        {stages.map((stage) => {
          const color = statusColor[stage] ?? '#475569';
          const items = groups[stage] ?? [];
          return (
            <div key={stage} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-mono tracking-wider" style={{ color }}>{stage}</span>
                <span className="ml-auto text-xs text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.slice(0, 5).map(req => (
                  <motion.div
                    key={req.collectionId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 rounded-xl text-xs"
                    style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                  >
                    <div className="font-medium text-white mb-1">BIN #{req.binId}</div>
                    <div className="text-slate-500">Score: {req.priorityScore}</div>
                    <div className="text-slate-500">{req.quantity.toFixed(1)} kg</div>
                  </motion.div>
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-slate-700 text-center py-4">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CollectionsPage;
