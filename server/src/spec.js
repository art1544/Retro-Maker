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
const strArr = (v, maxItems, maxLen, fallback) => {
  if (!Array.isArray(v)) return fallback;
  const out = v.map((x) => str(x, maxLen, '')).filter(Boolean).slice(0, maxItems);
  return out.length ? out : fallback;
};

// ---------- Fallback theme bank (usado quando a IA falha ou não há internet) ----------
export const FALLBACK_SPECS = [
  {
    themeName: 'Minecraft',
    tagline: 'Mine os aprendizados, blocode a próxima sprint',
    emoji: '⛏️',
    palette: { bgTop: '#7ec0ee', bgBottom: '#5b8731', good: '#5db54a', improve: '#f2a33c', action: '#3a86ff' },
    images: [
      'Minecraft blocky landscape at sunrise, grass blocks and trees, cinematic voxel art',
      'cute Minecraft creeper character, voxel 3d render, green',
      'Minecraft diamond ore and pickaxe, glowing, voxel art',
      'Minecraft cozy house with torches at night, voxel art',
    ],
    columns: {
      good: { title: 'O que foi bom', emoji: '💎', hint: 'Diamantes que a gente minerou' },
      improve: { title: 'O que pode melhorar', emoji: '🧨', hint: 'Creepers que atrapalharam' },
      action: { title: 'Ações', emoji: '🧱', hint: 'Crafting da próxima sprint' },
    },
    dynamic: {
      format: 'two-truths', title: 'Creeper ou Amigo?', emoji: '🧨',
      goal: 'Quebrar o gelo e rir um pouco antes de mergulhar nos temas da sprint.',
      instructions: 'Cada pessoa escreve 2 histórias verdadeiras e 1 falsa sobre si. O time lê e vota qual é o Creeper (a mentira); depois revela.',
      steps: [
        'Cada um escreve suas 3 histórias em segredo (2 min).',
        'Uma pessoa por vez lê suas 3 histórias em voz alta.',
        'O time debate e vota qual acha que é a mentira.',
        'A pessoa revela o Creeper e conta a história real por trás.',
        'Próxima pessoa — até todos participarem.',
      ],
      durationMin: 8,
    },
  },
  {
    themeName: 'Divertidamente',
    tagline: 'Toda sprint tem suas emoções',
    emoji: '🎭',
    palette: { bgTop: '#ffd54a', bgBottom: '#6a5acd', good: '#ffd54a', improve: '#4aa3ff', action: '#e23b3b' },
    images: [
      'colorful glowing emotion orbs floating, Inside Out style, joyful, digital art',
      'happy yellow glowing character radiating light, cartoon, cute',
      'blue sad droplet character, cartoon, soft lighting',
      'control console of emotions with colorful buttons, cartoon',
    ],
    columns: {
      good: { title: 'Alegria', emoji: '😄', hint: 'O que trouxe alegria pro time' },
      improve: { title: 'Tristeza', emoji: '😢', hint: 'O que deixou a sprint pra baixo' },
      action: { title: 'Raiva → Ação', emoji: '😤', hint: 'Vamos transformar em atitude' },
    },
    dynamic: {
      format: 'scale-rating', title: 'Termômetro das Emoções', emoji: '🎭',
      goal: 'Deixar cada pessoa expressar como se sentiu na sprint, sem julgamento.',
      instructions: 'Cada um escolhe a emoção que dominou sua sprint. Revelamos juntos e cada pessoa explica em 30s o porquê.',
      steps: [
        'Todos escolhem sua emoção em segredo (1 min).',
        'O líder revela todas as escolhas de uma vez.',
        'Cada pessoa explica em ~30s por que escolheu aquela emoção.',
        'O time procura padrões: qual emoção apareceu mais?',
        'Anotem 1 ação para melhorar o clima na próxima sprint.',
      ],
      durationMin: 9,
      scale: { label: 'Qual emoção dominou sua sprint?', options: ['Alegria', 'Tristeza', 'Raiva', 'Medo', 'Nojinho', 'Ansiedade'] },
    },
  },
  {
    themeName: 'Missão Espacial',
    tagline: 'Rumo ao infinito e além da sprint',
    emoji: '🚀',
    palette: { bgTop: '#0b1020', bgBottom: '#1a2340', good: '#4aa3ff', improve: '#f2b705', action: '#e23b3b' },
    images: [
      'astronaut floating in space with colorful nebula, cinematic, digital art',
      'retro rocket ship launching with fire trail, stylized illustration',
      'planet with rings and stars, vibrant cosmic art',
      'mission control room with screens, sci-fi illustration',
    ],
    columns: {
      good: { title: 'Combustível', emoji: '⛽', hint: 'O que nos impulsionou' },
      improve: { title: 'Buracos negros', emoji: '🕳️', hint: 'O que sugou nossa energia' },
      action: { title: 'Próxima órbita', emoji: '🛰️', hint: 'Rota da próxima missão' },
    },
    dynamic: {
      format: 'prompt-response', title: 'Diário de Bordo', emoji: '👩‍🚀',
      goal: 'Refletir sobre o papel de cada um no time de forma leve e criativa.',
      instructions: 'Responda em 1 card (secreto até revelar). O líder revela todas e cada tripulante comenta a sua.',
      steps: [
        'Todos leem a pergunta e escrevem sua resposta em segredo (2 min).',
        'Todos marcam "terminei".',
        'O líder revela as respostas uma a uma.',
        'Cada autor comenta a própria resposta em ~1 min.',
        'O time escolhe a resposta mais criativa da missão.',
      ],
      durationMin: 10,
      prompt: 'Se a sprint fosse uma missão espacial, qual seria o seu papel na tripulação e por quê?',
    },
  },
  {
    themeName: 'Retrô Anos 80',
    tagline: 'Rebobina a fita e bora melhorar',
    emoji: '📼',
    palette: { bgTop: '#2a0e61', bgBottom: '#ff2e88', good: '#00e5ff', improve: '#ff2e88', action: '#ffe600' },
    images: [
      'retro 80s synthwave sunset with grid and palm trees, neon, vaporwave',
      'neon arcade cabinet glowing in the dark, 80s style',
      'cassette tape with neon glow, retro 80s art',
      'DeLorean style car with neon lights, synthwave',
    ],
    columns: {
      good: { title: 'Hits da sprint', emoji: '📀', hint: 'Sucessos que tocaram no repeat' },
      improve: { title: 'Ruídos na fita', emoji: '📻', hint: 'O que embolou a gravação' },
      action: { title: 'Lado B', emoji: '🎚️', hint: 'O que vamos regravar' },
    },
    dynamic: {
      format: 'prompt-response', title: 'Trilha Sonora da Sprint', emoji: '🎧',
      goal: 'Trazer leveza associando a sprint a uma música/vibe.',
      instructions: 'Cada um escolhe uma música (ou vibe) que resume sua sprint e explica. Secreto até revelar.',
      steps: [
        'Cada pessoa escreve a música/vibe e o motivo (2 min).',
        'O líder revela todas as respostas.',
        'Cada um conta em ~1 min por que aquela música.',
        'O time monta mentalmente a "playlist da sprint".',
      ],
      durationMin: 8,
    },
  },
  {
    themeName: 'Mundo dos Piratas',
    tagline: 'Rumo ao tesouro da próxima entrega',
    emoji: '🏴‍☠️',
    palette: { bgTop: '#0e3b5c', bgBottom: '#c98a2b', good: '#2fb37a', improve: '#e23b3b', action: '#f2b705' },
    images: [
      'pirate ship sailing on stormy sea, dramatic, digital painting',
      'treasure chest overflowing with gold on a beach, illustration',
      'old pirate treasure map with compass, parchment art',
      'tropical island with palm trees and a skull flag, cartoon',
    ],
    columns: {
      good: { title: 'Tesouros', emoji: '💰', hint: 'O que valeu ouro' },
      improve: { title: 'Tempestades', emoji: '🌊', hint: 'O que quase afundou o navio' },
      action: { title: 'Próxima rota', emoji: '🧭', hint: 'Rumo ao próximo tesouro' },
    },
    dynamic: {
      format: 'scale-rating', title: 'Bússola da Tripulação', emoji: '🧭',
      goal: 'Medir o astral do time e abrir conversa sobre como está a navegação.',
      instructions: 'Cada marujo aponta onde a bússola parou nesta sprint. Revela junto e conversem sobre os extremos.',
      steps: [
        'Cada um escolhe sua posição na bússola em segredo.',
        'O líder revela tudo de uma vez.',
        'Quem marcou extremos (melhor/pior) comenta rapidinho.',
        'O time define 1 ajuste de rota para a próxima sprint.',
      ],
      durationMin: 7,
      scale: { label: 'Como esteve a navegação da sua sprint?', options: ['Mar de rosas', 'Vento a favor', 'Mar calmo', 'Marolas', 'Tempestade', 'Quase naufrágio'] },
    },
  },
];

export function randomFallback(avoid = []) {
  const avoidSet = new Set((avoid || []).map((s) => String(s).toLowerCase()));
  const fresh = FALLBACK_SPECS.filter((s) => !avoidSet.has(s.themeName.toLowerCase()));
  const pool = fresh.length ? fresh : FALLBACK_SPECS;
  return structuredClone(pool[Math.floor(Math.random() * pool.length)]);
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
    goal: str(dyn.goal, 160, base.dynamic.goal),
    instructions: str(dyn.instructions, 280, base.dynamic.instructions),
    steps: strArr(dyn.steps, 6, 160, base.dynamic.steps),
    durationMin: clampInt(dyn.durationMin, 5, 10, 8),
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
    images: strArr(raw.images, 6, 160, base.images),
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
  if (!(spec.images?.length >= 1)) errors.push('images vazio');
  for (const k of ['good', 'improve', 'action']) {
    if (!spec.columns?.[k]?.title) errors.push(`columns.${k}.title faltando`);
  }
  if (!DYNAMIC_FORMATS.includes(spec.dynamic?.format)) errors.push('dynamic.format inválido');
  if (!(spec.dynamic?.steps?.length >= 2)) errors.push('dynamic.steps insuficientes');
  if (spec.dynamic?.format === 'prompt-response' && !spec.dynamic?.prompt) errors.push('falta dynamic.prompt');
  if (spec.dynamic?.format === 'scale-rating' && !(spec.dynamic?.scale?.options?.length >= 3)) errors.push('scale.options insuficientes');
  return errors;
}
