/**
 * Ticket Match — the café memory game.
 *
 * Flip two tickets at a time and pair the dishes from your own order (the board is
 * topped up from the menu, so it is always six pairs). Completion is what reports the
 * score: `onFinish` fires once, and only when every pair has been found, so the reward
 * endpoint can never be reached by clicking a button or reloading the page.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useElapsedSeconds } from '@/lib/hooks';
import { sfx } from '@/lib/sfx';
import { buildDeck, resolveLabels, type MemoryCard } from './memoryDeck';

export interface MemoryMatchResult {
  moves: number;
  seconds: number;
}

export interface MemoryMatchProps {
  /** dishes from the order; the deck is topped up to six pairs */
  labels: string[];
  /** identity of the current order — a different order deals a fresh board */
  seed: string;
  onFinish: (result: MemoryMatchResult) => void;
}

/** How long a mismatched pair stays visible before turning back over. */
const FLIP_BACK_MS = 850;

export function MemoryMatch({ labels, seed, onFinish }: MemoryMatchProps) {
  const [deck, setDeck] = useState<MemoryCard[]>(() => buildDeck(labels));
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(1);

  // Refs, not state, for the guards: two fast taps must never beat React's batching.
  const openRef = useRef<string[]>([]);
  const lockedRef = useRef(false);
  const reportedRef = useRef(false);
  const flipBackRef = useRef<number | null>(null);
  const labelsRef = useRef(labels);

  const pairsTotal = deck.length / 2;
  const matchedPairs = matched.length / 2;
  const seconds = useElapsedSeconds(startedAt, !done);

  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

  const startRound = useCallback(() => {
    if (flipBackRef.current !== null) window.clearTimeout(flipBackRef.current);
    flipBackRef.current = null;
    openRef.current = [];
    lockedRef.current = false;
    reportedRef.current = false;

    setDeck(buildDeck(labelsRef.current));
    setOpen([]);
    setMatched([]);
    setMoves(0);
    setStartedAt(null);
    setDone(false);
    setRound((value) => value + 1);
  }, []);

  /** A different order — or a different set of dishes — deals a brand new board. */
  const boardKey = useMemo(() => `${seed}:${resolveLabels(labels).join('|')}`, [labels, seed]);
  const firstBoard = useRef(true);

  useEffect(() => {
    if (firstBoard.current) {
      firstBoard.current = false;
      return;
    }
    startRound();
  }, [boardKey, startRound]);

  /** Nothing should keep ticking (or flipping) after the board is left. */
  useEffect(
    () => () => {
      if (flipBackRef.current !== null) window.clearTimeout(flipBackRef.current);
    },
    [],
  );

  const flip = useCallback(
    (card: MemoryCard) => {
      if (done || lockedRef.current) return;
      if (openRef.current.length >= 2) return;
      if (openRef.current.includes(card.id) || matched.includes(card.id)) return;

      if (startedAt === null) setStartedAt(Date.now());
      sfx.tap();

      const next = [...openRef.current, card.id];
      openRef.current = next;
      setOpen(next);

      if (next.length < 2) return;

      const [firstId, secondId] = next;
      const first = deck.find((entry) => entry.id === firstId);
      const second = deck.find((entry) => entry.id === secondId);
      setMoves((value) => value + 1);

      if (first && second && first.pair === second.pair) {
        // A pair: keep both revealed and unlock straight away.
        setMatched((current) => [...current, firstId, secondId]);
        openRef.current = [];
        setOpen([]);
        sfx.coin();
        return;
      }

      // Not a pair: hold both face up, then turn them back over.
      lockedRef.current = true;
      sfx.remove();
      flipBackRef.current = window.setTimeout(() => {
        flipBackRef.current = null;
        lockedRef.current = false;
        openRef.current = [];
        setOpen([]);
      }, FLIP_BACK_MS);
    },
    [deck, done, matched, startedAt],
  );

  /** Reported exactly once per round, and only for a genuinely cleared board. */
  useEffect(() => {
    if (reportedRef.current || deck.length === 0 || matched.length < deck.length) return;

    reportedRef.current = true;
    lockedRef.current = true;
    setDone(true);
    sfx.success();
    onFinish({ moves, seconds });
  }, [deck.length, matched.length, moves, seconds, onFinish]);

  return (
    <div className="game">
      <header className="game__head">
        <div>
          <h3>Ticket match</h3>
          <p className="muted">
            Six pairs are on the pass. Flip two tickets at a time and remember where each dish is.
          </p>
        </div>
        <div className="game__hud">
          <span className="game__stat">
            <strong>
              {matchedPairs}/{pairsTotal}
            </strong>
            <small>pairs found</small>
          </span>
          <span className="game__stat">
            <strong>{moves}</strong>
            <small>moves</small>
          </span>
          <span className="game__stat">
            <strong>{seconds}s</strong>
            <small>on the clock</small>
          </span>
        </div>
      </header>

      <div className="memory-grid" key={round} data-pairs={pairsTotal}>
        {deck.map((card, index) => {
          const faceUp = open.includes(card.id) || matched.includes(card.id);
          const isMatched = matched.includes(card.id);

          return (
            <motion.button
              key={card.id}
              type="button"
              className={`memory-card${faceUp ? ' is-open' : ''}${isMatched ? ' is-matched' : ''}`}
              data-tone={card.pair % 3}
              aria-label={faceUp ? `${card.label}${isMatched ? ', matched' : ''}` : 'Hidden ticket'}
              aria-pressed={faceUp}
              aria-disabled={done || isMatched}
              onClick={() => flip(card)}
              initial={{ opacity: 0, scale: 0.94, rotateY: 180 }}
              animate={{ opacity: 1, scale: 1, rotateY: faceUp ? 0 : 180 }}
              transition={{ duration: 0.26, delay: Math.min(index * 0.015, 0.18) }}
            >
              <span className="memory-card__face">{faceUp ? card.label : 'EO'}</span>
            </motion.button>
          );
        })}
      </div>

      {done && (
        <div className="game__result memory-result">
          <div>
            <strong>Board cleared — all {pairsTotal} pairs found</strong>
            <p className="muted">
              {moves} {moves === 1 ? 'move' : 'moves'} · {seconds} seconds on the clock
            </p>
          </div>
          <Button variant="primary" onClick={startRound}>
            Play again
          </Button>
        </div>
      )}
    </div>
  );
}
