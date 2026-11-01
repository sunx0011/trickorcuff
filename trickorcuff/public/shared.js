// TRICK OR CUFF: SUPER CHAOS — shared constants, 3D city map and physics (server + browser)
(function (root) {
  const S = {};
  S.HALF = 26;
  S.CEIL = 18;
  S.G = 24;
  S.TICK_MS = 66;
  S.REVEAL_MS = 3000;
  S.HEAD_MS = 3000;           // police stay frozen a little longer
  S.ROUND_MS = 60000;
  S.MIN_PLAYERS = 2;
  S.MAX_PLAYERS = 8;
  S.ROLE = {
    thief: { r: 0.32, h: 1.0, eye: 0.82, step: 0.5, speed: 6.0 },
    police: { r: 1.0, h: 6.0, eye: 5.3, step: 2.7, speed: 4.5 },
  };
  S.CHASE_SPEED = 7.0;          // police speed while they can see a thief
  S.VIEW_RANGE = 32;
  S.VIEW_COS = Math.cos(65 * Math.PI / 180);
  // flight
  S.FLY_UP = 6;
  S.GLIDE = 3;
  S.FLY_DRAIN = 0.22;           // energy per second while holding fly (full bar ≈ 4.5 s)
  S.FLY_REGEN = 0.45;           // per second while standing on any surface
  // keys + gate
  S.KEYS = 5;
  S.STEAL_R = 1.5;
  S.STEAL_MS = 1000;
  S.STEAL_CD = 2500;
  S.RING = { back: 1.0, up: 3.3 };          // key ring position on a police officer's back
  S.REAR_COS = -0.4;                        // thief must be behind (angle > ~114°)
  S.FRONT_COS = -0.2;                       // contact capture from front/sides only
  S.GATE = { x: -14, z: -24.3, r: 2.2 };   // far north-west, diagonal from the thieves' start
  S.ESCAPE_MS = 3000;
  // colour money
  S.MONEY_NEED = 2;              // bills a thief needs before the gate opens for them
  S.MONEY_PER = 3;               // bills spawned per thief (one spare)
  S.MONEY_R = 1.0;               // touch radius
  S.LEVEL_STEP = 0.5;            // police speed added per level
  S.THIEF_COLORS = ['#ff4d6d', '#ffd23f', '#4ade80', '#c084fc', '#ff8a3d', '#38bdf8', '#f472b6'];
  S.policeSpeed = (chase, level) => (chase ? S.CHASE_SPEED : S.ROLE.police.speed) + S.LEVEL_STEP * (level || 0);
  S.CATCH_R = 2.0;             // horizontal touch distance (police centre to thief centre)
  S.REACH = 7.4;               // giants can grab this high above their feet
  S.COLORS = ['#ff6b6b', '#ffd23f', '#4ade80', '#c084fc', '#ff9f43', '#f472b6', '#2dd4bf', '#f5f5f5'];
  S.policeCount = n => (n <= 4 ? 1 : 2);

  S.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const PALETTE = ['#ff7a8a', '#ffb547', '#57d1c9', '#8f7cff', '#6fcf7a', '#ff8f5a', '#5aa9ff', '#f06ec8', '#ffd86b', '#7be0ff'];
  const T = 'T'; // tower (slide off the pointy top)

  S.buildMap = function () {
    const rnd = S.rng(777);
    const map = { solids: [], lamps: [], skyline: [], bridges: [], pipes: [], stairs: [], props: [] };
    const box = (x, z, hw, hd, y0, y1, o) => { const s = Object.assign({ t: 'b', x, z, hw, hd, y0, y1 }, o || {}); map.solids.push(s); return s; };
    const cyl = (x, z, r, y0, y1, o) => { const s = Object.assign({ t: 'c', x, z, r, y0, y1 }, o || {}); map.solids.push(s); return s; };

    // 8 city blocks around a central plaza, each split into 4 buildings with 2.4 m cross alleys
    const BLOCKS = {
      '-17,-17': [2.6, 6.8, 4.5, T], '0,-17': [6.8, 6.8, 3.2, 5.0], '17,-17': [T, 4.5, 2.6, 6.8],
      '-17,0': [4.5, 2.6, 6.8, 3.2], '17,0': [3.2, 6.8, 2.6, 4.5],
      '-17,17': [6.8, 3.2, T, 4.5], '0,17': [5.0, 3.2, 6.8, 6.8], '17,17': [2.6, T, 6.8, 4.5],
    };
    let ci = 0;
    for (const key in BLOCKS) {
      const [bx, bz] = key.split(',').map(Number), hs = BLOCKS[key];
      const quads = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      quads.forEach(([qx, qz], i) => {
        const x = bx + qx * 3.3, z = bz + qz * 3.3, h = hs[i], tower = h === T;
        const col = PALETTE[(ci++ * 3 + 1) % PALETTE.length];
        if (tower) box(x, z, 2.1, 2.1, 0, 10, { kind: 'tower', col, slide: true, seed: (rnd() * 1e6) | 0 });
        else box(x, z, 2.1, 2.1, 0, h, { kind: 'bld', col, seed: (rnd() * 1e6) | 0 });
        // stairs hugging the outer wall of low buildings: a free way up for tiny thieves
        if (!tower && h <= 3.3) {
          const n = Math.ceil(h / 0.45), outX = qx, outZ = qz;
          for (let k = 0; k < n; k++) {
            const top = Math.min(h, (k + 1) * 0.45);
            const along = -1.8 + k * 0.62;
            // stairs run along the face pointing to the street (z side)
            const sx = x + along * -outX, sz = z + outZ * (2.1 + 0.5);
            map.stairs.push(box(sx, sz, 0.31, 0.5, 0, top, { kind: 'step' }));
          }
        }
      });
      // low pipe across one alley of every block: giants are stopped, tiny thieves slip under
      const vertical = (ci % 2) === 0;
      const p = vertical ? box(bx, bz + 3.3, 1.25, 0.22, 1.3, 1.75, { kind: 'pipe', axis: 'x' }) : box(bx + 3.3, bz, 0.22, 1.25, 1.3, 1.75, { kind: 'pipe', axis: 'z' });
      map.pipes.push(p);
    }
    // rooftop bridges (6.8 m roofs) — high enough for giants to walk underneath
    const bridge = (x0, z0, x1, z1) => {
      const x = (x0 + x1) / 2, z = (z0 + z1) / 2, alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const len = alongX ? Math.abs(x1 - x0) / 2 : Math.abs(z1 - z0) / 2;
      const b = box(x, z, alongX ? len : 0.8, alongX ? 0.8 : len, 6.4, 6.8, { kind: 'bridge', alongX });
      map.bridges.push(b);
    };
    bridge(-11.6, -20.3, -5.4, -20.3);   // block -17,-17 → 0,-17
    bridge(5.4, 20.3, 11.6, 20.3);       // 0,17 → 17,17
    bridge(-20.3, 5.4, -20.3, 11.6);     // -17,0 → -17,17
    bridge(20.3, -11.6, 20.3, -5.4);     // 17,-17 → 17,0
    // big wall pipes = ledges on the plaza-facing walls
    for (const [x, z, ax] of [[-13.7, -11.25, 'x'], [13.7, 11.25, 'x'], [-11.25, 13.7, 'z'], [11.25, -13.7, 'z']]) {
      map.pipes.push(ax === 'x' ? box(x, z, 2.6, 0.32, 2.8, 3.4, { kind: 'pipe', axis: 'x', big: true }) : box(x, z, 0.32, 2.6, 2.8, 3.4, { kind: 'pipe', axis: 'z', big: true }));
    }

    // plaza: oversized objects
    map.props.push(cyl(0, 0, 2.1, 0, 2.9, { kind: 'duck' }));
    for (let k = 0; k < 5; k++) map.stairs.push(box(0, 2.6 + k * 0.55, 0.7, 0.3, 0, 2.5 - k * 0.5, { kind: 'step', col: '#ffd23f' }));
    map.props.push(cyl(-5.6, -5.6, 1.0, 0, 3.2, { kind: 'cone' }));
    map.props.push(cyl(5.6, 5.6, 1.0, 0, 3.2, { kind: 'cone' }));
    map.props.push(cyl(-5.2, 5.2, 1.0, 0, 2.4, { kind: 'can', col: '#ff4d6d' }));
    map.props.push(box(5.2, -5.2, 1.1, 1.1, 0, 2.2, { kind: 'dice' }));
    // crate stacks on the streets (stair-step climbable)
    for (const [x, z] of [[-8.5, 4], [8.5, -4], [4, 8.5], [-4, -8.5], [-24.2, 0], [24.2, 0], [0, 24.2], [14, -24.2]]) {
      map.props.push(box(x, z, 0.5, 0.5, 0, 0.5, { kind: 'crate' }));
      map.props.push(box(x + 0.6, z + 0.6, 0.45, 0.45, 0, 1.0, { kind: 'crate' }));
    }
    // floating platforms over the streets for flyers / jumpers
    for (const [x, z, y] of [[-8.5, -8.5, 6.6], [8.5, 8.5, 6.6], [8.5, -8.5, 7.2], [-8.5, 8.5, 7.2]]) map.props.push(box(x, z, 1.1, 1.1, y - 0.4, y, { kind: 'platform' }));
    // lamps
    for (const [x, z] of [[-8.5, -11.8], [8.5, 11.8], [-11.8, 8.5], [11.8, -8.5], [-8.5, 11.8], [8.5, -11.8], [-24, -11.8], [24, 11.8], [11.8, 24], [-4, -24], [-24, 11.8], [24, -11.8]]) {
      map.lamps.push({ x, z }); cyl(x, z, 0.16, 0, 4.2, { kind: 'lamp' });
    }
    // skyline
    for (let i = 0; i < 80; i++) {
      const side = i % 4, t = (rnd() * 2 - 1) * 42, d = 30 + rnd() * 12;
      const x = side < 2 ? t : (side === 2 ? d : -d), z = side < 2 ? (side === 0 ? d : -d) : t;
      map.skyline.push({ x, z, hw: 2 + rnd() * 3, hd: 2 + rnd() * 3, h: 10 + rnd() * 22, seed: (rnd() * 1e6) | 0 });
    }
    return map;
  };

  const inside = (s, x, z, m) => s.t === 'b' ? (Math.abs(x - s.x) <= s.hw + m && Math.abs(z - s.z) <= s.hd + m) : Math.hypot(x - s.x, z - s.z) <= s.r + m;

  // push a vertical capsule out of every solid it overlaps in height
  S.resolve = function (map, x, z, y, R) {
    const pr = R.r, lim = S.HALF - 0.4 - pr;
    for (let it = 0; it < 3; it++) {
      for (const s of map.solids) {
        if (!(y + R.step < s.y1 - 1e-3 && y + R.h > s.y0)) continue;
        if (s.t === 'c') {
          const dx = x - s.x, dz = z - s.z, rr = s.r + pr, d2 = dx * dx + dz * dz;
          if (d2 < rr * rr) { const d = Math.sqrt(d2) || 1e-4; x = s.x + dx / d * rr; z = s.z + dz / d * rr; }
        } else {
          const px = Math.max(s.x - s.hw, Math.min(x, s.x + s.hw)), pz = Math.max(s.z - s.hd, Math.min(z, s.z + s.hd));
          const dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz;
          if (d2 < pr * pr) {
            if (d2 > 1e-8) { const d = Math.sqrt(d2); x = px + dx / d * pr; z = pz + dz / d * pr; }
            else { const ox = s.hw + pr - Math.abs(x - s.x), oz = s.hd + pr - Math.abs(z - s.z); if (ox < oz) x += Math.sign(x - s.x || 1) * ox; else z += Math.sign(z - s.z || 1) * oz; }
          }
        }
      }
      x = Math.max(-lim, Math.min(lim, x)); z = Math.max(-lim, Math.min(lim, z));
    }
    return { x, z };
  };

  // highest surface under (x,z) that can be stepped onto from height y
  S.groundAt = function (map, x, z, y, R) {
    let h = 0, slide = null;
    const m = R.r * 0.55;
    for (const s of map.solids) {
      if (s.y1 > h && s.y1 <= y + R.step + 0.01 && inside(s, x, z, m)) { h = s.y1; slide = s.slide ? s : null; }
    }
    return { h, slide };
  };

  // one physics step. e: {x,y,z,vy,onGround,energy}; inp: {mx,mz (world dir, len<=1), mult, fly (held)}
  S.step = function (map, e, inp, dt, role) {
    const R = S.ROLE[role];
    const sp = R.speed * (inp.mult || 1);
    let nx = e.x + (inp.mx || 0) * sp * dt, nz = e.z + (inp.mz || 0) * sp * dt;
    let flying = false;
    if (role === 'thief') {
      if (e.energy == null) e.energy = 1;
      flying = !!inp.fly && e.energy > 0;
      if (flying) { e.vy += (S.FLY_UP - e.vy) * Math.min(1, dt * 6); e.energy = Math.max(0, e.energy - S.FLY_DRAIN * dt); }
      else if (!e.onGround) e.vy = Math.max(e.vy - S.G * 0.5 * dt, -S.GLIDE);   // gentle glide down
      else e.vy = Math.min(0, e.vy - S.G * dt);
      if (e.onGround && !flying) e.energy = Math.min(1, e.energy + S.FLY_REGEN * dt);
    } else e.vy = Math.max(e.vy - S.G * dt, -30);
    let ny = e.y + e.vy * dt;
    if (ny > S.CEIL) { ny = S.CEIL; if (e.vy > 0) e.vy = 0; }
    const p = S.resolve(map, nx, nz, e.y, R); nx = p.x; nz = p.z;
    if (e.vy > 0) {
      for (const s of map.solids) if (e.y + R.h <= s.y0 + 0.02 && ny + R.h > s.y0 && inside(s, nx, nz, R.r * 0.3)) { ny = s.y0 - R.h; e.vy = 0; }
    }
    const g = S.groundAt(map, nx, nz, Math.max(e.y, ny), R);
    if (ny <= g.h) {
      ny = g.h; if (e.vy < 0) e.vy = 0; e.onGround = true;
      if (g.slide) { const dx = nx - g.slide.x, dz = nz - g.slide.z, l = Math.hypot(dx, dz) || 1; nx += dx / l * 7 * dt; nz += dz / l * 7 * dt; }
    } else if (e.onGround && !flying && e.vy <= 0 && ny - g.h < R.step + 0.05) { ny = g.h; e.vy = 0; } // walk down stairs
    else e.onGround = false;
    if (ny < 0) { ny = 0; e.vy = 0; e.onGround = true; }
    e.x = nx; e.y = ny; e.z = nz;
    return e;
  };

  // line of sight: segment a→b blocked by any opaque solid (slab test against boxes; cylinders as boxes)
  S.los = function (map, ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    for (const s of map.solids) {
      if (s.kind === 'lamp') continue;
      const hw = s.t === 'b' ? s.hw : s.r, hd = s.t === 'b' ? s.hd : s.r;
      let t0 = 0.0001, t1 = 0.9999;
      const slab = (o, d, lo, hi) => {
        if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
        let a = (lo - o) / d, b = (hi - o) / d; if (a > b) { const t = a; a = b; b = t; }
        if (a > t0) t0 = a; if (b < t1) t1 = b; return t0 <= t1;
      };
      if (slab(ax, dx, s.x - hw, s.x + hw) && slab(ay, dy, s.y0, s.y1) && slab(az, dz, s.z - hd, s.z + hd)) return false;
    }
    return true;
  };
  // can police officer c see thief th?
  S.canSee = function (map, c, th) {
    const dx = th.x - c.x, dz = th.z - c.z, d = Math.hypot(dx, dz);
    if (d > S.VIEW_RANGE) return false;
    if (d > 1.5) { const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw); if ((dx * fx + dz * fz) / d < S.VIEW_COS) return false; }
    return S.los(map, c.x, c.y + S.ROLE.police.eye, c.z, th.x, th.y + 0.5, th.z);
  };
  // cosine of the angle between the officer's facing and the direction to the thief (1 = in front, -1 = right behind)
  S.facingCos = function (c, th) {
    const dx = th.x - c.x, dz = th.z - c.z, d = Math.hypot(dx, dz) || 1e-6;
    return (dx * -Math.sin(c.yaw) + dz * -Math.cos(c.yaw)) / d;
  };
  S.ringPos = function (c) { return { x: c.x + Math.sin(c.yaw) * S.RING.back, y: c.y + S.RING.up, z: c.z + Math.cos(c.yaw) * S.RING.back }; };

  S.MAP_SEED = 1;
  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.SHARED = S;
})(typeof self !== 'undefined' ? self : this);
