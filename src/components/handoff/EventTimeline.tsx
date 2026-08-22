// ============================================================
// KesslerX Event Timeline
// Shows responsibility changes and system events
// ============================================================

import type { TimelineEntry } from '../../data/handoffTypes';

interface EventTimelineProps {
  timeline: TimelineEntry[];
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
  } catch { return iso; }
}

function iconForAction(action: string): { icon: string; color: string } {
  const a = action.toLowerCase();
  if (a.includes('emergency')) return { icon: 'crisis_alert', color: 'text-error' };
  if (a.includes('escalat')) return { icon: 'trending_up', color: 'text-error' };
  if (a.includes('reject')) return { icon: 'cancel', color: 'text-error' };
  if (a.includes('clarification')) return { icon: 'help', color: 'text-yellow-400' };
  if (a.includes('accept') || a.includes('transferred')) return { icon: 'check_circle', color: 'text-green-400' };
  if (a.includes('awaiting')) return { icon: 'hourglass_top', color: 'text-secondary' };
  if (a.includes('started') || a.includes('draft')) return { icon: 'swap_horiz', color: 'text-primary' };
  if (a.includes('created') || a.includes('assigned')) return { icon: 'person_add', color: 'text-primary' };
  return { icon: 'circle', color: 'text-on-surface-variant' };
}

export default function EventTimeline({ timeline }: EventTimelineProps) {
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-headline-sm text-headline-sm flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-tertiary">timeline</span>
        Event Timeline
      </h3>

      {timeline.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2 block">timeline</span>
          <p className="text-sm text-on-surface-variant/50">No timeline events yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-outline-variant/20" />

          <div className="space-y-0">
            {timeline.map((entry) => {
              const { icon, color } = iconForAction(entry.action);
              return (
                <div key={entry.timeline_id} className="relative flex gap-4 py-3">
                  {/* Icon dot */}
                  <div className={`relative z-10 w-[30px] h-[30px] rounded-full bg-surface-container-lowest flex items-center justify-center flex-shrink-0 border border-outline-variant/20`}>
                    <span className={`material-symbols-outlined text-sm ${color}`}>{icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-snug">{entry.action}</p>
                    {entry.comment && (
                      <p className="text-xs text-on-surface-variant mt-0.5">{entry.comment}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-on-surface-variant/60 font-label-mono">
                      <span>{formatTimestamp(entry.timestamp)}</span>
                      {entry.actor_name && entry.actor_id !== 'system' && (
                        <span>by {entry.actor_name}</span>
                      )}
                      {entry.actor_id === 'system' && (
                        <span className="text-secondary">SYSTEM</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
