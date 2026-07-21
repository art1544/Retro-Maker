import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import {
  createBoard,
  getBoard,
  listBoards,
  allBoardsWithCards,
  deleteBoard,
  usedThemes,
  save,
} from './store.js';
import { generateSpec, aiHealth } from './ai.js';
import { normalizeSpec } from './spec.js';

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

// ---------- REST ----------
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/boards', (_req, res) => res.json(listBoards()));

app.post('/api/boards', async (req, res) => {
  const { title, prompt, spec: providedSpec } = req.body || {};
  // 1) se o cliente colou um spec pronto (de uma IA externa), usa ele.
  // 2) senão, tenta gerar via IA a partir do "prompt" (tema), evitando repetir temas já usados.
  // 3) se a IA falhar, createBoard cai no fallback local automaticamente.
  let spec = null;
  if (providedSpec && typeof providedSpec === 'object') {
    spec = normalizeSpec(providedSpec);
  } else {
    spec = await generateSpec(prompt || '', usedThemes());
  }
  const board = createBoard({ title, spec });
  res.status(201).json(board);
});

// pré-visualizar/gerar um spec sem criar board (útil pra "regenerar tema")
app.post('/api/spec/preview', async (req, res) => {
  const spec = (await generateSpec(req.body?.prompt || '', usedThemes())) || normalizeSpec(null);
  res.json(spec);
});

// checagem de saúde da IA (valida provider/chave/modelo)
app.get('/api/ai/health', async (_req, res) => {
  res.json(await aiHealth());
});

app.get('/api/boards/:id', (req, res) => {
  const board = getBoard(req.params.id);
  if (!board) return res.status(404).json({ error: 'not found' });
  res.json(board);
});

app.delete('/api/boards/:id', (req, res) => {
  deleteBoard(req.params.id);
  res.json({ ok: true });
});

// aggregated data for the dashboard (client applies filters)
app.get('/api/dashboard', (_req, res) => res.json(allBoardsWithCards()));

// ---------- Serve built client in production (single-service deploy) ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback for client-side routes (/board/:id, /dashboard, ...)
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('📦 Servindo client de', clientDist);
}

// ---------- Realtime ----------
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, maxHttpBufferSize: 1.2e7 });

/** presence per board: boardId -> { hostId, users: Map<socketId,{userId,name,color}> } */
const rooms = new Map();

function room(boardId) {
  if (!rooms.has(boardId)) rooms.set(boardId, { hostId: null, users: new Map() });
  return rooms.get(boardId);
}

function presenceList(boardId) {
  const r = room(boardId);
  const seen = new Map();
  for (const u of r.users.values()) seen.set(u.id, u); // dedupe multi-tab
  return { hostId: r.hostId, users: [...seen.values()] };
}

// Build a per-user view enforcing card privacy during the writing phase.
function viewFor(board, userId) {
  const cards = {};
  for (const c of Object.values(board.cards)) {
    const mine = c.authorId === userId;
    if (board.phase === 'writing' && !mine) {
      // face-down: hide content + author, keep position + column + color
      cards[c.id] = {
        id: c.id, columnId: c.columnId, x: c.x, y: c.y,
        color: c.color, hidden: true, reactions: c.reactions || {},
        authorId: null, authorName: null,
      };
    } else {
      const showName = board.phase !== 'writing' ? (board.showAuthors || mine) : true;
      cards[c.id] = {
        ...c,
        authorName: showName ? c.authorName : null,
        hidden: false,
      };
    }
  }
  // game entries privacy: hide others' secret parts until revealed (per format)
  const format = board.spec?.dynamic?.format || 'two-truths';
  const entries = {};
  for (const [uid, e] of Object.entries(board.game.entries || {})) {
    const mine = uid === userId;
    if (mine || e.revealed) { entries[uid] = e; continue; }
    const pub = { authorName: e.authorName, authorColor: e.authorColor, revealed: false, locked: e.locked, format: e.format };
    if (format === 'two-truths') {
      // as afirmações são lidas pelo time; só o índice da mentira fica secreto
      pub.payload = { statements: e.payload?.statements || [] };
    }
    // prompt-response / scale-rating: resposta fica totalmente oculta até revelar
    entries[uid] = pub;
  }
  return {
    id: board.id,
    index: board.index,
    title: board.title,
    theme: board.theme,
    spec: board.spec,
    phase: board.phase,
    showAuthors: board.showAuthors,
    columns: board.columns,
    cards,
    freeItems: board.freeItems,
    doneUsers: board.doneUsers,
    timer: board.timer,
    game: { active: board.game.active, entries },
  };
}

function broadcastBoard(boardId) {
  const board = getBoard(boardId);
  if (!board) return;
  const r = room(boardId);
  for (const [socketId, u] of r.users) {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) sock.emit('board:state', viewFor(board, u.id));
  }
}

function broadcastPresence(boardId) {
  io.to(boardId).emit('presence', presenceList(boardId));
}

io.on('connection', (socket) => {
  socket.on('board:join', ({ boardId, user }) => {
    const board = getBoard(boardId);
    if (!board || !user) return socket.emit('error:msg', 'Board não encontrado');
    socket.join(boardId);
    socket.data.boardId = boardId;
    socket.data.user = user;
    const r = room(boardId);
    r.users.set(socket.id, user);
    if (!r.hostId) r.hostId = user.id; // first in becomes host
    socket.emit('board:state', viewFor(board, user.id));
    broadcastPresence(boardId);
  });

  const bId = () => socket.data.boardId;
  const uId = () => socket.data.user?.id;
  const isHost = () => room(bId())?.hostId === uId();

  socket.on('cursor:move', ({ x, y }) => {
    if (!bId()) return;
    socket.to(bId()).emit('cursor', { userId: uId(), name: socket.data.user?.name, color: socket.data.user?.color, x, y });
  });

  socket.on('card:create', ({ columnId, text, x, y }) => {
    const board = getBoard(bId());
    if (!board) return;
    const id = nanoid(8);
    board.cards[id] = {
      id, columnId, text: text || '',
      authorId: uId(),
      authorName: socket.data.user?.name,
      color: socket.data.user?.color,
      x: x ?? 20, y: y ?? 20,
      reactions: {}, createdAt: Date.now(),
    };
    save();
    broadcastBoard(bId());
  });

  socket.on('card:update', ({ id, patch }) => {
    const board = getBoard(bId());
    const card = board?.cards[id];
    if (!card) return;
    // only author may edit text; anyone may move (drag)
    const allowed = {};
    if (patch.x != null) allowed.x = patch.x;
    if (patch.y != null) allowed.y = patch.y;
    if (patch.columnId != null) allowed.columnId = patch.columnId;
    if (patch.text != null && card.authorId === uId()) allowed.text = patch.text;
    Object.assign(card, allowed);
    save();
    broadcastBoard(bId());
  });

  socket.on('card:delete', ({ id }) => {
    const board = getBoard(bId());
    if (!board?.cards[id]) return;
    if (board.cards[id].authorId !== uId() && !isHost()) return;
    delete board.cards[id];
    save();
    broadcastBoard(bId());
  });

  socket.on('card:react', ({ id, emoji }) => {
    const board = getBoard(bId());
    const card = board?.cards[id];
    if (!card) return;
    card.reactions = card.reactions || {};
    const arr = card.reactions[emoji] || [];
    const me = uId();
    card.reactions[emoji] = arr.includes(me) ? arr.filter((u) => u !== me) : [...arr, me];
    if (card.reactions[emoji].length === 0) delete card.reactions[emoji];
    save();
    broadcastBoard(bId());
  });

  socket.on('user:done', ({ done }) => {
    const board = getBoard(bId());
    if (!board) return;
    const me = uId();
    board.doneUsers = (board.doneUsers || []).filter((u) => u !== me);
    if (done) board.doneUsers.push(me);
    save();
    broadcastBoard(bId());
  });

  socket.on('phase:reveal', () => {
    const board = getBoard(bId());
    if (!board || !isHost()) return;
    board.phase = 'revealed';
    save();
    broadcastBoard(bId());
  });

  socket.on('phase:reset', () => {
    const board = getBoard(bId());
    if (!board || !isHost()) return;
    board.phase = 'writing';
    board.showAuthors = false;
    board.doneUsers = [];
    save();
    broadcastBoard(bId());
  });

  socket.on('authors:toggle', ({ show }) => {
    const board = getBoard(bId());
    if (!board || !isHost()) return;
    board.showAuthors = !!show;
    save();
    broadcastBoard(bId());
  });

  socket.on('host:claim', () => {
    const r = room(bId());
    if (r) { r.hostId = uId(); broadcastPresence(bId()); }
  });

  // regenerate the board theme/dynamic via AI (host only)
  socket.on('spec:regenerate', async ({ prompt }) => {
    const board = getBoard(bId());
    if (!board || !isHost()) return;
    io.to(bId()).emit('spec:generating', true);
    // evita repetir temas de OUTROS boards (mantém o próprio na lista tb, tudo bem)
    const spec = (await generateSpec(prompt || '', usedThemes())) || normalizeSpec(null);
    board.spec = spec;
    board.theme = spec.themeName;
    board.game.entries = {}; // dinâmica mudou -> limpa respostas anteriores
    save();
    io.to(bId()).emit('spec:generating', false);
    broadcastBoard(bId());
  });

  // set a hand-crafted spec (pasted JSON) — host only
  socket.on('spec:set', ({ spec }) => {
    const board = getBoard(bId());
    if (!board || !isHost()) return;
    board.spec = normalizeSpec(spec);
    board.theme = board.spec.themeName;
    board.game.entries = {};
    save();
    broadcastBoard(bId());
  });

  // free canvas items (text / image / gif) — always shared, Miro-style
  socket.on('freeitem:create', ({ item }) => {
    const board = getBoard(bId());
    if (!board) return;
    const id = nanoid(8);
    board.freeItems[id] = {
      id, ...item,
      authorId: uId(), authorName: socket.data.user?.name, color: socket.data.user?.color,
    };
    save();
    broadcastBoard(bId());
  });

  socket.on('freeitem:update', ({ id, patch }) => {
    const board = getBoard(bId());
    if (!board?.freeItems[id]) return;
    Object.assign(board.freeItems[id], patch);
    save();
    broadcastBoard(bId());
  });

  socket.on('freeitem:delete', ({ id }) => {
    const board = getBoard(bId());
    if (!board?.freeItems[id]) return;
    delete board.freeItems[id];
    save();
    broadcastBoard(bId());
  });

  // synced countdown timer (host-controlled)
  socket.on('timer:start', ({ durationMs }) => {
    const board = getBoard(bId());
    if (!board || !isHost()) return;
    const d = durationMs != null ? durationMs
      : (board.timer.remainingMs > 0 ? board.timer.remainingMs : board.timer.durationMs);
    board.timer = { running: true, endsAt: Date.now() + d, remainingMs: 0, durationMs: durationMs ?? board.timer.durationMs };
    save();
    broadcastBoard(bId());
  });

  socket.on('timer:pause', () => {
    const board = getBoard(bId());
    if (!board || !isHost()) return;
    const remaining = Math.max(0, board.timer.endsAt - Date.now());
    board.timer = { ...board.timer, running: false, remainingMs: remaining };
    save();
    broadcastBoard(bId());
  });

  socket.on('timer:reset', ({ durationMs }) => {
    const board = getBoard(bId());
    if (!board || !isHost()) return;
    const d = durationMs ?? board.timer.durationMs;
    board.timer = { running: false, endsAt: 0, remainingMs: 0, durationMs: d };
    save();
    broadcastBoard(bId());
  });

  // dynamic game — "Creeper ou Amigo?" (two truths & a lie)
  socket.on('game:toggle', ({ active }) => {
    const board = getBoard(bId());
    if (!board || !isHost()) return;
    board.game.active = !!active;
    save();
    broadcastBoard(bId());
  });

  socket.on('game:setEntry', ({ payload }) => {
    const board = getBoard(bId());
    if (!board) return;
    board.game.entries[uId()] = {
      format: board.spec?.dynamic?.format || 'two-truths',
      payload: payload || {},
      authorName: socket.data.user?.name,
      authorColor: socket.data.user?.color,
      locked: true, revealed: false,
    };
    save();
    broadcastBoard(bId());
  });

  socket.on('game:revealEntry', ({ userId }) => {
    const board = getBoard(bId());
    if (!board) return;
    const target = userId || uId();
    if (target !== uId() && !isHost()) return;
    if (board.game.entries[target]) board.game.entries[target].revealed = true;
    save();
    broadcastBoard(bId());
  });

  socket.on('board:setTitle', ({ title }) => {
    const board = getBoard(bId());
    if (!board || !isHost()) return;
    board.title = title;
    save();
    broadcastBoard(bId());
  });

  socket.on('disconnect', () => {
    const boardId = bId();
    if (!boardId) return;
    const r = rooms.get(boardId);
    if (!r) return;
    r.users.delete(socket.id);
    // reassign host if the host left
    if (r.hostId === uId() && !presenceList(boardId).users.find((u) => u.id === uId())) {
      const next = [...r.users.values()][0];
      r.hostId = next ? next.id : null;
    }
    broadcastPresence(boardId);
  });
});

server.listen(PORT, () => {
  console.log(`\n🟩 RetroMaker server rodando em http://localhost:${PORT}\n`);
});
