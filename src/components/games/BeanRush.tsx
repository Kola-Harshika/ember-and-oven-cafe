import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/sfx';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressRing';

const W = 420;
const H = 520;
const DURATION = 24;
const CUP_W = 104;
const CUP_H = 56;

interface Bean {
  x: number;
  y: number;
  vy: number;
  r: number;
  rot: number;
  spin: number;
  spoiled: boolean;
}

export interface BeanRushProps {
  /** called once when the round ends, with the number of beans caught */
  onFinish: (score: number) => void;
}

/**
 * Bean Rush — catch the falling coffee beans in the cup, dodge the burnt ones.
 * Pure canvas, no assets, identical on every screen.
 */
export function BeanRush({ onFinish }: BeanRushProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [hud, setHud] = useState({ score: 0, misses: 0, timeLeft: DURATION });

  const world = useRef({
    cupX: W / 2,
    beans: [] as Bean[],
    score: 0,
    misses: 0,
    endsAt: 0,
    lastSpawn: 0,
    last: 0,
    raf: 0,
    hudScore: -1,
    hudSeconds: DURATION,
  });

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = world.current;

    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#241b14');
    gradient.addColorStop(1, '#14100c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(240, 180, 41, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 34);
    ctx.lineTo(W, H - 34);
    ctx.stroke();

    for (const bean of w.beans) {
      ctx.save();
      ctx.translate(bean.x, bean.y);
      ctx.rotate(bean.rot);
      ctx.fillStyle = bean.spoiled ? '#5b4234' : '#8a5a3b';
      ctx.beginPath();
      ctx.ellipse(0, 0, bean.r, bean.r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = bean.spoiled ? '#3d2b21' : '#3c2417';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-bean.r * 0.5, 0);
      ctx.quadraticCurveTo(0, bean.r * 0.35, bean.r * 0.5, 0);
      ctx.stroke();
      ctx.restore();
    }

    const left = w.cupX - CUP_W / 2;
    const top = H - 34 - CUP_H;
    ctx.fillStyle = '#f6ead6';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left + CUP_W, top);
    ctx.lineTo(left + CUP_W - 14, H - 34);
    ctx.lineTo(left + 14, H - 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e2701f';
    ctx.fillRect(left, top - 8, CUP_W, 10);
    ctx.strokeStyle = 'rgba(30, 20, 12, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + 16, top + 14);
    ctx.lineTo(left + CUP_W - 16, top + 14);
    ctx.stroke();
  }, []);

  const finish = useCallback(() => {
    const w = world.current;
    window.cancelAnimationFrame(w.raf);
    setPhase('over');
    if (w.score > 0) sfx.success();
    else sfx.error();
    onFinish(w.score);
  }, [onFinish]);

  const loop = useCallback(
    (now: number) => {
      const w = world.current;
      if (!w.last) w.last = now;
      const dt = Math.min(0.048, (now - w.last) / 1000);
      w.last = now;

      const fall = 1 + Math.max(0, now - w.endsAt + DURATION * 1000) / 40000;

      for (const bean of w.beans) {
        bean.y += bean.vy * dt;
        bean.rot += bean.spin * dt;
      }

      if (now - w.lastSpawn > 430) {
        w.lastSpawn = now;
        w.beans.push({
          x: 46 + Math.random() * (W - 92),
          y: -18,
          vy: (125 + Math.random() * 95) * fall,
          r: 9 + Math.random() * 5,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 4,
          spoiled: Math.random() < 0.22,
        });
      }

      const cupTop = H - 34 - CUP_H;
      w.beans = w.beans.filter((bean) => {
        const reachingCup = bean.y + bean.r >= cupTop && bean.y < cupTop + 14;
        if (reachingCup) {
          const withinCup = Math.abs(bean.x - w.cupX) <= CUP_W / 2 - 6;
          if (withinCup) {
            if (bean.spoiled) {
              w.misses += 1;
              sfx.error();
            } else {
              w.score += 1;
              if (w.score % 4 === 0) sfx.coin();
              else sfx.tap();
            }
          } else if (!bean.spoiled) {
            w.misses += 1;
          }
          return false;
        }
        if (bean.y - bean.r > H) {
          if (!bean.spoiled) w.misses += 1;
          return false;
        }
        return true;
      });

      paint();

      const seconds = Math.max(0, Math.ceil((w.endsAt - now) / 1000));
      if (w.hudScore !== w.score || w.hudSeconds !== seconds) {
        w.hudScore = w.score;
        w.hudSeconds = seconds;
        setHud({ score: w.score, misses: w.misses, timeLeft: seconds });
      }

      if (now >= w.endsAt) {
        finish();
        return;
      }
      w.raf = requestAnimationFrame(loop);
    },
    [finish, paint],
  );

  const start = () => {
    const w = world.current;
    w.beans = [];
    w.score = 0;
    w.misses = 0;
    w.hudScore = -1;
    w.hudSeconds = DURATION;
    w.last = 0;
    w.lastSpawn = 0;
    w.cupX = W / 2;
    w.endsAt = performance.now() + DURATION * 1000;
    setHud({ score: 0, misses: 0, timeLeft: DURATION });
    setPhase('playing');
    sfx.add();
    w.raf = requestAnimationFrame(loop);
  };

  const moveCup = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const ratio = W / (box.width || W);
    const x = (clientX - box.left) * ratio;
    world.current.cupX = Math.min(W - CUP_W / 2, Math.max(CUP_W / 2, x));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (phase !== 'playing') return;
      const w = world.current;
      if (event.key === 'ArrowLeft') w.cupX = Math.max(CUP_W / 2, w.cupX - 26);
      if (event.key === 'ArrowRight') w.cupX = Math.min(W - CUP_W / 2, w.cupX + 26);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  useEffect(() => {
    paint();
    return () => window.cancelAnimationFrame(world.current.raf);
  }, [paint]);

  const reward = Math.min(60, hud.score * 3);

  return (
    <div className="game">
      <header className="game__head">
        <div>
          <h3>Bean Rush</h3>
          <p className="muted">Catch the beans in the cup — burnt crumbles cost you a miss.</p>
        </div>
        <div className="game__hud">
          <span className="game__stat">
            <strong>{hud.score}</strong>
            <small>caught</small>
          </span>
          <span className="game__stat">
            <strong>{hud.misses}</strong>
            <small>missed</small>
          </span>
          <span className="game__stat">
            <strong>{hud.timeLeft}s</strong>
            <small>left</small>
          </span>
        </div>
      </header>

      <ProgressBar progress={1 - hud.timeLeft / DURATION} />

      <div className="game__stage">
        <canvas
          ref={canvasRef}
          className="game__canvas"
          width={W}
          height={H}
          onPointerMove={(event) => moveCup(event.clientX)}
          onPointerDown={(event) => moveCup(event.clientX)}
        />
        {phase !== 'playing' && (
          <div className="game__overlay">
            {phase === 'ready' ? (
              <>
                <h4>Ready when you are</h4>
                <p className="muted">
                  Slide with your finger, or use the arrow keys. Twenty-four seconds on the clock.
                </p>
                <Button variant="primary" onClick={start}>
                  Start the rush
                </Button>
              </>
            ) : (
              <>
                <h4>{hud.score} beans in the cup</h4>
                <p className="muted">
                  That round is worth ₹{reward} off the bill. Play again for a better one — we keep your best.
                </p>
                <Button variant="quiet" onClick={start}>
                  Play again
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}