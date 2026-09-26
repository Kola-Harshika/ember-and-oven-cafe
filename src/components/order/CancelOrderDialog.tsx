/**
 * Cancelling an order.
 *
 * The rules come from the API (which answers with the same shared policy the UI
 * explains here): a short grace window, a warning once the kitchen has started, and a
 * hard stop once the food is cooked or out for delivery. The dialog never promises
 * something the server will refuse.
 */
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/Field';
import { ApiFailure } from '@/lib/apiClient';
import type { CancellationPolicyDto } from '@/services/types';

export interface CancelOrderDialogProps {
  open: boolean;
  policy: CancellationPolicyDto | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function CancelOrderDialog({ open, policy, onClose, onConfirm }: CancelOrderDialogProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const allowed = policy?.allowed ?? false;

  const submit = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await onConfirm(reason.trim() || 'Cancelled by the customer');
      setReason('');
      onClose();
    } catch (failure) {
      setProblem(
        failure instanceof ApiFailure ? failure.message : 'We could not cancel this order. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={allowed ? 'Cancel this order?' : 'This order cannot be cancelled'} onClose={onClose}>
      {allowed ? (
        <>
          {policy?.warning && <p className="notice notice--warning">{policy.warning}</p>}
          <p className="muted">
            Nothing has been charged yet for a cancelled order. Let us know why so the kitchen can learn from it.
          </p>
          <TextAreaField
            id="cancel-reason"
            label="Reason (optional)"
            placeholder="Changed my mind, ordered by mistake…"
            maxLength={180}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </>
      ) : (
        <>
          <p className="notice notice--warning">{policy?.reason ?? 'This order can no longer be cancelled.'}</p>
          <p className="muted">
            If something is wrong, please talk to the counter — the team can still change or cancel the ticket from the
            kitchen side.
          </p>
        </>
      )}

      {problem && <p className="field__error">{problem}</p>}

      <div className="modal__actions">
        <Button variant="quiet" onClick={onClose} disabled={busy}>
          Keep the order
        </Button>
        {allowed && (
          <Button variant="danger" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Cancelling…' : 'Cancel the order'}
          </Button>
        )}
      </div>
    </Modal>
  );
}
