// Small WebGL renderer + low-poly cartoon night city for TRICK OR CUFF (no external libraries)
(function () {
  const M4 = {
    mul(a, b, out) {
      out = out || new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      return out;
    },
    persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]); },
    compose(x, y, z, ry, sx, sy, sz, out) {
      out = out || new Float32Array(16);
      const c = Math.cos(ry), s = Math.sin(ry);
      out[0] = c * sx; out[1] = 0; out[2] = -s * sx; out[3] = 0; out[4] = 0; out[5] = sy; out[6] = 0; out[7] = 0;
      out[8] = s * sz; out[9] = 0; out[10] = c * sz; out[11] = 0; out[12] = x; out[13] = y; out[14] = z; out[15] = 1;
      return out;
    },
    view(px, py, pz, yaw, pitch) {
      const cy = Math.cos(-yaw), sy = Math.sin(-yaw), cp = Math.cos(-pitch), sp = Math.sin(-pitch);
      const ry = new Float32Array([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1]);
      const rx = new Float32Array([1, 0, 0, 0, 0, cp, sp, 0, 0, -sp, cp, 0, 0, 0, 0, 1]);
      const t = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -px, -py, -pz, 1]);
      return M4.mul(M4.mul(rx, ry), t);
    },
  };
  const hex = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const mulc = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  class Geo {
    constructor() { this.v = []; }
    tri(a, b, c, col, center) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      if (center) { const mx = (a[0] + b[0] + c[0]) / 3 - center[0], my = (a[1] + b[1] + c[1]) / 3 - center[1], mz = (a[2] + b[2] + c[2]) / 3 - center[2]; if (nx * mx + ny * my + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz; } }
      else if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      for (const p of [a, b, c]) this.v.push(p[0], p[1], p[2], nx, ny, nz, col[0], col[1], col[2]);
    }
    quad(a, b, c, d, col, center) { this.tri(a, b, c, col, center); this.tri(a, c, d, col, center); }
    // flat quad with explicit normal (for windows/decals)
    flat(a, b, c, d, n, col) { for (const p of [a, b, c, a, c, d]) this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2]); }
  }
  const T = (x, y, z, ry, s, sy) => { const c = Math.cos(ry), sn = Math.sin(ry); sy = sy == null ? s : sy; return p => [x + (c * p[0] + sn * p[2]) * s, y + p[1] * sy, z + (-sn * p[0] + c * p[2]) * s]; };
  const jit = (col, rnd, amt) => { const k = 1 + (rnd() - 0.5) * amt; return [col[0] * k, col[1] * k, col[2] * k]; };

  function cyl(g, tf, seg, rb, rt, y0, h, col, rnd, amt, rot) {
    rot = rot || 0; const center = tf([0, y0 + h / 2, 0]);
    for (let i = 0; i < seg; i++) {
      const a0 = rot + i / seg * Math.PI * 2, a1 = rot + (i + 1) / seg * Math.PI * 2;
      const b0 = tf([Math.cos(a0) * rb, y0, Math.sin(a0) * rb]), b1 = tf([Math.cos(a1) * rb, y0, Math.sin(a1) * rb]);
      const c = jit(col, rnd, amt);
      if (rt > 1e-4) {
        const t0 = tf([Math.cos(a0) * rt, y0 + h, Math.sin(a0) * rt]), t1 = tf([Math.cos(a1) * rt, y0 + h, Math.sin(a1) * rt]);
        g.quad(b0, b1, t1, t0, c, center); g.tri(tf([0, y0 + h, 0]), t0, t1, jit(col, rnd, amt * 0.5), center);
      } else g.tri(b0, b1, tf([0, y0 + h, 0]), c, center);
    }
  }
  function box(g, tf, hw, y0, h, hd, col, rnd, amt, top) {
    const p = (x, y, z) => tf([x, y, z]), center = tf([0, y0 + h / 2, 0]);
    const x0 = -hw, x1 = hw, z0 = -hd, z1 = hd, y1 = y0 + h;
    g.quad(p(x0, y1, z0), p(x1, y1, z0), p(x1, y1, z1), p(x0, y1, z1), top || jit(col, rnd, amt), center);
    g.quad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), jit(col, rnd, amt), center);
    g.quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y1, z0), p(x0, y1, z0), jit(col, rnd, amt), center);
    g.quad(p(x1, y0, z0), p(x1, y0, z1), p(x1, y1, z1), p(x1, y1, z0), jit(mulc(col, 0.9), rnd, amt), center);
    g.quad(p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0), jit(mulc(col, 0.9), rnd, amt), center);
  }
  function blob(g, tf, seg, rings, r, col, rnd, amt, noise) {
    const center = tf([0, 0, 0]), pts = [];
    for (let j = 0; j <= rings; j++) {
      const row = [], ph = j / rings * Math.PI;
      for (let i = 0; i < seg; i++) { const th = i / seg * Math.PI * 2, rr = r * (1 + (j === 0 || j === rings ? 0 : (rnd() - 0.5) * noise)); row.push(tf([Math.sin(ph) * Math.cos(th) * rr, Math.cos(ph) * rr, Math.sin(ph) * Math.sin(th) * rr])); }
      pts.push(row);
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = pts[j][i], b = pts[j][(i + 1) % seg], c = pts[j + 1][(i + 1) % seg], d = pts[j + 1][i];
      if (j === 0) g.tri(a, c, d, jit(col, rnd, amt), center); else if (j === rings - 1) g.tri(a, b, d, jit(col, rnd, amt), center); else g.quad(a, b, c, d, jit(col, rnd, amt), center);
    }
  }
  function octa(g, tf, r, hT, hB, col) {
    const center = tf([0, 0, 0]), top = tf([0, hT, 0]), bot = tf([0, -hB, 0]);
    const ring = [0, 1, 2, 3].map(i => tf([Math.cos(i * Math.PI / 2) * r, 0, Math.sin(i * Math.PI / 2) * r]));
    for (let i = 0; i < 4; i++) { g.tri(top, ring[i], ring[(i + 1) % 4], col, center); g.tri(bot, ring[i], ring[(i + 1) % 4], mulc(col, 0.75), center); }
  }
  function disc(g, r, seg, cC, cE, y) {
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      g.v.push(0, y, 0, 0, 1, 0, ...cC, Math.cos(a0) * r, y, Math.sin(a0) * r, 0, 1, 0, ...cE, Math.cos(a1) * r, y, Math.sin(a1) * r, 0, 1, 0, ...cE);
    }
  }
  function ring(g, r0, r1, seg, col, y) {
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const p = (r, a) => [Math.cos(a) * r, y, Math.sin(a) * r];
      g.flat(p(r0, a0), p(r1, a0), p(r1, a1), p(r0, a1), [0, 1, 0], col);
    }
  }

  // ---------------- shader: per-fragment lighting with warm street-lamp pools ----------------
  const NL = 12;
  const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol;
uniform mat4 uProj, uView, uModel; uniform vec3 uTint;
varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vDepth;
void main(){
  vec4 wp = uModel * vec4(aPos, 1.0);
  vec4 vp = uView * wp;
  gl_Position = uProj * vp;
  vN = mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * aNor;
  vW = wp.xyz; vCol = aCol * uTint; vDepth = -vp.z;
}`;
  const FS = `
precision mediump float;
uniform vec3 uFogCol; uniform vec2 uFog; uniform float uAlpha; uniform float uEmit; uniform float uNoFog;
uniform vec4 uLamps[${NL}]; uniform vec4 uSiren; uniform vec3 uSirenCol; uniform vec4 uPad;
varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vDepth;
void main(){
  vec3 n = normalize(vN);
  vec3 base = vCol;
  float hemi = n.y * 0.5 + 0.5;
  vec3 amb = mix(vec3(0.10, 0.08, 0.20), vec3(0.30, 0.32, 0.55), hemi);
  float moon = max(dot(n, normalize(vec3(-0.5, 0.75, -0.45))), 0.0);
  vec3 light = amb + vec3(0.30, 0.34, 0.60) * moon;
  for (int i = 0; i < ${NL}; i++) {
    vec4 L = uLamps[i];
    vec3 d = vec3(L.x, 3.6, L.y) - vW;
    float dist = length(d);
    float att = max(0.0, 1.0 - dist / L.z);
    float ndl = max(dot(n, d / dist), 0.0) * 0.7 + 0.3;
    light += vec3(1.0, 0.72, 0.42) * att * att * ndl * L.w;
  }
  float sd = length(vW.xz - uSiren.xy); float sg = max(0.0, 1.0 - sd / uSiren.z);
  light += uSirenCol * sg * sg * uSiren.w;
  float pd = length(vW.xz - uPad.xy); float pg = max(0.0, 1.0 - pd / uPad.z);
  light += vec3(0.3, 1.0, 0.55) * pg * pg * uPad.w;
  vec3 c = mix(base * light, base, uEmit);
  float fog = uNoFog > 0.5 ? 0.0 : clamp((vDepth - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  gl_FragColor = vec4(mix(c, uFogCol, fog * (1.0 - uEmit * 0.6)), uAlpha);
}`;

  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const A = { pos: gl.getAttribLocation(prog, 'aPos'), nor: gl.getAttribLocation(prog, 'aNor'), col: gl.getAttribLocation(prog, 'aCol') };
    const U = {};
    ['uProj', 'uView', 'uModel', 'uTint', 'uEmit', 'uFog', 'uFogCol', 'uAlpha', 'uNoFog', 'uLamps', 'uSiren', 'uSirenCol', 'uPad'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    const ident = M4.compose(0, 0, 0, 0, 1, 1, 1);
    return {
      gl, M4, NL,
      mesh(geo) { const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.v), gl.STATIC_DRAW); return { buf, count: geo.v.length / 9 }; },
      frame(view, proj, fogCol, fogN, fogF, lamps, siren, sirenCol, pad) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(fogCol[0], fogCol[1], fogCol[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(U.uProj, false, proj); gl.uniformMatrix4fv(U.uView, false, view);
        gl.uniform3fv(U.uFogCol, fogCol); gl.uniform2f(U.uFog, fogN, fogF);
        gl.uniform4fv(U.uLamps, lamps); gl.uniform4fv(U.uSiren, siren); gl.uniform3fv(U.uSirenCol, sirenCol); gl.uniform4fv(U.uPad, pad);
        gl.disable(gl.BLEND); gl.depthMask(true);
      },
      additive(on) { if (on) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); } else { gl.disable(gl.BLEND); gl.depthMask(true); } },
      alpha(on) { if (on) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); } else { gl.disable(gl.BLEND); gl.depthMask(true); } },
      draw(mesh, model, tint, emit, alpha, noFog) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
        gl.enableVertexAttribArray(A.pos); gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, 36, 0);
        gl.enableVertexAttribArray(A.nor); gl.vertexAttribPointer(A.nor, 3, gl.FLOAT, false, 36, 12);
        gl.enableVertexAttribArray(A.col); gl.vertexAttribPointer(A.col, 3, gl.FLOAT, false, 36, 24);
        gl.uniformMatrix4fv(U.uModel, false, model || ident);
        gl.uniform3fv(U.uTint, tint || [1, 1, 1]); gl.uniform1f(U.uEmit, emit || 0);
        gl.uniform1f(U.uAlpha, alpha == null ? 1 : alpha); gl.uniform1f(U.uNoFog, noFog ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      },
    };
  }

  // ---------------- city (SUPER CHAOS) ----------------
  function buildWorld(R, map, S) {
    const rnd = S.rng(99);
    const W = {};
    const g = new Geo(), em = new Geo(), lines = new Geo();
    const H = S.HALF;

    // ground
    const road = hex('#272b45'), walk = hex('#4d5274'), plaza = hex('#6a5fa8'), plaza2 = hex('#7a6fbb'), outside = hex('#1b1d2e');
    const blocks = [-17, 0, 17];
    for (let x = -H - 8; x < H + 8; x += 1) for (let z = -H - 8; z < H + 8; z += 1) {
      const cx = x + 0.5, cz = z + 0.5;
      let col = road;
      if (Math.abs(cx) > H || Math.abs(cz) > H) col = outside;
      else {
        for (const bx of blocks) for (const bz of blocks) if (Math.abs(cx - bx) <= 6.2 && Math.abs(cz - bz) <= 6.2) col = walk;
        if (Math.abs(cx) <= 6.2 && Math.abs(cz) <= 6.2) col = ((Math.floor(cx) + Math.floor(cz)) & 1) ? plaza : plaza2;
      }
      g.flat([x, 0, z], [x + 1, 0, z], [x + 1, 0, z + 1], [x, 0, z + 1], [0, 1, 0], jit(col, rnd, 0.08));
    }
    // lane dashes
    const dash = hex('#e8d36a');
    for (const k of [-8.5, 8.5]) for (let t = -H + 1; t < H - 1; t += 2.4) {
      if ([-8.5, 8.5].some(v => Math.abs(t + 0.6 - v) < 3.2)) continue;
      lines.flat([t, 0.012, k - 0.08], [t + 1.2, 0.012, k - 0.08], [t + 1.2, 0.012, k + 0.08], [t, 0.012, k + 0.08], [0, 1, 0], dash);
      lines.flat([k - 0.08, 0.012, t], [k + 0.08, 0.012, t], [k + 0.08, 0.012, t + 1.2], [k - 0.08, 0.012, t + 1.2], [0, 1, 0], dash);
    }
    // zebra crossings
    for (const ix of [-8.5, 8.5]) for (const iz of [-8.5, 8.5]) for (const side of [-1, 1]) for (let i = -2; i <= 2; i++) {
      const zz = iz + side * 3.6, xx = ix + i * 1.0, xx2 = ix + side * 3.6, zz2 = iz + i * 1.0;
      lines.flat([xx - 0.3, 0.013, zz - 0.7], [xx + 0.3, 0.013, zz - 0.7], [xx + 0.3, 0.013, zz + 0.7], [xx - 0.3, 0.013, zz + 0.7], [0, 1, 0], [0.85, 0.86, 0.95]);
      lines.flat([xx2 - 0.7, 0.013, zz2 - 0.3], [xx2 + 0.7, 0.013, zz2 - 0.3], [xx2 + 0.7, 0.013, zz2 + 0.3], [xx2 - 0.7, 0.013, zz2 + 0.3], [0, 1, 0], [0.85, 0.86, 0.95]);
    }

    const winWarm = [hex('#ffd98a'), hex('#ffc46b'), hex('#fff1b8')], winCool = [hex('#8fe3ff'), hex('#ff9ad5'), hex('#b8a6ff')], winOff = hex('#1d2140');
    const windows = (b, wr, dense) => {
      for (const [fx, fz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const len = fx === 0 ? b.hw * 2 : b.hd * 2, cols = Math.max(1, Math.floor((len - 0.6) / 1.2)), rows = Math.max(1, Math.floor((b.h - 1.2) / 1.4));
        const span = (cols - 1) * 1.2;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const u = -span / 2 + c * 1.2, y0 = 1.1 + r * 1.4, y1 = y0 + 0.8, on = wr() < dense;
          const col = on ? (wr() < 0.7 ? winWarm : winCool)[(wr() * 3) | 0] : winOff, tg = on ? em : g;
          if (fx === 0) { const zz = b.z + fz * (b.hd + 0.02); tg.flat([b.x + u - 0.3, y0, zz], [b.x + u + 0.3, y0, zz], [b.x + u + 0.3, y1, zz], [b.x + u - 0.3, y1, zz], [0, 0, fz], col); }
          else { const xx = b.x + fx * (b.hw + 0.02); tg.flat([xx, y0, b.z + u - 0.3], [xx, y0, b.z + u + 0.3], [xx, y1, b.z + u + 0.3], [xx, y1, b.z + u - 0.3], [fx, 0, 0], col); }
        }
      }
    };
    const neonCols = ['#ff4fd8', '#4ff0ff', '#ffe14f', '#7dff7a'];
    for (const s of map.solids) {
      const wr = S.rng(s.seed || 1);
      if (s.kind === 'bld' || s.kind === 'tower') {
        const col = hex(s.col);
        box(g, T(s.x, 0, s.z, 0, 1), s.hw, 0, s.y1, s.hd, col, rnd, 0.05, s.kind === 'bld' ? hex('#3a3f63') : mulc(col, 0.6));
        windows({ x: s.x, z: s.z, hw: s.hw, hd: s.hd, h: s.y1 }, wr, 0.5);
        if (s.kind === 'tower') {
          // pointy roof you slide off
          cyl(g, T(s.x, 0, s.z, Math.PI / 4, 1), 4, s.hw * 1.45, 0, s.y1, 3.2, mulc(col, 0.75), rnd, 0.08, Math.PI / 4);
          octa(em, T(s.x, s.y1 + 3.5, s.z, 0, 1), 0.25, 0.4, 0.2, hex('#ff5470'));
        } else {
          // rooftop parapet + neon edge so roofs read as places to stand
          const n = hex(neonCols[(wr() * 4) | 0]);
          for (const [dx, dz, hw, hd] of [[0, -s.hd, s.hw, 0.06], [0, s.hd, s.hw, 0.06], [-s.hw, 0, 0.06, s.hd], [s.hw, 0, 0.06, s.hd]]) box(em, T(s.x + dx, 0, s.z + dz, 0, 1), hw, s.y1, 0.07, hd, n, rnd, 0);
          if (wr() < 0.5) cyl(g, T(s.x + (wr() - 0.5) * 2, 0, s.z + (wr() - 0.5) * 2, 0, 1), 6, 0.35, 0.35, s.y1, 0.6, hex('#8b8fa8'), rnd, 0.1);
        }
        // awning
        const aw = hex(['#ff5d73', '#3dd6c6', '#ffc63d', '#a78bfa'][(wr() * 4) | 0]), fz = wr() < 0.5 ? -1 : 1, zz = s.z + fz * s.hd;
        g.quad([s.x - 1.4, 2.0, zz], [s.x + 1.4, 2.0, zz], [s.x + 1.4, 1.7, zz + fz * 0.7], [s.x - 1.4, 1.7, zz + fz * 0.7], aw);
      } else if (s.kind === 'step') {
        box(g, T(s.x, 0, s.z, 0, 1), s.hw, 0, s.y1, s.hd, hex(s.col || '#c7a27a'), rnd, 0.1, hex(s.col ? '#ffe680' : '#e3c08f'));
      } else if (s.kind === 'bridge') {
        const c = hex('#d2694a');
        box(g, T(s.x, 0, s.z, 0, 1), s.hw, s.y0, s.y1 - s.y0, s.hd, c, rnd, 0.1, hex('#b5865a'));
        // rails
        for (const side of [-1, 1]) {
          const ox = s.alongX ? 0 : side * (s.hw - 0.05), oz = s.alongX ? side * (s.hd - 0.05) : 0;
          box(em, T(s.x + ox, 0, s.z + oz, 0, 1), s.alongX ? s.hw : 0.04, s.y1 + 0.55, 0.06, s.alongX ? 0.04 : s.hd, hex('#ffe14f'), rnd, 0);
          const len = s.alongX ? s.hw : s.hd;
          for (let k = -len; k <= len + 0.01; k += 1.0) box(g, T(s.x + (s.alongX ? k : ox), 0, s.z + (s.alongX ? oz : k), 0, 1), 0.04, s.y1, 0.6, 0.04, hex('#3b2a33'), rnd, 0);
        }
      } else if (s.kind === 'pipe') {
        const c = s.big ? hex('#3fb27f') : hex('#e0663f'), r = (s.y1 - s.y0) / 2, len = s.axis === 'x' ? s.hw : s.hd, yc = (s.y0 + s.y1) / 2;
        // horizontal cylinder built from a rotated box ring
        for (let i = 0; i < 8; i++) {
          const a0 = i / 8 * Math.PI * 2, a1 = (i + 1) / 8 * Math.PI * 2;
          const P = (a, t) => s.axis === 'x' ? [s.x + t, yc + Math.sin(a) * r, s.z + Math.cos(a) * r] : [s.x + Math.cos(a) * r, yc + Math.sin(a) * r, s.z + t];
          g.quad(P(a0, -len), P(a1, -len), P(a1, len), P(a0, len), jit(c, rnd, 0.15), [s.x, yc, s.z]);
        }
        for (const t of [-len, len]) { const P = s.axis === 'x' ? [s.x + t, 0, s.z] : [s.x, 0, s.z + t]; cyl(g, T(P[0], 0, P[2], 0, 1), 6, 0.08, 0.08, 0, s.y0, hex('#555a78'), rnd, 0); }
        if (!s.big) box(em, T(s.x, 0, s.z, 0, 1), s.axis === 'x' ? len : r + 0.02, yc - 0.04, 0.08, s.axis === 'x' ? r + 0.02 : len, hex('#ffe14f'), rnd, 0);
      } else if (s.kind === 'duck') {
        const y = hex('#ffd23f');
        blob(g, T(0, 1.5, 0, 0, 2.2, 1.5), 12, 8, 1, y, rnd, 0.06, 0.04);
        blob(g, T(0, 4.0, -1.0, 0, 1.2), 10, 7, 1, y, rnd, 0.06, 0.03);
        blob(g, T(0, 3.8, -2.2, 0, 0.6, 0.25), 8, 5, 1, hex('#ff8a2b'), rnd, 0.05, 0);
        blob(em, T(-0.55, 4.4, -2.0, 0, 0.16), 6, 4, 1, [0.05, 0.05, 0.1], rnd, 0, 0);
        blob(em, T(0.55, 4.4, -2.0, 0, 0.16), 6, 4, 1, [0.05, 0.05, 0.1], rnd, 0, 0);
        blob(g, T(0, 2.4, 2.0, 0, 0.8, 0.6), 8, 5, 1, y, rnd, 0.06, 0.04);
      } else if (s.kind === 'cone') {
        cyl(g, T(s.x, 0, s.z, 0, 1), 4, 1.5, 1.5, 0, 0.3, hex('#ff6a2b'), rnd, 0.05, Math.PI / 4);
        cyl(g, T(s.x, 0, s.z, 0, 1), 12, 1.1, 0.12, 0.3, 4.2, hex('#ff6a2b'), rnd, 0.05);
        cyl(em, T(s.x, 0, s.z, 0, 1), 12, 0.78, 0.6, 1.6, 0.6, hex('#ffffff'), rnd, 0);
      } else if (s.kind === 'can') {
        cyl(g, T(s.x, 0, s.z, 0, 1), 14, s.r, s.r, 0, s.y1, hex(s.col), rnd, 0.05);
        cyl(g, T(s.x, 0, s.z, 0, 1), 14, s.r * 0.9, s.r * 0.9, s.y1, 0.08, hex('#d6d8e8'), rnd, 0);
        cyl(em, T(s.x, 0, s.z, 0, 1), 14, s.r + 0.01, s.r + 0.01, s.y1 * 0.4, 0.5, hex('#ffffff'), rnd, 0);
      } else if (s.kind === 'dice') {
        box(g, T(s.x, 0, s.z, 0.0, 1), s.hw, 0, s.y1, s.hd, hex('#f4f1ff'), rnd, 0.03);
        for (const [dx, dz] of [[-0.5, -0.5], [0, 0], [0.5, 0.5]]) box(g, T(s.x + dx, 0, s.z + dz, 0, 1), 0.16, s.y1, 0.02, 0.16, hex('#e23b5a'), rnd, 0);
      } else if (s.kind === 'crate') {
        box(g, T(s.x, 0, s.z, 0, 1), s.hw, s.y0, s.y1 - s.y0, s.hd, hex('#b9874f'), rnd, 0.12);
      } else if (s.kind === 'platform') {
        box(g, T(s.x, 0, s.z, 0, 1), s.hw, s.y0, s.y1 - s.y0, s.hd, hex('#5aa9ff'), rnd, 0.05, hex('#9fd0ff'));
        box(em, T(s.x, 0, s.z, 0, 1), s.hw + 0.02, s.y0 - 0.02, 0.06, s.hd + 0.02, hex('#7be0ff'), rnd, 0);
      } else if (s.kind === 'lamp') {
        cyl(g, T(s.x, 0, s.z, 0, 1), 6, 0.12, 0.08, 0, 4.2, hex('#2b2d45'), rnd, 0);
        cyl(em, T(s.x, 0, s.z, 0, 1), 8, 0.32, 0.14, 4.0, 0.45, hex('#ffe2a0'), rnd, 0);
      }
    }
    // boundary wall + skyline
    const brick = hex('#7a4b5e'), hedge = hex('#2f6b47');
    for (const [x, z, hw, hd] of [[0, -H - 0.3, H + 0.6, 0.3], [0, H + 0.3, H + 0.6, 0.3], [-H - 0.3, 0, 0.3, H], [H + 0.3, 0, 0.3, H]]) {
      box(g, T(x, 0, z, 0, 1), hw, 0, 1.6, hd, brick, rnd, 0.06); box(g, T(x, 0, z, 0, 1), hw, 1.6, 0.5, hd + 0.12, hedge, rnd, 0.15);
    }
    for (const s of map.skyline) {
      const wr = S.rng(s.seed), c = hex(['#3a3466', '#2e3a66', '#4a3360', '#33405e'][(wr() * 4) | 0]);
      box(g, T(s.x, 0, s.z, 0, 1), s.hw, 0, s.h, s.hd, c, rnd, 0.05); windows({ x: s.x, z: s.z, hw: s.hw, hd: s.hd, h: s.h }, wr, 0.2);
    }
    W.static = R.mesh(g); W.emit = R.mesh(em); W.lines = R.mesh(lines);

    const sky = new Geo(), sr = S.rng(5);
    for (let i = 0; i < 300; i++) { const th = sr() * Math.PI * 2, ph = 0.2 + sr() * 1.25, r = 140, b = 0.5 + sr() * 0.5; octa(sky, T(Math.cos(th) * Math.cos(ph) * r, Math.sin(ph) * r, Math.sin(th) * Math.cos(ph) * r, sr() * 3, 0.25 + sr() * 0.45), 1, 1, 1, [b * 0.9, b * 0.9, b]); }
    blob(sky, T(60, 66, -86, 0, 10), 12, 8, 1, hex('#fff2c9'), sr, 0.03, 0.02);
    W.sky = R.mesh(sky);

    // effects
    const glow = new Geo(); disc(glow, 1, 18, [1, 1, 1], [0, 0, 0], 0.02); W.glow = R.mesh(glow);
    const rg = new Geo(); ring(rg, 0.9, 1, 40, [1, 1, 1], 0); W.ring = R.mesh(rg);
    const sp = new Geo(); octa(sp, T(0, 0, 0, 0, 1), 0.5, 0.7, 0.7, [1, 1, 1]); W.spark = R.mesh(sp);
    const col = new Geo();
    for (let i = 0; i < 16; i++) { const a0 = i / 16 * Math.PI * 2, a1 = (i + 1) / 16 * Math.PI * 2; for (const [p, c] of [[[Math.cos(a0), 0, Math.sin(a0)], [1, 1, 1]], [[Math.cos(a1), 0, Math.sin(a1)], [1, 1, 1]], [[Math.cos(a1) * 0.2, 1, Math.sin(a1) * 0.2], [0, 0, 0]], [[Math.cos(a0), 0, Math.sin(a0)], [1, 1, 1]], [[Math.cos(a1) * 0.2, 1, Math.sin(a1) * 0.2], [0, 0, 0]], [[Math.cos(a0) * 0.2, 1, Math.sin(a0) * 0.2], [0, 0, 0]]]) col.v.push(p[0], p[1], p[2], 0, 1, 0, ...c); }
    W.swirl = R.mesh(col);

    // characters (built ~1.75 m tall; scaled per role)
    const skin = hex('#f3c7a0'), dark = hex('#1c1d2e');
    const pb = new Geo(), pa = new Geo();
    box(pb, T(-0.14, 0, 0, 0, 1), 0.11, 0, 0.72, 0.13, hex('#1e2a55'), rnd, 0); box(pb, T(0.14, 0, 0, 0, 1), 0.11, 0, 0.72, 0.13, hex('#1e2a55'), rnd, 0);
    box(pb, T(-0.14, 0, -0.04, 0, 1), 0.13, 0, 0.14, 0.18, dark, rnd, 0); box(pb, T(0.14, 0, -0.04, 0, 1), 0.13, 0, 0.14, 0.18, dark, rnd, 0);
    cyl(pb, T(0, 0, 0, 0, 1), 8, 0.32, 0.3, 0.7, 0.62, hex('#2f64e8'), rnd, 0.05);
    box(pb, T(0, 0, 0, 0, 1), 0.33, 0.72, 0.08, 0.31, dark, rnd, 0);
    box(pb, T(-0.4, 0, 0, 0, 1), 0.08, 0.72, 0.58, 0.09, hex('#2f64e8'), rnd, 0.05); box(pb, T(0.4, 0, 0, 0, 1), 0.08, 0.72, 0.58, 0.09, hex('#2f64e8'), rnd, 0.05);
    blob(pb, T(-0.4, 0.68, 0, 0, 0.1), 6, 4, 1, skin, rnd, 0, 0); blob(pb, T(0.4, 0.68, 0, 0, 0.1), 6, 4, 1, skin, rnd, 0, 0);
    blob(pb, T(0, 1.55, 0, 0, 0.25), 8, 5, 1, skin, rnd, 0.05, 0.02);
    cyl(pb, T(0, 0, 0, 0, 1), 8, 0.27, 0.28, 1.66, 0.16, hex('#1b2b66'), rnd, 0);
    box(pb, T(0, 0, -0.23, 0, 1), 0.21, 1.66, 0.04, 0.12, hex('#14204d'), rnd, 0);
    octa(pb, T(0.13, 1.15, -0.31, 0, 1), 0.07, 0.09, 0.09, hex('#ffd34d'));
    box(pb, T(0, 0, -0.24, 0, 1), 0.07, 1.47, 0.025, 0.02, hex('#6b3b2b'), rnd, 0); // moustache
    cyl(pa, T(0, 0, 0, 0, 1), 8, 0.285, 0.285, 1.6, 0.07, [1, 1, 1], rnd, 0);
    W.policeBase = R.mesh(pb); W.policeAcc = R.mesh(pa);
    const tb = new Geo(), ta = new Geo();
    box(tb, T(-0.13, 0, 0, 0, 1), 0.09, 0, 0.6, 0.1, dark, rnd, 0); box(tb, T(0.13, 0, 0, 0, 1), 0.09, 0, 0.6, 0.1, dark, rnd, 0);
    blob(tb, T(0, 1.42, -0.05, 0, 0.33), 8, 5, 1, skin, rnd, 0.05, 0.02);
    box(tb, T(0, 0, -0.27, 0, 1), 0.34, 1.42, 0.14, 0.1, dark, rnd, 0);
    box(tb, T(-0.12, 0, -0.38, 0, 1), 0.06, 1.46, 0.06, 0.01, [1, 1, 1], rnd, 0); box(tb, T(0.12, 0, -0.38, 0, 1), 0.06, 1.46, 0.06, 0.01, [1, 1, 1], rnd, 0);
    blob(tb, T(0, 0.95, 0.36, 0, 0.3), 7, 4, 1, hex('#d9c08f'), rnd, 0.1, 0.15);
    cyl(ta, T(0, 0, 0, 0, 1), 8, 0.32, 0.27, 0.56, 0.6, [1, 1, 1], rnd, 0.06);
    blob(ta, T(0, 1.5, 0.1, 0, 0.35, 0.33), 8, 5, 1, [0.9, 0.9, 0.9], rnd, 0.05, 0.02);
    W.thiefBase = R.mesh(tb); W.thiefAcc = R.mesh(ta);
    // wings (fly power)
    const wg = new Geo();
    for (const side of [-1, 1]) {
      const p = (x, y, z) => [side * x, y, z];
      wg.flat(p(0.2, 1.05, 0.2), p(1.4, 1.5, 0.45), p(1.1, 0.75, 0.45), p(0.2, 0.75, 0.25), [0, 0, 1], [1, 1, 1]);
      wg.flat(p(0.2, 1.05, 0.2), p(1.1, 0.75, 0.45), p(1.4, 1.5, 0.45), p(0.2, 0.75, 0.25), [0, 0, -1], [1, 1, 1]);
    }
    W.wings = R.mesh(wg);
    // glasses (tinted blue / red at draw time)
    const gl2 = new Geo();
    box(gl2, T(-0.1, 0, -0.245, 0, 1), 0.085, 1.53, 0.075, 0.025, [1, 1, 1], rnd, 0); box(gl2, T(0.1, 0, -0.245, 0, 1), 0.085, 1.53, 0.075, 0.025, [1, 1, 1], rnd, 0);
    box(gl2, T(0, 0, -0.245, 0, 1), 0.03, 1.58, 0.02, 0.02, [1, 1, 1], rnd, 0);
    W.glasses = R.mesh(gl2);
    // key ring hanging on the back (≈ 1.0 m behind, 3.3 m up once scaled)
    const kr = new Geo(), gold = hex('#ffcf4a');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; box(kr, T(Math.cos(a) * 0.09, 0, 0.31, 0, 1), 0.02, 1.0 + Math.sin(a) * 0.09, 0.02, 0.012, gold, rnd, 0); }
    for (const [dx, rot] of [[-0.05, -0.3], [0.0, 0], [0.05, 0.3]]) { box(kr, T(dx, 0, 0.33, rot, 1), 0.012, 0.8, 0.13, 0.008, gold, rnd, 0); box(kr, T(dx, 0, 0.33, rot, 1), 0.035, 0.77, 0.035, 0.01, gold, rnd, 0); }
    box(kr, T(0, 0, 0.3, 0, 1), 0.015, 1.09, 0.1, 0.01, hex('#8a8fa8'), rnd, 0);
    W.keyring = R.mesh(kr);
    // escape gate (north edge): arch is static, bars / portal / beam are dynamic
    const ga = new Geo(), gx = S.GATE.x, gz = -S.HALF + 0.2;
    for (const sx of [-2.7, 2.7]) { box(ga, T(gx + sx, 0, gz, 0, 1), 0.45, 0, 5.6, 0.45, hex('#3b3f63'), rnd, 0.05, hex('#565b85')); box(ga, T(gx + sx, 0, gz, 0, 1), 0.6, 5.6, 0.3, 0.6, hex('#2b2e4a'), rnd, 0); }
    box(ga, T(gx, 0, gz, 0, 1), 3.3, 5.0, 0.7, 0.5, hex('#3b3f63'), rnd, 0.05);
    W.gateArch = R.mesh(ga);
    const gb = new Geo();
    for (let x = -2.1; x <= 2.11; x += 0.42) cyl(gb, T(gx + x, 0, gz, 0, 1), 6, 0.06, 0.06, 0, 5.0, [1, 1, 1], rnd, 0);
    box(gb, T(gx, 0, gz + 0.1, 0, 1), 0.35, 2.2, 0.55, 0.12, [1, 1, 1], rnd, 0); // padlock
    W.gateBars = R.mesh(gb);
    const pt = new Geo(); pt.flat([gx - 2.25, 0, gz], [gx + 2.25, 0, gz], [gx + 2.25, 5.0, gz], [gx - 2.25, 5.0, gz], [0, 0, 1], [1, 1, 1]); W.portal = R.mesh(pt);
    const bm = new Geo();
    for (let i = 0; i < 14; i++) { const a0 = i / 14 * Math.PI * 2, a1 = (i + 1) / 14 * Math.PI * 2; for (const [p, c] of [[[Math.cos(a0), 0, Math.sin(a0)], [1, 1, 1]], [[Math.cos(a1), 0, Math.sin(a1)], [1, 1, 1]], [[Math.cos(a1), 40, Math.sin(a1)], [0, 0, 0]], [[Math.cos(a0), 0, Math.sin(a0)], [1, 1, 1]], [[Math.cos(a1), 40, Math.sin(a1)], [0, 0, 0]], [[Math.cos(a0), 40, Math.sin(a0)], [0, 0, 0]]]) bm.v.push(p[0], p[1], p[2], 0, 1, 0, ...c); }
    W.beam = R.mesh(bm);
    // banknote (vertical plate, tinted with the owner's colour)
    const bn = new Geo();
    box(bn, T(0, 0, 0, 0, 1), 0.36, -0.19, 0.38, 0.03, [1, 1, 1], rnd, 0);
    box(bn, T(0, 0, 0, 0, 1), 0.3, -0.14, 0.28, 0.035, [0.55, 0.55, 0.55], rnd, 0);
    octa(bn, T(0, 0, 0, Math.PI / 4, 1), 0.1, 0.1, 0.1, [1.3, 1.3, 1.3]);
    W.bill = R.mesh(bn);
    return W;
  }

  window.TCGL = { createRenderer, buildWorld, M4, hex };
})();
