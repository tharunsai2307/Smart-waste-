import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../services/api2';
import { Card, Input, Select, EmptyState, SecondaryButton } from '../components/ui';
import type { AuditEntry } from '../types/api';
import { Search } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  CREATE_STAFF: '#34d399',
  RESET_PASSWORD: '#fbbf24',
  DELETE_USER: '#f87171',
  SET_USER_STATUS: '#22d3ee',
  CLEANER_MISSED_SLA: '#fb923c',
};

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const color = ACTION_COLORS[action] || '#94a3b8';
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center flex-shrink-0"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {action.replace(/_/g, ' ')}
    </span>
  );
};

const fmt = (ts?: string) => (ts ? new Date(ts).toLocaleString() : '—');

function describeDetail(d: AuditEntry['detail']): string {
  if (!d || typeof d !== 'object') return '';
  if (d.name) {
    const withUser = d.username ? ` (@${String(d.username)})` : '';
    const withRole = d.role ? ` — ${String(d.role)}` : '';
    return `${String(d.name)}${withUser}${withRole}`;
  }
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

const ActivityLog: React.FC = () => {
  const [action, setAction] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['activity', action, q],
    queryFn: () => activityApi.list({ action: action || undefined, q: q || undefined, limit: 200 }),
  });

  const entries = data?.activity || [];
  const counts = data?.counts || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Activity Log</h1>
        <p className="text-xs text-slate-500 mt-1">Full audit trail of privileged actions — who did what, to whom, and when.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="w-56">
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All actions</option>
              {counts.map((c) => (
                <option key={c.action} value={c.action}>{c.action.replace(/_/g, ' ')} ({c.n})</option>
              ))}
            </Select>
          </div>
          <div className="w-72 flex-1 min-w-[200px]">
            <Input
              placeholder="Search actor, action or detail… (Enter)"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setQ(qInput.trim()); }}
            />
          </div>
          <SecondaryButton type="button" onClick={() => setQ(qInput.trim())}><Search size={13} /></SecondaryButton>
        </div>

        {isLoading ? (
          <div className="text-xs text-slate-400 text-center py-8">Loading activity…</div>
        ) : entries.length === 0 ? (
          <EmptyState message="No activity recorded yet" hint="Admin actions like password resets, deletions and staff changes will appear here." />
        ) : (
          <div className="space-y-1.5">
            {entries.map((a) => {
              const desc = describeDetail(a.detail);
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-44 text-[11px] text-slate-500 font-mono flex-shrink-0">{fmt(a.created_at)}</div>
                  <ActionBadge action={a.action} />
                  <div className="text-xs text-slate-200 min-w-[110px]">
                    {a.actor_name ? a.actor_name : <span className="text-slate-500 italic">system</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 flex-1 min-w-[140px] break-words">
                    {a.entity_type ? `${a.entity_type} #${a.entity_id}` : ''}
                    {desc && <span className="ml-2">{desc}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityLog;
