import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/session';
import type { BoardSummary } from '../types';
import { COLUMN_META } from '../lib/theme';

export default function BoardList() {
  const { user, setUser } = useSession();
  const nav = useNavigate();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const refresh = () => {
    fetch('/api/boards')
      .then((r) => r.json())
      .then((b) => setBoards(b))
      .catch(() => setBoards([]))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const create = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || undefined, prompt: prompt.trim() || undefined }),
      });
      const board = await res.json();
      nav(`/board/${board.id}`);
    } catch {
      setGenerating(false);
      alert('Não consegui criar o board. O servidor está rodando?');
    }
  };

  const del = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Excluir este board? Não dá pra desfazer.')) return;
    await fetch(`/api/boards/${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <div className="brand"><span className="mini-block" /> RetroMaker</div>
        <div className="spacer" />
        <button className="ghost sm" onClick={() => nav('/dashboard')}>📊 Dashboard</button>
        <div className="avatar" style={{ background: user?.color, marginLeft: 4 }}>{user?.name[0]?.toUpperCase()}</div>
        <button className="ghost sm" onClick={() => setUser(null)}>Sair</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px clamp(16px, 5vw, 60px)' }}>
        <div className="row" style={{ marginBottom: 4 }}>
          <h1 style={{ margin: 0 }}>Suas retrospectivas</h1>
          <span className="pill">Tema gerado por IA 🤖</span>
        </div>
        <p className="muted" style={{ marginTop: 4 }}>Cada retro ganha um tema e uma dinâmica novos, gerados por IA. Tudo fica salvo para histórico e dashboard.</p>

        <div style={{ margin: '18px 0', maxWidth: 560 }}>
          {creating ? (
            generating ? (
              <div className="card-panel" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>🤖✨</div>
                <b>Gerando tema e dinâmica...</b>
                <p className="muted" style={{ margin: '6px 0 0' }}>A IA está montando um board temático novinho. Pode levar alguns segundos.</p>
              </div>
            ) : (
              <div className="col" style={{ gap: 10 }}>
                <input
                  autoFocus
                  placeholder="Título (ex.: Retro Sprint 42)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <input
                  placeholder="Tema (opcional) — ex.: Star Wars, Senhor dos Anéis... ou deixe a IA escolher"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && create()}
                />
                <div className="row">
                  <button className="primary" onClick={create}>✨ Gerar retro</button>
                  <button className="ghost" onClick={() => setCreating(false)}>Cancelar</button>
                </div>
              </div>
            )
          ) : (
            <button className="primary" onClick={() => setCreating(true)}>➕ Nova retro</button>
          )}
        </div>

        {loading ? (
          <p className="muted">Carregando...</p>
        ) : boards.length === 0 ? (
          <div className="card-panel" style={{ padding: 28, textAlign: 'center', maxWidth: 520 }}>
            <div style={{ fontSize: 42 }}>🧱</div>
            <h3>Nenhum board ainda</h3>
            <p className="muted">Comece criando sua primeira retro temática.</p>
          </div>
        ) : (
          <div className="grid">
            {boards.map((b) => (
              <div key={b.id} className="card-panel board-tile" onClick={() => nav(`/board/${b.id}`)}>
                <div className="row">
                  <span className="pill">Retro {b.index}</span>
                  <div className="spacer" />
                  {b.phase === 'writing' ? <span className="pill" style={{ borderColor: '#f2a33c' }}>✍️ em aberto</span>
                    : <span className="pill" style={{ borderColor: '#5db54a' }}>✅ revelada</span>}
                </div>
                <h3 style={{ margin: '10px 0 2px' }}>{b.title}</h3>
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  {b.themeEmoji || '🧱'} {b.theme}{b.dynamicTitle ? ` · ${b.dynamicTitle}` : ''}
                </div>
                <div className="row" style={{ gap: 12, fontSize: 13 }}>
                  <span>{COLUMN_META.good.emoji} {b.counts.good}</span>
                  <span>{COLUMN_META.improve.emoji} {b.counts.improve}</span>
                  <span>{COLUMN_META.action.emoji} {b.counts.action}</span>
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {new Date(b.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="spacer" />
                  <button className="ghost sm" onClick={(e) => del(e, b.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
