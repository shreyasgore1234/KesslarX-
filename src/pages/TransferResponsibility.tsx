// ============================================================
// KesslerX Transfer Responsibility Page
// Select a conjunction event and initiate handoff transfer
// ============================================================

import { useState } from 'react';
import { useEvents, useUsers } from '../hooks/useHandoffAPI';
import { useCurrentUser } from '../components/handoff/UserContext';
import HandoffModal from '../components/handoff/HandoffModal';

export default function TransferResponsibility() {
  const { events, loading: eventsLoading, refresh: refreshEvents } = useEvents();
  const { users } = useUsers();
  const { currentUser } = useCurrentUser();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const severityColors: Record<string, { bg: string; text: string; border: string }> = {
    CRITICAL: { bg: 'bg-error/15', text: 'text-error', border: 'border-error/40' },
    HIGH: { bg: 'bg-secondary/15', text: 'text-secondary', border: 'border-secondary/40' },
    MEDIUM: { bg: 'bg-on-surface-variant/10', text: 'text-on-surface-variant', border: 'border-on-surface-variant/30' },
    LOW: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
  };

  const filteredEvents = events.filter(ev => {
    if (!searchQuery) return true;
    const q = searchQuery.toUpperCase();
    return (
      ev.title.toUpperCase().includes(q) ||
      ev.event_id.toUpperCase().includes(q) ||
      (ev.owner?.name || '').toUpperCase().includes(q)
    );
  });

  return (
    <div className="space-y-card-gap">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">Transfer Responsibility</h2>
          <p className="text-on-surface-variant/80">Select a conjunction event to transfer ownership to another operator.</p>
        </div>
      </div>

      {/* Search & Info Bar */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 flex items-center gap-2 glass rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            type="text"
            placeholder="Search events by name, ID, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-on-surface-variant/40"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
        <div className="glass rounded-xl px-4 py-3 flex items-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-primary text-sm">person</span>
          <span className="text-sm font-label-mono">{currentUser?.name || 'Unknown'}</span>
        </div>
      </div>

      {/* Events Grid */}
      {eventsLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3 block">search_off</span>
          <p className="text-on-surface-variant">No events found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-card-gap">
          {filteredEvents.map(ev => {
            const s = severityColors[ev.severity] || severityColors.MEDIUM;
            const isOwner = currentUser?.user_id === ev.current_owner_id;
            const owner = ev.owner || users.find(u => u.user_id === ev.current_owner_id);

            return (
              <div
                key={ev.event_id}
                className={`glass rounded-xl overflow-hidden border-l-4 ${s.border} transition-all hover:ring-1 hover:ring-primary/20 ${
                  selectedEventId === ev.event_id ? 'ring-2 ring-primary/40 bg-primary/5' : ''
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-outline-variant/10">
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm truncate">{ev.title}</h4>
                      <p className="text-[10px] text-on-surface-variant font-label-mono">{ev.event_id}</p>
                    </div>
                    <span className={`${s.bg} ${s.text} text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ml-2`}>
                      {ev.severity}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center p-2 rounded-lg bg-surface-container-highest/20">
                      <p className="text-[9px] text-on-surface-variant uppercase">TCA</p>
                      <p className="text-xs font-bold">{ev.tca_minutes} min</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-surface-container-highest/20">
                      <p className="text-[9px] text-on-surface-variant uppercase">Miss</p>
                      <p className="text-xs font-bold">{ev.miss_distance_km} km</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-surface-container-highest/20">
                      <p className="text-[9px] text-on-surface-variant uppercase">Risk</p>
                      <p className="text-xs font-bold">{((ev.collision_probability || 0) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                {/* Owner Section */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary">
                      {owner?.avatar_initials || (ev.current_owner_id || '??').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{owner?.name || ev.current_owner_id || 'Unassigned'}</p>
                      <p className="text-[10px] text-on-surface-variant">{ev.current_owner_role || 'Operator'}</p>
                    </div>
                    {isOwner && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold shrink-0">YOU</span>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="px-4 pb-4">
                  {isOwner ? (
                    <button
                      onClick={() => {
                        setSelectedEventId(ev.event_id);
                        setShowHandoffModal(true);
                      }}
                      className="w-full py-2.5 rounded-lg text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(180, 197, 255, 0.2), rgba(0, 174, 239, 0.15))',
                        border: '1px solid rgba(180, 197, 255, 0.3)',
                        color: '#B4C5FF',
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">swap_horiz</span>
                      TRANSFER RESPONSIBILITY
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-lg text-[10px] font-label-mono text-center text-on-surface-variant/50 border border-outline-variant/10">
                      Owned by {owner?.name || ev.current_owner_id || 'someone else'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Handoff Modal */}
      {selectedEventId && (
        <HandoffModal
          eventId={selectedEventId}
          eventTitle={events.find(e => e.event_id === selectedEventId)?.title || selectedEventId}
          isOpen={showHandoffModal}
          onClose={() => { setShowHandoffModal(false); setSelectedEventId(null); }}
          onComplete={() => {
            refreshEvents();
            setShowHandoffModal(false);
            setSelectedEventId(null);
          }}
        />
      )}
    </div>
  );
}
