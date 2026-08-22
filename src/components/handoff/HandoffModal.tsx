// ============================================================
// KesslerX Handoff Modal
// "Transfer Responsibility" dialog with form, note generation,
// preview, and confirm flow.
// ============================================================

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative glass rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col border border-primary/20 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
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
                  <div className="mt-2 flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className={`w-2 h-2 rounded-full ${selectedRecipient.status === 'Available' ? 'bg-green-400' : 'bg-amber-400'}`} />
                    <span>{selectedRecipient.name} ({selectedRecipient.role}) is currently {selectedRecipient.status}</span>
                  </div>
                )}
              </div>

              {/* Reason & Priority */}
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-xs text-on-surface-variant uppercase tracking-wide mb-1.5 font-bold">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Next Action */}
              <div>
                <label className="block text-xs text-on-surface-variant uppercase tracking-wide mb-1.5 font-bold">Next Action Required *</label>
                <textarea
                  value={nextAction}
                  onChange={e => setNextAction(e.target.value)}
                  placeholder="Specific action the incoming operator must take..."
                  rows={2}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs text-on-surface-variant uppercase tracking-wide mb-1.5 font-bold">Deadline (optional)</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs text-on-surface-variant uppercase tracking-wide mb-1.5 font-bold">Personal Message (optional)</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Additional context or handover notes..."
                  rows={2}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Include Evidence */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEvidence}
                  onChange={e => setIncludeEvidence(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <span className="text-sm">Include analysis evidence & Monte Carlo scenarios</span>
              </label>
            </div>
          )}

          {step === 'preview' && handoff && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary font-bold">Structured Handoff Note Generated</p>
                  <p className="text-[10px] text-on-surface-variant font-label-mono">Review and edit before confirming transfer</p>
                </div>
                <button
                  onClick={() => setIsEditingNote(!isEditingNote)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">{isEditingNote ? 'visibility' : 'edit'}</span>
                  {isEditingNote ? 'Preview' : 'Edit Note'}
                </button>
              </div>

              {isEditingNote ? (
                <textarea
                  value={editedNote}
                  onChange={e => setEditedNote(e.target.value)}
                  rows={12}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 font-mono text-xs text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                />
              ) : (
                <div className="bg-surface-container-lowest/60 rounded-lg p-4 border border-outline-variant/20 max-h-72 overflow-y-auto font-mono text-xs whitespace-pre-wrap leading-relaxed">
                  {editedNote}
                </div>
              )}

              <div className="p-3 rounded-lg bg-surface-container-highest/20 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Transfer:</span>
                  <span className="font-bold">{currentUser?.name} → {selectedRecipient?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Reason:</span>
                  <span>{reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Priority:</span>
                  <span className="font-bold text-primary">{priority}</span>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto text-green-400">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <h3 className="font-headline-sm text-lg font-bold text-green-400">Transfer Initiated</h3>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                Responsibility handoff has been sent to <span className="text-white font-bold">{selectedRecipient?.name}</span>.
                You remain responsible until they accept.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="p-5 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest/30 shrink-0">
            {step === 'preview' ? (
              <button
                onClick={() => setStep('form')}
                className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Form
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-highest transition-all"
              >
                Cancel
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
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
