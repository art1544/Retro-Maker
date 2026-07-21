// Geração de BoardSpec via IA gratuita.
// Padrão: Pollinations (grátis, SEM chave). Alternativas via .env: gemini | groq | openrouter.
// Sempre retorna um spec normalizado (seguro) ou null — quem chama decide o fallback.

import { normalizeSpec, DYNAMIC_FORMATS } from './spec.js';

const PROVIDER = (process.env.AI_PROVIDER || 'pollinations').toLowerCase();
const TIMEOUT = Number(process.env.AI_TIMEOUT_MS || 20000);

const SYSTEM = `Você é o gerador de temas do RetroMaker. Responda SEMPRE apenas com um objeto JSON válido (sem texto extra, sem crases).`;

function userPrompt(hint, avoid = []) {
  const tema = (hint && hint.trim()) ? hint.trim() : 'algo da cultura pop, filme, desenho, game ou meme (você escolhe algo criativo e em alta)';
  const avoidBlock = (avoid && avoid.length)
    ? `\n\nJÁ FORAM USADOS nestes boards (NÃO repita tema nem dinâmica; traga uma ideia NOVA e diferente):\n- ${avoid.slice(0, 40).join('\n- ')}`
    : '';
  const seed = Math.random().toString(36).slice(2, 8);
  return `Gere UM tema de retrospectiva de Scrum MUITO criativo e divertido baseado em: "${tema}".
Seja original e caprichado — nada genérico. (semente de variação: ${seed})${avoidBlock}

Regras OBRIGATÓRIAS:
- Chaves de "columns" fixas: good, improve, action (só personalize title/emoji/hint no clima do tema; podem ser bem criativas).
- "palette": 5 cores HEX (#rrggbb) BONITAS, contrastantes e no clima do tema: bgTop, bgBottom, good, improve, action.
- "images": 4 descrições curtas (em INGLÊS, estilo prompt de arte) de cenas/objetos icônicos do tema, para gerar ilustrações. Ex.: "epic castle on a hill at sunset, digital art". Variadas entre si.
- "dynamic": uma atividade de grupo ELABORADA para durar de 5 a 10 minutos, com:
  - "format": um de ${DYNAMIC_FORMATS.map((f) => `"${f}"`).join(', ')}.
    - "two-truths": duas verdades e uma mentira (sem campos extras).
    - "prompt-response": inclua "prompt" (uma pergunta temática instigante).
    - "scale-rating": inclua "scale" = { "label", "options" (4 a 6 opções temáticas e engraçadas) }.
  - "goal": objetivo da dinâmica (por que vale a pena), até 160 chars.
  - "instructions": resumo de como jogar, no clima do tema, até 280 chars.
  - "steps": 4 a 6 passos curtos de como conduzir a atividade em 5-10 min.
  - "durationMin": inteiro entre 5 e 10.
- tagline <= 80 chars, 1 emoji por campo "emoji". Textos em português do Brasil (menos "images", que é em inglês).

Responda apenas com o JSON no formato do schema.`;
}

function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  // remove cercas de código, se houver
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = t.slice(start, end + 1);
  try { return JSON.parse(slice); } catch { return null; }
}

async function withTimeout(promiseFactory) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), TIMEOUT);
  try { return await promiseFactory(ctrl.signal); }
  finally { clearTimeout(id); }
}

// ---------- Providers: cada um recebe o prompt pronto e devolve o TEXTO cru da IA ----------
async function callPollinations(promptText, signal) {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'openai',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: promptText }],
      temperature: 0.9,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`pollinations ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
  }
  return await res.text();
}

// Subset de JSON Schema aceito pelo Gemini (com propertyOrdering p/ compat. 2.0).
const col = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Rótulo temático da coluna' },
    emoji: { type: 'string', description: 'Um emoji' },
    hint: { type: 'string', description: 'Dica curta e temática' },
  },
  required: ['title', 'emoji', 'hint'],
  propertyOrdering: ['title', 'emoji', 'hint'],
};
const GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    themeName: { type: 'string' },
    tagline: { type: 'string', description: 'Frase de efeito curta, até 80 caracteres' },
    emoji: { type: 'string' },
    palette: {
      type: 'object',
      description: 'Cores HEX #rrggbb legíveis e no clima do tema',
      properties: {
        bgTop: { type: 'string' }, bgBottom: { type: 'string' },
        good: { type: 'string' }, improve: { type: 'string' }, action: { type: 'string' },
      },
      required: ['bgTop', 'bgBottom', 'good', 'improve', 'action'],
      propertyOrdering: ['bgTop', 'bgBottom', 'good', 'improve', 'action'],
    },
    images: {
      type: 'array',
      description: '4 prompts de arte em inglês descrevendo cenas/objetos icônicos do tema',
      items: { type: 'string' },
    },
    columns: {
      type: 'object',
      properties: { good: col, improve: col, action: col },
      required: ['good', 'improve', 'action'],
      propertyOrdering: ['good', 'improve', 'action'],
    },
    dynamic: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['two-truths', 'prompt-response', 'scale-rating'] },
        title: { type: 'string' },
        emoji: { type: 'string' },
        goal: { type: 'string', description: 'Objetivo da dinâmica, até 160 caracteres' },
        instructions: { type: 'string', description: 'Como jogar, no clima do tema, até 280 caracteres' },
        steps: { type: 'array', items: { type: 'string' }, description: '4 a 6 passos curtos para conduzir em 5-10 min' },
        durationMin: { type: 'integer', description: 'Duração em minutos, entre 5 e 10' },
        prompt: { type: 'string', description: 'Só quando format=prompt-response: a pergunta temática' },
        scale: {
          type: 'object',
          description: 'Só quando format=scale-rating',
          properties: {
            label: { type: 'string' },
            options: { type: 'array', items: { type: 'string' }, description: '4 a 6 opções temáticas' },
          },
          propertyOrdering: ['label', 'options'],
        },
      },
      required: ['format', 'title', 'emoji', 'goal', 'instructions', 'steps', 'durationMin'],
      propertyOrdering: ['format', 'title', 'emoji', 'goal', 'instructions', 'steps', 'durationMin', 'prompt', 'scale'],
    },
  },
  required: ['themeName', 'tagline', 'emoji', 'palette', 'images', 'columns', 'dynamic'],
  propertyOrdering: ['themeName', 'tagline', 'emoji', 'palette', 'images', 'columns', 'dynamic'],
};

async function callGemini(promptText, signal) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY ausente');
  const model = process.env.AI_MODEL || 'gemini-3.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: GEMINI_SCHEMA, // força o formato -> acaba com temas malformados
        temperature: 1.0,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`gemini ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callOpenAICompatible(promptText, signal, { url, key, model }) {
  if (!key) throw new Error('API key ausente');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal,
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: promptText }],
      temperature: 0.9,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callProvider(promptText, signal) {
  switch (PROVIDER) {
    case 'gemini': return callGemini(promptText, signal);
    case 'groq': return callOpenAICompatible(promptText, signal, {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY, model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    });
    case 'openrouter': return callOpenAICompatible(promptText, signal, {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY, model: process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    });
    case 'none': throw new Error('AI desativada (AI_PROVIDER=none)');
    default: return callPollinations(promptText, signal);
  }
}

export function currentModel() {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  return PROVIDER === 'gemini' ? 'gemini-3.5-flash'
    : PROVIDER === 'groq' ? 'llama-3.3-70b-versatile'
    : PROVIDER === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct:free'
    : 'openai';
}

// Lista os modelos Gemini que a chave atual pode usar (para diagnóstico).
async function listGeminiModels() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': key },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => (m.name || '').replace('models/', ''))
      .filter((n) => n.startsWith('gemini'));
  } catch { return []; }
}

/**
 * Gera um BoardSpec a partir de um hint textual (pode ser vazio).
 * @param {string} hint tema desejado
 * @param {string[]} avoid temas/dinâmicas já usados a evitar
 * @returns {Promise<object|null>} spec normalizado, ou null se falhar.
 */
export async function generateSpec(hint, avoid = []) {
  try {
    const promptText = userPrompt(hint, avoid);
    const raw = await withTimeout((signal) => callProvider(promptText, signal));
    const parsed = extractJson(raw);
    if (!parsed) { console.warn('[ai] resposta sem JSON válido; usando fallback'); return null; }
    return normalizeSpec(parsed);
  } catch (err) {
    console.warn(`[ai] geração falhou (${PROVIDER}): ${err.message}; usando fallback`);
    return null;
  }
}

/** Testa se a IA configurada está funcionando (usado por /api/ai/health). */
export async function aiHealth() {
  const provider = PROVIDER;
  const model = currentModel();
  if (provider === 'none') return { provider, model: null, ok: false, message: 'AI desativada (AI_PROVIDER=none)' };
  const t0 = Date.now();
  try {
    const raw = await withTimeout((signal) => callProvider(userPrompt('teste rápido de conexão', []), signal));
    const parsed = extractJson(raw);
    return {
      provider, model, ok: !!parsed, ms: Date.now() - t0,
      message: parsed ? 'Conexão OK — a IA respondeu um tema válido.' : 'A IA respondeu, mas sem JSON válido.',
      sample: parsed?.themeName || null,
    };
  } catch (err) {
    // se for Gemini, lista os modelos disponíveis pra facilitar corrigir o AI_MODEL
    const availableModels = provider === 'gemini' ? await listGeminiModels() : undefined;
    const hint = /404/.test(err.message) && availableModels?.length
      ? ` Dica: defina AI_MODEL para um destes: ${availableModels.slice(0, 8).join(', ')}.`
      : '';
    return { provider, model, ok: false, ms: Date.now() - t0, message: err.message + hint, availableModels };
  }
}

export { extractJson };
