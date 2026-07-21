import type { CursorInfo } from '../types';

export default function Cursors({ cursors }: { cursors: Record<string, CursorInfo> }) {
  const now = Date.now();
  return (
    <>
      {Object.values(cursors)
        .filter((c) => now - c.t < 8000)
        .map((c) => (
          <div key={c.userId} className="cursor" style={{ left: c.x, top: c.y }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 2 L4 20 L9 15 L12.5 22 L15 21 L11.5 14 L18 14 Z"
                fill={c.color} stroke="#fff" strokeWidth="1.2" />
            </svg>
            <span className="tag" style={{ background: c.color }}>{c.name}</span>
          </div>
        ))}
    </>
  );
}
