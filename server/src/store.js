import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { normalizeSpec, randomFallback } from './spec.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'boards.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/** @type {Record<string, any>} */
let boards = {};

function migrate(board) {
  // garante que todo board tenha um spec válido (boards antigos não tinham)
  if (!board.spec) board.spec = normalizeSpec({ themeName: board.theme });
  else board.spec = normalizeSpec(board.spec);
  board.theme = board.spec.themeName;
  if (!board.timer) board.timer = { running: false, endsAt: 0, remainingMs: 0, durationMs: 10 * 60 * 1000 };
  if (!board.game) board.game = { active: false, entries: {} };
  // migra entries antigas (a/b/c/lieIndex) para o formato genérico { format, payload }
  for (const [uid, e] of Object.entries(board.game.entries || {})) {
    if (e && !e.payload && (e.a || e.b || e.c)) {
      board.game.entries[uid] = {
        format: 'two-truths',
        payload: { statements: [e.a || '', e.b || '', e.c || ''], lieIndex: e.lieIndex ?? 0 },
        authorName: e.authorName, authorColor: e.authorColor, locked: e.locked, revealed: e.revealed,
      };
    }
  }
  delete board.music; // feature removida
  return board;
}

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      boards = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      for (const id of Object.keys(boards)) boards[id] = migrate(boards[id]);
    }
  } catch (err) {
    console.error('Falha ao carregar boards.json, iniciando vazio:', err.message);
    boards = {};
  }
}
load();

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(boards, null, 2));
    } catch (err) {
      console.error('Falha ao salvar boards.json:', err.message);
    }
  }, 400);
}

export const COLUMNS = [
  { id: 'good', title: 'O que foi bom', type: 'good' },
  { id: 'improve', title: 'O que pode melhorar', type: 'improve' },
  { id: 'action', title: 'Ações', type: 'action' },
];

function nextIndex() {
  const idxs = Object.values(boards).map((b) => b.index || 0);
  return (idxs.length ? Math.max(...idxs) : 0) + 1;
}

export function createBoard({ title, spec }) {
  const id = nanoid(10);
  const index = nextIndex();
  const safeSpec = normalizeSpec(spec || randomFallback());
  const board = {
    id,
    index,
    title: title || `Retro ${index}`,
    theme: safeSpec.themeName,
    spec: safeSpec,
    createdAt: Date.now(),
    phase: 'writing', // 'writing' | 'revealed'
    showAuthors: false,
    columns: COLUMNS,
    cards: {},
    freeItems: {},
    doneUsers: [],
    timer: { running: false, endsAt: 0, remainingMs: 0, durationMs: safeSpec.dynamic.durationMin * 60 * 1000 },
    game: { active: false, entries: {} },
  };
  boards[id] = board;
  persist();
  return board;
}

export function getBoard(id) {
  return boards[id] || null;
}

export function listBoards() {
  return Object.values(boards)
    .sort((a, b) => a.index - b.index)
    .map((b) => {
      const counts = { good: 0, improve: 0, action: 0 };
      for (const c of Object.values(b.cards)) counts[c.columnId] = (counts[c.columnId] || 0) + 1;
      return {
        id: b.id,
        index: b.index,
        title: b.title,
        theme: b.theme,
        themeEmoji: b.spec?.emoji || '🧱',
        tagline: b.spec?.tagline || '',
        dynamicTitle: b.spec?.dynamic?.title || '',
        createdAt: b.createdAt,
        phase: b.phase,
        counts,
        total: Object.keys(b.cards).length,
      };
    });
}

export function allBoardsWithCards() {
  return Object.values(boards)
    .sort((a, b) => a.index - b.index)
    .map((b) => ({
      id: b.id,
      index: b.index,
      title: b.title,
      theme: b.theme,
      createdAt: b.createdAt,
      cards: Object.values(b.cards).map((c) => ({ id: c.id, columnId: c.columnId, text: c.text })),
    }));
}

// Temas e dinâmicas já usados — para a IA gerar sempre algo novo.
export function usedThemes() {
  const out = [];
  for (const b of Object.values(boards)) {
    const t = b.spec?.themeName;
    const d = b.spec?.dynamic?.title;
    if (t) out.push(d ? `${t} (dinâmica: ${d})` : t);
  }
  return out;
}

export function deleteBoard(id) {
  delete boards[id];
  persist();
}

export function save() {
  persist();
}

export { boards };
