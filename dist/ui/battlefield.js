'use strict';
function hexCenter(p) {
  return { x: SQ * R * (p.c + 0.5 * (p.r & 1)) + R, y: R * 1.5 * p.r + R };
}
function computeView() {
  const rect = canvas.getBoundingClientRect();
  mapSize = { w: rect.width, h: rect.height };
  const width = SQ * R * (game.cols + 0.5) + R,
    height = R * 1.5 * (game.rows - 1) + 2 * R;
  const compact = rect.width < 700;
  const top = compact ? 120 : 130,
    bottom = compact ? 205 : 175;
  fitScale = Math.min((rect.width - 70) / width, (rect.height - top - bottom) / height);
  fitScale = Math.max(0.22, fitScale);
  const scale = fitScale * zoom;
  offset = {
    x: (rect.width - width * scale) / 2 + pan.x,
    y: top + (rect.height - top - bottom - height * scale) / 2 + pan.y,
  };
  return scale;
}
function centerOn(p) {
  const scale = computeView(),
    c = hexCenter(p);
  pan.x += mapSize.w / 2 - (c.x * scale + offset.x);
  pan.y += mapSize.h / 2 - (c.y * scale + offset.y);
}
// Admiral portraits float up and to the left of their fleet (see drawAdmiralPin).
function hitPin(clientX, clientY) {
  const rect = canvas.getBoundingClientRect(),
    scale = computeView(),
    x = (clientX - rect.left - offset.x) / scale,
    y = (clientY - rect.top - offset.y) / scale,
    k = Math.min(1.6, Math.max(1, 0.85 / scale));
  return game.units.find(u => {
    if (u.hp <= 0 || !u.admiral) return false;
    const p = animatedPosition(u),
      dx = x - (p.x - 22),
      dy = y - (p.y - 40);
    return Math.abs(dx) <= 15 * k && dy >= -18 * k && dy <= 25 * k;
  });
}
function hitHex(clientX, clientY) {
  const rect = canvas.getBoundingClientRect(),
    scale = computeView(),
    x = (clientX - rect.left - offset.x) / scale,
    y = (clientY - rect.top - offset.y) / scale;
  let nearest = null,
    best = R;
  for (const t of game.tiles) {
    const p = hexCenter(t),
      d = Math.hypot(p.x - x, p.y - y);
    if (d < best) {
      best = d;
      nearest = t;
    }
  }
  return nearest;
}
function changeZoom(factor, anchor) {
  const oldScale = computeView(),
    oldOffset = { ...offset };
  zoom = E.clamp(zoom * factor, 0.7, 3.2);
  const newScale = computeView();
  if (anchor) {
    const wx = (anchor.x - oldOffset.x) / oldScale,
      wy = (anchor.y - oldOffset.y) / oldScale;
    pan.x += anchor.x - (wx * newScale + offset.x);
    pan.y += anchor.y - (wy * newScale + offset.y);
  }
}

const HEAVY_SHAKE = {
  siege: 10,
  battleship: 6,
  flagship: 7,
  strategic: 6,
  missile: 4,
  bomber: 3,
  heavy: 2.5,
  light: 1.5,
};
function bump(amount) {
  if (!reducedMotion()) shake = Math.max(shake, amount);
}
function popup(at, text, color, opts = {}) {
  const life = opts.life || 1.6;
  effects.push({
    kind: 'text',
    to: { c: at.c, r: at.r },
    text,
    color,
    life,
    max: life,
    dy: opts.dy || 0,
    size: opts.size || 14,
    pop: !!opts.pop,
  });
}
function unitSnapshot() {
  return new Map(game.units.filter(u => u.hp > 0).map(u => [u.id, { hp: u.hp, morale: u.morale }]));
}
function moraleLabel(m) {
  return m <= -3 ? 'CONFUSED!' : m === -2 ? 'MORALE ↓↓' : 'MORALE ↓';
}
// Morale drops over units: Confused, or a falling-morale tag.
function moralePopups(before) {
  for (const u of game.units) {
    const b = before.get(u.id);
    if (b && u.hp > 0 && u.morale < b.morale) popup(u, moraleLabel(u.morale), '#d9a6ff', { dy: 30, life: 2 });
  }
}
// Start-of-turn events: nebula attrition (Low Supply), morale shifts and fortress strikes.
function turnStartPopups(before, side) {
  const struck = new Set((game.strikes || []).map(s => s.id));
  for (const u of game.units) {
    const b = before.get(u.id);
    if (!b || u.hp <= 0 || struck.has(u.id)) continue;
    if (u.side === side && u.hp < b.hp) popup(u, `LOW SUPPLY −${Math.round(b.hp - u.hp)}`, '#f2b35c', { life: 2.1 });
    if (u.morale < b.morale) popup(u, moraleLabel(u.morale), '#d9a6ff', { dy: 30, life: 2.1 });
  }
  (game.strikes || []).forEach((s, i) => strikeEffects(s, i * 0.5));
}
function strikeEffects(s, delay = 0) {
  effects.push({
    kind: 'beam',
    heavy: true,
    from: s.from,
    to: s.to,
    color: '#fff3a0',
    life: 1.2 + delay,
    max: 1.2 + delay,
  });
  popup(s.to, s.name.toUpperCase() + '!', '#ffe27a', { dy: 34, size: 16, life: 2.4, pop: true });
  popup(s.to, '−' + s.damage, '#ff4b3e', { size: 22, life: 2.2, pop: true });
  if (s.destroyed) effects.push({ kind: 'boom', to: s.to, life: 1, max: 1 });
  for (const h of s.hit || []) popup(h, '−' + h.damage, '#ff4b3e', { size: 18, life: 2, pop: true });
  SFX.play('thor', 'empire', delay);
  setTimeout(() => bump(16), reducedMotion() ? 0 : delay * 1000 + 550);
}
// Single-aircraft sortie using existing art. Fly to the enemy, strike, then RETURN
// to the launch station; the aircraft remains visible until it reaches home.
function addAirStrikeEffects(result, delay = 0) {
  const outboundTime = 0.68, // ~17% faster than the previous 0.82s to impact
    impactPause = 0.36,     // complete the short blast before the plane turns home
    returnTime = 0.68,
    cycle = outboundTime + impactPause + returnTime;
  effects.push({
    kind: 'air-sortie', type: result.type, side: result.side,
    from: result.from, to: result.to,
    unitDamage: result.unitDamage || 0, shieldDamage: result.shieldDamage || 0,
    destroyed: !!result.destroyed, hit: result.hit || [],
    delay, outboundTime, impactPause, returnTime,
    life: cycle + delay, max: cycle + delay,
    impactShown: false,
  });
  SFX.play('flyby', result.side, delay);
}
function addCombatEffects(result, attacker) {
  const side = attacker.side,
    type = attacker.type;
  effects.push({
    kind: 'beam',
    heavy: ['battleship', 'flagship', 'siege'].includes(type),
    from: result.from,
    to: result.to,
    color: E.FACTIONS[side].color,
    life: 0.75,
    max: 0.75,
  });
  SFX.play(SFX.weapon(type), side);
  if (result.crit) SFX.play('crit', side, 0.08);
  if (result.destroyed) {
    SFX.play('explosion', side, 0.2);
    effects.push({ kind: 'boom', to: result.to, life: 1, max: 1 });
  }
  bump((HEAVY_SHAKE[type] || 0) + (result.crit ? 4 : 0) + (result.destroyed ? 4 : 0));
  // Blue tag: station defenses knocked down.
  if (result.shieldDamage) popup(result.to, `−${result.shieldDamage} DEF`, '#7cc8ff', { dy: 20, size: 14 });
  for (const h of result.hit || []) {
    const main = h.c === result.to.c && h.r === result.to.r;
    if (main && result.crit) popup(h, `−${h.damage} CRIT!`, '#ff3b30', { size: 21, life: 1.9, pop: true });
    else popup(h, '−' + h.damage, main ? '#ffb3a3' : '#ff9a7a', { size: main ? 15 : 13 });
  }
  if (result.counter) popup(result.from, `↩ −${result.counter}`, '#ffb3a3', { size: 13 });
}
const stars = Array.from({ length: 160 }, (_, i) => ({
  x: (((Math.sin(i * 127.1 + 1) * 43758.5453) % 1) + 1) % 1,
  y: (((Math.sin(i * 311.7 + 7) * 19731.234) % 1) + 1) % 1,
  a: 0.1 + (i % 7) * 0.05,
}));
function hexPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30),
      px = x + r * Math.cos(a),
      py = y + r * Math.sin(a);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function drawLine(x, y, tx, ty, color, width = 1, dash = []) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
}
/* Battlefield renderer is supplied below. */
function frame(time) {
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
  lastTime = time;
  draw(time, dt);
  requestAnimationFrame(frame);
}

const PLATE = {
  neutral: { light: '#7a7290', mid: '#3d3850', dark: '#1f1b2b', trim: '#c9c2d8', bar: '#b0a8c2' },
  empire: { light: '#3a4f8c', mid: '#16244f', dark: '#0a1430', trim: '#e6c56a', bar: '#d9b45a' },
  alliance: { light: '#a3333f', mid: '#5c1219', dark: '#33070c', trim: '#d3dbe2', bar: '#c4ccd3' },
};
function starPath(x, y, ro, ri) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro,
      a = ((36 * i - 90) * Math.PI) / 180;
    i ? ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}
// Selected tile: glowing teal hex outline with pulsing inner corners.
function selectedHex(p, time, scale) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 260);
  ctx.save();
  hexPath(p.x, p.y, R - 2);
  ctx.fillStyle = '#3ff2c41c';
  ctx.fill();
  ctx.shadowColor = '#3ff2c4';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#3ff2c4';
  ctx.lineWidth = Math.max(2.5, 2 / scale);
  ctx.stroke();
  ctx.shadowBlur = 0;
  const inset = R - 7 - pulse * 3,
    len = 8;
  ctx.strokeStyle = `rgba(160,255,225,${0.55 + 0.45 * pulse})`;
  ctx.lineWidth = Math.max(2, 1.6 / scale);
  const vertex = i => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: p.x + inset * Math.cos(a), y: p.y + inset * Math.sin(a) };
  };
  for (let i = 0; i < 6; i++) {
    const v = vertex(i);
    for (const j of [-1, 1]) {
      const n = vertex(i + j),
        d = Math.hypot(n.x - v.x, n.y - v.y);
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(v.x + ((n.x - v.x) * len) / d, v.y + ((n.y - v.y) * len) / d);
      ctx.stroke();
    }
  }
  ctx.restore();
}
// Attackable hexes: pulsing red crosshair drawn above the fleets.
function drawCrosshair(p, time, scale) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 200),
    r = 11 + pulse * 1.5;
  ctx.save();
  ctx.translate(p.x, p.y - 4);
  ctx.strokeStyle = `rgba(255,80,60,${0.65 + 0.35 * pulse})`;
  ctx.lineWidth = Math.max(2, 1.8 / scale);
  ctx.shadowColor = '#ff3b2f';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd0c4';
  ctx.fill();
  ctx.restore();
}
// Hover estimate shown above a red hex before the one-click attack.
function drawEstimate(p, pr, scale) {
  const text = `~${pr.unit || pr.shield} dmg · ${pr.counterAllowed ? '↩ ' + pr.counter : 'no counter'}`;
  ctx.save();
  ctx.translate(p.x, p.y - R + 2);
  ctx.scale(1 / scale, 1 / scale);
  ctx.font = "bold 12px 'Trebuchet MS'";
  const w = (ctx.measureText(text)?.width || text.length * 7) + 16;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w / 2, -24, w, 22, 5);
  else ctx.rect(-w / 2, -24, w, 22);
  ctx.fillStyle = '#3b0f0ee8';
  ctx.fill();
  ctx.strokeStyle = '#ff7a62';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff1e8';
  ctx.fillText(text, 0, -9);
  ctx.restore();
}
// WC4 base token: Imperial navy with gold trim, Alliance crimson with silver trim, ringed by hull integrity.
function drawPlate(u, scale) {
  const c = PLATE[u.side],
    cy = 14,
    rx = 31,
    ry = 18,
    f = Math.max(0, Math.min(1, u.hp / E.maxHP(u)));
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, cy + 3, rx + 3, ry + 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#00000080';
  ctx.fill();
  const g = ctx.createRadialGradient(-7, cy - 6, 2, 0, cy, rx);
  g.addColorStop(0, c.light);
  g.addColorStop(0.65, c.mid);
  g.addColorStop(1, c.dark);
  ctx.beginPath();
  ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = c.trim;
  ctx.lineWidth = Math.max(2, 1.6 / scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, cy, rx - 4.5, ry - 3, 0, 0, Math.PI * 2);
  ctx.strokeStyle = c.trim + '66';
  ctx.lineWidth = Math.max(0.8, 0.8 / scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, cy, rx + 6, ry + 6, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#061019e0';
  ctx.lineWidth = Math.max(4.2, 3.2 / scale);
  ctx.stroke();
  if (f > 0) {
    ctx.beginPath();
    ctx.ellipse(0, cy, rx + 6, ry + 6, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
    ctx.strokeStyle = ICONS.hpColor(f);
    ctx.lineWidth = Math.max(2.8, 2.2 / scale);
    ctx.stroke();
  }
  ctx.restore();
}
// Stack strength: 1–3 metallic bars hung from the bottom of the token ring.
function drawStackBars(n, side, scale) {
  const c = PLATE[side],
    w = 9,
    gap = 3,
    total = n * w + (n - 1) * gap,
    y = 41;
  for (let i = 0; i < n; i++) {
    const x = -total / 2 + i * (w + gap);
    ctx.fillStyle = '#05090d';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = c.bar;
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = '#ffffffb0';
    ctx.fillRect(x, y, w, 1.2);
    ctx.fillStyle = '#00000055';
    ctx.fillRect(x, y + 2.8, w, 1.2);
  }
}
// WC4 admiral pin: the admiral's framed portrait standing above the fleet, with rank stars.
function drawAdmiralPin(u, p, scale, sel) {
  const a = E.ADMIRALS[u.admiral],
    img = ART.images.portraits;
  ctx.save();
  ctx.translate(p.x - 22, p.y - 40);
  const k = Math.min(1.6, Math.max(1, 0.85 / scale));
  ctx.scale(k, k);
  const w = 26,
    h = 32;
  ctx.shadowColor = '#000c';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const drawn = ART.officers[u.admiral] == null ? ART.portraitImage(u.admiral) : null;
  if (drawn?.complete && drawn.naturalWidth) {
    const sw = drawn.naturalWidth,
      sh = Math.min(drawn.naturalHeight, sw * (h / w));
    ctx.drawImage(drawn, 0, 0, sw, sh, -w / 2, -h / 2, w, h);
  } else if (ART.officers[u.admiral] != null && ART.ready.portraits && img) {
    const [sx, sy, sw, sh] = ART.rect('portraits', ART.officers[u.admiral]),
      crop = sw * (h / w) < sh ? sw * (h / w) : sh;
    ctx.drawImage(img, sx, sy, sw, crop, -w / 2, -h / 2, w, h);
  } else outlinedText('★', 0, 4, 14, '#e9c366', scale);
  ctx.strokeStyle = sel ? '#3ff2c4' : '#e6c56a';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
  ctx.fillStyle = '#5c1219';
  ctx.fillRect(-w / 2 - 2, h / 2 + 1, w + 4, 7);
  ctx.strokeStyle = '#e6c56a';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-w / 2 - 2, h / 2 + 1, w + 4, 7);
  for (let i = 0; i < a.stars; i++) {
    starPath((i - (a.stars - 1) / 2) * 5, h / 2 + 4.6, 2.3, 0.95);
    ctx.fillStyle = '#ffe08a';
    ctx.fill();
  }
  ctx.restore();
  if (sel || scale > 0.8) outlinedText(a.short, p.x - 22, p.y - 40 - (h / 2 + 7) * k, 10, '#f7e5ad', scale);
}
function mapBadge(x, y, side, scale) {
  const radius = Math.max(7, 7 / scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = side === 'empire' ? PLATE.empire.mid : side === 'alliance' ? PLATE.alliance.mid : '#665774';
  ctx.fill();
  ctx.strokeStyle = side === 'empire' ? PLATE.empire.trim : side === 'alliance' ? PLATE.alliance.trim : '#eee6c5';
  ctx.lineWidth = 1.4 / scale;
  ctx.stroke();
  ctx.font = `bold ${Math.max(9, 8 / scale)}px Georgia`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff8df';
  ctx.fillText(side === 'empire' ? 'I' : side === 'alliance' ? 'A' : 'N', 0, 3 / scale);
  ctx.restore();
}
function outlinedText(text, x, y, size, color, scale, font = 'Trebuchet MS', bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${Math.max(size, size / scale)}px '${font}'`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = '#06121fdd';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
function animatedPosition(u) {
  const p = hexCenter(u),
    fx = effects.find(e => e.kind === 'move' && e.unitId === u.id && e.life > 0);
  if (!fx) return p;
  const start = hexCenter(fx.from),
    t = 1 - fx.life / fx.max,
    ease = 1 - Math.pow(1 - t, 3);
  return { x: start.x + (p.x - start.x) * ease, y: start.y + (p.y - start.y) * ease };
}

const staticTerrainCache = { signature: null, canvas: null };
function drawStaticTerrain(visibleTiles, scale, w, h, dpr, jolt) {
  // Tile ownership, terrain, camera, viewport and image loading are the only
  // inputs to this immutable map layer. Dynamic fleets and overlays stay live.
  const tiles = game.tiles.map(t => t.owner[0] + t.terrain[0]).join('');
  const signature = [game.cols, game.rows, w, h, dpr, scale, offset.x, offset.y,
    ART.ready?.terrain ? 1 : 0, tiles].join('|');
  if (!staticTerrainCache.canvas || staticTerrainCache.signature !== signature) {
    const layer = document.createElement('canvas');
    layer.width = Math.round(w * dpr);
    layer.height = Math.round(h * dpr);
    const mainCtx = ctx;
    try {
      ctx = layer.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);
      ctx.lineWidth = 0.65 / scale;
  for (const t of visibleTiles) {
    const p = hexCenter(t);
    hexPath(p.x, p.y, R);
    ctx.fillStyle =
      t.terrain === 'rift'
        ? '#07131e'
        : t.owner === 'empire'
          ? '#a59a602c'
          : t.owner === 'alliance'
            ? '#358b9c26'
            : '#78829b0a';
    ctx.fill();
    ctx.strokeStyle = '#b5c8cf13';
    ctx.stroke();
  }
  // Territorial borders remain visible when the tactical grid is subtle.
  for (const t of visibleTiles) {
    if (t.terrain === 'rift') continue;
    const p = hexCenter(t);
    for (const n of E.adjacent(game, t)) {
      if (n.owner === t.owner && n.terrain !== 'rift') continue;
      const q = hexCenter(n),
        angle = Math.atan2(q.y - p.y, q.x - p.x),
        i = Math.round(angle / (Math.PI / 3)),
        a = ((i * 60 - 30) * Math.PI) / 180,
        b = ((i * 60 + 30) * Math.PI) / 180;
      drawLine(
        p.x + R * Math.cos(a),
        p.y + R * Math.sin(a),
        p.x + R * Math.cos(b),
        p.y + R * Math.sin(b),
        n.terrain === 'rift' ? '#93a9b35a' : t.owner === 'empire' ? '#d2ba7a8f' : '#5bb9d899',
        1.4 / scale,
      );
    }
  }
  // Painted terrain props are actual raster assets, kept separate from hit regions.
  for (const t of visibleTiles) {
    const p = hexCenter(t);
    if (t.terrain === 'nebula') {
      ctx.globalAlpha = 0.65;
      ART.draw(ctx, 'terrain', 4 + ((t.c + t.r) % 4), p.x, p.y, R * 2.6, R * 2.6);
      ctx.globalAlpha = 1;
    } else if (t.terrain === 'asteroid') {
      ART.draw(ctx, 'terrain', (t.c + t.r) % 4, p.x, p.y - 3, R * 1.9, R * 1.9);
    } else if (t.terrain === 'rift') {
      ctx.globalAlpha = 0.36;
      ART.draw(ctx, 'terrain', 13, p.x, p.y, R * 1.8, R * 1.8);
      ctx.globalAlpha = 1;
      outlinedText('×', p.x, p.y + 3, 11, '#93a6b66b', scale);
    }
  }
    } finally {
      ctx = mainCtx;
    }
    staticTerrainCache.canvas = layer;
    staticTerrainCache.signature = signature;
  }
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(staticTerrainCache.canvas, jolt.x, jolt.y, w, h);
  ctx.restore();
}

function draw(time, dt) {
  if (!canvas || !ctx) return;
  const scale = computeView(),
    { w, h } = mapSize,
    dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#102b3e';
  ctx.fillRect(0, 0, w, h);
  const wash = ctx.createRadialGradient(w * 0.48, h * 0.5, 50, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
  wash.addColorStop(0, '#244658');
  wash.addColorStop(0.6, '#142f43');
  wash.addColorStop(1, '#071423');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = 0.11;
    ART.draw(
      ctx,
      'terrain',
      4 + (i % 4),
      w * ((i * 0.317 + 0.12) % 1),
      h * ((i * 0.463 + 0.21) % 1),
      w * 0.6,
      h * 0.65,
    );
  }
  ctx.globalAlpha = 1;
  for (const star of stars) {
    ctx.fillStyle = `rgba(211,229,229,${star.a * 0.75})`;
    ctx.fillRect(star.x * w, star.y * h, 1.2, 1.2);
  }
  const jolt = shake ? { x: (Math.random() * 2 - 1) * shake, y: (Math.random() * 2 - 1) * shake } : { x: 0, y: 0 };
  shake = Math.max(0, shake - dt * 30);
  ctx.save();
  ctx.translate(offset.x + jolt.x, offset.y + jolt.y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 0.65 / scale;
  const inView = p => p.x * scale + offset.x >= -R*3*scale && p.x * scale + offset.x <= w+R*3*scale &&
    p.y*scale+offset.y >= -R*3*scale && p.y*scale+offset.y <= h+R*3*scale;
  const visibleTiles = game.tiles.filter(t => inView(hexCenter(t)));
  drawStaticTerrain(visibleTiles, scale, w, h, dpr, jolt);
  for (const t of visibleTiles) {
    const p = hexCenter(t);
    const k = E.key(t),
      unsupplied = supplyCache && !supplyCache.has(k) && selectedUnit()?.admiral !== 'konev';
    // Air supply overlay: covered hexes glow blue; reachable hexes beyond coverage turn amber with a warning.
    if (supplyCache?.has(k)) {
      hexPath(p.x, p.y, R - 1);
      ctx.fillStyle = '#4fb6ff22';
      ctx.fill();
      ctx.setLineDash([3 / scale, 3 / scale]);
      ctx.strokeStyle = '#7cc8ff66';
      ctx.lineWidth = 1 / scale;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (readyCache.has(k) && unsupplied) {
      hexPath(p.x, p.y, R - 1.5);
      ctx.fillStyle = '#ff9d2e3a';
      ctx.fill();
      ctx.strokeStyle = '#ffb35ccc';
      ctx.lineWidth = 1.2 / scale;
      ctx.stroke();
      outlinedText('!', p.x, p.y + 5, 14, '#ffcf7a', scale);
    } else if (readyCache.has(k)) {
      hexPath(p.x, p.y, R - 1.5);
      ctx.fillStyle = '#3ddc7a38';
      ctx.fill();
      ctx.strokeStyle = '#6dffa5aa';
      ctx.lineWidth = 1.2 / scale;
      ctx.stroke();
    }
    if (targetCache.has(k)) {
      hexPath(p.x, p.y, R - 1.5);
      ctx.fillStyle = '#e8343048';
      ctx.fill();
      ctx.strokeStyle = '#ff6a5acc';
      ctx.lineWidth = 1.4 / scale;
      ctx.stroke();
    }
  }
  const selTile =
    selection?.kind === 'unit'
      ? selectedUnit()
      : selection?.kind === 'station'
        ? selectedStation()
        : selection?.kind === 'tile'
          ? selection
          : null;
  if (selTile) selectedHex(hexCenter(selTile), time, scale);
  for (const u of ownUnits()) {
    if (!u.destination) continue;
    const a = hexCenter(u),
      b = hexCenter(u.destination);
    drawLine(a.x, a.y, b.x, b.y, '#78d8ff99', 1.4 / scale, [6 / scale, 5 / scale]);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#78d8ff33';
    ctx.strokeStyle = '#9fe6ffcc';
    ctx.lineWidth = 1.4 / scale;
    ctx.fillRect(-8 / scale, -8 / scale, 16 / scale, 16 / scale);
    ctx.strokeRect(-8 / scale, -8 / scale, 16 / scale, 16 / scale);
    ctx.restore();
  }
  for (const s of game.stations) {
    if (!inView(hexCenter(s))) continue;
    const p = hexCenter(s),
      col = E.FACTIONS[s.owner].color,
      garrison = E.unitAt(game, s),
      index = s.capital ? 15 : s.fort ? 14 : 13;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = garrison ? 0.75 : 1;
    ctx.shadowColor = '#0008';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 5;
    ART.draw(
      ctx,
      'fleet',
      index,
      0,
      s.fort ? -8 : -4,
      s.capital ? R * 2.8 : s.fort ? R * 2.45 : R * 2.2,
      s.capital ? R * 2.8 : s.fort ? R * 2.45 : R * 2.2,
    );
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#071623';
    ctx.fillRect(-20, 27, 40, 4);
    ctx.fillStyle = '#bcb778';
    ctx.fillRect(-20, 27, (40 * s.shield) / s.maxShield, 4);
    outlinedText(s.name, 0, garrison ? 49 : 43, 11, '#e8e7cc', scale);
    if (!garrison) {
      mapBadge(-25, 20, s.owner, scale);
      for (let i = 0; i < s.tier; i++) {
        ctx.fillStyle = '#d8c581';
        ctx.fillRect(25, 10 - i * 5, 3, 3);
      }
    }
    ctx.restore();
  }
  // WC4-style tokens drawn back to front: base plate, hull ring, ships, stack bars and admiral pins.
  for (const u of game.units.filter(u => u.hp > 0 && inView(animatedPosition(u))).sort((a, b) => a.r - b.r || a.c - b.c)) {
    const p = animatedPosition(u),
      t = E.TYPES[u.type],
      col = E.FACTIONS[u.side].color,
      sel = selection?.kind === 'unit' && selection.id === u.id,
      spent = u.side === game.player && game.phase === game.player ? !hasOrders(u) : u.moved && u.attacked;
    ctx.save();
    ctx.translate(p.x, p.y);
    drawPlate(u, scale);
    ctx.globalAlpha = spent ? 0.62 : 1;
    // Extra hull silhouettes visualize stacks without hiding the readable front hull.
    const size =
      u.type === 'siege'
        ? R * 2.3
        : u.type === 'flagship'
          ? R * 2.2
          : t.branch === 'Battle Line' || t.air
            ? R * 2.0
            : R * 1.85;
    ctx.shadowColor = '#000a';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 4;
    // Air wings are already drawn as a formation, so their stack shows only in the stack bars.
    for (let i = t.air ? 0 : Math.min(u.stack - 1, 2); i >= 0; i--)
      ART.drawShip(
        ctx,
        u.type,
        artSide(u),
        (i ? i * 7 : 0) - 2,
        -6 - i * 8,
        size * (i ? 0.88 : 1),
        size * (i ? 0.88 : 1),
      );
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
    if (!t.air && !ART.ready[artSide(u)]) outlinedText(t.code, 0, 3, 13, col, scale);
    drawStackBars(u.stack, u.side, scale);
    if (u.side === game.player && interactive() && hasOrders(u)) {
      ctx.beginPath();
      ctx.arc(36, 8, Math.max(3, 2.4 / scale), 0, Math.PI * 2);
      ctx.fillStyle = '#6dffa5';
      ctx.fill();
      ctx.strokeStyle = '#06301a';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    if (u.morale < 0) outlinedText(u.morale === -3 ? '!' : '↓', 31, -14, 13, '#ffb78c', scale);
    ctx.restore();
  }
  for (const u of game.units)
    if (u.hp > 0 && u.admiral && inView(animatedPosition(u)))
      drawAdmiralPin(u, animatedPosition(u), scale, selection?.kind === 'unit' && selection.id === u.id);
  for (const k of targetCache) {
    const [c, r] = k.split(',').map(Number);
    drawCrosshair(hexCenter({ c, r }), time, scale);
  }
  if (hover) {
    const p = hexCenter(hover),
      u = selectedUnit();
    hexPath(p.x, p.y, R - 1);
    ctx.strokeStyle = '#dcebe769';
    ctx.lineWidth = 1.2 / scale;
    ctx.stroke();
    const st = selectedStation();
    const pr = targetCache.has(E.key(hover))
      ? u ? E.preview(game, u.id, hover.c, hover.r)
        : st && airOrder ? E.airStrikePreview(game, st.id, airOrder.type, hover.c, hover.r) : null
      : null;
    if (pr) {
      const a = hexCenter(u || st);
      drawLine(a.x, a.y, p.x, p.y, '#ff9a6ac0', 1.4 / scale, [6, 6]);
      drawEstimate(p, pr, scale);
    }
  }
  for (const e of effects) {
    e.life -= dt;
    const a = e.from ? hexCenter(e.from) : null,
      b = hexCenter(e.to);
    ctx.globalAlpha = Math.max(0, e.life / e.max);
    if (e.kind === 'beam') {
      drawLine(a.x, a.y, b.x, b.y, e.color, (e.heavy ? 9 : 4) / scale);
      drawLine(a.x, a.y, b.x, b.y, '#fff6dd', (e.heavy ? 3.2 : 1.6) / scale);
      ART.draw(
        ctx,
        'terrain',
        15,
        b.x,
        b.y,
        95 * (1.15 - (e.life / e.max) * 0.45),
        95 * (1.15 - (e.life / e.max) * 0.45),
      );
    } else if (e.kind === 'air-sortie') {
      const elapsed = e.max - e.life - e.delay;
      if (elapsed >= 0) {
        const turnAt = e.outboundTime,
          returnAt = e.outboundTime + e.impactPause,
          finishedAt = returnAt + e.returnTime,
          returning = elapsed >= returnAt,
          // Symmetric smooth movement (no sudden teleport at the target).
          smooth = n => { const t = E.clamp(n, 0, 1); return t * t * (3 - 2 * t); };
        if (elapsed >= turnAt && !e.impactShown) {
          // Show this impact exactly once and only after the outbound flight.
          e.impactShown = true;
          SFX.play('explosion', e.side);
          bump((HEAVY_SHAKE[e.type] || 2) + (e.destroyed ? 4 : 0));
          effects.push({ kind: 'boom', to: e.to, life: e.impactPause, max: e.impactPause });
          if (e.shieldDamage) popup(e.to, `−${e.shieldDamage} DEF`, '#7cc8ff', { dy: 25, size: 15 });
          for (const hit of e.hit) popup(hit, `−${hit.damage}`, '#ff9a7a', { size: 18, pop: true });
        }
        if (elapsed <= finishedAt) {
          // Route progress is 0 -> 1 on attack, held at the target while firing,
          // and 1 -> 0 on the return flight.
          const route = elapsed < turnAt
            ? smooth(elapsed / e.outboundTime)
            : elapsed < returnAt ? 1
              : 1 - smooth((elapsed - returnAt) / e.returnTime),
            x = a.x + (b.x - a.x) * route,
            y = a.y + (b.y - a.y) * route,
            tailRoute = returning ? Math.min(1, route + 0.16) : Math.max(0, route - 0.16);
          ctx.save();
          ctx.globalAlpha = 1;
          drawLine(a.x + (b.x - a.x) * tailRoute, a.y + (b.y - a.y) * tailRoute,
            x, y, E.FACTIONS[e.side].color, 3 / scale);
          ctx.translate(x, y);
          if (returning) ctx.rotate(Math.PI); // Face back toward the home air base.
          ctx.shadowColor = '#000a';
          ctx.shadowBlur = 5;
          ctx.shadowOffsetY = 4;
          // Preserve the original map-unit footprint, now showing a single PNG aircraft.
          ART.drawShip(ctx, e.type, e.side, 0, -6, R * 2, R * 2);
          ctx.restore();
        }
      }
    } else if (e.kind === 'boom') {
      const grow = 1 - e.life / e.max;
      ART.draw(ctx, 'terrain', 14, b.x, b.y - 6, 70 + grow * 90, 70 + grow * 90);
    } else if (e.kind === 'move') {
      drawLine(a.x, a.y, b.x, b.y, e.color, 2 / scale, [7, 6]);
    } else if (e.kind === 'text') {
      const age = 1 - e.life / e.max,
        pop = e.pop ? 1 + Math.max(0, 1 - age * 7) * 0.7 : 1;
      outlinedText(
        e.text,
        b.x,
        b.y - 28 - age * 28 - (e.dy || 0),
        (e.size || 14) * pop,
        e.color,
        scale,
        'Trebuchet MS',
        true,
      );
    }
    ctx.globalAlpha = 1;
  }
  effects = effects.filter(e => e.life > 0);
  ctx.restore();
}