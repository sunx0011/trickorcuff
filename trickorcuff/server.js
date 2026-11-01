// TRICK OR CUFF: THE GREAT HEIST — authoritative multiplayer server (static files + WebSocket)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const S = require('./public/shared.js');
if (process.env.ROUND_MS) S.ROUND_MS = +process.env.ROUND_MS; // testing override

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MAP = S.buildMap();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (url === '/') url = '/index.html';
  const file = path.normalize(path.join(PUBLIC, url));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const BOT_NAMES = ['Bot Mo', 'Bot Pip', 'Bot Zed', 'Bot Kit', 'Bot Rue', 'Bot Jax', 'Bot Lu'];
let nextId = 1;
const now = () => Date.now();
const r2 = v => Math.round(v * 100) / 100;
const hdist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function newCode() { let c; do { c = Array.from({ length: 4 }, () => CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0]).join(''); } while (rooms.has(c)); return c; }
const send = (p, m) => { if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(m)); };
const broadcast = (room, m) => { const s = JSON.stringify(m); for (const p of room.players.values()) if (p.ws && p.ws.readyState === 1) p.ws.send(s); };
const cleanName = n => String(n || '').replace(/[<>&"'`]/g, '').trim().slice(0, 12);

function makePlayer(room, name, bot) {
  const used = new Set([...room.players.values()].map(p => p.color));
  return {
    id: 'p' + nextId++, token: crypto.randomBytes(12).toString('hex'), name, bot: !!bot,
    color: S.COLORS.find(c => !used.has(c)) || S.COLORS[0],
    ws: null, connected: !!bot, discAt: 0, role: null, lastRole: null, policeCount: 0,
    x: 0, y: 0, z: 0, vy: 0, onGround: true, energy: 1, yaw: 0, budget: 0, lastPosAt: now(),
    captured: false, chase: false, chaseUntil: 0, stealBy: null, stealStart: 0, stealReadyAt: 0, steals: 0, catches: 0, ai: null,
  };
}
const lobbyMsg = room => ({
  t: 'lobby', code: room.code, hostId: room.hostId, phase: room.phase,
  players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, color: p.color, bot: p.bot, connected: p.connected, role: p.role, pc: p.policeCount })),
});
const pushLobby = room => broadcast(room, lobbyMsg(room));
function ensureHost(room) {
  const h = room.players.get(room.hostId);
  if (h && h.connected && !h.bot) return;
  const n = [...room.players.values()].find(p => p.connected && !p.bot);
  if (n) room.hostId = n.id;
}

// ---------------- fair role rotation ----------------
// police are picked at random among players with the lowest police count this session,
// avoiding last round's police whenever there are enough other candidates
function pickPolice(list, n) {
  const shuffled = list.slice().sort(() => Math.random() - 0.5);
  shuffled.sort((a, b) => a.policeCount - b.policeCount || (a.lastRole === 'police') - (b.lastRole === 'police'));
  return new Set(shuffled.slice(0, n).map(p => p.id));
}

// ---------------- round flow ----------------
const POLICE_SPAWNS = [[0, -8.5, 0], [0, 8.5, Math.PI]];
const THIEF_SPAWNS = [[8.5, 24.2], [24.2, 8.5], [24.2, 18], [17, 24.2], [24.2, 24.2], [8.5, 18], [-8.5, 24.2], [24.2, -8.5]];

// ---------------- colour money ----------------
const ELEVATED = MAP.solids.filter(s => (s.kind === 'bld' && s.y1 <= 6.9) || s.kind === 'bridge' || s.kind === 'platform' || s.kind === 'duck');
function moneySpot(room, elevated, owner) {
  for (let i = 0; i < 80; i++) {
    let x, z, y;
    if (elevated) {
      const s = ELEVATED[(Math.random() * ELEVATED.length) | 0];
      const hw = s.t === 'b' ? s.hw : s.r * 0.6, hd = s.t === 'b' ? s.hd : s.r * 0.6;
      x = s.x + (Math.random() * 2 - 1) * Math.max(0, hw - 0.5); z = s.z + (Math.random() * 2 - 1) * Math.max(0, hd - 0.5);
      y = S.groundAt(MAP, x, z, 50, S.ROLE.thief).h;
      if (y < 2) continue;
    } else {
      x = (Math.random() * 2 - 1) * 23.5; z = (Math.random() * 2 - 1) * 23.5;
      y = S.groundAt(MAP, x, z, 0.4, S.ROLE.thief).h;
      if (y > 0.4) continue;
      const r = S.resolve(MAP, x, z, y, S.ROLE.thief); if (Math.hypot(r.x - x, r.z - z) > 0.05) continue;
    }
    if (Math.hypot(x - S.GATE.x, z - S.GATE.z) < 10) continue;
    const minOwn = i < 60 ? 14 : 8; // spread one thief's bills across the map
    if ([...room.money.values()].some(m => Math.hypot(m.x - x, m.z - z) < (m.owner === owner ? minOwn : 3))) continue;
    return { x, y: y + 0.7, z };
  }
  return null;
}
let nextMoney = 1;

function startRound(room) {
  const list = [...room.players.values()];
  if (list.length < S.MIN_PLAYERS) return;
  const police = pickPolice(list, S.policeCount(list.length));
  const off = (Math.random() * THIEF_SPAWNS.length) | 0;
  let pi = 0, ti = 0;
  for (const p of list) {
    p.role = police.has(p.id) ? 'police' : 'thief';
    if (p.role === 'police') p.policeCount++;
    Object.assign(p, { captured: false, escaped: false, escStart: 0, money: 0, tcolor: null, chase: false, chaseUntil: 0, stealBy: null, stealStart: 0, stealReadyAt: 0, steals: 0, catches: 0, ai: null, budget: 0, lastPosAt: now(), vy: 0, onGround: true, energy: 1, y: 0 });
    if (p.role === 'police') { const s = POLICE_SPAWNS[pi++ % 2]; p.x = s[0]; p.z = s[1]; p.yaw = s[2]; }
    else { const s = THIEF_SPAWNS[(ti++ + off) % THIEF_SPAWNS.length]; p.x = s[0]; p.z = s[1]; p.yaw = 0; }
  }
  Object.assign(room, { phase: 'reveal', revealUntil: now() + S.REVEAL_MS, escape: { by: null, start: 0 }, result: null, level: 0, money: new Map() });
  // every thief gets a random colour of their own + bills of that colour around the city
  const cols = S.THIEF_COLORS.slice().sort(() => Math.random() - 0.5);
  list.filter(p => p.role === 'thief').forEach((p, i) => {
    p.tcolor = cols[i % cols.length];
    for (let k = 0; k < S.MONEY_PER; k++) {
      const spot = moneySpot(room, k === S.MONEY_PER - 1, p.id);
      if (spot) { const id = 'm' + nextMoney++; room.money.set(id, { id, owner: p.id, ...spot }); }
    }
  });
  room.round++;
  pushLobby(room);
  for (const p of room.players.values()) send(p, roundMsg(room, p));
}
function roundMsg(room, p) {
  return {
    t: 'round', round: room.round, phase: room.phase,
    roles: Object.fromEntries([...room.players.values()].map(q => [q.id, q.role])),
    colors: Object.fromEntries([...room.players.values()].filter(q => q.tcolor).map(q => [q.id, q.tcolor])),
    me: { x: p.x, y: p.y, z: p.z, yaw: p.yaw, role: p.role, captured: p.captured },
    revealMs: Math.max(0, (room.revealUntil || 0) - now()),
  };
}
function endRound(room, winner, reason) {
  room.phase = 'results';
  for (const p of room.players.values()) p.lastRole = p.role;
  const thieves = [...room.players.values()].filter(p => p.role === 'thief');
  room.result = {
    winner, reason, durationMs: Math.min(S.ROUND_MS, now() - room.startAt),
    captured: thieves.filter(p => p.captured).length, escaped: thieves.filter(p => p.escaped).length, thieves: thieves.length, level: room.level,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, color: p.tcolor || p.color, role: p.role, catches: p.catches, captured: p.captured, escaped: !!p.escaped, money: p.money || 0,
      won: p.role === 'thief' ? !!p.escaped : thieves.every(q => !q.escaped), pc: p.policeCount })),
  };
  broadcast(room, { t: 'results', ...room.result });
  pushLobby(room);
}

function handlePos(room, p, m) {
  if (room.phase !== 'playing' || p.captured || p.escaped) return;
  const t = now();
  const x = Number(m.x), y = Number(m.y), z = Number(m.z), yaw = Number(m.yaw);
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(y)) return;
  if (Number.isFinite(yaw)) p.yaw = yaw;
  if (Number.isFinite(Number(m.e))) p.energy = Math.max(0, Math.min(1, Number(m.e)));
  const elapsed = Math.min(t - p.lastPosAt, 1000) / 1000; p.lastPosAt = t;
  if (p.role === 'police' && t < room.headUntil) { if (Math.hypot(x - p.x, z - p.z) > 0.3) send(p, { t: 'correct', x: p.x, y: p.y, z: p.z }); return; }
  const R = S.ROLE[p.role];
  const speed = p.role === 'police' ? S.policeSpeed(p.chase || t < p.chaseUntil, room.level) : R.speed;
  p.budget = Math.min(p.budget + speed * elapsed * 1.3, 1.5);
  let dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz), corrected = false;
  if (d > p.budget) { const k = p.budget / d; dx *= k; dz *= k; corrected = d - p.budget > 0.6; d = p.budget; }
  p.budget -= d;
  const ny = Math.max(0, Math.min(S.CEIL, y));
  const r = S.resolve(MAP, p.x + dx, p.z + dz, ny, R);
  if (Math.hypot(r.x - x, r.z - z) > 0.7) corrected = true;
  p.x = r.x; p.z = r.z; p.y = ny;
  if (corrected) send(p, { t: 'correct', x: p.x, y: p.y, z: p.z });
}

// ---------------- bots ----------------
function randomPoint() {
  for (let i = 0; i < 60; i++) { const x = (Math.random() * 2 - 1) * 23, z = (Math.random() * 2 - 1) * 23; if (S.groundAt(MAP, x, z, 0, S.ROLE.thief).h === 0 && Math.abs(S.resolve(MAP, x, z, 0, S.ROLE.police).x - x) < 0.01) return { x, z }; }
  return { x: 0, z: 8.5 };
}
function moveBot(b, tx, tz, mult, fly, dt) {
  const ai = b.ai, R = S.ROLE[b.role];
  const want = Math.atan2(tx - b.x, tz - b.z), dist = Math.hypot(tx - b.x, tz - b.z);
  if (dist < 0.25) { S.step(MAP, b, { fly }, dt, b.role); return true; }
  for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4]) {
    const a = want + off + ai.bias;
    const test = { x: b.x, y: b.y, z: b.z, vy: b.vy, onGround: b.onGround, energy: b.energy };
    S.step(MAP, test, { mx: Math.sin(a) * Math.min(1, dist), mz: Math.cos(a) * Math.min(1, dist), mult, fly }, dt, b.role);
    if (Math.hypot(test.x - b.x, test.z - b.z) > R.speed * mult * dt * 0.3 * Math.min(1, dist)) {
      Object.assign(b, test);
      ai.bias = off !== 0 ? (off + ai.bias) * 0.55 : ai.bias * 0.8; return true;
    }
  }
  ai.bias = (Math.random() - 0.5) * 3; S.step(MAP, b, { fly: b.role === 'thief' }, dt, b.role); return false;
}
function botStep(room, b, t, dt) {
  if (!b.ai) b.ai = { bias: 0, wp: randomPoint(), stuck: 0 };
  const ai = b.ai;
  if (b.role === 'police') {
    if (t < room.headUntil) return;
    let best = null, bd = 1e9;
    for (const q of room.players.values()) if (q.role === 'thief' && !q.captured && S.canSee(MAP, b, q)) { const d = hdist(b, q); if (d < bd) { bd = d; best = q; } }
    if (best) { ai.last = { x: best.x, z: best.z }; }
    let tx, tz;
    if (best) { tx = best.x; tz = best.z; }
    else if (ai.last && hdist(b, ai.last) > 2) { tx = ai.last.x; tz = ai.last.z; }
    else { ai.last = null; if (hdist(b, ai.wp) < 3) ai.wp = randomPoint(); tx = ai.wp.x; tz = ai.wp.z; }
    const mult = S.policeSpeed(b.chase, room.level) / S.ROLE.police.speed * 0.9;
    const px = b.x, pz = b.z;
    const ok = moveBot(b, tx, tz, mult, false, dt);
    if (Math.hypot(b.x - px, b.z - pz) > 1e-3) b.yaw = Math.atan2(-(b.x - px), -(b.z - pz));
    // look around now and then
    if (t > (ai.lookAt || 0)) { ai.lookAt = t + 2500 + Math.random() * 2500; if (!best) b.yaw += (Math.random() - 0.5) * 2.5; }
    if (!ok && ++ai.stuck > 20) { ai.wp = randomPoint(); ai.stuck = 0; }
    return;
  }
  // thief: grab the nearest bill of my colour, then head for the gate; fly over giants
  let tx = S.GATE.x, tz = S.GATE.z, ty = 0;
  let cop = null, cd = 1e9;
  for (const c of room.players.values()) if (c.role === 'police') { const d = hdist(b, c); if (d < cd) { cd = d; cop = c; } }
  if (b.money < S.MONEY_NEED) {
    let best = null, bd = 1e9;
    for (const m of room.money.values()) if (m.owner === b.id) { const d = hdist(b, m) + (m.y > 1.5 ? 6 : 0); if (d < bd) { bd = d; best = m; } }
    if (best) { tx = best.x; tz = best.z; ty = best.y - 0.4; if (hdist(b, best) > 3 && best.y > 1.5) ty = best.y + 1.5; }
  } else {
    if (!ai.route) ai.route = [Math.random() < 0.5 ? -8.5 : 8.5];
    if (b.z > -20) { tx = ai.route[0]; tz = -24.2; if (Math.abs(b.x - ai.route[0]) > 2) tz = b.z; }
  }
  if (cop && cd < 7) ty = Math.max(ty, 9);
  if (b.energy < 0.05) ai.rest = true; if (b.energy > 0.8) ai.rest = false;
  const fly = !ai.rest && b.y < ty - 0.2;
  void ty;
  const ok = moveBot(b, tx, tz, 0.9, fly, dt);
  b.yaw = Math.atan2(-(tx - b.x), -(tz - b.z));
  if (!ok && ++ai.stuck > 20) { ai.stuck = 0; }
}

// ---------------- tick ----------------
setInterval(() => {
  const t = now(), dt = S.TICK_MS / 1000;
  for (const room of rooms.values()) {
    for (const p of [...room.players.values()]) {
      if (p.bot || p.connected) continue;
      if (t - p.discAt > (room.phase === 'playing' ? 30000 : 20000)) { room.players.delete(p.id); ensureHost(room); pushLobby(room); }
    }
    if (![...room.players.values()].some(p => !p.bot)) { rooms.delete(room.code); continue; }
    if (room.phase === 'reveal' && t >= room.revealUntil) {
      room.phase = 'playing'; room.startAt = t; room.endAt = t + S.ROUND_MS; room.headUntil = t + S.HEAD_MS;
      for (const p of room.players.values()) { p.lastPosAt = t; p.budget = 0; }
      broadcast(room, { t: 'go', headMs: S.HEAD_MS, roundMs: S.ROUND_MS });
      pushLobby(room);
    }
    if (room.phase === 'playing') tickPlaying(room, t, dt);
    if (room.phase === 'reveal' || room.phase === 'playing') sendState(room, t);
  }
}, S.TICK_MS);

function tickPlaying(room, t, dt) {
  const players = [...room.players.values()];
  for (const p of players) if (p.bot && !p.captured && !p.escaped) botStep(room, p, t, dt);
  const police = players.filter(p => p.role === 'police'), thieves = players.filter(p => p.role === 'thief');
  const free = () => thieves.filter(p => !p.captured && !p.escaped);

  // vision: real raycasts against the city
  for (const c of police) {
    const sees = t >= room.headUntil && free().some(th => S.canSee(MAP, c, th));
    if (sees !== c.chase) { c.chase = sees; broadcast(room, { t: 'ev', k: sees ? 'spot' : 'lost', id: c.id }); }
    if (sees) c.chaseUntil = t + 600; // speed grace while the client catches up
  }
  for (const th of thieves) th.seen = !th.captured && !th.escaped && police.some(c => c.chase && S.canSee(MAP, c, th));

  // money: touch a bill of your own colour to collect it
  for (const th of free()) for (const m of room.money.values()) {
    if (m.owner !== th.id) continue;
    if (Math.hypot(th.x - m.x, th.z - m.z) <= S.MONEY_R && th.y + 0.5 >= m.y - 1.2 && th.y <= m.y + 0.8) {
      room.money.delete(m.id); th.money++;
      broadcast(room, { t: 'ev', k: 'money', id: th.id, n: th.money, mid: m.id, x: r2(m.x), y: r2(m.y), z: r2(m.z) });
      if (th.money === 1) { room.level++; broadcast(room, { t: 'ev', k: 'lvl', level: room.level, by: th.id }); }
      if (th.money === S.MONEY_NEED) send(th, { t: 'ev', k: 'ready', id: th.id });
    }
  }

  if (t >= room.headUntil) {
    // capture: physical contact from the front or sides
    for (const th of free()) for (const c of police) {
      if (hdist(c, th) <= S.CATCH_R && th.y <= c.y + S.REACH && th.y >= c.y - 1.5 && S.facingCos(c, th) > S.FRONT_COS) {
        th.captured = true; th.stealBy = null; c.catches++;
        broadcast(room, { t: 'ev', k: 'cap', id: th.id, by: c.id, x: r2(th.x), y: r2(th.y), z: r2(th.z) });
        th.escStart = 0;
        break;
      }
    }
    // escape: a thief with 3 bills stands in the gate for 3 seconds (each thief on their own)
    for (const th of free()) {
      const inGate = th.money >= S.MONEY_NEED && Math.hypot(th.x - S.GATE.x, th.z - S.GATE.z) <= S.GATE.r && th.y < 4;
      if (!inGate) { th.escStart = 0; continue; }
      if (!th.escStart) th.escStart = t;
      if (t - th.escStart >= S.ESCAPE_MS) {
        th.escaped = true; th.escStart = 0;
        broadcast(room, { t: 'ev', k: 'esc', id: th.id });
      }
    }
  }
  const anyEscaped = thieves.some(p => p.escaped);
  if (thieves.length === 0 || free().length === 0) return endRound(room, anyEscaped ? 'thief' : 'police', anyEscaped ? 'done' : 'caught');
  if (police.length === 0) return endRound(room, 'thief', 'nopolice');
  if (t >= room.endAt) return endRound(room, anyEscaped ? 'thief' : 'police', 'time');
}

function sendState(room, t) {
  const pl = [...room.players.values()].map(p => {
    const flags = (p.captured ? 1 : 0) | (p.chase ? 2 : 0) | (p.escaped ? 4 : 0) | (p.connected ? 8 : 0) | (p.seen ? 16 : 0);
    const st = p.escStart ? Math.min(1, (t - p.escStart) / S.ESCAPE_MS) : 0;
    return [p.id, r2(p.x), r2(p.y), r2(p.z), Math.round(p.yaw * 1000) / 1000, flags, Math.round(st * 100) / 100, p.role === 'thief' ? Math.round((p.energy ?? 1) * 100) / 100 : 0, p.money || 0];
  });
  const money = [...(room.money || new Map()).values()].map(m => [m.id, m.owner, r2(m.x), r2(m.y), r2(m.z)]);
  const msg = JSON.stringify({ t: 's', ph: room.phase, tl: room.phase === 'playing' ? Math.max(0, room.endAt - t) : S.ROUND_MS, hs: room.phase === 'playing' ? Math.max(0, room.headUntil - t) : S.HEAD_MS, lv: room.level || 0, m: money, p: pl });
  for (const p of room.players.values()) if (p.ws && p.ws.readyState === 1) p.ws.send(msg);
}

// ---------------- sockets ----------------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
wss.on('connection', ws => {
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'join') return handleJoin(ws, m);
    const p = ws.player, room = ws.room;
    if (!p || !room || p.ws !== ws) return;
    const idle = room.phase === 'lobby' || room.phase === 'results';
    switch (m.t) {
      case 'pos': handlePos(room, p, m); break;
      case 'start': if (p.id === room.hostId && idle) startRound(room); break;
      case 'addbot':
        if (p.id === room.hostId && idle && room.players.size < S.MAX_PLAYERS) {
          const used = new Set([...room.players.values()].map(q => q.name));
          const b = makePlayer(room, BOT_NAMES.find(n => !used.has(n)) || 'Bot', true);
          room.players.set(b.id, b); pushLobby(room);
        }
        break;
      case 'removebot': { const b = room.players.get(m.id); if (p.id === room.hostId && idle && b && b.bot) { room.players.delete(b.id); pushLobby(room); } break; }
      case 'leave': room.players.delete(p.id); ws.player = null; ws.room = null; ensureHost(room); pushLobby(room); break;
    }
  });
  ws.on('close', () => {
    const p = ws.player, room = ws.room;
    if (!p || !room || p.ws !== ws) return;
    p.ws = null; p.connected = false; p.discAt = now(); ensureHost(room); pushLobby(room);
  });
});

function handleJoin(ws, m) {
  const name = cleanName(m.name) || 'Player';
  let room;
  if (m.create) { room = { code: newCode(), players: new Map(), hostId: null, phase: 'lobby', round: 0, level: 0, money: new Map(), escape: { by: null, start: 0 } }; rooms.set(room.code, room); }
  else { room = rooms.get(String(m.code || '').toUpperCase().trim()); if (!room) return ws.send(JSON.stringify({ t: 'error', code: 'noroom' })); }
  let p = m.token ? [...room.players.values()].find(q => q.token === m.token && !q.bot) : null;
  if (p) { if (p.ws && p.ws !== ws) { try { p.ws.close(); } catch {} } }
  else {
    if (room.players.size >= S.MAX_PLAYERS) return ws.send(JSON.stringify({ t: 'error', code: 'full' }));
    p = makePlayer(room, name, false);
    room.players.set(p.id, p);
    if (room.phase === 'reveal' || room.phase === 'playing') { // late joiner watches until the next round
      p.role = 'thief'; p.captured = true;
      broadcast(room, { t: 'roles', roles: Object.fromEntries([...room.players.values()].map(q => [q.id, q.role])) });
    }
  }
  if (!room.hostId) room.hostId = p.id;
  p.ws = ws; p.connected = true; p.discAt = 0; p.lastPosAt = now(); p.budget = 0;
  ws.player = p; ws.room = room;
  ensureHost(room);
  ws.send(JSON.stringify({ t: 'joined', you: p.id, token: p.token, code: room.code, name: p.name }));
  pushLobby(room);
  if (room.phase === 'reveal' || room.phase === 'playing') send(p, roundMsg(room, p));
  else if (room.phase === 'results' && room.result) send(p, { t: 'results', ...room.result });
}

setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch {} } }, 15000);
server.listen(PORT, () => console.log(`TRICK OR CUFF running on http://localhost:${PORT}`));
