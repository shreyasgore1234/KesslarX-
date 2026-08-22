// ============================================================
// KesslerX Event Workspace
// Conjunction event detail page with handoff integration
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvent, useEventHandoffs, useEventTimeline, useUsers } from '../hooks/useHandoffAPI';
import { useCurrentUser } from '../components/handoff/UserContext';
import HandoffModal from '../components/handoff/HandoffModal';
import HandoffHistory from '../components/handoff/HandoffHistory';
import EventTimeline from '../components/handoff/EventTimeline';
import ReportPreviewModal from '../components/handoff/ReportPreviewModal';
import type { HandoffEvent } from '../data/handoffTypes';

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-error/20 text-error border-error/40',
    HIGH: 'bg-error/15 text-error border-error/30',
    MEDIUM: 'bg-secondary/20 text-secondary border-secondary/30',
    LOW: 'bg-primary/15 text-primary border-primary/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider border ${colors[severity] || colors.LOW}`}>
      {severity === 'CRITICAL' && <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />}
      {severity}
    </span>
  );
}

function OwnerBadge({ event }: { event: HandoffEvent }) {
  const isEmergency = event.status === 'Unassigned Emergency';
  const owner = event.owner;

  if (isEmergency || !event.current_owner_id) {
    return (
      <div className="p-4 rounded-xl bg-error/10 border-2 border-error/40 animate-pulse">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-2xl">warning</span>
          <div>
            <p className="text-error font-bold text-sm">⚠ Emergency: No owner has accepted responsibility</p>
            <p className="text-error/70 text-xs">This event requires immediate attention</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-highest/20">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
        {owner?.avatar_initials || event.current_owner_id.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-bold">{owner?.name || event.current_owner_id}</p>
        <p className="text-[10px] text-on-surface-variant font-label-mono">{event.current_owner_role}</p>
      </div>
      {owner?.status && (
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
          owner.status === 'Available' ? 'bg-green-500/20 text-green-400' : 'bg-error/20 text-error'
        }`}>
          {owner.status}
        </span>
      )}
    </div>
  );
}

function formatTCA(tca: string | undefined, tcaMinutes: number | undefined): string {
  if (tcaMinutes !== undefined) {
    if (tcaMinutes < 60) return `${tcaMinutes} min`;
    const h = Math.floor(tcaMinutes / 60);
    const m = tcaMinutes % 60;
    return `${h}h ${m}m`;
  }
  if (tca) {
    const dt = new Date(tca);
    const now = new Date();
    const diffMs = dt.getTime() - now.getTime();
    const diffMin = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMin < 60) return `${diffMin} min`;
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
  }
  return 'N/A';
}

export default function EventWorkspace() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();

  const { event, loading: eventLoading, refresh: refreshEvent } = useEvent(eventId || '');
  const { handoffs, loading: handoffsLoading, refresh: refreshHandoffs } = useEventHandoffs(eventId || '');
  const { timeline, refresh: refreshTimeline } = useEventTimeline(eventId || '');
  const { users } = useUsers();

  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      refreshEvent();
      refreshHandoffs();
      refreshTimeline();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshEvent, refreshHandoffs, refreshTimeline]);

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-3">search_off</span>
        <p className="text-on-surface-variant">Event not found</p>
        <button onClick={() => navigate('/collision-monitor')} className="mt-3 text-primary text-sm hover:underline">
          Back to Collision Monitor
        </button>
      </div>
    );
  }

  const isOwner = currentUser?.user_id === event.current_owner_id;
  const statusColors: Record<string, string> = {
    'Under Review': 'text-primary',
    'Handoff Pending': 'text-secondary',
    'Escalated': 'text-error',
    'Unassigned Emergency': 'text-error',
    'Monitoring': 'text-on-surface-variant',
    'Handoff Rejected': 'text-error',
  };

  return (
    <div className="space-y-card-gap">
      {/* Back nav */}
      <button
        onClick={() => navigate('/collision-monitor')}
        className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Collision Monitor
      </button>

      {/* Event Header */}
      <div className="glass rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-label-mono text-label-mono text-on-surface-variant">{event.event_id}</span>
              <SeverityBadge severity={event.severity} />
              {event.status && (
                <span className={`text-xs font-bold ${statusColors[event.status] || 'text-on-surface-variant'}`}>
                  {event.status}
                </span>
              )}
            </div>
            <h1 className="font-headline-md text-headline-md mb-1">{event.title}</h1>
            <p className="text-sm text-on-surface-variant">Conjunction Event Workspace</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            {/* Generate Report Button — always visible */}
            <button
              onClick={() => setShowReportModal(true)}
              className="px-5 py-3 glass text-on-surface rounded-xl font-bold text-sm hover:bg-primary/10 hover:text-primary active:scale-95 transition-all flex items-center gap-2 border border-outline-variant/20"
            >
              <span className="material-symbols-outlined">description</span>
              Generate Assessment Report
            </button>

            {/* Transfer Button — owner only */}
            {isOwner && (
              <button
                onClick={() => setShowHandoffModal(true)}
                className="px-5 py-3 bg-primary-container text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg"
              >
                <span className="material-symbols-outlined">swap_horiz</span>
                Transfer Responsibility
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Banner */}
      {event.status === 'Unassigned Emergency' && (
        <div className="p-4 rounded-xl bg-error/10 border-2 border-error/40 animate-pulse flex items-center gap-4">
          <span className="material-symbols-outlined text-error text-3xl">crisis_alert</span>
          <div>
            <p className="text-error font-bold">⚠ EMERGENCY: No owner has accepted responsibility</p>
            <p className="text-error/70 text-sm">This critical event requires immediate assignment. All operations personnel are notified.</p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-card-gap">
        <div className="glass p-4 rounded-xl">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">TCA</p>
          <p className="font-stat-lg text-stat-lg text-error">{formatTCA(event.tca, event.tca_minutes)}</p>
        </div>
        <div className="glass p-4 rounded-xl">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">Miss Distance</p>
          <p className="font-stat-lg text-stat-lg">{event.miss_distance_km} km</p>
        </div>
        <div className="glass p-4 rounded-xl">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">Collision Prob.</p>
          <p className="font-stat-lg text-stat-lg">{event.collision_probability}</p>
        </div>
        <div className="glass p-4 rounded-xl">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">Rel. Velocity</p>
          <p className="font-stat-lg text-stat-lg">{event.relative_velocity_km_s} km/s</p>
        </div>
        <div className="glass p-4 rounded-xl">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">Risk Trend</p>
          <p className="font-stat-lg text-[20px] font-bold">{event.risk_trend || 'N/A'}</p>
        </div>
        <div className="glass p-4 rounded-xl">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wide">Orbit</p>
          <p className="font-stat-lg text-[20px] font-bold">{event.orbit} · {event.altitude_km} km</p>
        </div>
      </div>

      {/* Owner & Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-card-gap">
        <div className="glass rounded-xl p-5 space-y-4">
          <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person</span>
            Current Owner
          </h3>
          <OwnerBadge event={event} />

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-surface-container-highest/10">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wide mb-1">Next Action</p>
              <p className="text-sm font-bold">{event.next_action || 'Not specified'}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-highest/10">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wide mb-1">Deadline</p>
              <p className="text-sm font-bold font-label-mono">
                {event.deadline ? new Date(event.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : 'Not set'}
              </p>
            </div>
          </div>
        </div>

        {/* Work Completed */}
        <div className="glass rounded-xl p-5 space-y-3">
          <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">task_alt</span>
            Work Completed
          </h3>
          {event.work_completed && event.work_completed.length > 0 ? (
            <ul className="space-y-2">
              {event.work_completed.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-green-400 text-sm mt-0.5 flex-shrink-0">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-on-surface-variant/50 italic">No work items recorded</p>
          )}
        </div>
      </div>

      {/* Handoff History */}
      <HandoffHistory
        handoffs={handoffs}
        loading={handoffsLoading}
        onRefresh={() => { refreshHandoffs(); refreshEvent(); refreshTimeline(); }}
      />

      {/* Event Timeline */}
      <EventTimeline timeline={timeline} />

      {/* Handoff Modal */}
      <HandoffModal
        eventId={event.event_id}
        eventTitle={event.title}
        isOpen={showHandoffModal}
        onClose={() => setShowHandoffModal(false)}
        onComplete={() => {
          refreshEvent();
          refreshHandoffs();
          refreshTimeline();
        }}
      />

      {/* Report Preview Modal */}
      {currentUser && (
        <ReportPreviewModal
          event={event}
          handoffs={handoffs}
          timeline={timeline}
          currentUser={currentUser}
          users={users}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
