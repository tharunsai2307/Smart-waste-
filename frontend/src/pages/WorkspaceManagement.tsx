import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { api } from '../services/api';
import { useAppStore } from '../store';
import { Building2, Plus, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkspaceManagement() {
  const { workspaces, refresh, currentWorkspace, switchWorkspace } = useWorkspace();
  const user = useAppStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: api.createWorkspace,
    onSuccess: () => {
      setShowCreate(false);
      setFormData({ name: '', description: '' });
      refresh();
    },
  });

  if (user?.role !== 'ADMIN' && user?.role !== 'MUNICIPAL_ADMIN') {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
        <p className="text-gray-400">You do not have permission to manage workspaces.</p>
      </div>
    );
  }

  return (
    <div className="p-8 pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Building2 className="w-8 h-8 mr-3 text-emerald-500" />
            Workspace Management
          </h1>
          <p className="text-gray-400">Manage municipalities and isolated environments.</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Workspace
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((ws) => (
          <div
            key={ws.workspaceId}
            className={`bg-[#1E1E1E] rounded-xl border ${
              currentWorkspace?.workspaceId === ws.workspaceId ? 'border-emerald-500' : 'border-white/10'
            } p-6 flex flex-col`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{ws.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{ws.workspaceId}</p>
              </div>
              {currentWorkspace?.workspaceId === ws.workspaceId && (
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                  Active
                </span>
              )}
            </div>
            <p className="text-gray-300 flex-grow mb-6">{ws.description}</p>
            
            <div className="flex gap-2">
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => switchWorkspace(ws.workspaceId)}
                  className="flex-1 py-2 rounded-lg font-medium text-sm transition-colors bg-white/5 hover:bg-white/10 text-white"
                >
                  Switch Context
                </button>
              )}
              {user?.role === 'ADMIN' && ws.workspaceId !== 'global' && (
                <button
                  className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                  title="Delete Workspace (Requires empty data)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1E1E1E] border border-white/10 rounded-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">Create New Workspace</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#2A2A2A] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="e.g. Springfield Municipality"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#2A2A2A] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors h-24 resize-none"
                    placeholder="Workspace details..."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={!formData.name || createMutation.isPending}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
