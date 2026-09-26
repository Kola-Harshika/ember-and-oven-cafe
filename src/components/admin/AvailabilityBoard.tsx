/**
 * Menu availability.
 *
 * A dish that runs out can be hidden without a deploy: the API stops accepting it in
 * new orders (quoting and order creation both refuse it) while past orders keep their
 * snapshot. This is the switch the counter actually flips mid-service.
 */
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { ApiFailure } from '@/lib/apiClient';
import { adminApi } from '@/services/adminApi';

export function AvailabilityBoard() {
  const { push } = useToast();
  const [items, setItems] = useState<{ id: string; name: string; available: boolean }[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const summary = await adminApi.summary();
      setItems(summary.menu);
      setProblem(null);
    } catch (failure) {
      setProblem(failure instanceof ApiFailure ? failure.message : 'We could not load the menu.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (id: string, available: boolean) => {
    setBusyId(id);
    try {
      setItems(await adminApi.setAvailability(id, available));
      push({ title: available ? 'Back on the menu' : 'Hidden from the menu', tone: 'success' });
    } catch (failure) {
      push({
        title: 'That change was refused',
        message: failure instanceof ApiFailure ? failure.message : 'Please try again.',
        tone: 'warning',
      });
    } finally {
      setBusyId(null);
    }
  };

  const unavailable = items.filter((item) => !item.available).length;

  return (
    <section className="panel stack">
      <header className="tracker-panel__head">
        <h3>Menu availability</h3>
        <span className="muted">
          {items.length} dishes · {unavailable} hidden
        </span>
      </header>

      {problem && <p className="notice notice--warning">{problem}</p>}

      <ul className="availability-list">
        {items.map((item) => (
          <li key={item.id}>
            <span className={item.available ? '' : 'muted'}>{item.name}</span>
            <Button
              variant={item.available ? 'quiet' : 'primary'}
              size="sm"
              disabled={busyId === item.id}
              onClick={() => void toggle(item.id, !item.available)}
            >
              {item.available ? 'Mark sold out' : 'Put back on'}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
