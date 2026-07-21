import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLUMN_META } from '../lib/theme';

interface DashBoard {
  id: string;
  index: number;
  title: string;
  createdAt: number;
  cards: { id: string; columnId: 'good' | 'improve' | 'action'; text: string }[];
}

type Mode = 'all' | 'range' | 'pick';

export default function Dashboard() {
  const nav = useNavigate();
  const [data, setData] = useState<DashBoard[]>([]);
  const [mode, setMode] = useState<Mode>('all');
  const [from, setFrom] = useState<number>(1);
  const [to, setTo] = useState<number>(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d: DashBoard[]) => {
        setData(d);
        if (d.length) { setFrom(d[0].index); setTo(d[d.length - 1].index); }
      });
  }, []);

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filtered = useMemo(() => {
    if (mode === 'all') return data;
    if (mode === 'range') return data.filter((b) => b.index >= Math.min(from, to) && b.index <= Math.max(from, to));
    return data.filter((b) => picked.has(b.id));
  }, [data, mode, from, to, picked]);

  const totals = useMemo(() => {
    const t = { good: 0, improve: 0, action: 0 };
    for (const b of filtered) for (const c of b.cards) t[c.columnId]++;
    return t;
  }, [filtered]);

  const grand = totals.good + totals.improve + totals.action || 1;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <div className="brand"><span className="mini-block" /> RetroMaker</div>
        <div className="spacer" />
        <button className="ghost sm" onClick={() => nav('/')}>← Boards</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px clamp(16px, 5vw, 60px)' }}>
        <h1 style={{ marginTop: 0 }}>📊 Dashboard de métricas</h1>
        <p className="muted">Contagem de cards por tipo, agregada nas retros que você escolher.</p>

        <div className="card-panel" style={{ padding: 16, marginBottom: 20 }}>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button className={mode === 'all' ? 'primary sm' : 'ghost sm'} onClick={() => setMode('all')}>Todas as retros</button>
            <button className={mode === 'range' ? 'primary sm' : 'ghost sm'} onClick={() => setMode('range')}>Intervalo</button>
            <button className={mode === 'pick' ? 'primary sm' : 'ghost sm'} onClick={() => setMode('pick')}>Selecionar específicas</button>
          </div>

          {mode === 'range' && (
            <div className="row" style={{ marginTop: 12, gap: 12, maxWidth: 320 }}>
              <label className="col" style={{ flex: 1 }}>
                <span className="muted" style={{ fontSize: 12 }}>Da Retro</span>
                <input type="number" min={1} value={from} onChange={(e) => setFrom(+e.target.value)} />
              </label>
              <label className="col" style={{ flex: 1 }}>
                <span className="muted" style={{ fontSize: 12 }}>Até a Retro</span>
                <input type="number" min={1} value={to} onChange={(e) => setTo(+e.target.value)} />
              </label>
            </div>
          )}

          {mode === 'pick' && (
            <div className="row" style={{ marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
              {data.map((b) => (
                <button
                  key={b.id}
                  className={picked.has(b.id) ? 'gold sm' : 'ghost sm'}
                  onClick={() => togglePick(b.id)}
                >
                  Retro {b.index}
                </button>
              ))}
              {data.length === 0 && <span className="muted">Sem boards.</span>}
            </div>
          )}
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', marginBottom: 20 }}>
          {(['good', 'improve', 'action'] as const).map((k) => (
            <div key={k} className="card-panel stat" style={{ borderTop: `4px solid ${COLUMN_META[k].color}` }}>
              <div style={{ fontSize: 28 }}>{COLUMN_META[k].emoji}</div>
              <div className="badge-count" style={{ color: COLUMN_META[k].color }}>{totals[k]}</div>
              <div className="muted">{COLUMN_META[k].title}</div>
            </div>
          ))}
          <div className="card-panel stat">
            <div style={{ fontSize: 28 }}>🧱</div>
            <div className="badge-count">{filtered.length}</div>
            <div className="muted">Retros analisadas</div>
          </div>
        </div>

        <div className="card-panel" style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Distribuição</h3>
          {(['good', 'improve', 'action'] as const).map((k) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <div className="row" style={{ marginBottom: 6, fontSize: 13 }}>
                <span>{COLUMN_META[k].emoji} {COLUMN_META[k].title}</span>
                <div className="spacer" />
                <span className="muted">{totals[k]} ({Math.round((totals[k] / grand) * 100)}%)</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(totals[k] / grand) * 100}%`, background: COLUMN_META[k].color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card-panel" style={{ padding: 20, marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>Por retro</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                  <th style={{ padding: '8px 6px' }}>Retro</th>
                  <th>Título</th>
                  <th>{COLUMN_META.good.emoji}</th>
                  <th>{COLUMN_META.improve.emoji}</th>
                  <th>{COLUMN_META.action.emoji}</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const c = { good: 0, improve: 0, action: 0 };
                  b.cards.forEach((card) => c[card.columnId]++);
                  return (
                    <tr key={b.id} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '8px 6px' }}>#{b.index}</td>
                      <td>{b.title}</td>
                      <td>{c.good}</td>
                      <td>{c.improve}</td>
                      <td>{c.action}</td>
                      <td><b>{b.cards.length}</b></td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="muted" style={{ padding: 12 }}>Nenhuma retro no filtro atual.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
