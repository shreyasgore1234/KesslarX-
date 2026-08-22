// ============================================================
// KesslerX Handoff History
// Shows past handoffs for an event
// ============================================================

import type { Handoff } from '../../data/handoffTypes';

interface HandoffHistoryProps {
  handoffs: Handoff[];
  loading: boolean;
  onRefresh: () => void;
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    'Draft': 'text-on-surface-variant',
    'Awaiting Acceptance': 'text-secondary',
    'Accepted': 'text-green-400',
    'Clarification Requested': 'text-yellow-400',
    'Rejected': 'text-error',
    'Escalated': 'text-error',
    'Unassigned Emergency': 'text-error',
  };
  return map[status] || 'text-on-surface-variant';
}

function statusBg(status: string): string {
  const map: Record<string, string> = {
    'Draft': 'bg-on-surface-variant/10',
    'Awaiting Acceptance': 'bg-secondary/10',
    'Accepted': 'bg-green-500/10',
    'Clarification Requested': 'bg-yellow-500/10',
    'Rejected': 'bg-error/10',
    'Escalated': 'bg-error/10',
  };
  return map[status] || 'bg-surface-container-highest/10';
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  } catch { return iso; }
}

export default function HandoffHistory({ handoffs, loading, onRefresh }: HandoffHistoryProps) {
  if (loading) {
    return (
      <div className="glass rounded-xl p-5">
        <h3 className="font-headline-sm text-headline-sm flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">history</span>
          Handoff History
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">history</span>
          Handoff History
          {handoffs.length > 0 && (
            <span className="text-xs font-label-mono bg-surface-container-highest px-2 py-0.5 rounded">
              {handoffs.length}
            </span>
          )}
        </h3>
        <button onClick={onRefresh} className="p-2 hover:bg-surface-container-highest/20 rounded-lg transition-all">
          <span className="material-symbols-outlined text-sm">refresh</span>
        </button>
      </div>

      {handoffs.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2 block">swap_horiz</span>
          <p className="text-sm text-on-surface-variant/50">No handoffs yet for this event</p>
        </div>
      ) : (
        <div className="space-y-3">
          {handoffs.map((h, idx) => (
            <div
              key={h.handoff_id}
              className={`p-4 rounded-lg border transition-all ${
                h.status === 'Escalated' || h.status === 'Unassigned Emergency'
                  ? 'border-error/30 bg-error/5'
                  : h.status === 'Awaiting Acceptance'
                    ? 'border-secondary/20 bg-secondary/5'
                    : 'border-outline-variant/10 bg-surface-container-highest/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-label-mono text-[10px] text-on-surface-variant">
                    Handoff #{handoffs.length - idx}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBg(h.status)} ${statusColor(h.status)}`}>
                    {h.status}
                  </span>
                  {h.priority === 'Urgent' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/20 text-error">
                      URGENT
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-on-surface-variant font-label-mono">
                  {formatTime(h.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                    {h.from_user?.avatar_initials || '??'}
                  </div>
                  <span className="text-xs font-bold">{h.from_user?.name || h.from_user_id}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-sm">arrow_forward</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center text-[9px] font-bold text-secondary">
                    {h.to_user?.avatar_initials || '??'}
                  </div>
                  <span className="text-xs font-bold">{h.to_user?.name || h.to_user_id}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[10px] text-on-surface-variant">
                <span>Reason: {h.reason}</span>
                {h.accepted_at && <span>Accepted: {formatTime(h.accepted_at)}</span>}
                {h.rejected_at && <span>Rejected: {formatTime(h.rejected_at)}</span>}
                {h.escalated_at && <span>Escalated: {formatTime(h.escalated_at)}</span>}
              </div>

              {h.clarification_messages && h.clarification_messages.length > 0 && (
                <div className="mt-2 space-y-1">
                  {h.clarification_messages.map((msg, i) => (
                    <div key={i} className="text-[10px] text-on-surface-variant p-2 rounded bg-surface-container-lowest/50">
                      <span className="font-bold">{msg.from}:</span> {msg.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
