import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, hubsApi } from '../services/api2';
import { Card, PrimaryButton, SecondaryButton, DangerButton, Input, Select, Badge, EmptyState, Modal } from '../components/ui';
import type { Role, StaffUser } from '../types/api';
import { UserPlus, KeyRound, Ban, CheckCircle2, Trash2, Eye, Copy } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

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

const fmt = (ts?: string) => (ts ? new Date(ts).toLocaleString() : '—');

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
    <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
    <div className="text-slate-200 font-medium mt-0.5 break-words">{value}</div>
  </div>
);

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-center">
    <div className="text-white font-bold">{value}</div>
    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
  </div>
);

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

  const me = useAuthStore((s) => s.user);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'ACTIVE' | 'SUSPENDED' }) => usersApi.setStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-users'] });
      qc.invalidateQueries({ queryKey: ['activity'] });
    },
  });

  // ── Reset password (generate a temp password or set a custom one) ──
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [resetMode, setResetMode] = useState<'generate' | 'custom'>('generate');
  const [resetCustom, setResetCustom] = useState('');
  const [resetResult, setResetResult] = useState<{ password: string; mustChangePassword: boolean } | null>(null);
  const [resetError, setResetError] = useState('');
  const [copied, setCopied] = useState(false);

  const resetPwMutation = useMutation({
    mutationFn: () => usersApi.resetPassword(resetTarget!.id, resetMode === 'custom' ? resetCustom.trim() : undefined),
    onSuccess: (r) => {
      setResetResult({ password: r.password, mustChangePassword: r.mustChangePassword });
      setResetError('');
      qc.invalidateQueries({ queryKey: ['staff-users'] });
      qc.invalidateQueries({ queryKey: ['activity'] });
    },
    onError: (e: any) => setResetError(e.message || 'Failed to reset password'),
  });

  const openReset = (u: StaffUser) => {
    setResetTarget(u);
    setResetMode('generate');
    setResetCustom('');
    setResetResult(null);
    setResetError('');
    setCopied(false);
  };

  const copyPassword = async () => {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // ── Delete account ────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: (r) => {
      setNotice(`Account "${r.deleted.name}" was permanently deleted.`);
      setDeleteTarget(null);
      setDeleteConfirm('');
      setDeleteError('');
      qc.invalidateQueries({ queryKey: ['staff-users'] });
      qc.invalidateQueries({ queryKey: ['activity'] });
    },
    onError: (e: any) => setDeleteError(e.message || 'Failed to delete account'),
  });

  // ── Account detail view ──────────────────────────────────────────
  const [viewTarget, setViewTarget] = useState<StaffUser | null>(null);
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['user-detail', viewTarget?.id],
    queryFn: () => usersApi.detail(viewTarget!.id),
    enabled: !!viewTarget,
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
              <Select
                value={form.localHubId}
                onChange={(e) => setForm({ ...form, localHubId: e.target.value })}
                required={form.role === 'CLEANER'}
              >
                <option value="">{form.role === 'CLEANER' ? 'Assign to local hub (required)' : 'Assign to local hub (optional)'}</option>
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
          {notice && (
            <div className="mb-3 p-2 rounded-lg text-emerald-300 text-xs" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>{notice}</div>
          )}
          {users.length === 0 ? <EmptyState message="No accounts yet" /> : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="min-w-0 cursor-pointer" onClick={() => setViewTarget(u)} title="View account details">
                    <div className="text-sm text-white font-medium truncate">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.username || u.email}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge status={u.role}>{u.role.replace(/_/g, ' ')}</Badge>
                    <Badge status={u.status} />
                    {u.must_change_password && (
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: 'rgba(251,191,36,0.13)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                        title="Must set a new password at next login"
                      >temp pw</span>
                    )}
                    <button title="View details" onClick={() => setViewTarget(u)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                      <Eye size={13} />
                    </button>
                    {u.role !== 'RESIDENT' && (
                      <>
                        <button title="Reset password" onClick={() => openReset(u)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
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
                    <button
                      title={me && u.id === me.id ? 'You cannot delete your own account' : 'Delete account'}
                      disabled={!!me && u.id === me.id}
                      onClick={() => { setDeleteTarget(u); setDeleteConfirm(''); setDeleteError(''); }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 disabled:opacity-30 disabled:hover:bg-slate-800 disabled:hover:text-slate-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Reset password modal ─────────────────────────────────── */}
      {resetTarget && (
        <Modal title={`Reset password — ${resetTarget.name}`} onClose={() => setResetTarget(null)}>
          {resetResult ? (
            <div className="space-y-3">
              <div className="p-2 rounded-lg text-emerald-300 text-xs" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>
                New password for <span className="font-mono text-white">{resetTarget.username || resetTarget.name}</span>:
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 font-mono text-white text-sm break-all">{resetResult.password}</div>
                <SecondaryButton type="button" onClick={copyPassword}>{copied ? 'Copied ✓' : <Copy size={13} />}</SecondaryButton>
              </div>
              <div className="text-[11px] text-amber-400/90">Shown only once — copy it now and share it securely.</div>
              {resetResult.mustChangePassword && <div className="text-[11px] text-slate-400">They must set their own new password at next login.</div>}
              <PrimaryButton type="button" className="w-full py-2.5" onClick={() => setResetTarget(null)}>Done</PrimaryButton>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Passwords are stored as one-way hashes — an existing password can never be viewed by anyone. Resetting issues a brand-new one.
              </div>
              <div className="flex gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => setResetMode('generate')}
                  style={resetMode === 'generate' ? { background: 'rgba(52,211,153,0.15)', borderColor: 'rgba(52,211,153,0.4)', color: '#6ee7b7' } : undefined}
                >Generate temporary</SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => setResetMode('custom')}
                  style={resetMode === 'custom' ? { background: 'rgba(52,211,153,0.15)', borderColor: 'rgba(52,211,153,0.4)', color: '#6ee7b7' } : undefined}
                >Set custom</SecondaryButton>
              </div>
              {resetMode === 'custom' && (
                <Input placeholder="New password (min 6 characters)" value={resetCustom} onChange={(e) => setResetCustom(e.target.value)} />
              )}
              {resetError && <div className="p-2 rounded-lg text-red-300 text-xs" style={{ background: 'rgba(239,68,68,0.1)' }}>{resetError}</div>}
              <PrimaryButton
                type="button"
                className="w-full py-2.5"
                disabled={resetPwMutation.isPending || (resetMode === 'custom' && resetCustom.trim().length < 6)}
                onClick={() => { setResetError(''); resetPwMutation.mutate(); }}
              >
                {resetPwMutation.isPending ? 'Resetting…' : 'Reset password'}
              </PrimaryButton>
            </div>
          )}
        </Modal>
      )}

      {/* ── Delete account modal ─────────────────────────────────── */}
      {deleteTarget && (
        <Modal title={`Delete account — ${deleteTarget.name}`} onClose={() => setDeleteTarget(null)}>
          <div className="space-y-3">
            <div className="p-3 rounded-lg text-red-300 text-xs space-y-1" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div className="font-semibold">This permanently deletes the account{deleteTarget.username ? ` @${deleteTarget.username}` : ''}.</div>
              <div>· Their sign-in stops working immediately.</div>
              <div>· Personal data (profile, pickup requests, eco points) is erased.</div>
              <div>· Hub and collection history stays, but no longer names them.</div>
            </div>
            <Input
              placeholder={deleteTarget.username ? `Type "${deleteTarget.username}" to confirm` : `Type "${deleteTarget.name}" to confirm`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            {deleteError && <div className="p-2 rounded-lg text-red-300 text-xs" style={{ background: 'rgba(239,68,68,0.1)' }}>{deleteError}</div>}
            <DangerButton
              className="w-full py-2.5"
              disabled={deleteMutation.isPending || deleteConfirm !== (deleteTarget.username || deleteTarget.name)}
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete permanently'}
            </DangerButton>
          </div>
        </Modal>
      )}

      {/* ── Account detail modal ─────────────────────────────────── */}
      {viewTarget && (
        <Modal title={`Account — ${viewTarget.name}`} onClose={() => setViewTarget(null)} wide>
          {detailLoading ? (
            <div className="text-xs text-slate-400 py-6 text-center">Loading account…</div>
          ) : detail ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge status={detail.user.role}>{detail.user.role.replace(/_/g, ' ')}</Badge>
                <Badge status={detail.user.status} />
                {detail.user.must_change_password && <Badge status="MEDIUM">must change pw</Badge>}
                {detail.user.status === 'SUSPENDED' && <Badge status="CRITICAL">suspended</Badge>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <Info label="Username" value={detail.user.username || '—'} />
                <Info label="Email" value={detail.user.email || '—'} />
                <Info label="Phone" value={detail.user.phone || '—'} />
                <Info label="Created" value={fmt(detail.user.created_at)} />
                {detail.user.created_by_name && <Info label="Created by" value={detail.user.created_by_name} />}
                <Info label="Failed logins" value={String(detail.user.failed_attempts ?? 0)} />
                {detail.user.local_hub_name && <Info label="Local hub" value={detail.user.local_hub_name} />}
                {detail.user.recycling_hub_name && <Info label="Recycling hub" value={detail.user.recycling_hub_name} />}
                {detail.resident_profile && <Info label="Eco points" value={String(detail.resident_profile.eco_points)} />}
                {detail.resident_profile && <Info label="Total recycled" value={`${detail.resident_profile.total_kg_recycled} kg`} />}
                {detail.resident_profile?.address_line && <Info label="Address" value={detail.resident_profile.address_line} />}
                {detail.driver_profile && <Info label="License" value={detail.driver_profile.license_number || '—'} />}
                {detail.driver_profile && <Info label="Hauled" value={`${detail.driver_profile.total_trips ?? 0} trips · ${detail.driver_profile.total_kg_hauled ?? 0} kg`} />}
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Activity footprint</div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <Stat label="Collections" value={detail.stats.collections_as_cleaner} />
                  <Stat label="Kg collected" value={detail.stats.kg_collected} />
                  <Stat label="Pickups" value={detail.stats.pickups_requested} />
                  <Stat label="Transfers req." value={detail.stats.transfers_requested} />
                  <Stat label="Trips driven" value={detail.stats.transfers_driven} />
                  <Stat label="Batches" value={detail.stats.batches_created} />
                </div>
              </div>

              {detail.recent_collections && detail.recent_collections.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Recent collections</div>
                  <div className="space-y-1.5">
                    {detail.recent_collections.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <span className="text-slate-300">{c.waste_type} · {c.weight_kg} kg{c.hub_name ? ` → ${c.hub_name}` : ''}</span>
                        <span className="text-slate-500 flex-shrink-0">{fmt(c.collected_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.recent_pickups && detail.recent_pickups.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Recent pickup requests</div>
                  <div className="space-y-1.5">
                    {detail.recent_pickups.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <span className="text-slate-300 flex items-center gap-2"><Badge status={p.status} /> {p.waste_type} · est {p.estimated_kg} kg</span>
                        <span className="text-slate-500 flex-shrink-0">{fmt(p.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.recent_ledger && detail.recent_ledger.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Eco points history</div>
                  <div className="space-y-1.5">
                    {detail.recent_ledger.map((l) => (
                      <div key={l.id} className="flex items-center justify-between gap-2 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <span className="text-slate-300">{l.reason} · <span className="text-emerald-400">+{l.points} pts</span></span>
                        <span className="text-slate-500 flex-shrink-0">{fmt(l.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.activity && detail.activity.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Account history (admin actions)</div>
                  <div className="space-y-1.5">
                    {detail.activity.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <span className="text-slate-300">{a.action.replace(/_/g, ' ').toLowerCase()}{a.actor_name ? ` by ${a.actor_name}` : ''}</span>
                        <span className="text-slate-500 flex-shrink-0">{fmt(a.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState message="Could not load account details" />
          )}
        </Modal>
      )}
    </div>
  );
};

export default StaffManagement;
