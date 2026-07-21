// BoardSpec: normalização, validação e banco de fallbacks.
// Ver docs/BOARD_SPEC_CONSTITUTION.md — este arquivo é a implementação do contrato.

export const DYNAMIC_FORMATS = ['two-truths', 'prompt-response', 'scale-rating'];

const HEX = /^#([0-9a-fA-F]{6})$/;
const firstEmoji = (s, fallback) => {
  if (typeof s !== 'string') return fallback;
  const m = [...s].find((ch) => /\p{Extended_Pictographic}/u.test(ch));
  return m || fallback;
};
const str = (v, max, fallback) => {
  const s = (typeof v === 'string' ? v : '').trim().replace(/\s+/g, ' ');
  if (!s) return fallback;
  return s.length > max ? s.slice(0, max) : s;
};
const hex = (v, fallback) => (typeof v === 'string' && HEX.test(v.trim()) ? v.trim() : fallback);
const clampInt = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ---------- Fallback theme bank (usado quando a IA falha ou não há internet) ----------
export const FALLBACK_SPECS = [
  {
    themeName: 'Minecraft',
    tagline: 'Mine os aprendizados, blocode a próxima sprint',
    emoji: '⛏️',
    palette: { bgTop: '#7ec0ee', bgBottom: '#5b8731', good: '#5db54a', improve: '#f2a33c', action: '#3a86ff' },
    columns: {
      good: { title: 'O que foi bom', emoji: '💎', hint: 'Diamantes que a gente minerou' },
      improve: { title: 'O que pode melhorar', emoji: '🧨', hint: 'Creepers que atrapalharam' },
      action: { title: 'Ações', emoji: '🧱', hint: 'Crafting da próxima sprint' },
    },
    dynamic: {
      format: 'two-truths', title: 'Creeper ou Amigo?', emoji: '🧨',
      instructions: 'Escreva 2 histórias verdadeiras e 1 falsa sobre você. O time adivinha qual é o Creeper (a mentira)!',
      durationMin: 12,
    },
  },
  {
    themeName: 'Divertidamente',
    tagline: 'Toda sprint tem suas emoções',
    emoji: '🎭',
    palette: { bgTop: '#ffd54a', bgBottom: '#6a5acd', good: '#ffd54a', improve: '#4aa3ff', action: '#e23b3b' },
    columns: {
      good: { title: 'Alegria', emoji: '😄', hint: 'O que trouxe alegria pro time' },
      improve: { title: 'Tristeza', emoji: '😢', hint: 'O que deixou a sprint pra baixo' },
      action: { title: 'Raiva → Ação', emoji: '😤', hint: 'Vamos transformar em atitude' },
    },
    dynamic: {
      format: 'scale-rating', title: 'Qual foi seu Divertidamente?', emoji: '🎭',
      instructions: 'Cada pessoa escolhe qual emoção dominou sua sprint. Revelamos juntos e comentamos o porquê!',
      durationMin: 10,
      scale: { label: 'Qual emoção dominou sua sprint?', options: ['Alegria', 'Tristeza', 'Raiva', 'Medo', 'Nojinho', 'Ansiedade'] },
    },
  },
  {
    themeName: 'Espacial',
    tagline: 'Rumo ao infinito e além da sprint',
    emoji: '🚀',
    palette: { bgTop: '#0b1020', bgBottom: '#1a2340', good: '#4aa3ff', improve: '#f2b705', action: '#e23b3b' },
    columns: {
      good: { title: 'Combustível', emoji: '⛽', hint: 'O que nos impulsionou' },
      improve: { title: 'Buracos negros', emoji: '🕳️', hint: 'O que nos sugou de energia' },
      action: { title: 'Próxima órbita', emoji: '🛰️', hint: 'Rota da próxima missão' },
    },
    dynamic: {
      format: 'prompt-response', title: 'Tripulante do dia', emoji: '👩‍🚀',
      instructions: 'Responda em 1 card, privado até a revelação. Depois o líder revela todas as respostas da tripulação!',
      durationMin: 10,
      prompt: 'Se a sprint fosse uma missão espacial, qual seria o seu papel na tripulação e por quê?',
    },
  },
];

export function randomFallback() {
  return structuredClone(FALLBACK_SPECS[Math.floor(Math.random() * FALLBACK_SPECS.length)]);
}

export const DEFAULT_SPEC = FALLBACK_SPECS[0];

// ---------- Normalização: transforma QUALQUER entrada num spec seguro ----------
export function normalizeSpec(input) {
  const base = randomFallback(); // usado para preencher buracos
  const raw = input && typeof input === 'object' ? input : {};

  const col = (key) => {
    const c = raw.columns && typeof raw.columns === 'object' ? raw.columns[key] : null;
    const d = base.columns[key];
    return {
      title: str(c?.title, 60, d.title),
      emoji: firstEmoji(c?.emoji, d.emoji),
      hint: str(c?.hint, 120, d.hint),
    };
  };

  const p = raw.palette && typeof raw.palette === 'object' ? raw.palette : {};
  const dyn = raw.dynamic && typeof raw.dynamic === 'object' ? raw.dynamic : {};
  const format = DYNAMIC_FORMATS.includes(dyn.format) ? dyn.format : base.dynamic.format;

  const dynamic = {
    format,
    title: str(dyn.title, 60, base.dynamic.title),
    emoji: firstEmoji(dyn.emoji, base.dynamic.emoji),
    instructions: str(dyn.instructions, 280, base.dynamic.instructions),
    durationMin: clampInt(dyn.durationMin, 5, 15, 10),
  };

  if (format === 'prompt-response') {
    dynamic.prompt = str(dyn.prompt, 200, base.dynamic.prompt || 'O que essa sprint te ensinou sobre o time?');
  }
  if (format === 'scale-rating') {
    let options = Array.isArray(dyn.scale?.options) ? dyn.scale.options.map((o) => str(o, 40, '')).filter(Boolean) : [];
    if (options.length < 3) options = (base.dynamic.scale?.options) || ['Ótimo', 'Ok', 'Difícil'];
    if (options.length > 6) options = options.slice(0, 6);
    dynamic.scale = { label: str(dyn.scale?.label, 120, base.dynamic.scale?.label || 'Como foi sua sprint?'), options };
  }

  return {
    themeName: str(raw.themeName, 60, base.themeName),
    tagline: str(raw.tagline, 80, base.tagline),
    emoji: firstEmoji(raw.emoji, base.emoji),
    palette: {
      bgTop: hex(p.bgTop, base.palette.bgTop),
      bgBottom: hex(p.bgBottom, base.palette.bgBottom),
      good: hex(p.good, base.palette.good),
      improve: hex(p.improve, base.palette.improve),
      action: hex(p.action, base.palette.action),
    },
    columns: { good: col('good'), improve: col('improve'), action: col('action') },
    dynamic,
  };
}

// ---------- Validação estrita (para testes/telemetria; o app usa normalizeSpec) ----------
export function validateSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== 'object') return ['spec não é objeto'];
  for (const f of ['themeName', 'tagline', 'emoji']) if (!spec[f]) errors.push(`falta ${f}`);
  for (const k of ['bgTop', 'bgBottom', 'good', 'improve', 'action']) {
    if (!HEX.test(spec.palette?.[k] || '')) errors.push(`palette.${k} inválida`);
  }
  for (const k of ['good', 'improve', 'action']) {
    if (!spec.columns?.[k]?.title) errors.push(`columns.${k}.title faltando`);
  }
  if (!DYNAMIC_FORMATS.includes(spec.dynamic?.format)) errors.push('dynamic.format inválido');
  if (spec.dynamic?.format === 'prompt-response' && !spec.dynamic?.prompt) errors.push('falta dynamic.prompt');
  if (spec.dynamic?.format === 'scale-rating' && !(spec.dynamic?.scale?.options?.length >= 3)) errors.push('scale.options insuficientes');
  return errors;
}
