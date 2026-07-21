import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/session';
import { PALETTE } from '../lib/theme';

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Login({ redirectTo = '/' }: { redirectTo?: string }) {
  const { setUser } = useSession();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[3]);

  const enter = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUser({ id: makeId(), name: trimmed, color });
    nav(redirectTo || '/', { replace: true });
  };

  return (
    <div className="center-screen">
      <div className="card-panel login-box">
        <div className="logo-badge" />
        <h1 style={{ margin: '4px 0 2px', fontSize: 26 }}>RetroMaker</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Retros divertidas com <b>tema e dinâmica gerados por IA</b> 🤖 a cada board.
        </p>

        <div className="col" style={{ marginTop: 18, textAlign: 'left' }}>
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Seu nome</div>
            <input
              autoFocus
              placeholder="Ex.: Steve, Alex, Arthur..."
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enter()}
            />
          </label>

          <div>
            <div className="muted" style={{ margin: '10px 0 8px' }}>Escolha sua cor</div>
            <div className="swatches">
              {PALETTE.map((c) => (
                <div
                  key={c}
                  className={`swatch ${c === color ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="row" style={{ marginTop: 8, gap: 12 }}>
            <div
              className="avatar"
              style={{ background: color, width: 40, height: 40, fontSize: 15, marginLeft: 0 }}
            >
              {(name.trim()[0] || '?').toUpperCase()}
            </div>
            <span className="muted">É assim que o time vai te ver — cursor, cards e balões nessa cor.</span>
          </div>

          <button className="primary" style={{ marginTop: 14, padding: '12px' }} onClick={enter} disabled={!name.trim()}>
            Entrar na retro ⛏️
          </button>
        </div>
      </div>
    </div>
  );
}
