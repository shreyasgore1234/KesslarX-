// ============================================================
// KesslerX Pending Handoffs Page
// Recipient inbox showing handoffs awaiting acceptance
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../components/handoff/UserContext';
import { usePendingHandoffs, acceptHandoff, requestClarification, rejectHandoff, checkTimeouts } from '../hooks/useHandoffAPI';
import { REJECT_REASONS } from '../data/handoffTypes';
import type { Handoff } from '../data/handoffTypes';

function HandoffCard({ handoff, onAction }: { handoff: Handoff; onAction: () => void }) {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const [showActions, setShowActions] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [clarifyMsg, setClarifyMsg] = useState('');
  const [rejectReason, setRejectReason] = useState('Unavailable');
  const [showReject, setShowReject] = useState(false);
  const [showClarify, setShowClarify] = useState(false);
  const [error, setError] = useState('');

  const event = handoff.event;
  const isUrgent = handoff.priority === 'Urgent' || event?.severity === 'CRITICAL';
  const isEscalated = handoff.status === 'Escalated';

  const handleAccept = async () => {
    setActionLoading('accept');
    setError('');
    try {
      await acceptHandoff(handoff.handoff_id, currentUser!.user_id);
      onAction();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleClarify = async () => {
    if (!clarifyMsg.trim()) return;
    setActionLoading('clarify');
    setError('');
    try {
      await requestClarification(handoff.handoff_id, currentUser!.user_id, clarifyMsg);
      onAction();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    setError('');
    try {
      await rejectHandoff(handoff.handoff_id, currentUser!.user_id, rejectReason);
      onAction();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className={`glass rounded-xl overflow-hidden transition-all ${
      isEscalated ? 'border-2 border-error/40 glow-error' : isUrgent ? 'border border-error/30' : 'border border-outline-variant/10'
    }`}>
      {/* Card Header */}
      <div className={`p-4 ${isEscalated ? 'bg-error/10' : isUrgent ? 'bg-error/5' : ''}`}>
        {isEscalated && (
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-error text-sm">trending_up</span>
            <span className="text-[10px] font-bold text-error uppercase tracking-wider">Escalated — Requires Immediate Action</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label-mono text-[10px] text-on-surface-variant">{event?.event_id}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                event?.severity === 'CRITICAL' ? 'bg-error/20 text-error' :
                event?.severity === 'HIGH' ? 'bg-error/15 text-error' :
                'bg-secondary/15 text-secondary'
              }`}>
                {event?.severity}
              </span>
              {handoff.priority === 'Urgent' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/20 text-error flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px]">priority_high</span>
                  URGENT
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm mb-1">{event?.title || handoff.event_id}</h3>
          </div>

          <button
            onClick={() => navigate(`/event/${event?.event_id || handoff.event_id}`)}
            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all flex-shrink-0"
            title="Open Event Workspace"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </button>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="text-center p-1.5 rounded bg-surface-container-highest/10">
            <p className="text-[9px] text-on-surface-variant uppercase">TCA</p>
            <p className="text-xs font-bold text-error">{event?.tca_minutes || '?'} min</p>
          </div>
          <div className="text-center p-1.5 rounded bg-surface-container-highest/10">
            <p className="text-[9px] text-on-surface-variant uppercase">Miss</p>
            <p className="text-xs font-bold">{event?.miss_distance_km || '?'} km</p>
          </div>
          <div className="text-center p-1.5 rounded bg-surface-container-highest/10">
            <p className="text-[9px] text-on-surface-variant uppercase">Prob</p>
            <p className="text-xs font-bold">{event?.collision_probability || '?'}</p>
          </div>
          <div className="text-center p-1.5 rounded bg-surface-container-highest/10">
            <p className="text-[9px] text-on-surface-variant uppercase">From</p>
            <p className="text-xs font-bold">{handoff.from_user?.name || '?'}</p>
          </div>
        </div>

        <div className="mt-3 text-xs text-on-surface-variant">
          <span className="font-bold">Reason:</span> {handoff.reason}
          {handoff.deadline && (
            <> · <span className="font-bold">Deadline:</span> {new Date(handoff.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-error/10 text-error text-xs">{error}</div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-outline-variant/10">
        {!showActions && !showClarify && !showReject ? (
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={!!actionLoading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              {actionLoading === 'accept' ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-sm">check</span>
              )}
              Accept
            </button>
            <button
              onClick={() => setShowClarify(true)}
              className="flex-1 py-2.5 bg-surface-container-highest/30 text-on-surface rounded-lg text-sm font-bold hover:bg-surface-container-highest/50 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">help</span>
              Clarify
            </button>
            <button
              onClick={() => setShowReject(true)}
              className="flex-1 py-2.5 bg-surface-container-highest/20 text-on-surface-variant rounded-lg text-sm font-bold hover:bg-error/10 hover:text-error transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Reject
            </button>
          </div>
        ) : showClarify ? (
          <div className="space-y-2">
            <textarea
              value={clarifyMsg}
              onChange={e => setClarifyMsg(e.target.value)}
              placeholder="What clarification do you need?"
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary transition-all resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowClarify(false)} className="flex-1 py-2 text-sm text-on-surface-variant hover:bg-surface-container-highest/20 rounded-lg transition-all">Cancel</button>
              <button
                onClick={handleClarify}
                disabled={!clarifyMsg.trim() || !!actionLoading}
                className="flex-1 py-2 bg-primary-container text-white rounded-lg text-sm font-bold hover:brightness-110 transition-all"
              >
                Send
              </button>
            </div>
          </div>
        ) : showReject ? (
          <div className="space-y-2">
            <select
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary transition-all"
            >
              {REJECT_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowReject(false)} className="flex-1 py-2 text-sm text-on-surface-variant hover:bg-surface-container-highest/20 rounded-lg transition-all">Cancel</button>
              <button
                onClick={handleReject}
                disabled={!!actionLoading}
                className="flex-1 py-2 bg-error/80 text-white rounded-lg text-sm font-bold hover:bg-error transition-all"
              >
                Reject
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Generated Note Preview */}
      {handoff.generated_note && (
        <details className="border-t border-outline-variant/10">
          <summary className="px-4 py-2 text-xs text-primary cursor-pointer hover:bg-primary/5 transition-all font-bold">
            View Handoff Note
          </summary>
          <div className="px-4 pb-4">
            <pre className="text-[10px] font-label-mono text-on-surface-variant whitespace-pre-wrap bg-surface-container-lowest rounded-lg p-3 max-h-[300px] overflow-y-auto">
              {handoff.generated_note}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}

export default function PendingHandoffs() {
  const { currentUser } = useCurrentUser();
  const { handoffs, loading, refresh } = usePendingHandoffs(currentUser?.user_id || '');
  const [checkingTimeouts, setCheckingTimeouts] = useState(false);

  const handleCheckTimeouts = async () => {
    setCheckingTimeouts(true);
    try {
      await checkTimeouts(30); // 30-second timeout for demo
      refresh();
    } catch (err) {
      console.error('Timeout check failed:', err);
    } finally {
      setCheckingTimeouts(false);
    }
  };

  return (
    <div className="space-y-card-gap">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">Handoffs Awaiting Me</h2>
          <p className="text-on-surface-variant/80">
            Logged in as <span className="font-bold text-on-surface">{currentUser?.name}</span> — {currentUser?.role}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCheckTimeouts}
            disabled={checkingTimeouts}
            className="px-4 py-2 glass rounded-lg flex items-center gap-2 text-sm hover:bg-surface-container-highest transition-all"
            title="Demo: Check for timed-out handoffs (30s timeout)"
          >
            {checkingTimeouts ? (
              <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-sm">timer</span>
            )}
            Check Escalations
          </button>
          <button onClick={refresh} className="px-4 py-2 glass rounded-lg flex items-center gap-2 text-sm hover:bg-surface-container-highest transition-all">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : handoffs.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-4 block">inbox</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface-variant/60 mb-2">No Pending Handoffs</h3>
          <p className="text-sm text-on-surface-variant/40">
            You don't have any responsibility transfers awaiting your acceptance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-card-gap">
          {handoffs.map(h => (
            <HandoffCard key={h.handoff_id} handoff={h} onAction={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
