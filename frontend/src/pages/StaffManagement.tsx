import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, hubsApi } from '../services/api2';
import { Card, PrimaryButton, SecondaryButton, Input, Select, Badge, EmptyState } from '../components/ui';
import type { Role } from '../types/api';
import { UserPlus, KeyRound, Ban, CheckCircle2 } from 'lucide-react';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'LOCAL_HUB_MANAGER', label: 'Local Hub Manager' },
  { value: 'CLEANER', label: 'Cleaner' },
  { value: 'RECYCLING_MANAGER', label: 'Recycling Manager' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'ADMIN', label: 'Administrator' },
];

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const StaffManagement: React.FC = () => {
  const qc = useQueryClient();
  const { data: usersData } = useQuery({ queryKey: ['staff-users'], queryFn: () => usersApi.list() });
  const { data: localHubs } = useQuery({ queryKey: ['local-hubs-lite'], queryFn: hubsApi.listLocal });
  const { data: recyclingHubs } = useQuery({ queryKey: ['recycling-hubs-lite'], queryFn: hubsApi.listRecycling });

  const [form, setForm] = useState({ role: 'CLEANER' as Role, name: '', username: '', password: randomPassword(), email: '', phone: '', localHubId: '', recyclingHubId: '' });
  const [createdCred, setCreatedCred] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => usersApi.createStaff({
      role: form.role,
      name: form.name,
      username: form.username,
      password: form.password,
      email: form.email || undefined,
      phone: form.phone || undefined,
      localHubId: form.localHubId ? Number(form.localHubId) : undefined,
      recyclingHubId: form.recyclingHubId ? Number(form.recyclingHubId) : undefined,
    }),
    onSuccess: () => {
      setCreatedCred({ username: form.username, password: form.password });
      setForm({ role: 'CLEANER', name: '', username: '', password: randomPassword(), email: '', phone: '', localHubId: '', recyclingHubId: '' });
      qc.invalidateQueries({ queryKey: ['staff-users'] });
    },
    onError: (e: any) => setError(e.message || 'Failed to create account'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'ACTIVE' | 'SUSPENDED' }) => usersApi.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-users'] }),
  });

  const resetPwMutation = useMutation({
    mutationFn: (id: number) => usersApi.resetPassword(id, randomPassword()),
  });

  const users = usersData?.users || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Staff & Accounts</h1>
        <p className="text-xs text-slate-500 mt-1">Only administrators create staff logins. Residents self-provision exclusively via Google sign-in.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-4 text-white font-semibold text-sm"><UserPlus size={16} className="text-emerald-400" /> Issue new staff credentials</div>
          {error && <div className="p-2 mb-3 rounded-lg text-red-300 text-xs" style={{ background: 'rgba(239,68,68,0.1)' }}>{error}</div>}
          <form onSubmit={(e) => { e.preventDefault(); setError(''); createMutation.mutate(); }} className="space-y-3">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <div className="flex gap-2">
              <Input placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <SecondaryButton type="button" onClick={() => setForm({ ...form, password: randomPassword() })}>Generate</SecondaryButton>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            {(form.role === 'CLEANER' || form.role === 'LOCAL_HUB_MANAGER') && (
              <Select value={form.localHubId} onChange={(e) => setForm({ ...form, localHubId: e.target.value })}>
                <option value="">Assign to local hub (optional)</option>
                {localHubs?.hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
            )}
            {(form.role === 'DRIVER' || form.role === 'RECYCLING_MANAGER') && (
              <Select value={form.recyclingHubId} onChange={(e) => setForm({ ...form, recyclingHubId: e.target.value })}>
                <option value="">Assign to recycling hub (optional)</option>
                {recyclingHubs?.hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
            )}
            <PrimaryButton type="submit" disabled={createMutation.isPending} className="w-full py-2.5">
              {createMutation.isPending ? 'Creating…' : 'Create account & issue credentials'}
            </PrimaryButton>
          </form>

          {createdCred && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
              <div className="font-semibold">Account created — share these credentials securely:</div>
              <div>Username: <span className="font-mono text-white">{createdCred.username}</span></div>
              <div>Temporary password: <span className="font-mono text-white">{createdCred.password}</span></div>
              <div className="text-emerald-400/80">User will be required to set a new password on first login.</div>
            </div>
          )}
        </Card>

        <Card>
          <div className="text-white font-semibold text-sm mb-4">All accounts ({users.length})</div>
          {users.length === 0 ? <EmptyState message="No accounts yet" /> : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="min-w-0">
                    <div className="text-sm text-white font-medium truncate">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.username || u.email}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge status={u.role}>{u.role.replace(/_/g, ' ')}</Badge>
                    <Badge status={u.status} />
                    {u.role !== 'RESIDENT' && (
                      <>
                        <button title="Reset password" onClick={() => resetPwMutation.mutate(u.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                          <KeyRound size={13} />
                        </button>
                        <button
                          title={u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                          onClick={() => statusMutation.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          {u.status === 'ACTIVE' ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StaffManagement;
