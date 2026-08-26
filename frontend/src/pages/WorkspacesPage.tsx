import React, { useState } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { api } from '../services/api';
import { useAppStore } from '../store';

export default function WorkspacesPage() {
  const { workspaces, currentWorkspace, loading, refresh } = useWorkspace();
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    try {
      await api.createWorkspace({ name: newName.trim(), description: newDesc.trim() });
      setNewName('');
      setNewDesc('');
      setCreating(false);
      refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            🏢 Workspaces
          </h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>
            Manage municipal workspace partitions and access boundaries.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setCreating(!creating)}
            style={{
              background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8,
              padding: '0.6rem 1.4rem', cursor: 'pointer', fontWeight: 600, fontSize: 14
            }}
          >
            + New Workspace
          </button>
        )}
      </div>

      {currentWorkspace && (
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          borderRadius: 12, padding: '1.25rem 1.5rem', color: '#fff', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <span style={{ fontSize: 32 }}>🌐</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{currentWorkspace.name}</div>
            <div style={{ opacity: 0.85, fontSize: 13 }}>{currentWorkspace.description || 'Your active workspace'}</div>
            <div style={{ opacity: 0.7, fontSize: 11, marginTop: 4 }}>
              ID: {currentWorkspace.workspaceId}
            </div>
          </div>
          <span style={{
            marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: 20,
            padding: '0.3rem 0.9rem', fontSize: 12, fontWeight: 600
          }}>
            Active
          </span>
        </div>
      )}

      {creating && isAdmin && (
        <form
          onSubmit={handleCreate}
          style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '1.25rem', marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Create New Workspace</h3>
          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '0.5rem 1rem', marginBottom: '1rem', fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Workspace Name *
              </label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                placeholder="e.g. North District Municipality"
                style={{
                  width: '100%', padding: '0.6rem 1rem', border: '1px solid #cbd5e1',
                  borderRadius: 8, fontSize: 14, boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Description
              </label>
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Optional description"
                style={{
                  width: '100%', padding: '0.6rem 1rem', border: '1px solid #cbd5e1',
                  borderRadius: 8, fontSize: 14, boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCreating(false)}
                style={{
                  background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8,
                  padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 600
                }}
              >
                Create
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>Loading workspaces…</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {workspaces.map(ws => (
            <div
              key={ws.workspaceId}
              style={{
                background: ws.workspaceId === currentWorkspace?.workspaceId ? '#ede9fe' : '#fff',
                border: `1.5px solid ${ws.workspaceId === currentWorkspace?.workspaceId ? '#7c3aed' : '#e2e8f0'}`,
                borderRadius: 12, padding: '1.25rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                transition: 'box-shadow 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{ws.workspaceId === 'global' ? '🌍' : '🏙️'}</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{ws.name}</div>
                  {ws.workspaceId === currentWorkspace?.workspaceId && (
                    <span style={{ fontSize: 11, background: '#7c3aed', color: '#fff', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>
                      Active
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                {ws.description || <em>No description</em>}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                {ws.workspaceId}
              </div>
              {ws.createdAt && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Created: {ws.createdAt}
                </div>
              )}
            </div>
          ))}
          {workspaces.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
              No workspaces found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
