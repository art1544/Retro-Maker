import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socket } from '../lib/socket';
import { useSession } from '../lib/session';
import { columnMetaFromSpec } from '../lib/theme';
import type { BoardState, CursorInfo, GameEntry, Presence } from '../types';
import RetroCard from '../components/RetroCard';
import FreeItemView from '../components/FreeItemView';
import Cursors from '../components/Cursors';
import TimerBubble from '../components/TimerBubble';
import DynamicModal from '../components/DynamicModal';
import { fileToScaledDataURL, imageDims } from '../lib/image';

const COLS: { id: 'good' | 'improve' | 'action'; x: number }[] = [
  { id: 'good', x: 60 },
  { id: 'improve', x: 420 },
  { id: 'action', x: 780 },
];
const COL_W = 300;
const COL_Y = 40;
const COL_HEAD = COL_Y + 120; // where the first card sits (below title/hint/button)
const CARD_SLOT = 112; // vertical spacing between stacked cards

export default function BoardView() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useSession();
  const [board, setBoard] = useState<BoardState | null>(null);
  const [presence, setPresence] = useState<Presence>({ hostId: null, users: [] });
  const [cursors, setCursors] = useState<Record<string, CursorInfo>>({});
  const [view, setView] = useState({ x: 40, y: 20, scale: 1 });
  const [tool, setTool] = useState<'select' | 'text'>('select');
  const [showGame, setShowGame] = useState(false);
  const [toast, setToast] = useState('');
  const [showRegen, setShowRegen] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const isHost = presence.hostId === user?.id;
  const me = user!;

  // ---- socket wiring ----
  useEffect(() => {
    if (!id) return;
    const join = () => socket.emit('board:join', { boardId: id, user: me });
    if (socket.connected) join();
    socket.on('connect', join);
    socket.on('board:state', (b: BoardState) => setBoard(b));
    socket.on('presence', (p: Presence) => setPresence(p));
    socket.on('cursor', (c: Omit<CursorInfo, 't'>) =>
      setCursors((prev) => ({ ...prev, [c.userId]: { ...c, t: Date.now() } })));
    socket.on('error:msg', (m: string) => { setToast(m); });
    socket.on('spec:generating', (on: boolean) => {
      setRegenerating(on);
      if (!on) { setShowRegen(false); setRegenPrompt(''); }
    });
    return () => {
      socket.off('connect', join);
      socket.off('board:state');
      socket.off('presence');
      socket.off('cursor');
      socket.off('error:msg');
      socket.off('spec:generating');
    };
  }, [id]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t); }
  }, [toast]);

  // ---- coordinate helpers ----
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (sx - r.left - v.x) / v.scale, y: (sy - r.top - v.y) / v.scale };
  }, []);

  // ---- cursor emit (throttled) ----
  const lastEmit = useRef(0);
  const onStageMove = (e: React.MouseEvent) => {
    const now = performance.now();
    if (now - lastEmit.current < 40) return;
    lastEmit.current = now;
    const w = screenToWorld(e.clientX, e.clientY);
    socket.emit('cursor:move', w);
  };

  // ---- pan & zoom ----
  const [panning, setPanning] = useState(false);
  const onStageDown = (e: React.MouseEvent) => {
    if (e.target !== stageRef.current && !(e.target as HTMLElement).classList.contains('world')) {
      // clicked on a piece; let it handle
      if (tool !== 'text') return;
    }
    if (tool === 'text') {
      const w = screenToWorld(e.clientX, e.clientY);
      socket.emit('freeitem:create', {
        item: { type: 'text', content: 'Texto', x: w.x, y: w.y, w: 160, h: 40, color: me.color, fontSize: 24 },
      });
      setTool('select');
      return;
    }
    setPanning(true);
    const sx = e.clientX, sy = e.clientY, ox = view.x, oy = view.y;
    const move = (ev: MouseEvent) => setView((v) => ({ ...v, x: ox + (ev.clientX - sx), y: oy + (ev.clientY - sy) }));
    const up = () => { setPanning(false); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const r = stageRef.current!.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    setView((v) => {
      const scale = Math.min(2.2, Math.max(0.35, v.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
      const k = scale / v.scale;
      return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  };

  // ---- card actions ----
  const addCard = (columnId: 'good' | 'improve' | 'action') => {
    const col = COLS.find((c) => c.id === columnId)!;
    const count = Object.values(board?.cards || {}).filter((cd) => cd.columnId === columnId).length;
    socket.emit('card:create', {
      columnId,
      text: '',
      x: col.x + 40,
      y: COL_HEAD + count * CARD_SLOT,
    });
  };

  const dropCard = (cardId: string, x: number, y: number) => {
    // reclassify by nearest column center
    const center = x + 110;
    let best = COLS[0].id, dist = Infinity;
    for (const c of COLS) {
      const d = Math.abs(center - (c.x + COL_W / 2));
      if (d < dist) { dist = d; best = c.id; }
    }
    socket.emit('card:update', { id: cardId, patch: { x, y, columnId: best } });
  };

  // ---- images: upload + paste ----
  const fileRef = useRef<HTMLInputElement>(null);

  const viewCenterWorld = () => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return { x: 200, y: 200 };
    return screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
  };

  const placeImage = async (dataUrl: string, at?: { x: number; y: number }) => {
    const { w, h } = await imageDims(dataUrl, 280);
    const c = at || viewCenterWorld();
    socket.emit('freeitem:create', {
      item: { type: 'image', content: dataUrl, x: c.x - w / 2, y: c.y - h / 2, w, h, color: me.color },
    });
  };

  const addImageFiles = async (files: FileList | File[], at?: { x: number; y: number }) => {
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const url = await fileToScaledDataURL(f);
        await placeImage(url, at);
      } catch {
        setToast('Não consegui carregar essa imagem.');
      }
    }
  };

  // paste image from clipboard (Ctrl/Cmd+V)
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const imgs: File[] = [];
      for (const it of items) {
        if (it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) imgs.push(f);
        }
      }
      if (imgs.length) { e.preventDefault(); await addImageFiles(imgs); setToast('Imagem colada no board 🖼️'); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  if (!board) {
    return <div className="center-screen"><div className="card-panel" style={{ padding: 30 }}>Carregando board… ⛏️</div></div>;
  }

  const doneCount = board.doneUsers.length;
  const iAmDone = board.doneUsers.includes(me.id);
  const cards = Object.values(board.cards);
  const spec = board.spec;
  const M = columnMetaFromSpec(spec);

  return (
    <div style={{ height: '100%' }}>
      {/* top bar */}
      <div className="topbar">
        <button className="ghost sm" onClick={() => nav('/')}>←</button>
        <div className="brand" style={{ fontSize: 15 }}><span className="mini-block" /> {board.title}</div>
        <span className="pill">Retro {board.index}</span>
        <span className="pill" title={spec.tagline}>{spec.emoji} {spec.themeName}</span>
        {isHost && <button className="ghost sm" title="Regenerar tema e dinâmica com IA" onClick={() => setShowRegen(true)}>🎲</button>}
        <span className="pill" style={{ borderColor: board.phase === 'writing' ? '#f2a33c' : '#5db54a' }}>
          {board.phase === 'writing' ? '✍️ Preenchendo' : '👀 Revelado'}
        </span>
        <div className="spacer" />

        <div className="avatars">
          {presence.users.map((u) => (
            <div key={u.id} className="avatar" style={{ background: u.color, position: 'relative' }} title={u.name}>
              {u.name[0]?.toUpperCase()}
              {presence.hostId === u.id && <span className="crown">👑</span>}
            </div>
          ))}
        </div>
        {!isHost && <button className="ghost sm" onClick={() => socket.emit('host:claim')}>Assumir líder</button>}
        <button className="ghost sm" onClick={() => nav('/dashboard')}>📊</button>
      </div>

      {/* phase controls */}
      <div className="panel-float" style={{ top: 68, left: 14, padding: 10 }}>
        {board.phase === 'writing' ? (
          <div className="col" style={{ gap: 8 }}>
            <button className={iAmDone ? 'gold sm' : 'primary sm'} onClick={() => socket.emit('user:done', { done: !iAmDone })}>
              {iAmDone ? '✅ Terminei' : 'Marcar que terminei'}
            </button>
            <span className="muted" style={{ fontSize: 12 }}>{doneCount}/{presence.users.length} prontos</span>
            {isHost && (
              <button className="primary sm" onClick={() => socket.emit('phase:reveal')}>🎉 Revelar cards</button>
            )}
          </div>
        ) : (
          <div className="col" style={{ gap: 8 }}>
            <label className="row" style={{ fontSize: 13, gap: 6 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={board.showAuthors}
                disabled={!isHost}
                onChange={(e) => socket.emit('authors:toggle', { show: e.target.checked })} />
              Exibir quem escreveu
            </label>
            {isHost && <button className="ghost sm" onClick={() => socket.emit('phase:reset')}>↩️ Voltar a preencher</button>}
          </div>
        )}
      </div>

      {/* timer */}
      <TimerBubble
        timer={board.timer}
        isHost={isHost}
        onStart={(durationMs) => socket.emit('timer:start', { durationMs })}
        onPause={() => socket.emit('timer:pause')}
        onReset={(durationMs) => socket.emit('timer:reset', { durationMs })}
      />

      {/* hidden file input for image upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files) addImageFiles(e.target.files); e.target.value = ''; }}
      />

      {/* stage */}
      <div
        ref={stageRef}
        className={`stage ${panning ? 'panning' : ''}`}
        style={{ cursor: tool === 'text' ? 'text' : undefined }}
        onMouseDown={onStageDown}
        onMouseMove={onStageMove}
        onWheel={onWheel}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) {
            const at = screenToWorld(e.clientX, e.clientY);
            addImageFiles(e.dataTransfer.files, at);
          }
        }}
      >
        {/* theme tint from the board spec */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(1200px 620px at 82% -12%, ${spec.palette.bgTop}55, transparent 60%), radial-gradient(900px 520px at 0% 112%, ${spec.palette.bgBottom}55, transparent 55%)`,
        }} />
        <div className="world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
          {/* columns */}
          {COLS.map((c) => {
            const meta = M[c.id];
            const n = cards.filter((cd) => cd.columnId === c.id).length;
            // grow to fit at least 10 cards, and more as cards are added
            const height = Math.max(COL_HEAD - COL_Y + 10 * CARD_SLOT, COL_HEAD - COL_Y + (n + 1) * CARD_SLOT);
            return (
              <div key={c.id} className="column" style={{ left: c.x, top: COL_Y, minHeight: height, borderColor: meta.color }}>
                <div className="column-head" style={{ background: `${meta.color}22`, color: meta.color }}>
                  <span>{meta.emoji}</span> {meta.title} <span className="spacer" /> <span className="pill">{n}</span>
                </div>
                <div className="column-hint muted">{meta.hint}</div>
                <button className="sm" style={{ background: meta.color, width: '100%' }} onClick={() => addCard(c.id)}>
                  ＋ Adicionar card
                </button>
              </div>
            );
          })}

          {/* free items */}
          {Object.values(board.freeItems).map((it) => (
            <FreeItemView key={it.id} item={it} scale={view.scale}
              onUpdate={(iid, patch) => socket.emit('freeitem:update', { id: iid, patch })}
              onDelete={(iid) => socket.emit('freeitem:delete', { id: iid })} />
          ))}

          {/* cards */}
          {cards.map((card) => (
            <RetroCard key={card.id} card={card} meId={me.id} phase={board.phase} scale={view.scale}
              onDragEnd={dropCard}
              onEdit={(cid, text) => socket.emit('card:update', { id: cid, patch: { text } })}
              onDelete={(cid) => socket.emit('card:delete', { id: cid })}
              onReact={(cid, emoji) => socket.emit('card:react', { id: cid, emoji })} />
          ))}

          {/* live cursors (others) */}
          <Cursors cursors={cursors} />
        </div>
      </div>

      {/* toolbar */}
      <div className="toolbar">
        <button className={`tool ${tool === 'select' ? '' : ''}`} title="Mover/selecionar"
          style={{ outline: tool === 'select' ? '2px solid var(--grass)' : 'none' }} onClick={() => setTool('select')}>🖐️</button>
        <button className="tool" title="Adicionar texto" style={{ outline: tool === 'text' ? '2px solid var(--grass)' : 'none' }}
          onClick={() => setTool('text')}>🔤</button>
        <button className="tool" title="Enviar imagem/GIF (ou cole com Ctrl+V)" onClick={() => fileRef.current?.click()}>🖼️</button>
        <div style={{ width: 1, height: 28, background: 'var(--line)' }} />
        <button className="tool" title="Diminuir zoom" onClick={() => setView((v) => ({ ...v, scale: Math.max(0.35, v.scale * 0.9) }))}>➖</button>
        <span className="pill" style={{ minWidth: 44, textAlign: 'center' }}>{Math.round(view.scale * 100)}%</span>
        <button className="tool" title="Aumentar zoom" onClick={() => setView((v) => ({ ...v, scale: Math.min(2.2, v.scale * 1.1) }))}>➕</button>
        <button className="tool" title="Centralizar" onClick={() => setView({ x: 40, y: 20, scale: 1 })}>🎯</button>
        <div style={{ width: 1, height: 28, background: 'var(--line)' }} />
        <button className="gold sm" title={spec.dynamic.instructions} onClick={() => {
          if (!board.game.active && isHost) socket.emit('game:toggle', { active: true });
          setShowGame(true);
        }}>{spec.dynamic.emoji} {spec.dynamic.title}</button>
      </div>

      {showGame && (
        <DynamicModal
          dynamic={spec.dynamic}
          entries={board.game.entries}
          meId={me.id}
          isHost={isHost}
          onSubmit={(payload: GameEntry['payload']) => socket.emit('game:setEntry', { payload })}
          onReveal={(uid) => socket.emit('game:revealEntry', { userId: uid })}
          onClose={() => setShowGame(false)}
          onStop={() => { socket.emit('game:toggle', { active: false }); setShowGame(false); }}
        />
      )}

      {showRegen && (
        <div className="modal-back" onClick={() => !regenerating && setShowRegen(false)}>
          <div className="card-panel modal" style={{ width: 'min(460px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
            {regenerating ? (
              <div style={{ textAlign: 'center', padding: 10 }}>
                <div style={{ fontSize: 34 }}>🤖✨</div>
                <b>Regenerando tema e dinâmica...</b>
                <p className="muted" style={{ margin: '6px 0 0' }}>Todos no board vão ver o novo tema em instantes.</p>
              </div>
            ) : (
              <>
                <div className="row">
                  <h2 style={{ margin: 0 }}>🎲 Regenerar tema</h2>
                  <div className="spacer" />
                  <button className="ghost sm" onClick={() => setShowRegen(false)}>Fechar</button>
                </div>
                <p className="muted" style={{ marginTop: 4 }}>
                  Gera um tema e uma dinâmica novos para <b>este board</b> (some as respostas da dinâmica atual). Deixe em branco pra IA escolher.
                </p>
                <input
                  autoFocus
                  placeholder="Tema (ex.: Senhor dos Anéis, Barbie, anos 80...)"
                  value={regenPrompt}
                  onChange={(e) => setRegenPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && socket.emit('spec:regenerate', { prompt: regenPrompt.trim() })}
                />
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="primary" onClick={() => socket.emit('spec:regenerate', { prompt: regenPrompt.trim() })}>✨ Gerar novo tema</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
