import { useState } from 'react';
import type { BoardSpec, GameEntry } from '../types';

interface Props {
  dynamic: BoardSpec['dynamic'];
  entries: Record<string, GameEntry>;
  meId: string;
  isHost: boolean;
  onSubmit: (payload: GameEntry['payload']) => void;
  onReveal: (userId: string) => void;
  onClose: () => void;
  onStop: () => void;
}

const LABELS = ['A', 'B', 'C'];

export default function DynamicModal({ dynamic, entries, meId, isHost, onSubmit, onReveal, onClose, onStop }: Props) {
  const mine = entries[meId];
  const fmt = dynamic.format;

  // form state per format
  const [stmts, setStmts] = useState<string[]>(mine?.payload?.statements || ['', '', '']);
  const [lie, setLie] = useState<number>(mine?.payload?.lieIndex ?? 0);
  const [answer, setAnswer] = useState<string>(mine?.payload?.answer || '');
  const [choice, setChoice] = useState<string>(mine?.payload?.choice || '');

  const submit = () => {
    if (fmt === 'two-truths') {
      if (stmts.some((s) => !s.trim())) return alert('Escreva as 3 histórias.');
      onSubmit({ statements: stmts.map((s) => s.trim()), lieIndex: lie });
    } else if (fmt === 'prompt-response') {
      if (!answer.trim()) return alert('Escreva sua resposta.');
      onSubmit({ answer: answer.trim() });
    } else {
      if (!choice) return alert('Escolha uma opção.');
      onSubmit({ choice });
    }
  };

  const others = Object.entries(entries).filter(([uid]) => uid !== meId);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="card-panel modal" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 style={{ margin: 0 }}>{dynamic.emoji} {dynamic.title}</h2>
          <span className="pill">⏱️ {dynamic.durationMin} min</span>
          <div className="spacer" />
          <button className="ghost sm" onClick={onClose}>Fechar</button>
        </div>
        {dynamic.goal && (
          <div className="pill" style={{ display: 'inline-block', marginTop: 6, borderColor: 'var(--grass)' }}>🎯 {dynamic.goal}</div>
        )}
        <p className="muted" style={{ marginTop: 8 }}>{dynamic.instructions}</p>

        {dynamic.steps && dynamic.steps.length > 0 && (
          <div className="card-panel" style={{ padding: '10px 14px', background: 'var(--panel-2)', marginBottom: 12 }}>
            <b style={{ fontSize: 13 }}>Como conduzir ({dynamic.durationMin} min)</b>
            <ol style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
              {dynamic.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        )}

        {/* --- meu formulário --- */}
        <div className="card-panel" style={{ padding: 14, background: 'var(--panel-2)' }}>
          <b>Sua vez {mine?.locked ? '✅ enviado' : ''}</b>

          {fmt === 'two-truths' && (
            <>
              {stmts.map((val, i) => (
                <div key={i} className="row" style={{ marginTop: 8 }}>
                  <span className="pill">{LABELS[i]}</span>
                  <input value={val} placeholder={`História ${LABELS[i]}`}
                    onChange={(e) => setStmts((p) => p.map((v, j) => (j === i ? e.target.value : v)))} />
                  <label className="row" style={{ gap: 4, whiteSpace: 'nowrap', fontSize: 12 }}>
                    <input type="radio" style={{ width: 'auto' }} checked={lie === i} onChange={() => setLie(i)} /> mentira
                  </label>
                </div>
              ))}
            </>
          )}

          {fmt === 'prompt-response' && (
            <div style={{ marginTop: 8 }}>
              <div className="pill" style={{ display: 'inline-block', marginBottom: 8 }}>❓ {dynamic.prompt}</div>
              <textarea rows={3} value={answer} placeholder="Sua resposta (fica secreta até o líder revelar)"
                onChange={(e) => setAnswer(e.target.value)} />
            </div>
          )}

          {fmt === 'scale-rating' && (
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>{dynamic.scale?.label}</div>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {dynamic.scale?.options.map((o) => (
                  <button key={o} className={choice === o ? 'gold sm' : 'ghost sm'} onClick={() => setChoice(o)}>{o}</button>
                ))}
              </div>
            </div>
          )}

          <button className="primary sm" style={{ marginTop: 10 }} onClick={submit}>
            {mine?.locked ? 'Atualizar' : 'Enviar'}
          </button>
        </div>

        {/* --- respostas do time --- */}
        <h3 style={{ marginBottom: 6 }}>Respostas do time</h3>
        {others.length === 0 && <p className="muted">Aguardando o pessoal enviar...</p>}
        <div className="col">
          {others.map(([uid, e]) => (
            <div key={uid} className="card-panel" style={{ padding: 12, borderLeft: `4px solid ${e.authorColor}` }}>
              <div className="row">
                <b>{e.authorName}</b>
                <div className="spacer" />
                {e.revealed ? <span className="pill" style={{ borderColor: '#5db54a' }}>revelado</span>
                  : (isHost && <button className="gold sm" onClick={() => onReveal(uid)}>Revelar</button>)}
              </div>

              {fmt === 'two-truths' && (
                (e.payload?.statements?.length ? (
                  e.payload.statements.map((story, i) => (
                    <div key={i} className="row" style={{ marginTop: 6, alignItems: 'flex-start' }}>
                      <span className="pill">{LABELS[i]}</span>
                      <span style={{ flex: 1 }}>{story}</span>
                      {e.revealed && (
                        <span className="pill" style={{ borderColor: e.payload?.lieIndex === i ? '#e23b3b' : '#5db54a' }}>
                          {e.payload?.lieIndex === i ? '🧨 mentira' : '✅ verdade'}
                        </span>
                      )}
                    </div>
                  ))
                ) : <span className="muted">ainda não enviou</span>)
              )}

              {fmt === 'prompt-response' && (
                e.revealed ? <div style={{ marginTop: 6 }}>{e.payload?.answer}</div>
                  : <div className="muted" style={{ marginTop: 6 }}>🔒 resposta secreta até revelar</div>
              )}

              {fmt === 'scale-rating' && (
                e.revealed ? <div style={{ marginTop: 6 }} className="pill">{e.payload?.choice}</div>
                  : <div className="muted" style={{ marginTop: 6 }}>🔒 escolha secreta até revelar</div>
              )}
            </div>
          ))}
        </div>

        {isHost && (
          <div className="row" style={{ marginTop: 16 }}>
            <button className="danger sm" onClick={onStop}>Encerrar dinâmica</button>
          </div>
        )}
      </div>
    </div>
  );
}
