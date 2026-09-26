/**
 * "While we prepare your order…"
 *
 * Two small cafe games live here. Winning credit is added to the order itself (not to
 * local state), and the server caps it, so the bill can never be talked down further
 * than the cafe allows. Only a *better* round awards anything, which stops replaying
 * the same score from stacking discounts.
 */
import { useRef, useState } from 'react';
import { BeanRush } from '@/components/games/BeanRush';
import { MemoryMatch } from '@/components/games/MemoryMatch';
import { useToast } from '@/context/ToastContext';
import { formatINR } from '@/lib/format';
import { ApiFailure } from '@/lib/apiClient';
import type { OrderDto } from '@/services/types';

export interface WaitingGamesProps {
  order: OrderDto;
  onEarn: (amount: number) => Promise<void>;
}

type GameId = 'rush' | 'match';

export function WaitingGames({ order, onEarn }: WaitingGamesProps) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const best = useRef<Record<GameId, number>>({ rush: 0, match: 0 });

  const claim = async (game: GameId, points: number) => {
    const previous = best.current[game];

    if (points <= previous) {
      push({
        title: 'No new best this round',
        message: 'Only your best round counts — try again to beat it.',
        tone: 'default',
      });
      return;
    }

    const delta = points - previous;
    best.current[game] = points;
    setBusy(true);

    try {
      await onEarn(delta);
      push({
        title: `${formatINR(delta)} off your bill`,
        message: 'Added to this order — it is already on the pay tab.',
        tone: 'reward',
      });
    } catch (failure) {
      best.current[game] = previous;
      push({
        title: 'We could not add that credit',
        message: failure instanceof ApiFailure ? failure.message : 'Please try again in a moment.',
        tone: 'warning',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="play">
      <div className="panel play__intro">
        <div>
          <h3>While we prepare your order…</h3>
          <p className="muted">
            Two short games, straight from the counter. Winnings come off this bill — the cafe stops at ₹300, and only
            your best round counts.
          </p>
        </div>
        <span className="badge">
          {order.money.bonusCredit > 0 ? `Earned: ${formatINR(order.money.bonusCredit)}` : 'No credit yet'}
        </span>
      </div>

      <section className="panel" aria-busy={busy}>
        <BeanRush onFinish={(score) => void claim('rush', Math.min(60, score * 3))} />
      </section>

      <section className="panel" aria-busy={busy}>
        <MemoryMatch
          labels={order.lines.map((line) => line.shortName)}
          seed={order.id}
          onFinish={({ moves }) => void claim('match', Math.max(10, Math.min(70, 90 - moves * 5)))}
        />
      </section>
    </div>
  );
}
