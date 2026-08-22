// ============================================================
// KesslerX Handoff Modal
// "Transfer Responsibility" dialog with form, note generation,
// preview, and confirm flow.
// ============================================================

import { useState, useEffect } from 'react';
import { useCurrentUser } from './UserContext';
import { useUsers } from '../../hooks/useHandoffAPI';
import { createHandoff, generateNote, updateNote, confirmTransfer } from '../../hooks/useHandoffAPI';
import { HANDOFF_REASONS } from '../../data/handoffTypes';
import type { HandoffUser, Handoff } from '../../data/handoffTypes';

interface HandoffModalProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = 'form' | 'preview' | 'success';

export default function HandoffModal({ eventId, eventTitle, isOpen, onClose, onComplete }: HandoffModalProps) {
  const { currentUser } = useCurrentUser();
  const { users } = useUsers();

  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [toUserId, setToUserId] = useState('');
  const [reason, setReason] = useState('Shift Change');
  const [priority, setPriority] = useState('Normal');
  const [nextAction, setNextAction] = useState('');
  const [deadline, setDeadline] = useState('');
  const [message, setMessage] = useState('');
  const [includeEvidence, setIncludeEvidence] = useState(true);

  // Generated handoff
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [editedNote, setEditedNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Available recipients (exclude current user and offline users)
  const recipients = users.filter(
    u => u.user_id !== currentUser?.user_id
  );

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setError('');
      setHandoff(null);
      setToUserId('');
      setReason('Shift Change');
      setPriority('Normal');
      setNextAction('');
      setDeadline('');
      setMessage('');
      setIncludeEvidence(true);
      setIsEditingNote(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedRecipient = users.find(u => u.user_id === toUserId);

  const validate = (): string => {
    if (!toUserId) return 'Please select a recipient';
    if (!reason) return 'Please select a reason';
    if (!nextAction.trim()) return 'Please specify the next action';
    return '';
  };

  const handleGenerateNote = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');
    try {
      // Step 1: Create the handoff draft
      const created = await createHandoff(eventId, {
        to_user_id: toUserId,
        reason,
        priority,
        next_action: nextAction,
        deadline,
        message,
        include_evidence: includeEvidence,
      }, currentUser!.user_id);

      // Step 2: Generate the structured note
      const withNote = await generateNote(created.handoff_id);
      setHandoff(withNote);
      setEditedNote(withNote.generated_note);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to generate handoff note');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!handoff) return;
    setLoading(true);
    setError('');
    try {
      // Save edited note if changed
      if (editedNote !== handoff.generated_note) {
        await updateNote(handoff.handoff_id, editedNote);
      }
      // Confirm the transfer
      await confirmTransfer(handoff.handoff_id, currentUser!.user_id);
      setStep('success');
      setTimeout(() => {
        onComplete();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-primary/20 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">swap_horiz</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm">Transfer Responsibility</h2>
              <p className="text-xs text-on-surface-variant font-label-mono">{eventId} · {eventTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-highest/30 rounded-full transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {step === 'form' && (
            <div className="space-y-4">
              {/* Transfer To */}
              <div>
                <label className="block text-xs text-on-surface-variant uppercase tracking-wide mb-1.5 font-bold">Transfer To</label>
                <select
                  value={toUserId}
                  onChange={e => setToUserId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                >
                  <option value="">Select recipient...</option>
                  {recipients.map(u => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.name} — {u.role} {u.status === 'Offline' ? '(Offline)' : ''}
                    </option>
                  ))}
                </select>
                {selectedRecipient && (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-surface-container-highest/20">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedRecipient.status === 'Offline' ? 'bg-error/20 text-error' : 'bg-primary/20 text-primary'}`}>
                      {selectedRecipient.avatar_initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{selectedRecipient.name}</p>
                      <p className="text-[10px] text-on-surface-variant">{selectedRecipient.role} · {selectedRecipient.status}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs text-on-surface-variant uppercase tracking-wide mb-1.5 font-bold">Reason</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                >
                  {HANDOFF_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs text-on-surface-variant uppercase tracking-wide mb-1.5 font-bold">Priority</label>
                <div className="flex gap-2">
                  {['Normal', 'Urgent'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        priority === p
                          ? p === 'Urgent'
                            ? 'bg-error/20 text-error border border-error/40'
                            : 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-surface-container-low border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-highest/30'
                      }`}
                    >
                      {p === 'Urgent' && <span className="material-symbols-outlined text-sm mr-1 align-middle">priority_high</span>}
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Action */}
              <div>
                <label className="block text-xs text-on-surface-variant uppercase tracking-wide mb-1.5 font-bold">Next Action *</label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={e => setNextAction(e.target.value)}
                  placeholder="e.g., Validate Scenario B and request mission-manager approval"
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs text-on-surface-variant uppercase tracking-wide mb-1.5 font-bold">Deadline</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs text-on-surface-variant uppercase tracking-wide mb-1.5 font-bold">Additional Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Any additional context for the recipient..."
                  rows={3}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Include Evidence */}
              <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-highest/10 cursor-pointer hover:bg-surface-container-highest/20 transition-all">
                <input
                  type="checkbox"
                  checked={includeEvidence}
                  onChange={e => setIncludeEvidence(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant accent-primary"
                />
                <div>
                  <p className="text-sm font-bold">Include Event Evidence</p>
                  <p className="text-[10px] text-on-surface-variant">Attach conjunction data, risk metrics, and analysis results</p>
                </div>
              </label>
            </div>
          )}

          {step === 'preview' && handoff && (
            <div className="space-y-4">
              {/* Note Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">description</span>
                  <h3 className="font-bold text-sm">Handoff Note Preview</h3>
                </div>
                <button
                  onClick={() => setIsEditingNote(!isEditingNote)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-container-highest/20 hover:bg-surface-container-highest/40 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">{isEditingNote ? 'visibility' : 'edit'}</span>
                  {isEditingNote ? 'Preview' : 'Edit Note'}
                </button>
              </div>

              {/* Transfer Summary */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {currentUser?.avatar_initials}
                  </div>
                  <span className="text-sm font-bold">{currentUser?.name}</span>
                </div>
                <span className="material-symbols-outlined text-primary">arrow_forward</span>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold text-secondary">
                    {handoff.to_user?.avatar_initials || '??'}
                  </div>
                  <span className="text-sm font-bold">{handoff.to_user?.name || handoff.to_user_id}</span>
                </div>
              </div>

              {/* Note Content */}
              {isEditingNote ? (
                <textarea
                  value={editedNote}
                  onChange={e => setEditedNote(e.target.value)}
                  rows={20}
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 text-xs font-label-mono text-on-surface focus:ring-2 focus:ring-primary transition-all resize-y"
                />
              ) : (
                <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  <pre className="text-xs font-label-mono text-on-surface whitespace-pre-wrap leading-relaxed">
                    {editedNote}
                  </pre>
                </div>
              )}

              <p className="text-[10px] text-on-surface-variant italic flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">info</span>
                All numerical values in this note are from verified event data. This is decision-support information requiring human review.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm mb-2">Transfer Initiated</h3>
              <p className="text-sm text-on-surface-variant">
                Handoff is now <span className="text-primary font-bold">Awaiting Acceptance</span> from{' '}
                {handoff?.to_user?.name || 'the recipient'}.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step !== 'success' && (
          <div className="p-5 border-t border-outline-variant/10 flex items-center justify-between">
            <button
              onClick={step === 'preview' ? () => setStep('form') : onClose}
              className="px-4 py-2.5 text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/20 rounded-lg transition-all"
            >
              {step === 'preview' ? 'Back' : 'Cancel'}
            </button>
            <button
              onClick={step === 'form' ? handleGenerateNote : handleConfirmTransfer}
              disabled={loading}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                loading
                  ? 'bg-surface-container-highest text-on-surface-variant cursor-wait'
                  : step === 'form'
                    ? 'bg-primary-container text-white hover:brightness-110 active:scale-95'
                    : 'bg-green-600 text-white hover:bg-green-500 active:scale-95'
              }`}
            >
              {loading && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              {step === 'form' ? 'Generate Handoff Note' : 'Confirm Transfer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
