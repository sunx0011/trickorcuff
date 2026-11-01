// TRICK OR CUFF: SUPER CHAOS — client (networking, physics prediction, powers, giant police, icon HUD)
(() => {
  const S = window.SHARED;
  const MAP = S.buildMap();
  const $ = id => document.getElementById(id);
  const isTouch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  if (isTouch) document.body.classList.add('touch');
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} }, del: k => { try { sessionStorage.removeItem(k); } catch {} } };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------- icons ----------------
  const I = {
    police: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z" fill="currentColor"/><path d="M12 7l1.4 2.9 3.2.4-2.3 2.2.6 3.1L12 14.1l-2.9 1.5.6-3.1-2.3-2.2 3.2-.4z" fill="#120f2a"/></svg>',
    thief: '<svg viewBox="0 0 24 24"><path d="M1.5 9.5c3.2-2.6 7.4-2.6 10.5-.4 3.1-2.2 7.3-2.2 10.5.4-.1 5.2-3 7.3-6.1 7.3-2.1 0-3.4-1.4-4.4-3-1 1.6-2.3 3-4.4 3-3.1 0-6-2.1-6.1-7.3z" fill="currentColor"/><ellipse cx="7.4" cy="11.6" rx="2.2" ry="1.5" fill="#120f2a"/><ellipse cx="16.6" cy="11.6" rx="2.2" ry="1.5" fill="#120f2a"/></svg>',
    cuffs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="7" cy="15" r="4.6"/><circle cx="17" cy="15" r="4.6"/><path d="M9.5 9.2c.8-2.6 4.2-2.6 5 0"/></svg>',
    fly: '<svg viewBox="0 0 24 24"><path d="M12 13c-2-5-6-8-11-8 1 5 4 9 9 10-3 .5-5 2-6 4 3 0 6-1 8-4 2 3 5 4 8 4-1-2-3-3.5-6-4 5-1 8-5 9-10-5 0-9 3-11 8z" fill="currentColor"/></svg>',
    invis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 3l18 18"/><path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 3.9M6.6 6.7C3.7 8.4 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    tele: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 12m-1.5 0a1.5 1.5 0 1 0 3 0a3.5 3.5 0 1 0-7 0a5.5 5.5 0 1 0 11 0a7.5 7.5 0 1 0-15 0"/></svg>',
    speed: '<svg viewBox="0 0 24 24"><path d="M13.5 2L4 13.5h6.5L9 22l10-12h-6.8z" fill="currentColor"/></svg>',
    jump: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 11l6-6 6 6M6 18l6-6 6 6"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 4v4M2.5 13v2M21.5 13v2"/><circle cx="9.3" cy="13.3" r="1.3" fill="currentColor"/><circle cx="14.7" cy="13.3" r="1.3" fill="currentColor"/><path d="M19.5 3.5v4M17.5 5.5h4" stroke-width="1.8"/></svg>',
    botS: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 4v4"/><circle cx="9.3" cy="13.3" r="1.3" fill="currentColor"/><circle cx="14.7" cy="13.3" r="1.3" fill="currentColor"/></svg>',
    leave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
    again: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>',
    crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  };
  I.key = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21M18 12v3.5M15 12v2.5"/></svg>';
  I.gate = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 21V9a8 8 0 0 1 16 0v12"/><path d="M2 21h20"/><path d="M8 21v-8M12 21v-9M16 21v-8"/></svg>';
  I.lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" fill="currentColor" fill-opacity=".25"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';
  I.unlock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" fill="currentColor" fill-opacity=".25"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/></svg>';
  I.bill = '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2.5" fill="currentColor"/><circle cx="12" cy="12" r="3.2" fill="#120f2a"/><circle cx="5.5" cy="12" r="1" fill="#120f2a"/><circle cx="18.5" cy="12" r="1" fill="#120f2a"/></svg>';
  I.eyeOff = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 3l18 18"/><path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 3.9M6.6 6.7C3.7 8.4 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.2-1"/></svg>';
  const PCOL = { fly: '#7be0ff', key: '#ffcf4a', gate: '#4ade80' };
  document.querySelectorAll('[data-i]').forEach(el => { el.innerHTML = I[el.dataset.i] || ''; if (PCOL[el.dataset.i]) el.style.color = PCOL[el.dataset.i]; });
  if (isTouch) { $('keysDesk').classList.add('hidden'); $('keysTouch').classList.remove('hidden'); }
  const ROLE_COL = { police: '#4f8dff', thief: '#ff8a3d' };

  // ---------------- sound ----------------
  const SFX = (() => {
    let ctx = null, master = null, muted = ls.get('toc_mute') === '1';
    const init = () => { if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; } try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination); } catch { ctx = null; } };
    const tone = (f, dur, type, vol, f2, delay) => { if (!ctx) return; const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05); };
    const noise = (dur, vol, f1, f2, delay) => { if (!ctx) return; const t = ctx.currentTime + (delay || 0), n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const src = ctx.createBufferSource(); src.buffer = buf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.5; bp.frequency.setValueAtTime(f1, t); bp.frequency.exponentialRampToValueAtTime(f2, t + dur); const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(bp); bp.connect(g); g.connect(master); src.start(t); };
    return {
      init, get muted() { return muted; },
      toggle() { muted = !muted; ls.set('toc_mute', muted ? '1' : '0'); if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
      stomp(v) { tone(55, 0.3, 'sine', 0.5 * v, 30); noise(0.18, 0.35 * v, 300, 80); },
      cuff() { noise(0.08, 0.5, 3000, 1500); tone(1500, 0.12, 'square', 0.08, 900); noise(0.08, 0.5, 3200, 1600, 0.12); tone(1300, 0.15, 'square', 0.08, 700, 0.12); },
      fly() { noise(0.6, 0.25, 400, 2500); tone(500, 0.5, 'sine', 0.12, 1200); },
      invis() { tone(1200, 0.5, 'sine', 0.15, 200); tone(1800, 0.4, 'triangle', 0.06, 300, 0.05); },
      tele() { tone(200, 0.35, 'sawtooth', 0.12, 2000); tone(2400, 0.3, 'sine', 0.1, 300, 0.2); noise(0.3, 0.2, 4000, 500, 0.15); },
      speed() { noise(0.5, 0.3, 800, 4000); tone(300, 0.4, 'square', 0.06, 900); },
      jump() { tone(180, 0.45, 'square', 0.12, 1400); noise(0.2, 0.3, 300, 1500); },
      beep(hi) { tone(hi ? 1046 : 660, hi ? 0.35 : 0.15, 'square', 0.09); },
      heart(v) { tone(60, 0.12, 'sine', v, 40); tone(54, 0.12, 'sine', v * 0.8, 38, 0.16); },
      win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.45, 'triangle', 0.2, null, i * 0.12)); },
      lose() { [440, 370, 311, 262].forEach((f, i) => tone(f, 0.45, 'sawtooth', 0.09, null, i * 0.16)); },
      deny() { tone(160, 0.12, 'square', 0.08, 120); },
      tick() { tone(1200, 0.05, 'square', 0.05); },
      spot() { tone(880, 0.14, 'square', 0.12); tone(1320, 0.18, 'square', 0.12, null, 0.14); },
      lost() { tone(600, 0.25, 'sine', 0.1, 300); },
      key() { [1320, 1760, 2093].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, null, i * 0.06)); noise(0.1, 0.3, 5000, 3000); },
      open() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'triangle', 0.18, null, i * 0.1)); },
      flap() { noise(0.12, 0.08, 600, 1400); },
      ping() { tone(990, 0.08, 'sine', 0.08); },
    };
  })();

  // ---------------- state ----------------
  let ws = null, wantJoin = null, retries = 0;
  let myId = null, token = null, roomCode = null, hostId = null, myName = '';
  let phase = 'none', current = 'home', lobbyPlayers = [], roles = {}, myRole = null;
  const me = { x: 0, y: 0, z: 0, vy: 0, onGround: true, energy: 1, yaw: 0, pitch: -0.05, flags: 8, steal: 0 };
  const ents = new Map();
  let tl = S.ROUND_MS, hs = S.HEAD_MS, tAt = performance.now(), keysN = 0, escP = 0;
  let lastSend = 0, lastBeep = 99, heartAt = 0, lastTickSec = 99, results = null, shake = 0, flyHeld = false, lastFlap = 0, ringFlash = {};
  const parts = [], fxs = [];
  const keys = {};
  let joy = null, look = null, fov = 1.3;
  let tcolors = {}, money = [], level = 0;
  const colorOf = id => tcolors[id] || (lobbyPlayers.find(p => p.id === id) || {}).color || '#ffffff';
  const isChase = () => (me.flags & 2) > 0;

  function show(screen) {
    current = screen;
    $('home').classList.toggle('hidden', screen !== 'home');
    $('lobby').classList.toggle('hidden', screen !== 'lobby');
    $('results').classList.toggle('hidden', screen !== 'results');
    const inGame = screen === 'game';
    $('hud').classList.toggle('hidden', !inGame);
    $('touch').classList.toggle('hidden', !(inGame && isTouch));
    if (!inGame) { document.querySelectorAll('.fx').forEach(f => f.style.opacity = 0); $('marks').innerHTML = ''; $('tags').innerHTML = ''; $('reveal').classList.add('hidden'); }
    if (screen !== 'game' && document.pointerLockElement) document.exitPointerLock();
    updateLock();
  }

  // ---------------- networking ----------------
  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = () => { retries = 0; $('net').classList.add('hidden'); if (wantJoin) ws.send(JSON.stringify(wantJoin)); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } onMsg(m); };
    ws.onclose = () => { if (roomCode) $('net').classList.remove('hidden'); setTimeout(connect, Math.min(4000, 400 * (++retries))); };
  }
  const sendMsg = m => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
  const join = m => { wantJoin = m; sendMsg(m); };

  function onMsg(m) {
    switch (m.t) {
      case 'joined':
        myId = m.you; token = m.token; roomCode = m.code; myName = m.name;
        ss.set('toc_session', JSON.stringify({ code: roomCode, token }));
        wantJoin = { t: 'join', code: roomCode, token, name: myName };
        history.replaceState(null, '', '?room=' + roomCode); $('homeErr').textContent = '';
        break;
      case 'error':
        $('homeErr').textContent = m.code === 'full' ? 'Room is full.' : 'Room not found.';
        ss.del('toc_session'); roomCode = null; wantJoin = null; show('home');
        break;
      case 'lobby':
        hostId = m.hostId; lobbyPlayers = m.players; roomCode = m.code;
        for (const id of [...ents.keys()]) if (!m.players.some(p => p.id === id)) ents.delete(id);
        renderLobby();
        if (m.phase === 'lobby' && current !== 'lobby') { phase = 'lobby'; show('lobby'); }
        if (current === 'results') renderResults();
        break;
      case 'round':
        roles = m.roles; myRole = m.me.role; phase = m.phase; results = null; tcolors = m.colors || {}; money = []; level = 0; me.money = 0; me.escP = 0;
        Object.assign(me, { x: m.me.x, y: m.me.y, z: m.me.z, vy: 0, onGround: true, energy: 1, yaw: m.me.yaw, pitch: -0.05, flags: m.me.captured ? 9 : 8, steal: 0 });
        ents.clear(); parts.length = 0; fxs.length = 0; keysN = 0; escP = 0; flyHeld = false; ringFlash = {};
        lastBeep = 99; lastTickSec = 99; tl = S.ROUND_MS; hs = S.HEAD_MS; tAt = performance.now();
        setupRoleUI(); show('game');
        if (phase === 'reveal') showReveal(); else $('reveal').classList.add('hidden');
        SFX.init(); SFX.beep(false);
        break;
      case 'roles': roles = m.roles; break;
      case 'go': phase = 'playing'; $('reveal').classList.add('hidden'); updateLock(); break;
      case 's': onState(m); break;
      case 'correct': me.x = m.x; me.z = m.z; if (m.y != null) me.y = m.y; break;
      case 'ev': onEvent(m); break;
      case 'results':
        phase = 'results'; results = m; renderResults(); show('results');
        (myRole === m.winner ? SFX.win : SFX.lose)();
        break;
    }
  }

  function onState(m) {
    const now = performance.now();
    phase = m.ph; tl = m.tl; hs = m.hs; tAt = now; level = m.lv || 0; money = m.m || [];
    for (const [id, x, y, z, yaw, flags, escp, , cash] of m.p) {
      if (id === myId) { me.flags = flags; me.escP = escp; me.money = cash; continue; }
      let e = ents.get(id); if (!e) { e = { buf: [], x, y, z, yaw, step: 0 }; ents.set(id, e); }
      e.buf.push({ t: now, x, y, z, yaw }); if (e.buf.length > 20) e.buf.shift();
      e.flags = flags; e.money = cash;
    }
  }

  // ---------------- effects ----------------
  function burst(x, y, z, col, n, spd, up) {
    const c = window.TCGL.hex(col);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random() * 0.8);
      parts.push({ x, y, z, vx: Math.sin(a) * s, vy: (up || 0) + (Math.random() - 0.3) * spd, vz: Math.cos(a) * s, life: 0.6 + Math.random() * 0.6, max: 1.2, col: c, size: 0.1 + Math.random() * 0.12, g: 6 });
    }
    if (parts.length > 260) parts.splice(0, parts.length - 260);
  }
  function feed(icon, color, dotColor) {
    const el = document.createElement('div'); el.className = 'fe';
    el.innerHTML = `<span style="color:${color}">${I[icon]}</span>${dotColor ? `<span class="dot" style="background:${dotColor};color:${dotColor}"></span>` : ''}`;
    $('feed').appendChild(el); setTimeout(() => el.remove(), 2300);
  }
  function flash(id) { const f = $(id); f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash'); }
  function pop(id) { const f = $(id); f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop'); }
  function onEvent(m) {
    if (m.k === 'cap') {
      feed('cuffs', ROLE_COL.police, colorOf(m.id)); SFX.cuff(); pop('stCap');
      burst(m.x, m.y + 0.6, m.z, '#4f8dff', 40, 5, 3); burst(m.x, m.y + 0.6, m.z, '#ffd23f', 20, 3, 4);
      fxs.push({ k: 'wave', x: m.x, y: m.y, z: m.z, t: performance.now(), col: '#4f8dff' });
      if (m.id === myId) { flash('badfx'); shake = Math.max(shake, 0.6); }
      if (m.by === myId) flash('okfx');
    } else if (m.k === 'money') {
      const c = colorOf(m.id); burst(m.x, m.y, m.z, c, 35, 4, 3);
      if (m.id === myId) { SFX.key(); flash('okfx'); pop('stMoney'); }
    } else if (m.k === 'lvl') {
      feed('speed', ROLE_COL.police, colorOf(m.by)); SFX.spot(); pop('stLvl');
      if (myRole === 'police') { shake = Math.max(shake, 0.35); }
    } else if (m.k === 'ready') {
      SFX.open(); flash('openfx'); pop('stGate');
      const b = $('big'); b.innerHTML = `<span style="color:${PCOL.gate};display:block;width:min(30vw,140px);height:min(30vw,140px)">${I.unlock}</span>`; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      setTimeout(() => { if (b.innerHTML.includes('svg')) b.innerHTML = ''; }, 1200);
    } else if (m.k === 'esc') {
      feed('gate', PCOL.gate, colorOf(m.id)); SFX.open(); pop('stEsc');
      burst(S.GATE.x, 1.5, S.GATE.z, colorOf(m.id), 50, 5, 4);
      if (m.id === myId) flash('openfx');
    } else if (m.k === 'spot') {
      if (m.id === myId) { SFX.spot(); shake = Math.max(shake, 0.3); }
      else if (myRole === 'thief') SFX.ping();
    } else if (m.k === 'lost') {
      if (m.id === myId) SFX.lost();
    }
  }

  // ---------------- lobby / results ----------------
  function chip(p, opts) {
    opts = opts || {};
    const role = opts.role ? `<span style="color:${ROLE_COL[opts.role]}">${I[opts.role]}</span>` : '';
    const stat = opts.stat ? `<span class="pts" style="display:flex;align-items:center;gap:3px">${opts.stat}</span>` : '';
    return `<div class="chip${p.id === myId ? ' me' : ''}${p.connected === false ? ' off' : ''}${opts.cls ? ' ' + opts.cls : ''}">${role}<span class="dot" style="background:${p.color};color:${p.color}"></span>${esc_(p.name)}${stat}
      ${p.id === hostId && !opts.role ? `<span style="color:var(--gold)">${I.crown}</span>` : ''}${p.bot ? I.botS : ''}
      ${opts.kick ? `<button class="x" data-bot="${p.id}">${I.x}</button>` : ''}</div>`;
  }
  const esc_ = esc0 => String(esc0).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function renderLobby() {
    $('lobbyCode').textContent = roomCode || '----';
    const isHost = myId === hostId, n = lobbyPlayers.length;
    $('chips').innerHTML = lobbyPlayers.map(p => chip(p, { kick: isHost && p.bot })).join('');
    $('count').innerHTML = `${I.person}<span>${n} / ${S.MAX_PLAYERS}</span>`;
    $('startBtn').classList.toggle('hidden', !isHost); $('startBtn').disabled = n < S.MIN_PLAYERS;
    $('botBtn').classList.toggle('hidden', !isHost || n >= S.MAX_PLAYERS);
    $('waitHost').classList.toggle('hidden', isHost);
    $('againBtn').classList.toggle('hidden', !isHost); $('againBtn').disabled = n < S.MIN_PLAYERS;
    $('againWait').classList.toggle('hidden', isHost);
  }
  function renderResults() {
    if (!results) return;
    const mine = results.players.find(p => p.id === myId) || {};
    const won = !!mine.won;
    $('winEm').style.color = won ? 'var(--gold)' : '#6b6590'; $('winEm').innerHTML = I[mine.role || results.winner];
    document.querySelector('#results .crown').style.visibility = won ? 'visible' : 'hidden';
    $('rsEsc').textContent = `${results.escaped}`;
    $('rsCap').textContent = `${results.captured}/${results.thieves}`;
    $('rsTime').textContent = fmt(results.durationMs);
    $('rsReason').innerHTML = `<span style="color:${ROLE_COL.police};display:inline-flex;align-items:center;gap:6px;font-weight:900;font-size:22px"><span style="width:28px;height:28px;display:inline-block">${I.speed}</span>${results.level}</span>`;
    $('rsReason').style.textAlign = 'center';
    const ps = results.players.slice().sort((a, b) => b.won - a.won);
    const ic = (svg, col) => `<span style="width:16px;height:16px;display:inline-block;color:${col}">${svg}</span>`;
    $('resChips').innerHTML = ps.map(p => chip({ ...p, connected: true }, {
      role: p.role, cls: p.won ? '' : 'loser',
      stat: (p.won ? ic(I.crown, 'var(--gold)') : '') + (p.role === 'police' ? (p.catches ? ic(I.cuffs, '#fff') + p.catches : '') :
        ic(I.bill, p.color) + Math.min(p.money, S.MONEY_NEED) + (p.escaped ? ic(I.gate, PCOL.gate) : p.captured ? ic(I.cuffs, ROLE_COL.police) : '')),
    })).join('');
    renderLobby();
  }
  function showReveal() {
    const r = $('reveal'), col = myRole === 'thief' ? colorOf(myId) : ROLE_COL[myRole];
    const mates = Object.entries(roles).filter(([, ro]) => ro === myRole).map(([id]) => `<span style="background:${colorOf(id)};color:${colorOf(id)}"></span>`).join('');
    const big = myRole === 'police';
    r.innerHTML = `<div class="em" style="color:${col};width:${big ? 'min(60vw,300px)' : 'min(30vw,130px)'};height:${big ? 'min(60vw,300px)' : 'min(30vw,130px)'}">${I[myRole]}</div><div class="mates">${mates}</div>` +
      (myRole === 'thief' ? `<div class="abs"><div style="color:${PCOL.fly};width:76px;height:76px">${I.fly}</div><div style="color:${colorOf(myId)};width:76px;height:76px">${I.bill}</div><div style="color:${PCOL.gate};width:76px;height:76px">${I.gate}</div></div>`
        : `<div class="abs"><div style="color:#ff3b5c;width:76px;height:76px">${I.eye}</div><div style="color:${col};width:76px;height:76px">${I.cuffs}</div></div>`);
    r.classList.remove('hidden');
  }

  // ---------------- buttons ----------------
  const nameIn = $('name'), codeIn = $('codeIn');
  nameIn.value = ls.get('toc_name') || '';
  const getName = () => { const n = nameIn.value.trim().slice(0, 12) || 'Player' + Math.floor(Math.random() * 90 + 10); ls.set('toc_name', nameIn.value.trim()); return n; };
  $('createBtn').onclick = () => { SFX.init(); join({ t: 'join', create: true, name: getName() }); };
  $('joinBtn').onclick = () => { SFX.init(); const code = codeIn.value.trim().toUpperCase(); if (code.length !== 4) { $('homeErr').textContent = '4-letter code'; return; } join({ t: 'join', code, name: getName() }); };
  codeIn.addEventListener('keydown', e => { if (e.key === 'Enter') $('joinBtn').onclick(); });
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') (codeIn.value.trim().length === 4 ? $('joinBtn') : $('createBtn')).onclick(); });
  $('startBtn').onclick = () => { SFX.init(); sendMsg({ t: 'start' }); };
  $('againBtn').onclick = () => { SFX.init(); sendMsg({ t: 'start' }); };
  $('botBtn').onclick = () => sendMsg({ t: 'addbot' });
  $('chips').onclick = e => { const b = e.target.closest('[data-bot]'); if (b) sendMsg({ t: 'removebot', id: b.dataset.bot }); };
  $('copyBtn').onclick = async () => {
    const link = `${location.origin}/?room=${roomCode}`;
    try { await navigator.clipboard.writeText(link); } catch { window.prompt('', link); }
    $('copyBtn').innerHTML = I.check; $('copyBtn').classList.add('ok');
    setTimeout(() => { $('copyBtn').innerHTML = I.link; $('copyBtn').classList.remove('ok'); }, 1600);
  };
  const leave = () => { sendMsg({ t: 'leave' }); ss.del('toc_session'); roomCode = null; wantJoin = null; myId = null; phase = 'none'; ents.clear(); history.replaceState(null, '', location.pathname); show('home'); };
  $('leaveBtn').onclick = leave; $('resLeave').onclick = leave;
  const setMuteIcon = () => { $('muteBtn').innerHTML = SFX.muted ? I.mute : I.sound; };
  $('muteBtn').onclick = () => { SFX.init(); SFX.toggle(); setMuteIcon(); }; setMuteIcon();

  const urlRoom = new URLSearchParams(location.search).get('room');
  let saved = null; try { saved = JSON.parse(ss.get('toc_session') || 'null'); } catch {}
  if (saved && (!urlRoom || urlRoom.toUpperCase() === saved.code)) { roomCode = saved.code; token = saved.token; wantJoin = { t: 'join', code: saved.code, token: saved.token, name: ls.get('toc_name') || 'Player' }; }
  else if (urlRoom) { codeIn.value = urlRoom.toUpperCase().slice(0, 4); $('createBtn').classList.replace('primary', 'ghost'); $('joinBtn').classList.replace('ghost', 'primary'); }
  connect();

  // ---------------- role UI + fly button ----------------
  function setupRoleUI() {
    const b = $('power'), thief = myRole === 'thief';
    b.classList.toggle('hidden', !thief); $('energy').classList.toggle('hidden', !thief);
    b.style.color = PCOL.fly; $('pwIcon').innerHTML = I.fly;
    $('role').style.color = myRole === 'thief' ? colorOf(myId) : ROLE_COL[myRole]; $('role').innerHTML = I[myRole]; $('role')._v = '';
  }
  const setFly = v => { if (v && !flyHeld) SFX.init(); flyHeld = v && myRole === 'thief'; };
  $('power').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); setFly(true); try { $('power').setPointerCapture(e.pointerId); } catch {} });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('power').addEventListener(ev, () => setFly(false));

  // ---------------- input ----------------
  const canvas = $('c');
  const typing = () => document.activeElement && document.activeElement.tagName === 'INPUT';
  window.addEventListener('keydown', e => {
    if (typing()) return;
    keys[e.code] = true;
    if (current === 'game' && e.code === 'Space') { e.preventDefault(); setFly(true); }
    if (e.code === 'KeyM' && !e.repeat) { SFX.init(); SFX.toggle(); setMuteIcon(); }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space') setFly(false); });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; setFly(false); });
  const lockable = () => !isTouch && current === 'game';
  function updateLock() { $('lock').classList.toggle('hidden', !(lockable() && document.pointerLockElement !== canvas && phase !== 'reveal')); }
  document.addEventListener('pointerlockchange', updateLock);
  $('lock').onclick = () => { SFX.init(); try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch {} };
  document.addEventListener('mousemove', e => { if (document.pointerLockElement !== canvas) return; me.yaw -= e.movementX * 0.0022; me.pitch = Math.max(-1.3, Math.min(1.25, me.pitch - e.movementY * 0.0022)); });
  document.addEventListener('mousedown', e => { if (document.pointerLockElement === canvas && e.button === 0) setFly(true); });
  document.addEventListener('mouseup', e => { if (e.button === 0) setFly(false); });
  document.addEventListener('contextmenu', e => { if (current === 'game') e.preventDefault(); });
  const JR = 52;
  document.addEventListener('touchstart', e => {
    if (current !== 'game') return;
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('#power, .ib')) continue;
      if (t.clientX < innerWidth * 0.45 && !joy) {
        joy = { id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 };
        Object.assign($('joyB').style, { display: 'block', left: (t.clientX - 62) + 'px', top: (t.clientY - 62) + 'px' });
        Object.assign($('joyK').style, { display: 'block', left: (t.clientX - 27) + 'px', top: (t.clientY - 27) + 'px' });
      } else if (!look) look = { id: t.identifier, x: t.clientX, y: t.clientY };
    }
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchmove', e => {
    if (current !== 'game') return;
    for (const t of e.changedTouches) {
      if (joy && t.identifier === joy.id) {
        let dx = t.clientX - joy.ox, dy = t.clientY - joy.oy; const l = Math.hypot(dx, dy); if (l > JR) { dx *= JR / l; dy *= JR / l; }
        joy.dx = dx / JR; joy.dy = dy / JR;
        Object.assign($('joyK').style, { left: (joy.ox + dx - 27) + 'px', top: (joy.oy + dy - 27) + 'px' });
      } else if (look && t.identifier === look.id) {
        me.yaw -= (t.clientX - look.x) * 0.0065; me.pitch = Math.max(-1.2, Math.min(1.15, me.pitch - (t.clientY - look.y) * 0.005));
        look.x = t.clientX; look.y = t.clientY;
      }
    }
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  const tEnd = e => { for (const t of e.changedTouches) { if (joy && t.identifier === joy.id) { joy = null; $('joyB').style.display = 'none'; $('joyK').style.display = 'none'; } if (look && t.identifier === look.id) look = null; } };
  document.addEventListener('touchend', tEnd); document.addEventListener('touchcancel', tEnd);

  // ---------------- renderer ----------------
  const R = window.TCGL.createRenderer(canvas);
  if (!R) { document.body.innerHTML = '<div style="padding:40px;color:#fff;font-family:sans-serif">This game needs WebGL. Try Chrome, Safari or Firefox.</div>'; return; }
  const W = window.TCGL.buildWorld(R, MAP, S);
  const M4 = R.M4, hex = window.TCGL.hex, mtx = new Float32Array(16), mtx2 = new Float32Array(16);
  const lampU = new Float32Array(R.NL * 4);
  MAP.lamps.forEach((l, i) => { if (i < R.NL) lampU.set([l.x, l.z, 10, 1.2], i * 4); });
  function resize() { const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.6 : 2); canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr); }
  addEventListener('resize', resize); resize();

  const lerpA = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
  function sample(buf, rt, fb) {
    if (!buf.length) return fb;
    if (rt <= buf[0].t) return buf[0];
    for (let i = buf.length - 1; i > 0; i--) if (buf[i - 1].t <= rt) { const a = buf[i - 1], c = buf[i], k = Math.min(1, (rt - a.t) / Math.max(1, c.t - a.t)); return { x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k, z: a.z + (c.z - a.z) * k, yaw: lerpA(a.yaw, c.yaw, k) }; }
    return buf[buf.length - 1];
  }
  const fmt = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const SC = { thief: 0.57, police: 3.3 };
  const GLASS_BLUE = [0.25, 0.55, 1.4], GLASS_RED = [1.8, 0.1, 0.18];

  function drawChar(id, role, color, x, y, z, yaw, t, moving, airborne, chase, now) {
    const sc = SC[role], spd = role === 'police' ? (chase ? 9 : 5.5) : 14;
    const bob = moving && !airborne ? Math.abs(Math.sin(t * spd)) * (role === 'police' ? 0.25 : 0.05) : 0;
    const sway = role === 'police' && moving ? Math.sin(t * spd) * 0.06 : 0;
    M4.compose(x, y + bob, z, yaw + sway, sc, sc, sc, mtx);
    const col = hex(color);
    if (role === 'police') {
      R.draw(W.policeBase, mtx); R.draw(W.policeAcc, mtx, col, 0.4);
      R.draw(W.glasses, mtx, chase ? GLASS_RED : GLASS_BLUE, 1);
    } else {
      R.draw(W.thiefAcc, mtx, [col[0] * 0.9, col[1] * 0.9, col[2] * 0.9], 0.15); R.draw(W.thiefBase, mtx);
      if (airborne) { const flap = 1 + Math.sin(t * 24) * 0.3; M4.compose(x, y + bob, z, yaw, sc * flap, sc, sc, mtx2); R.draw(W.wings, mtx2, hex(PCOL.fly), 0.8); }
    }
  }
  function project(vp, x, y, z) {
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12], cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13], cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    return { x: (cx / cw * 0.5 + 0.5) * innerWidth, y: (1 - (cy / cw * 0.5 + 0.5)) * innerHeight, front: cw > 0.1 };
  }

  // ---------------- main loop ----------------
  let last = performance.now(), bobT = 0, menuA = 0, myStep = 0;
  const vpM = new Float32Array(16);
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const inGame = current === 'game';
    const el = now - tAt, TL = Math.max(0, tl - (phase === 'playing' ? el : 0)), HS = Math.max(0, hs - (phase === 'playing' ? el : 0));
    const captured = (me.flags & 5) > 0;
    const frozen = phase !== 'playing' || (myRole === 'police' && HS > 0) || captured;
    const role = myRole || 'thief';
    const chase = role === 'police' && isChase();

    let moving = false;
    if (inGame && !captured) {
      let f = 0, r = 0;
      if (!frozen) {
        if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
        if (keys.KeyD) r += 1; if (keys.KeyA) r -= 1;
        if (keys.ArrowLeft) me.yaw += 2.2 * dt; if (keys.ArrowRight) me.yaw -= 2.2 * dt;
        if (joy) { f -= joy.dy; r += joy.dx; }
      }
      const l = Math.hypot(f, r); if (l > 1) { f /= l; r /= l; }
      moving = l > 0.05;
      const mult = role === 'police' ? S.policeSpeed(chase, level) / S.ROLE.police.speed : 1;
      const mx = -Math.sin(me.yaw) * f + Math.cos(me.yaw) * r, mz = -Math.cos(me.yaw) * f - Math.sin(me.yaw) * r;
      if (phase === 'playing') S.step(MAP, me, { mx, mz, mult, fly: flyHeld && !frozen }, dt, role);
      if (role === 'thief' && flyHeld && me.energy > 0 && !frozen) {
        if (now - lastFlap > 180) { lastFlap = now; SFX.flap(); }
        if (Math.random() < 0.5) parts.push({ x: me.x + (Math.random() - 0.5) * 0.4, y: me.y + 0.2, z: me.z + (Math.random() - 0.5) * 0.4, vx: 0, vy: -1, vz: 0, life: 0.5, max: 0.5, col: hex(PCOL.fly), size: 0.06, g: 0 });
      }
      if (role === 'police' && moving && !frozen) {
        myStep += dt * (chase ? 2.6 : 1.6);
        if (myStep > 1) { myStep = 0; shake = Math.max(shake, chase ? 0.4 : 0.15); SFX.stomp(chase ? 0.9 : 0.45); fxs.push({ k: 'dust', x: me.x, y: me.y, z: me.z, t: now, big: chase }); }
      }
    }
    if (inGame && phase === 'playing' && !captured && now - lastSend > S.TICK_MS) { lastSend = now; sendMsg({ t: 'pos', x: +me.x.toFixed(3), y: +me.y.toFixed(3), z: +me.z.toFixed(3), yaw: +me.yaw.toFixed(3), e: +me.energy.toFixed(2) }); }

    // camera
    shake = Math.max(0, shake - dt * 1.6);
    const sh = shake * shake, t = now / 1000;
    let ex, ey, ez, yaw, pitch;
    if (inGame && !captured) {
      bobT += (moving && (role === 'police' || me.onGround) ? (role === 'police' ? (chase ? 9 : 5.5) : 12) : 0) * dt;
      ex = me.x; ez = me.z; ey = me.y + S.ROLE[role].eye + (moving ? Math.sin(bobT) * (role === 'police' ? 0.12 : 0.03) : 0);
      yaw = me.yaw + (Math.random() - 0.5) * sh * 0.08; pitch = me.pitch + (Math.random() - 0.5) * sh * 0.12; ey += (Math.random() - 0.5) * sh * 0.5;
    } else if (inGame) { menuA += dt * 0.12; ex = Math.sin(menuA) * 26; ez = Math.cos(menuA) * 26; ey = 26; yaw = menuA; pitch = -0.72; }
    else { menuA += dt * 0.05; ex = Math.sin(menuA) * 30; ez = Math.cos(menuA) * 30; ey = 20; yaw = menuA; pitch = -0.48; }
    let tf = role === 'police' ? (chase ? 1.72 : 1.55) : (!me.onGround ? 1.42 : 1.3);
    if (!inGame || captured) tf = 1.2;
    fov += (tf - fov) * Math.min(1, dt * 6);
    const proj = M4.persp(fov, canvas.width / canvas.height, role === 'thief' ? 0.12 : 0.25, 220), view = M4.view(ex, ey, ez, yaw, pitch);
    const open = myRole !== 'thief' || me.money >= S.MONEY_NEED;
    R.frame(view, proj, [0.075, 0.06, 0.16], 18, 75, lampU, [S.GATE.x, S.GATE.z, open ? 9 : 5, open ? 1.0 + Math.sin(t * 4) * 0.25 : 0.45], open ? [0.2, 1.0, 0.45] : [1.0, 0.2, 0.25], [0, 0, 1, 0]);
    R.draw(W.sky, null, null, 1, 1, true);
    R.draw(W.static); R.draw(W.lines, null, null, 0.35); R.draw(W.emit, null, null, 1);
    R.draw(W.gateArch);
    if (!open) R.draw(W.gateBars, null, [0.75, 0.75, 0.85], 0.15);
    for (const [, owner, mx, my, mz] of money) {
      const mine = owner === myId, c = hex(colorOf(owner)), sc = mine ? 1.3 : 0.9;
      R.draw(W.bill, M4.compose(mx, my + Math.sin(t * 3 + mx) * 0.12, mz, t * 2 + mz, sc, sc, sc, mtx), c, mine ? 0.85 : 0.55);
    }

    // players
    const rt = now - 110, vis = [];
    for (const [id, e] of ents) {
      const s = sample(e.buf, rt, e);
      const mv = Math.hypot(s.x - e.x, s.z - e.z) > 0.003;
      const air = s.y - e.y > 0.003 || (roles[id] === 'thief' && s.y > 0.05 && S.groundAt(MAP, s.x, s.z, s.y, S.ROLE.thief).h < s.y - 0.05);
      e.x = s.x; e.y = s.y; e.z = s.z; e.yaw = s.yaw;
      if (!e.buf.length || (e.flags & 5)) continue;
      const ro = roles[id] || 'thief', ch = (e.flags & 2) > 0;
      if (ro === 'police' && mv) {
        e.step += dt * (ch ? 2.6 : 1.6);
        if (e.step > 1) {
          e.step = 0; fxs.push({ k: 'dust', x: s.x, y: s.y, z: s.z, t: now, big: ch });
          const d = Math.hypot(s.x - me.x, s.z - me.z);
          if (inGame && d < 30) { const k = 1 - d / 30; shake = Math.max(shake, (ch ? 0.7 : 0.4) * k); SFX.stomp(k * (ch ? 1 : 0.6)); }
        }
      }
      if (ro === 'thief' && air && Math.random() < 0.35) parts.push({ x: s.x, y: s.y + 0.2, z: s.z, vx: 0, vy: -0.8, vz: 0, life: 0.45, max: 0.45, col: hex(PCOL.fly), size: 0.06, g: 0 });
      drawChar(id, ro, colorOf(id), s.x, s.y, s.z, s.yaw, t + id.length, mv, ro === 'thief' && air, ch, now);
      vis.push({ id, ro, x: s.x, y: s.y, z: s.z, ch, steal: e.steal });
    }

    // additive effects
    R.additive(true);
    for (const l of MAP.lamps) R.draw(W.glow, M4.compose(l.x, 0.01, l.z, 0, 3.8, 1, 3.8, mtx), [0.35, 0.24, 0.12], 1, 1);
    for (const v of vis) R.draw(W.glow, M4.compose(v.x, v.y + 0.02, v.z, 0, v.ro === 'police' ? 2.2 : 0.6, 1, v.ro === 'police' ? 2.2 : 0.6, mtx), v.ro === 'police' ? (v.ch ? [0.7, 0.05, 0.1] : [0.1, 0.25, 0.6]) : hex(colorOf(v.id)).map(c => c * 0.5), 1, 1);
    // gate
    const gz = -S.HALF + 0.2;
    R.draw(W.glow, M4.compose(S.GATE.x, 0.02, S.GATE.z, 0, S.GATE.r, 1, S.GATE.r, mtx), open ? [0.15, 0.8, 0.35] : [0.5, 0.06, 0.1], 1, 1);
    R.draw(W.ring, M4.compose(S.GATE.x, 0.04, S.GATE.z, t * 0.6, S.GATE.r, 1, S.GATE.r, mtx), open ? [0.3, 1.6, 0.6] : [0.9, 0.15, 0.2], 1, 1);
    if (open) {
      const k = 0.7 + Math.sin(t * 5) * 0.25;
      R.draw(W.portal, null, [0.12 * k, 0.9 * k, 0.4 * k], 1, 1);
      R.draw(W.beam, M4.compose(S.GATE.x, 0, gz + 1.2, t, 1.6, 1, 1.6, mtx), [0.2, 1.4, 0.6], 1, 1, true);
      if (escP) R.draw(W.ring, M4.compose(S.GATE.x, 0.08, S.GATE.z, 0, S.GATE.r * escP[1], 1, S.GATE.r * escP[1], mtx), [1.5, 1.5, 0.8], 1, 1);
      if (Math.random() < 0.4) parts.push({ x: S.GATE.x + (Math.random() - 0.5) * 4.4, y: 0.2, z: gz + 0.5, vx: 0, vy: 2 + Math.random() * 2, vz: 0, life: 1, max: 1, col: hex(PCOL.gate), size: 0.08, g: 0 });
    }
    for (const [, owner, mx, my, mz] of money) {
      const mine = owner === myId, c = hex(colorOf(owner));
      R.draw(W.glow, M4.compose(mx, my - 0.68, mz, 0, mine ? 1.2 : 0.7, 1, mine ? 1.2 : 0.7, mtx), c.map(v => v * (mine ? 0.8 : 0.35)), 1, 1);
      if (mine) R.draw(W.beam, M4.compose(mx, my, mz, t, 0.12, 0.35, 0.12, mtx), c.map(v => v * 0.9), 1, 1, true);
    }
    for (let i = fxs.length - 1; i >= 0; i--) {
      const f = fxs[i], k = (now - f.t) / 1000;
      const c = f.col ? hex(f.col) : [0.6, 0.55, 0.5];
      if (f.k === 'wave') { if (k > 0.7) { fxs.splice(i, 1); continue; } const s = 1 - k / 0.7; R.draw(W.ring, M4.compose(f.x, f.y + 0.05, f.z, 0, 0.3 + k * 7, 1, 0.3 + k * 7, mtx), c.map(v => v * 1.5 * s), 1, 1); }
      else if (f.k === 'dust') { if (k > 0.6) { fxs.splice(i, 1); continue; } const s = 1 - k / 0.6, r = (f.big ? 2 : 1.2) + k * (f.big ? 8 : 5); R.draw(W.ring, M4.compose(f.x, f.y + 0.04, f.z, 0, r, 1, r, mtx), f.big ? [0.9 * s, 0.25 * s, 0.3 * s] : [0.55 * s, 0.5 * s, 0.6 * s], 1, 1); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const s = p.life / p.max;
      R.draw(W.spark, M4.compose(p.x, p.y, p.z, t * 4 + i, p.size * (0.5 + s), p.size * (0.5 + s), p.size * (0.5 + s), mtx), p.col.map(c => c * 1.4 * s), 1, 1);
    }
    R.additive(false);

    if (inGame) { M4.mul(proj, view, vpM); hud(now, TL, HS, vis, captured, chase, open); }
  }

  // ---------------- HUD ----------------
  const ARC = 301.6;
  function hud(now, TL, HS, vis, captured, chase, open) {
    const tEl = $('timer');
    tEl.textContent = phase === 'playing' ? fmt(TL) : fmt(S.ROUND_MS);
    tEl.classList.toggle('low', phase === 'playing' && TL <= 15000);
    $('tbar').firstElementChild.style.transform = `scaleX(${phase === 'playing' ? TL / S.ROUND_MS : 1})`;
    if (phase === 'playing' && TL <= 10000) { const sec = Math.ceil(TL / 1000); if (sec !== lastTickSec) { lastTickSec = sec; SFX.tick(); } }
    // status: keys, gate, captured
    const thieves = Object.entries(roles).filter(([, r]) => r === 'thief');
    const flagOf = id => id === myId ? me.flags : ((ents.get(id) || {}).flags || 0);
    const capN = thieves.filter(([id]) => flagOf(id) & 1).length, escN = thieves.filter(([id]) => flagOf(id) & 4).length;
    const set = (id, html, cls) => { const e = $(id); if (e._v !== html + cls) { e.innerHTML = html; e.className = 'st ' + cls + (e.classList.contains('pop') ? ' pop' : ''); e._v = html + cls; } };
    const th = myRole === 'thief';
    $('stMoney').style.display = th ? '' : 'none'; $('stGate').style.display = th ? '' : 'none';
    if (th) { set('stMoney', `<span style="color:${colorOf(myId)}">${I.bill}</span><span>${Math.min(me.money || 0, S.MONEY_NEED)}/${S.MONEY_NEED}</span>`, ''); set('stGate', open ? I.unlock : I.lock, open ? 'open' : ''); }
    set('stLvl', `<span style="color:${ROLE_COL.police}">${I.speed}</span><span>${level}</span>`, level ? 'gold' : '');
    set('stEsc', `<span style="color:${PCOL.gate}">${I.gate}</span><span>${escN}</span>`, '');
    set('stCap', `${I.cuffs}<span>${capN}/${thieves.length}</span>`, '');
    // head start
    if (phase === 'playing' && HS > 0) {
      const n = Math.ceil(HS / 1000);
      if (n !== lastBeep) { lastBeep = n; const b = $('big'); b.textContent = n; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); SFX.beep(false); }
    } else if (phase === 'playing' && lastBeep !== 0 && lastBeep !== 99) { lastBeep = 0; if (!$('big').innerHTML.includes('svg')) $('big').textContent = ''; SFX.beep(true); }
    $('headfx').style.opacity = phase === 'playing' && HS > 0 && myRole === 'police' ? 1 : 0;

    // vision state: police = own glasses, thief = am I being watched
    const v = $('vision'), red = myRole === 'police' ? chase : (me.flags & 16) > 0;
    v.classList.toggle('red', !!red && !captured);
    const vi = captured ? 'eyeOff' : 'eye';
    if (v._v !== vi) { v.innerHTML = I[vi]; v._v = vi; }
    if (myRole === 'thief' && !captured && (me.flags & 16) && now > heartAt) { heartAt = now + 450; SFX.heart(0.3); }
    $('chasefx').style.opacity = !captured && red ? (myRole === 'police' ? 0.35 : 0.55 + 0.2 * Math.sin(now / 100)) : 0;
    $('flyfx').style.opacity = myRole === 'thief' && !me.onGround && !captured ? 0.6 : 0;
    $('specfx').style.opacity = captured ? 1 : 0;

    // energy + fly button
    if (myRole === 'thief') {
      const en = $('energy'); en.firstElementChild.style.transform = `scaleX(${me.energy})`; en.classList.toggle('low', me.energy < 0.25);
      const b = $('power'); b.classList.toggle('on', flyHeld && me.energy > 0); b.style.opacity = captured ? 0.25 : (me.energy <= 0 ? 0.45 : 1);
    }
    if (captured) { $('role').style.color = '#a79fd0'; if ($('role')._v !== 'eye') { $('role').innerHTML = I.eye; $('role')._v = 'eye'; } }

    // progress ring: stealing a key or escaping
    let prog = 0, pcol = '', icon = '';
    if (me.escP > 0) { prog = me.escP; pcol = PCOL.gate; icon = 'gate'; }
    if (myRole === 'police') { /* police feel the theft through the flash + shake */ }
    $('prog').classList.toggle('hidden', prog <= 0); $('progIcon').classList.toggle('hidden', prog <= 0);
    if (prog > 0) {
      const arc = $('progArc'); arc.style.stroke = pcol; arc.setAttribute('stroke-dashoffset', String(ARC * (1 - prog)));
      const pi = $('progIcon'); if (pi._v !== icon) { pi.innerHTML = I[icon]; pi.style.color = pcol; pi._v = icon; }
    }

    // markers clamped to the screen edge: my bills, then the gate once I have 3
    let html = '';
    const mark = (x, y, z, cls, inner, style) => {
      let p = project(vpM, x, y, z);
      if (!p.front || p.x < 30 || p.x > innerWidth - 30 || p.y < 30 || p.y > innerHeight - 30) {
        const dx = x - me.x, dz = z - me.z, fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw), rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
        const a = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz), w2 = innerWidth / 2 - 50, h2 = innerHeight / 2 - 50;
        const k = Math.min(w2 / Math.abs(Math.sin(a) || 1e-3), h2 / Math.abs(Math.cos(a) || 1e-3));
        p = { x: innerWidth / 2 + Math.sin(a) * k, y: innerHeight / 2 - Math.cos(a) * k };
      }
      html += `<div class="${cls}" style="left:${p.x | 0}px;top:${p.y | 0}px;${style || ''}">${inner}</div>`;
    };
    if (myRole === 'thief' && !captured && phase === 'playing') {
      if (open) mark(S.GATE.x, 2.5, S.GATE.z, 'edge', I.gate);
      else for (const [, owner, mx, my, mz] of money) if (owner === myId) { const c = colorOf(myId); mark(mx, my + 0.6, mz, 'edge', I.bill, `color:${c};border-color:${c};box-shadow:0 0 14px ${c};width:34px;height:34px;margin:-17px`); }
    }
    const mk = $('marks'); if (mk._v !== html) { mk.innerHTML = html; mk._v = html; }
  }

  window.__toc = () => ({ me: { ...me }, phase, myRole, fov, current });
  requestAnimationFrame(loop);
})();
