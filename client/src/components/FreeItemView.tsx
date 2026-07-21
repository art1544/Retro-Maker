import { useRef, useState } from 'react';
import type { FreeItem } from '../types';

interface Props {
  item: FreeItem;
  scale: number;
  onUpdate: (id: string, patch: Partial<FreeItem>) => void;
  onDelete: (id: string) => void;
}

export default function FreeItemView({ item, scale, onUpdate, onDelete }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.content);

  const drag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-h,.item-del,textarea')) return;
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, ox = item.x, oy = item.y;
    let nx = ox, ny = oy;
    const move = (ev: MouseEvent) => {
      nx = ox + (ev.clientX - sx) / scale;
      ny = oy + (ev.clientY - sy) / scale;
      if (ref.current) { ref.current.style.left = `${nx}px`; ref.current.style.top = `${ny}px`; }
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      onUpdate(item.id, { x: nx, y: ny });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const resize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, ow = item.w, oh = item.h;
    let nw = ow, nh = oh;
    const move = (ev: MouseEvent) => {
      nw = Math.max(40, ow + (ev.clientX - sx) / scale);
      nh = Math.max(30, oh + (ev.clientY - sy) / scale);
      if (ref.current) { ref.current.style.width = `${nw}px`; ref.current.style.height = `${nh}px`; }
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      const patch: Partial<FreeItem> = { w: nw, h: nh };
      if (item.type === 'text') patch.fontSize = Math.max(12, Math.round(nh * 0.6));
      onUpdate(item.id, patch);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div
      ref={ref}
      className="free-item"
      style={{ left: item.x, top: item.y, width: item.w, height: item.h, cursor: 'grab' }}
      onMouseDown={drag}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {item.type === 'text' ? (
        editing ? (
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => { setEditing(false); onUpdate(item.id, { content: text }); }}
            style={{ width: '100%', height: '100%', fontSize: item.fontSize || 22, color: item.color, background: 'rgba(0,0,0,0.25)' }}
          />
        ) : (
          <div
            className="free-text"
            style={{ fontSize: item.fontSize || 22, color: item.color, width: '100%', height: '100%' }}
            onDoubleClick={() => setEditing(true)}
          >
            {item.content}
          </div>
        )
      ) : (
        <img src={item.content} alt="" draggable={false} onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.3')} />
      )}

      {hover && (
        <>
          <button className="item-del" onClick={() => onDelete(item.id)}>✕</button>
          <div className="resize-h" onMouseDown={resize} />
        </>
      )}
    </div>
  );
}
