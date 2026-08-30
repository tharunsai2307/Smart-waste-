import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { SystemHealth, DataIntegrityResult, BackupMetadata } from '../types';
import { AlertTriangle, CheckCircle, Database, HardDrive, Shield, Activity, Save, FileText, DownloadCloud } from 'lucide-react';

export const DataGovernance: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [integrity, setIntegrity] = useState<DataIntegrityResult[]>([]);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [h, i, b] = await Promise.all([
        api.getSystemHealth(),
        api.getIntegrity(),
        api.getBackups()
      ]);
      setHealth(h);
      setIntegrity(i);
      setBackups(b);
    } catch (err: any) {
      setError(err.message || 'Failed to load data governance state');
    }
    setLoading(false);
  };

  const handleCreateBackup = async () => {
    try {
      await api.createBackup();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Backup failed');
    }
  };

  const handleScanIntegrity = async () => {
    try {
      const res = await api.scanIntegrity();
      setIntegrity(res);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Integrity scan failed');
    }
  };

  if (loading && !health) return <div className="p-8 text-slate-400">Loading Governance Center...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="text-indigo-400 w-8 h-8" />
            Data Governance & Resilience
          </h1>
          <p className="text-slate-400 mt-2">Enterprise-grade backup, recovery, and data integrity</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleScanIntegrity} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2">
            <Activity className="w-4 h-4" /> Run Integrity Scan
          </button>
          <button onClick={handleCreateBackup} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2">
            <Save className="w-4 h-4" /> Create Backup
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Data Storage</h3>
              <HardDrive className="text-blue-400 w-5 h-5" />
            </div>
            <div className="text-3xl font-bold text-white">{(health.totalStorageBytes / 1024).toFixed(1)} KB</div>
            <p className="text-sm text-slate-500 mt-2">Across {health.totalFiles} flat files</p>
          </div>
          
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">File Health</h3>
              <Activity className="text-emerald-400 w-5 h-5" />
            </div>
            <div className="text-3xl font-bold text-white">{health.healthyFiles} / {health.totalFiles}</div>
            <p className="text-sm text-slate-500 mt-2">{health.corruptedFiles} corrupted files</p>
          </div>

          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Recovery Points</h3>
              <Database className="text-purple-400 w-5 h-5" />
            </div>
            <div className="text-3xl font-bold text-white">{health.totalBackups}</div>
            <p className="text-sm text-slate-500 mt-2">{health.verifiedBackups} verified backups</p>
          </div>

          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">System Status</h3>
              {health.recoveryReady ? <CheckCircle className="text-emerald-400 w-5 h-5" /> : <AlertTriangle className="text-amber-400 w-5 h-5" />}
            </div>
            <div className="text-xl font-bold text-white">{health.recoveryReady ? 'Recovery Ready' : 'At Risk'}</div>
            <p className="text-sm text-slate-500 mt-2">Last Backup: {health.lastBackupAt}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              File Integrity Registry
            </h2>
          </div>
          <div className="p-0 overflow-auto max-h-96">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 sticky top-0">
                  <th className="p-3 text-sm font-semibold text-slate-400 border-b border-slate-700">File</th>
                  <th className="p-3 text-sm font-semibold text-slate-400 border-b border-slate-700">Records</th>
                  <th className="p-3 text-sm font-semibold text-slate-400 border-b border-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {integrity.map(f => (
                  <tr key={f.fileName} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="p-3">
                      <div className="text-white font-medium">{f.fileName}</div>
                      <div className="text-xs text-slate-500 font-mono truncate w-40" title={f.checksum}>{f.checksum}</div>
                    </td>
                    <td className="p-3 text-slate-300">{f.recordCount}</td>
                    <td className="p-3">
                      {f.valid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full">
                          <AlertTriangle className="w-3 h-3" /> {f.message}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <DownloadCloud className="w-5 h-5 text-indigo-400" />
              Recovery Points
            </h2>
          </div>
          <div className="p-4 space-y-4 overflow-auto max-h-96">
            {backups.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No backups available.</div>
            ) : (
              backups.map(b => (
                <div key={b.backupId} className="p-4 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-between group">
                  <div>
                    <h4 className="text-white font-bold">{b.backupId}</h4>
                    <p className="text-sm text-slate-400 mt-1">Created: {b.createdAt} | Size: {(b.totalBytes / 1024).toFixed(1)} KB</p>
                    <p className="text-xs text-slate-500 mt-1">Workspace: {b.workspaceId}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">Verify</button>
                    <button className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded text-sm">Restore</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
