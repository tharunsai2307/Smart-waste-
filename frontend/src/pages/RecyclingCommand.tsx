import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import ReceivingQueue from '../components/recycling/ReceivingQueue';
import ProcessingBatches from '../components/recycling/ProcessingBatches';

const RecyclingCommand: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'receiving' | 'batches' | 'analytics'>('receiving');

  const { data: analytics } = useQuery({
    queryKey: ['recyclingAnalytics'],
    queryFn: api.getRecyclingAnalytics,
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Recycling Command Center</h1>
        <p className="text-xs text-slate-500 mt-1">Manage receiving, processing, and recovery operations</p>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div className="glass p-5 rounded-xl border-b-2 border-emerald-500 text-center">
          <div className="text-2xl font-bold text-emerald-400">{analytics?.totalInputKg?.toFixed(0) || 0} kg</div>
          <div className="text-xs text-slate-500 tracking-widest mt-1">TOTAL INPUT</div>
        </div>
        <div className="glass p-5 rounded-xl border-b-2 border-cyan-500 text-center">
          <div className="text-2xl font-bold text-cyan-400">{analytics?.totalRecoveredKg?.toFixed(0) || 0} kg</div>
          <div className="text-xs text-slate-500 tracking-widest mt-1">RECOVERED</div>
        </div>
        <div className="glass p-5 rounded-xl border-b-2 border-amber-500 text-center">
          <div className="text-2xl font-bold text-amber-400">{analytics?.recoveryRatePct?.toFixed(1) || 0}%</div>
          <div className="text-xs text-slate-500 tracking-widest mt-1">RECOVERY RATE</div>
        </div>
        <div className="glass p-5 rounded-xl border-b-2 border-purple-500 text-center">
          <div className="text-2xl font-bold text-purple-400">{analytics?.activeBatches || 0}</div>
          <div className="text-xs text-slate-500 tracking-widest mt-1">ACTIVE BATCHES</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900/50 rounded-lg w-fit border border-slate-800">
        {(['receiving', 'batches'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {activeTab === 'receiving' && <ReceivingQueue />}
          {activeTab === 'batches' && <ProcessingBatches />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default RecyclingCommand;
