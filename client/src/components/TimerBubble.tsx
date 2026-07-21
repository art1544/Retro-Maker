import { useEffect, useState } from 'react';
import type { Timer } from '../types';

interface Props {
  timer: Timer;
  isHost: boolean;
  onStart: (durationMs?: number) => void;
  onPause: () => void;
  onReset: (durationMs?: number) => void;
}

const PRESETS = [
  { label: '5 min', ms: 5 * 60 * 1000 },
  { label: '10 min', ms: 10 * 60 * 1000 },
  { label: '15 min', ms: 15 * 60 * 1000 },
];

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function TimerBubble({ timer, isHost, onStart, onPause, onReset }: Props) {
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!timer.running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [timer.running]);

  const remaining = timer.running ? timer.endsAt - now : (timer.remainingMs || timer.durationMs);
  const done = timer.running && remaining <= 0;
  const total = timer.durationMs || 1;
  const pct = Math.max(0, Math.min(100, (Math.max(0, remaining) / total) * 100));
  const danger = remaining <= 30_000 && remaining > 0;

  return (
    <div className="card-panel timer-bubble">
      <div className="row">
        <span style={{ fontSize: 18 }}>⏱️</span>
        <b style={{ fontSize: 13 }}>Timer</b>
        <div className="spacer" />
        {isHost && <button className="ghost sm" onClick={() => setOpen((o) => !o)}>⚙️</button>}
      </div>

      <div className="timer-face" style={{ color: done ? 'var(--danger)' : danger ? '#f2a33c' : 'var(--text)' }}>
        {done ? '⛏️ Tempo!' : fmt(remaining)}
      </div>
      <div className="bar-track" style={{ marginTop: 6 }}>
        <div className="bar-fill" style={{ width: `${pct}%`, background: danger ? '#f2a33c' : 'var(--grass)', transition: 'width .25s linear' }} />
      </div>

      {isHost && (
        <>
          <div className="row" style={{ marginTop: 10, gap: 6 }}>
            {timer.running ? (
              <button className="gold sm" onClick={onPause}>⏸ Pausar</button>
            ) : (
              <button className="primary sm" onClick={() => onStart()}>▶ {timer.remainingMs > 0 ? 'Continuar' : 'Iniciar'}</button>
            )}
            <button className="ghost sm" onClick={() => onReset()}>↺ Zerar</button>
          </div>
          {open && (
            <div className="row" style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
              {PRESETS.map((p) => (
                <button key={p.ms} className="ghost sm" onClick={() => onStart(p.ms)}>{p.label}</button>
              ))}
            </div>
          )}
        </>
      )}
      {!isHost && <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>O líder controla o timer.</div>}
    </div>
  );
}
