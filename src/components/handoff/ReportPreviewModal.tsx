// ============================================================
// KesslerX — Report Preview Modal
// Pre-generation review before PDF creation with refined UI
// Rendered via createPortal to guarantee viewport-relative positioning
// ============================================================

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { generateConjunctionReport } from '../../lib/generateReport';
import type { HandoffEvent, Handoff, TimelineEntry, HandoffUser } from '../../data/handoffTypes';

interface ReportPreviewModalProps {
  event: HandoffEvent;
  handoffs: Handoff[];
  timeline: TimelineEntry[];
  currentUser: HandoffUser;
  users: HandoffUser[];
  isOpen: boolean;
  onClose: () => void;
}

type Status = 'preview' | 'generating' | 'success' | 'error';

function formatModalTCA(tca?: string, minutes?: number): string {
  if (minutes !== undefined && !isNaN(minutes) && minutes > 0) {
    if (minutes < 60) return `T-${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `T-${h}h ${m}m`;
  }
  if (!tca) return 'N/A';
  if (tca.toLowerCase().includes('continuous') || tca.toLowerCase().includes('nominal')) {
    return 'Continuous';
  }
  return formatShortTime(tca);
}

function formatShortTime(tcaStr: string): string {
  if (tcaStr.includes('T')) {
    try {
      const dt = new Date(tcaStr);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';
      }
    } catch {}
  }
  return tcaStr;
}

export default function ReportPreviewModal({
  event, handoffs, timeline, currentUser, users, isOpen, onClose,
}: ReportPreviewModalProps) {
  const [status, setStatus] = useState<Status>('preview');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const sevColors: Record<string, { badge: string; dot: string; border: string }> = {
    CRITICAL: {
      badge: 'bg-error/15 text-error border-error/30',
      dot: 'bg-error',
      border: 'border-error/40',
    },
    HIGH: {
      badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      dot: 'bg-orange-400',
      border: 'border-orange-500/40',
    },
    MEDIUM: {
      badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      dot: 'bg-yellow-400',
      border: 'border-yellow-500/30',
    },
    LOW: {
      badge: 'bg-primary/15 text-primary border-primary/30',
      dot: 'bg-primary',
      border: 'border-primary/30',
    },
  };

  const handleGenerate = async () => {
    setStatus('generating');
    setProgress('Preparing report data...');
    setError('');

    try {
      await generateConjunctionReport(
        { event, handoffs, timeline, currentUser, users },
        (msg) => setProgress(msg),
      );
      setStatus('success');
    } catch (err: any) {
      console.error('Report generation failed:', err);
      setError(err.message || 'Unknown error');
      setStatus('error');
    }
  };

  const handleClose = () => {
    setStatus('preview');
    setProgress('');
    setError('');
    onClose();
  };

  const ownerUser = users.find(u => u.user_id === event.current_owner_id);
  const sevStyle = sevColors[event.severity] || sevColors.LOW;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-hidden"
      onClick={handleClose}
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/85 backdrop-blur-md transition-opacity duration-300" />

      {/* Modal Container */}
      <div
        className="relative glass rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/20 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ background: 'rgba(6, 14, 32, 0.94)', backdropFilter: 'blur(24px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-outline-variant/10 flex items-center justify-between shrink-0 bg-surface-container-lowest/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/25">
              <span className="material-symbols-outlined text-primary text-lg">description</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-xs font-bold text-primary tracking-wide">KesslerX Report Center</h3>
              <p className="text-[9px] font-label-mono text-on-surface-variant uppercase tracking-wider">
                Orbital Conjunction Assessment
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-surface-container-highest/60 transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
          {status === 'preview' && (
            <>
              {/* Event Title Display */}
              <div className="text-center py-2 px-3 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/10">
                <span className="text-[9px] text-primary/80 font-label-mono uppercase tracking-widest block mb-0.5">
                  EVENT ID: {event.event_id}
                </span>
                <div className="flex items-center justify-center gap-1.5 flex-wrap my-0.5">
                  <h2 className="text-sm font-bold text-white font-headline-sm truncate max-w-[200px]" title={event.satellite || 'PRIMARY OBJECT'}>
                    {event.satellite || 'PRIMARY OBJECT'}
                  </h2>
                  <span className="text-[10px] text-on-surface-variant font-label-mono">vs</span>
                  <h2 className="text-sm font-bold text-white font-headline-sm truncate max-w-[200px]" title={event.object || 'SECONDARY OBJECT'}>
                    {event.object || 'SECONDARY OBJECT'}
                  </h2>
                </div>

                <div className="mt-1.5 flex justify-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${sevStyle.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot} animate-pulse`} />
                    {event.severity} RISK
                  </span>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* TCA */}
                <div className="p-2.5 rounded-xl bg-surface-container-highest/20 border border-outline-variant/10 text-center flex flex-col justify-center min-w-0">
                  <p className="text-[8.5px] text-on-surface-variant font-label-mono uppercase tracking-wider mb-0.5">TCA</p>
                  <p className="text-[11px] font-bold text-white font-label-mono truncate" title={event.tca || 'N/A'}>
                    {formatModalTCA(event.tca, event.tca_minutes)}
                  </p>
                </div>

                {/* Miss Distance */}
                <div className="p-2.5 rounded-xl bg-surface-container-highest/20 border border-outline-variant/10 text-center flex flex-col justify-center min-w-0">
                  <p className="text-[8.5px] text-on-surface-variant font-label-mono uppercase tracking-wider mb-0.5">Miss Distance</p>
                  <p className="text-[11px] font-bold text-white font-label-mono truncate">
                    {event.miss_distance_km !== undefined ? `${event.miss_distance_km} km` : 'N/A'}
                  </p>
                </div>

                {/* Collision Probability */}
                <div className="p-2.5 rounded-xl bg-surface-container-highest/20 border border-outline-variant/10 text-center flex flex-col justify-center min-w-0">
                  <p className="text-[8.5px] text-on-surface-variant font-label-mono uppercase tracking-wider mb-0.5">Collision Prob.</p>
                  <p className="text-[11px] font-bold text-error font-label-mono truncate">
                    {event.collision_probability !== undefined
                      ? event.collision_probability >= 0.001
                        ? `${(event.collision_probability * 100).toFixed(1)}%`
                        : event.collision_probability.toExponential(2)
                      : 'N/A'}
                  </p>
                </div>

                {/* Current Owner */}
                <div className="p-2.5 rounded-xl bg-surface-container-highest/20 border border-outline-variant/10 text-center flex flex-col justify-center min-w-0">
                  <p className="text-[8.5px] text-on-surface-variant font-label-mono uppercase tracking-wider mb-0.5">Current Owner</p>
                  <p className="text-[11px] font-bold text-white truncate" title={ownerUser?.name || event.current_owner_id || 'N/A'}>
                    {ownerUser?.name || event.current_owner_id || 'Unassigned'}
                  </p>
                </div>
              </div>

              {/* Report Contents Checklist */}
              <div className="p-3 rounded-xl bg-surface-container-highest/10 border border-outline-variant/10">
                <p className="text-[8.5px] text-on-surface-variant font-label-mono uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs text-primary">menu_book</span>
                  Report Sections Included
                </p>
                <div className="grid grid-cols-2 gap-y-1 gap-x-3 text-[10.5px] text-on-surface-variant">
                  {[
                    'Cover Page with Watermark',
                    '01 Executive Summary',
                    '02 Objects Involved',
                    '03 Conjunction Assessment',
                    '04 Conjunction Visualization',
                    '05 Risk Trend Analysis',
                    '06 Analysis & Evidence',
                    `07 Responsibility Handoff (${handoffs.length})`,
                    `08 Event Timeline (${timeline.length})`,
                    '09 Recommended Action',
                    '10 Data Sources & Metadata',
                    '11 Disclaimer & Copyright',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-primary text-xs shrink-0">check_circle</span>
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Note */}
              <div className="flex items-center gap-1.5 text-[9.5px] text-on-surface-variant/80 px-1">
                <span className="material-symbols-outlined text-xs text-primary shrink-0">info</span>
                <span>The PDF will open in a new browser tab with watermark, selectable text, and print options.</span>
              </div>
            </>
          )}

          {status === 'generating' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" />
              <div>
                <p className="font-bold text-primary text-xs">Generating Orbital Assessment...</p>
                <p className="text-[10px] text-on-surface-variant mt-1 font-label-mono">{progress}</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="py-7 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
              </div>
              <div>
                <p className="font-bold text-emerald-400 text-xs">Report Generated Successfully</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  The PDF has opened in a new browser tab with watermark and full assessment data.
                </p>
                <p className="text-[9px] text-on-surface-variant/70 mt-1 font-label-mono">
                  KesslerX_Conjunction_Report_{event.event_id}_{new Date().toISOString().split('T')[0]}.pdf
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-6 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-error/15 border border-error/30 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-error text-xl">error</span>
              </div>
              <div>
                <p className="font-bold text-error text-xs">Unable to generate the report</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">Please try again. If the issue persists, verify backend connectivity.</p>
                {error && <p className="text-[9px] text-error/60 font-label-mono mt-1">{error}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-outline-variant/10 flex justify-end gap-2.5 bg-surface-container-lowest/40 shrink-0">
          {status === 'preview' && (
            <>
              <button
                onClick={handleClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-white hover:bg-surface-container-highest/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all hover:brightness-110 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(180, 197, 255, 0.25), rgba(0, 174, 239, 0.25))',
                  border: '1px solid rgba(180, 197, 255, 0.4)',
                  color: '#B4C5FF',
                }}
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                Generate PDF
              </button>
            </>
          )}

          {status === 'generating' && (
            <button disabled className="px-4 py-2 rounded-xl text-xs text-on-surface-variant/50 cursor-not-allowed glass">
              Generating...
            </button>
          )}

          {(status === 'success' || status === 'error') && (
            <>
              {status === 'error' && (
                <button
                  onClick={handleGenerate}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-on-surface-variant hover:text-white hover:bg-surface-container-highest/60 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">refresh</span>
                  Retry
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-bold glass hover:bg-surface-container-highest/80 text-white transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
