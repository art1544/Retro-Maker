// Geração de BoardSpec via IA gratuita.
// Padrão: Pollinations (grátis, SEM chave). Alternativas via .env: gemini | groq | openrouter.
// Sempre retorna um spec normalizado (seguro) ou null — quem chama decide o fallback.

import { normalizeSpec, DYNAMIC_FORMATS } from './spec.js';

const PROVIDER = (process.env.AI_PROVIDER || 'pollinations').toLowerCase();
const TIMEOUT = Number(process.env.AI_TIMEOUT_MS || 20000);

const SYSTEM = `Você é o gerador de temas do RetroMaker. Responda SEMPRE apenas com um objeto JSON válido (sem texto extra, sem crases).`;

function userPrompt(hint) {
  const tema = (hint && hint.trim()) ? hint.trim() : 'algo da cultura pop atual/em alta (você escolhe)';
  return `Gere UM tema de retrospectiva de Scrum divertido baseado em: "${tema}".

Regras OBRIGATÓRIAS:
- Chaves de "columns" fixas: good, improve, action (só personalize title/emoji/hint no clima do tema).
- "palette": 5 cores HEX (#rrggbb) legíveis e temáticas: bgTop, bgBottom, good, improve, action.
- "dynamic.format" DEVE ser um de: ${DYNAMIC_FORMATS.map((f) => `"${f}"`).join(', ')}.
  - "two-truths": duas verdades e uma mentira. Sem campos extras.
  - "prompt-response": inclua "dynamic.prompt" (uma pergunta temática).
  - "scale-rating": inclua "dynamic.scale" = { "label", "options" (3 a 6 opções temáticas) }.
- tagline <= 80 chars, instructions <= 280 chars, 1 emoji por campo "emoji", durationMin inteiro 5..15.
- Textos em português do Brasil.

Formato EXATO:
{
  "themeName": "...", "tagline": "...", "emoji": "...",
  "palette": { "bgTop": "#......", "bgBottom": "#......", "good": "#......", "improve": "#......", "action": "#......" },
  "columns": {
    "good": { "title": "...", "emoji": "...", "hint": "..." },
    "improve": { "title": "...", "emoji": "...", "hint": "..." },
    "action": { "title": "...", "emoji": "...", "hint": "..." }
  },
  "dynamic": { "format": "...", "title": "...", "emoji": "...", "instructions": "...", "durationMin": 10 }
}
Responda apenas com o JSON.`;
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

// ---------- Providers: cada um devolve o TEXTO cru da IA ----------
async function callPollinations(hint, signal) {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'openai',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userPrompt(hint) }],
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

async function callGemini(hint, signal) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY ausente');
  const model = process.env.AI_MODEL || 'gemini-1.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt(hint) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callOpenAICompatible(hint, signal, { url, key, model }) {
  if (!key) throw new Error('API key ausente');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal,
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userPrompt(hint) }],
      temperature: 0.9,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callProvider(hint, signal) {
  switch (PROVIDER) {
    case 'gemini': return callGemini(hint, signal);
    case 'groq': return callOpenAICompatible(hint, signal, {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY, model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    });
    case 'openrouter': return callOpenAICompatible(hint, signal, {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY, model: process.env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    });
    case 'none': throw new Error('AI desativada (AI_PROVIDER=none)');
    default: return callPollinations(hint, signal);
  }
}

/**
 * Gera um BoardSpec a partir de um hint textual (pode ser vazio).
 * @returns {Promise<object|null>} spec normalizado, ou null se falhar.
 */
export async function generateSpec(hint) {
  try {
    const raw = await withTimeout((signal) => callProvider(hint, signal));
    const parsed = extractJson(raw);
    if (!parsed) { console.warn('[ai] resposta sem JSON válido; usando fallback'); return null; }
    return normalizeSpec(parsed);
  } catch (err) {
    console.warn(`[ai] geração falhou (${PROVIDER}): ${err.message}; usando fallback`);
    return null;
  }
}

export { extractJson };
