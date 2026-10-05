/* Generates the air-wing sprites in dist/assets/air/: run `node tools/air-art.cjs`.
 * Each craft is a small low-poly model (x = nose, y = starboard, z = up) projected into the same
 * three-quarter view as the fleet sprites (nose up-right, engines lower-left), flat shaded and
 * painted in faction livery, then grouped into a formation: 3 fighters, 2 bombers, 1 strategic bomber. */
const fs = require('fs');
const path = require('path');

const YAW = (40 * Math.PI) / 180,
  ELEV = (50 * Math.PI) / 180;
const cy = Math.cos(YAW),
  sy = Math.sin(YAW),
  ce = Math.cos(ELEV),
  se = Math.sin(ELEV);
const VIEW = [ce * sy, ce * cy, -se];
const LIGHT = norm([0.35, -0.55, 1]);

function norm(v) {
  const l = Math.hypot(...v) || 1;
  return v.map(c => c / l);
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
function project([x, y, z]) {
  const x1 = x * cy - y * sy,
    y1 = x * sy + y * cy;
  return { x: x1, y: -y1 * se - z * ce, d: y1 * ce - z * se };
}
function newell(pts) {
  const n = [0, 0, 0];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    n[0] += (p[1] - q[1]) * (p[2] + q[2]);
    n[1] += (p[2] - q[2]) * (p[0] + q[0]);
    n[2] += (p[0] - q[0]) * (p[1] + q[1]);
  });
  return n;
}
const centroid = pts =>
  pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map(c => c / pts.length);

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(color, light, spec) {
  return (
    '#' +
    hex(color)
      .map(c => Math.round(Math.max(0, Math.min(255, c * light + 255 * spec))))
      .map(c => c.toString(16).padStart(2, '0'))
      .join('')
  );
}

/* ---- Mesh builders: each face carries a reference point inside its part so normals can face outward. ---- */
function ring(s, n, round) {
  const [x, hw, hh, z = 0, y = 0] = s,
    e = 2 / round;
  return Array.from({ length: n }, (_, i) => {
    const t = ((i + 0.5) / n) * Math.PI * 2,
      c = Math.cos(t),
      si = Math.sin(t);
    return [x, y + hw * Math.sign(c) * Math.abs(c) ** e, z + hh * Math.sign(si) * Math.abs(si) ** e];
  });
}
// Body of revolution-ish hull through cross-sections [x, halfWidth, halfHeight, zCentre, yCentre].
function loft(sections, { n = 12, round = 2, mat, cap, front, bias = 0 }) {
  const base = typeof mat === 'function' ? mat(0) : mat,
    faces = [],
    rings = sections.map(s => ring(s, n, round)),
    axis = s => [s[0], s[4] || 0, s[3] || 0];
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i],
      b = rings[i + 1],
      ref = centroid([axis(sections[i]), axis(sections[i + 1])]),
      m = typeof mat === 'function' ? mat(i) : mat;
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      faces.push({ pts: [a[j], a[k], b[k], b[j]], mat: m, ref, bias });
    }
  }
  const first = sections[0],
    last = sections[sections.length - 1];
  if (first[1] > 0.01) faces.push({ pts: rings[0], mat: cap || base, ref: axis(sections[1]), bias, nozzle: true });
  if (last[1] > 0.01)
    faces.push({ pts: rings[rings.length - 1], mat: front || base, ref: axis(sections[sections.length - 2]), bias });
  return faces;
}
// Flat plate (wing, canard) from an outline in the x-y plane, given thickness and height.
// Wings default to a far depth bias so the hull and anything mounted on top always paints over their roots.
function slab(outline, { z = 0, t = 1.2, mat, under = mat, edge = mat, bias = 25, dihedral = 0 }) {
  const lift = p => z + Math.abs(p[1]) * dihedral,
    top = outline.map(p => [p[0], p[1], lift(p) + t / 2]),
    bot = outline.map(p => [p[0], p[1], lift(p) - t / 2]),
    ref = centroid(outline.map(p => [p[0], p[1], lift(p)])),
    faces = [
      { pts: top, mat, ref, bias },
      { pts: bot.slice().reverse(), mat: under, ref, bias },
    ];
  outline.forEach((_, i) => {
    const k = (i + 1) % outline.length;
    faces.push({ pts: [top[i], top[k], bot[k], bot[i]], mat: edge, ref, bias });
  });
  return faces;
}
// Vertical fin from an outline in the x-z plane at a given y.
function fin(outline, { y = 0, t = 1, mat, edge = mat, bias = -4, cant = 0 }) {
  const side = s => outline.map(p => [p[0], y + s * (t / 2) + (p[1] - outline[0][1]) * cant, p[1]]),
    a = side(1),
    b = side(-1),
    ref = centroid(outline.map(p => [p[0], y, p[1]])),
    faces = [
      { pts: a, mat, ref, bias },
      { pts: b, mat, ref, bias },
    ];
  outline.forEach((_, i) => {
    const k = (i + 1) % outline.length;
    faces.push({ pts: [a[i], a[k], b[k], b[i]], mat: edge, ref, bias });
  });
  return faces;
}
const mirror = faces =>
  faces.map(f => ({ ...f, pts: f.pts.map(p => [p[0], -p[1], p[2]]).reverse(), ref: [f.ref[0], -f.ref[1], f.ref[2]] }));
// Engine bell: a short cylinder whose rear cap glows.
const engine = (x0, x1, r, y, z, mat, n = 10) => [
  ...loft(
    [
      [x0, r * 1.08, r * 1.08, z, y],
      [x0 + (x1 - x0) * 0.25, r, r, z, y],
      [x1, r * 0.82, r * 0.82, z, y],
    ],
    { n, mat, cap: 'glow' },
  ),
];
const barrel = (x0, x1, r, y, z, mat, bias = 0) =>
  loft(
    [
      [x0, r, r, z, y],
      [x1, r * 0.8, r * 0.8, z, y],
    ],
    { n: 6, mat, cap: mat, bias },
  );

/* ---- Livery ---- */
const LIVERY = {
  empire: {
    hull: { fill: '#efe9da', stroke: null },
    hull2: { fill: '#e2dccb' },
    belly: { fill: '#b9b1a0' },
    trim: { fill: '#d4a640', spec: 0.25 },
    gold: { fill: '#efe9da', stroke: '#c79a3a', width: 1.1 },
    bronze: { fill: '#9a7038', spec: 0.15 },
    dark: { fill: '#4a4034' },
    glass: { fill: '#3b8fc0', spec: 0.45 },
    glow: { core: '#fff6d8', mid: '#ffc46b', edge: '#c0602a' },
  },
  alliance: {
    hull: { fill: '#6f7f3d', stroke: '#1e2616', width: 0.7 },
    hull2: { fill: '#2f5d5b', stroke: '#152522', width: 0.7 },
    belly: { fill: '#3b4528', stroke: '#1a2013', width: 0.6 },
    trim: { fill: '#8c9a4f', stroke: '#1e2616', width: 0.6 },
    gold: { fill: '#6f7f3d', stroke: '#1e2616', width: 0.7 },
    bronze: { fill: '#3a3f3e', stroke: '#151918', width: 0.6, spec: 0.1 },
    dark: { fill: '#262b25', stroke: '#101310', width: 0.5 },
    glass: { fill: '#2d8f9a', spec: 0.4 },
    glow: { core: '#fff3c8', mid: '#ff9a3c', edge: '#b43c12' },
  },
};

/* ---- Models ---- */
const MODELS = {
  // Imperial Walküre: a slim pearl dart with swept wings, gold leading edges and twin bronze bells.
  'empire-fighter': () => {
    const panel = i => (i === 3 ? 'trim' : 'hull');
    return [
      ...loft(
        [
          [-34, 6, 5, 0],
          [-26, 7.5, 6, 0.5],
          [-8, 8, 6.5, 1],
          [-6, 8.1, 6.6, 1],
          [12, 6.5, 5.5, 1],
          [30, 3.6, 3.4, 0.5],
          [44, 1.2, 1.3, 0],
          [50, 0, 0, 0],
        ],
        { n: 14, mat: panel },
      ),
      ...loft(
        [
          [4, 0.5, 0.5, 5],
          [8, 3.4, 2.6, 6.2],
          [18, 3, 2.4, 6],
          [26, 0.5, 0.5, 4.2],
        ],
        { n: 10, mat: 'glass' },
      ),
      ...slab(
        [
          [-4, 7],
          [-26, 31],
          [-32, 31],
          [-28, 7],
        ],
        { z: 0, t: 1.4, mat: 'gold', under: 'belly', dihedral: -0.05 },
      ),
      ...mirror(
        slab(
          [
            [-4, 7],
            [-26, 31],
            [-32, 31],
            [-28, 7],
          ],
          { z: 0, t: 1.4, mat: 'gold', under: 'belly', dihedral: -0.05 },
        ),
      ),
      ...slab(
        [
          [24, 3],
          [16, 12],
          [13, 12],
          [14, 3],
        ],
        { z: 0.5, t: 0.9, mat: 'gold', under: 'belly' },
      ),
      ...mirror(
        slab(
          [
            [24, 3],
            [16, 12],
            [13, 12],
            [14, 3],
          ],
          { z: 0.5, t: 0.9, mat: 'gold', under: 'belly' },
        ),
      ),
      ...fin(
        [
          [-30, 5],
          [-14, 5],
          [-24, 17],
          [-30, 17],
        ],
        { mat: 'gold', edge: 'trim' },
      ),
      ...engine(-40, -32, 3.6, 3.6, -0.5, 'bronze'),
      ...engine(-40, -32, 3.6, -3.6, -0.5, 'bronze'),
    ];
  },
  // Imperial attack bomber: a heavier pearl hull, straight wings and bronze torpedo pods.
  'empire-bomber': () => {
    const wing = slab(
        [
          [6, 9],
          [-6, 34],
          [-16, 34],
          [-20, 9],
        ],
        { z: 1, t: 2, mat: 'gold', under: 'belly' },
      ),
      pod = (y, s = 1) =>
        loft(
          [
            [-14, 0, 0, -3, y],
            [-10, 2.2 * s, 2.2 * s, -3, y],
            [12, 2.2 * s, 2.2 * s, -3, y],
            [18, 0, 0, -3, y],
          ],
          { n: 8, mat: 'bronze', bias: 40 },
        ),
      panel = i => (i === 2 || i === 4 ? 'trim' : i === 1 ? 'hull2' : 'hull');
    return [
      ...loft(
        [
          [-40, 9, 7, 0],
          [-32, 11, 9, 0.5],
          [-12, 12, 9.5, 1],
          [-10, 12, 9.5, 1],
          [16, 10, 8, 1],
          [18, 9.8, 7.9, 1],
          [36, 5, 4.5, 0.5],
          [50, 0, 0, 0],
        ],
        { n: 14, mat: panel },
      ),
      ...loft(
        [
          [14, 0.6, 0.6, 7],
          [19, 4.2, 3, 8.6],
          [30, 3.4, 2.6, 7.6],
          [36, 0.6, 0.6, 5],
        ],
        { n: 10, mat: 'glass' },
      ),
      ...wing,
      ...mirror(wing),
      ...pod(22),
      ...pod(-22),
      ...fin(
        [
          [-36, 8],
          [-18, 8],
          [-28, 22],
          [-36, 22],
        ],
        { y: 6, mat: 'gold', edge: 'trim', cant: 0.25 },
      ),
      ...fin(
        [
          [-36, 8],
          [-18, 8],
          [-28, 22],
          [-36, 22],
        ],
        { y: -6, mat: 'gold', edge: 'trim', cant: -0.25 },
      ),
      ...engine(-47, -38, 4.8, 5.4, 0, 'bronze'),
      ...engine(-47, -38, 4.8, -5.4, 0, 'bronze'),
    ];
  },
  // Imperial strategic bomber: an ornate flying wing with a gilded spine, twin spires and four bells.
  'empire-strategic': () => {
    const wing = slab(
        [
          [30, 6],
          [-14, 56],
          [-24, 56],
          [-30, 40],
          [-28, 6],
        ],
        { z: 0, t: 3, mat: 'gold', under: 'belly', edge: 'trim' },
      ),
      spire = y =>
        fin(
          [
            [-26, 9],
            [-6, 9],
            [-18, 34],
            [-22, 34],
          ],
          { y, t: 1.4, mat: 'gold', edge: 'trim' },
        ),
      crest = Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return [8 + Math.cos(a) * 5, Math.sin(a) * 5, 10.4];
      });
    return [
      ...loft(
        [
          [-34, 10, 7, 1],
          [-26, 13, 9, 1.5],
          [0, 14, 9.5, 2],
          [24, 9, 6, 1.5],
          [44, 3.4, 3, 0.5],
          [56, 0, 0, 0],
        ],
        { n: 16, mat: i => (i === 1 ? 'trim' : 'hull') },
      ),
      { pts: crest, mat: 'trim', ref: [8, 0, 0], bias: -2 },
      ...loft(
        [
          [24, 0.6, 0.6, 7],
          [28, 4, 2.6, 8.2],
          [38, 3, 2, 6.6],
          [42, 0.6, 0.6, 4.6],
        ],
        { n: 10, mat: 'glass' },
      ),
      ...wing,
      ...mirror(wing),
      ...spire(5),
      ...spire(-5),
      ...engine(-42, -32, 4.6, 6, 1, 'bronze'),
      ...engine(-42, -32, 4.6, -6, 1, 'bronze'),
      ...engine(-38, -26, 4, 22, 0, 'bronze'),
      ...engine(-38, -26, 4, -22, 0, 'bronze'),
    ];
  },
  // Alliance Spartanian: a boxy olive gun-ship with stub wings, twin cannons and one big drive.
  'alliance-fighter': () => {
    const panel = i => (i % 2 ? 'hull2' : 'hull'),
      wing = slab(
        [
          [6, 6],
          [2, 22],
          [-10, 22],
          [-16, 6],
        ],
        { z: -0.5, t: 2, mat: 'hull', under: 'belly', edge: 'dark' },
      );
    return [
      ...loft(
        [
          [-30, 6.5, 5.5, 0],
          [-18, 8, 6.5, 0.5],
          [-4, 8, 6.5, 0.5],
          [14, 7, 6, 0.5],
          [30, 4.5, 4, 0],
          [40, 2, 2, -0.5],
        ],
        { n: 8, round: 5, mat: panel, front: 'dark' },
      ),
      ...loft(
        [
          [12, 0.5, 0.5, 5],
          [16, 4, 2.4, 6.2],
          [26, 3.2, 2, 5.6],
          [30, 0.5, 0.5, 4.4],
        ],
        { n: 8, round: 4, mat: 'glass' },
      ),
      ...wing,
      ...mirror(wing),
      ...barrel(-2, 26, 1.1, 18, 0, 'dark'),
      ...barrel(-2, 26, 1.1, -18, 0, 'dark'),
      ...fin(
        [
          [-28, 5],
          [-14, 5],
          [-20, 15],
          [-28, 15],
        ],
        { y: 4, t: 1.4, mat: 'hull2', edge: 'dark', cant: 0.3 },
      ),
      ...fin(
        [
          [-28, 5],
          [-14, 5],
          [-20, 15],
          [-28, 15],
        ],
        { y: -4, t: 1.4, mat: 'hull2', edge: 'dark', cant: -0.3 },
      ),
      ...engine(-38, -29, 5.4, 0, 0, 'bronze', 12),
    ];
  },
  // Alliance attack bomber: a slab-sided hull with missile racks under both wings.
  'alliance-bomber': () => {
    const panel = i => (i % 2 ? 'hull2' : 'hull'),
      wing = slab(
        [
          [10, 9],
          [4, 34],
          [-10, 34],
          [-18, 9],
        ],
        { z: 0, t: 2.4, mat: 'hull', under: 'belly', edge: 'dark' },
      ),
      rack = y => [-0.5, 1, 2.5].flatMap(k => barrel(-14, 10, 1.3, y + (k - 1) * 3, -3.2, 'bronze', 40));
    return [
      ...loft(
        [
          [-38, 9, 7, 0],
          [-26, 11, 9, 0.5],
          [-6, 11, 9, 0.5],
          [14, 10, 8.5, 0.5],
          [32, 6, 5.5, 0],
          [44, 2.5, 2.5, -0.5],
        ],
        { n: 8, round: 5, mat: panel, front: 'dark' },
      ),
      ...loft(
        [
          [16, 0.6, 0.6, 7.5],
          [20, 5, 2.8, 9],
          [31, 4, 2.2, 7.8],
          [35, 0.6, 0.6, 6],
        ],
        { n: 8, round: 4, mat: 'glass' },
      ),
      ...wing,
      ...mirror(wing),
      ...rack(22),
      ...rack(-22),
      ...fin(
        [
          [-36, 8],
          [-20, 8],
          [-28, 22],
          [-36, 22],
        ],
        { t: 1.6, mat: 'hull2', edge: 'dark' },
      ),
      ...engine(-46, -36, 5, 5.5, 0, 'bronze', 12),
      ...engine(-46, -36, 5, -5.5, 0, 'bronze', 12),
    ];
  },
  // Alliance strategic bomber: a heavy armoured carrier-bomber with a long bomb bay and four drives.
  'alliance-strategic': () => {
    const panel = i => (i % 2 ? 'hull2' : 'hull'),
      wing = slab(
        [
          [16, 12],
          [4, 52],
          [-14, 52],
          [-26, 12],
        ],
        { z: 0, t: 3.4, mat: 'hull', under: 'belly', edge: 'dark' },
      ),
      nacelle = y =>
        loft(
          [
            [-30, 5, 5, 0, y],
            [-24, 6, 6, 0, y],
            [8, 6, 6, 0, y],
            [16, 3, 3, 0, y],
          ],
          { n: 8, round: 4, mat: panel, front: 'dark' },
        ),
      bay = Array.from({ length: 5 }, (_, i) => -14 + i * 7);
    return [
      ...loft(
        [
          [-42, 12, 9, 1],
          [-30, 14, 11, 1.5],
          [-4, 14, 11, 1.5],
          [22, 13, 10, 1.5],
          [42, 7, 6, 0.5],
          [54, 3, 3, 0],
        ],
        { n: 8, round: 6, mat: panel, front: 'dark' },
      ),
      ...bay.map(x => ({
        pts: [
          [x, -6, 12.6],
          [x + 5, -6, 12.6],
          [x + 5, 6, 12.6],
          [x, 6, 12.6],
        ],
        mat: 'trim',
        ref: [x + 2.5, 0, 0],
        bias: -3,
      })),
      ...loft(
        [
          [28, 0.6, 0.6, 8.5],
          [32, 5, 2.6, 10],
          [42, 4, 2, 8.4],
          [46, 0.6, 0.6, 6.4],
        ],
        { n: 8, round: 4, mat: 'glass' },
      ),
      ...wing,
      ...mirror(wing),
      ...nacelle(30),
      ...nacelle(-30),
      ...fin(
        [
          [-40, 10],
          [-22, 10],
          [-32, 28],
          [-40, 28],
        ],
        { y: 8, t: 2, mat: 'hull2', edge: 'dark', cant: 0.2 },
      ),
      ...fin(
        [
          [-40, 10],
          [-22, 10],
          [-32, 28],
          [-40, 28],
        ],
        { y: -8, t: 2, mat: 'hull2', edge: 'dark', cant: -0.2 },
      ),
      ...engine(-50, -40, 5.4, 6.5, 1, 'bronze', 12),
      ...engine(-50, -40, 5.4, -6.5, 1, 'bronze', 12),
      ...engine(-38, -29, 4.6, 30, 0, 'bronze', 12),
      ...engine(-38, -29, 4.6, -30, 0, 'bronze', 12),
    ];
  },
};

/* ---- Rendering ---- */
const f1 = v => +v.toFixed(1);
function renderCraft(faces, livery, id) {
  const glows = [],
    polys = [];
  for (const f of faces) {
    let n = newell(f.pts);
    if (!Math.hypot(...n)) continue;
    n = norm(n);
    if (dot(n, sub(centroid(f.pts), f.ref)) < 0) n = n.map(c => -c);
    if (dot(n, VIEW) >= 0) continue;
    const pr = f.pts.map(project),
      depth = pr.reduce((a, p) => a + p.d, 0) / pr.length + (f.bias || 0),
      points = pr.map(p => `${f1(p.x)},${f1(p.y)}`).join(' ');
    if (f.mat === 'glow') {
      polys.push({ depth, svg: `<polygon points="${points}" fill="url(#${id}-glow)"/>` });
      const c = project(centroid(f.pts)),
        tail = project(sub(centroid(f.pts), [14, 0, 0])),
        r = Math.hypot(...sub(f.pts[0], centroid(f.pts)));
      glows.push({ c, tail, r });
      continue;
    }
    const m = livery[f.mat],
      diff = Math.max(0, dot(n, LIGHT)),
      half = norm(sub(LIGHT, VIEW)),
      spec = (m.spec ?? 0.12) * Math.max(0, dot(n, half)) ** 18,
      fill = shade(m.fill, 0.42 + 0.7 * diff, spec);
    polys.push({
      depth,
      svg: `<polygon points="${points}" fill="${fill}" stroke="${m.stroke || fill}" stroke-width="${m.stroke ? m.width : 0.35}" stroke-linejoin="round"/>`,
    });
  }
  polys.sort((a, b) => b.depth - a.depth);
  // Exhaust plumes sit behind the hull; each bell's mouth is painted with the glow gradient.
  const plumes = glows
    .map(({ c, tail, r }) => {
      const dx = tail.x - c.x,
        dy = tail.y - c.y,
        len = Math.hypot(dx, dy),
        ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      return `<ellipse cx="${f1(c.x + dx * 0.55)}" cy="${f1(c.y + dy * 0.55)}" rx="${f1(len * 0.75)}" ry="${f1(r * 0.85)}" transform="rotate(${f1(ang)} ${f1(c.x + dx * 0.55)} ${f1(c.y + dy * 0.55)})" fill="url(#${id}-plume)"/>`;
    })
    .join('');
  const pts = polys.flatMap(p => [...p.svg.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m => [+m[1], +m[2]]));
  return { svg: plumes + polys.map(p => p.svg).join(''), pts };
}

const FORMATION = {
  fighter: [
    [0, 0, 1],
    [-34, 26, 0.86],
    [-4, 44, 0.86],
  ],
  bomber: [
    [0, 0, 1],
    [-44, 34, 0.9],
  ],
  strategic: [[0, 0, 1]],
};

function build(side, type) {
  const id = `${side}-${type}`,
    livery = LIVERY[side],
    craft = renderCraft(MODELS[id](), livery, id),
    slots = FORMATION[type];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [ox, oy, s] of slots)
    for (const [x, y] of craft.pts) {
      minX = Math.min(minX, ox + x * s);
      maxX = Math.max(maxX, ox + x * s);
      minY = Math.min(minY, oy + y * s);
      maxY = Math.max(maxY, oy + y * s);
    }
  const pad = 8,
    w = maxX - minX + pad * 2,
    h = maxY - minY + pad * 2,
    g = livery.glow;
  // Rear craft first so the leader overlaps its wingmen.
  const uses = slots
    .slice()
    .reverse()
    .map(([ox, oy, s]) => `<use href="#${id}-craft" transform="translate(${ox} ${oy}) scale(${s})"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f1(minX - pad)} ${f1(minY - pad)} ${f1(w)} ${f1(h)}" width="${Math.round(w * 2)}" height="${Math.round(h * 2)}">
<defs>
<radialGradient id="${id}-glow"><stop offset="0" stop-color="${g.core}"/><stop offset=".55" stop-color="${g.mid}"/><stop offset="1" stop-color="${g.edge}"/></radialGradient>
<radialGradient id="${id}-plume"><stop offset="0" stop-color="${g.mid}" stop-opacity=".75"/><stop offset=".5" stop-color="${g.edge}" stop-opacity=".3"/><stop offset="1" stop-color="${g.edge}" stop-opacity="0"/></radialGradient>
<g id="${id}-craft">${craft.svg}</g>
</defs>
${uses}
</svg>
`;
}

const out = path.join(__dirname, '..', 'dist', 'assets', 'air');
fs.mkdirSync(out, { recursive: true });
for (const side of ['empire', 'alliance'])
  for (const type of ['fighter', 'bomber', 'strategic'])
    fs.writeFileSync(path.join(out, `${side}-${type}.svg`), build(side, type));
console.log('Wrote air sprites to', out);
