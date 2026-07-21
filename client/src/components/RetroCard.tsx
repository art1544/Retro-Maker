import { useEffect, useRef, useState } from 'react';
import type { Card } from '../types';
import { REACTION_EMOJIS } from '../lib/theme';

interface Props {
  card: Card;
  meId: string;
  phase: 'writing' | 'revealed';
  scale: number;
  onDragEnd: (id: string, x: number, y: number) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
}

// text color contrast against a hex background
function ink(bg: string) {
  const h = bg.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#17202e' : '#fff';
}

export default function RetroCard({ card, meId, phase, scale, onDragEnd, onEdit, onDelete, onReact }: Props) {
  const mine = card.authorId === meId;
  const facedown = !!card.hidden;
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(mine && phase === 'writing' && !card.text);
  const [showEmoji, setShowEmoji] = useState(false);
  const [text, setText] = useState(card.text || '');
  const start = useRef({ mx: 0, my: 0, x: 0, y: 0, moved: false });

  useEffect(() => { if (!editing) setText(card.text || ''); }, [card.text, editing]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (editing || facedown && false) { /* facedown can still be dragged */ }
    if ((e.target as HTMLElement).closest('textarea,button,.no-drag')) return;
    e.stopPropagation();
    start.current = { mx: e.clientX, my: e.clientY, x: card.x, y: card.y, moved: false };
    setDragging(true);
    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - start.current.mx) / scale;
      const dy = (ev.clientY - start.current.my) / scale;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) start.current.moved = true;
      const el = ref.current;
      if (el) { el.style.left = `${start.current.x + dx}px`; el.style.top = `${start.current.y + dy}px`; }
    };
    const up = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setDragging(false);
      const dx = (ev.clientX - start.current.mx) / scale;
      const dy = (ev.clientY - start.current.my) / scale;
      if (start.current.moved) onDragEnd(card.id, start.current.x + dx, start.current.y + dy);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const ref = useRef<HTMLDivElement>(null);
  const bg = card.color || '#f5d442';
  const fg = ink(bg);

  const commit = () => { setEditing(false); if (text !== card.text) onEdit(card.id, text); };

  if (facedown) {
    return (
      <div ref={ref} className={`retro-card facedown ${dragging ? 'dragging' : ''}`}
        style={{ left: card.x, top: card.y, borderColor: card.color }} onMouseDown={onMouseDown}>
        <span style={{ fontSize: 22 }}>🔒</span>
      </div>
    );
  }

  return (
    <div ref={ref} className={`retro-card ${dragging ? 'dragging' : ''}`}
      style={{ left: card.x, top: card.y, background: bg, color: fg }} onMouseDown={onMouseDown}>
      {editing ? (
        <textarea autoFocus value={text} rows={3} className="no-drag"
          style={{ background: 'rgba(255,255,255,0.6)', color: '#17202e', border: 'none' }}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit(); }} />
      ) : (
        <div className="rc-text" onDoubleClick={() => mine && setEditing(true)}>
          {card.text || <span style={{ opacity: 0.5 }}>(vazio — duplo clique p/ editar)</span>}
        </div>
      )}

      <div className="rc-foot">
        {Object.entries(card.reactions || {}).map(([emo, users]) => (
          <span key={emo} className="react-chip" title={`${users.length}`}>
            {emo} {users.length}
          </span>
        ))}
        <div className="spacer" />
        <div style={{ position: 'relative' }}>
          <button className="react-btn no-drag" onClick={() => setShowEmoji((s) => !s)}>😀＋</button>
          {showEmoji && (
            <div className="emoji-pop no-drag">
              {REACTION_EMOJIS.map((e) => (
                <button key={e} onClick={() => { onReact(card.id, e); setShowEmoji(false); }}>{e}</button>
              ))}
            </div>
          )}
        </div>
        {(mine) && <button className="react-btn no-drag" onClick={() => onDelete(card.id)} title="Excluir">🗑️</button>}
      </div>

      {card.authorName && <div className="rc-author" style={{ color: fg }}>— {card.authorName}</div>}
    </div>
  );
}
