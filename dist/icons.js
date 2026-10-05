/* WC4-style HUD iconography for the LOGH reskin: one inline SVG sprite, referenced with <use>. */
const ICONS = (() => {
  const gear = (() => {
    const cx = 13,
      cy = 13,
      teeth = 8,
      ro = 10.5,
      ri = 8;
    let d = '';
    for (let i = 0; i < teeth * 2; i++) {
      const r = i % 2 ? ri : ro,
        a0 = (i / (teeth * 2)) * Math.PI * 2,
        a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
      const p = a => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
      d += (i ? 'L' : 'M') + p(a0 + 0.06) + 'L' + p(a1 - 0.06);
    }
    return d + 'Z';
  })();
  const hex = (cx, cy, r) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = ((60 * i - 90) * Math.PI) / 180;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(' ');
  const star = (cx, cy, ro, ri) =>
    Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? ri : ro,
        a = ((36 * i - 90) * Math.PI) / 180;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(' ');
  const coin =
    emblem => `<polygon points="${hex(16, 16, 14.5)}" fill="url(#ig-gold)" stroke="#5c3a08" stroke-width="1"/>
    <polygon points="${hex(16, 16, 11.5)}" fill="url(#ig-gold-in)" stroke="#fff3c4" stroke-opacity=".7" stroke-width=".8"/>
    ${emblem}
    <path d="M6 9.5 16 3.8 26 9.5" fill="none" stroke="#fffbe6" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round"/>`;
  const symbols = {
    'credits-empire': coin(
      `<path d="M16 8.5 18.4 12.6 23 11.2 20.6 15.6 23 20 18.2 18.9 16 23.5 13.8 18.9 9 20 11.4 15.6 9 11.2 13.6 12.6Z" fill="#7a4a0c" stroke="#fff0b8" stroke-width=".7"/><circle cx="16" cy="16" r="2.1" fill="#ffe9a0"/>`,
    ),
    'credits-alliance': coin(
      `<polygon points="${star(16, 16.4, 7.4, 3)}" fill="#7a4a0c" stroke="#fff0b8" stroke-width=".7"/>`,
    ),
    industry: `<path d="${gear}" fill="url(#ig-bronze)" stroke="#2a1a0c" stroke-width=".9"/>
      <circle cx="13" cy="13" r="3.6" fill="#1d150e" stroke="#e9c48a" stroke-width="1"/>
      <path d="M12 23.5 15.5 18h13l-2.6 5.5Z" fill="url(#ig-steel)" stroke="#20262c" stroke-width=".9"/>
      <path d="M12 23.5h13.9l2.6-5.5v3l-2.6 5.5H12Z" fill="#59636c" stroke="#20262c" stroke-width=".9"/>
      <path d="M16.2 19.2h10.6" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/>`,
    research: `<g filter="url(#if-glow)"><rect x="9" y="9" width="14" height="14" rx="2" fill="url(#ig-chip)" stroke="#bff7ff" stroke-width="1"/></g>
      <g stroke="#7fe9ff" stroke-width="1.6" stroke-linecap="round">${[11.5, 16, 20.5]
        .map(v => `<path d="M${v} 4.5v3M${v} 24.5v3M4.5 ${v}h3M24.5 ${v}h3"/>`)
        .join('')}</g>
      <rect x="12.5" y="12.5" width="7" height="7" rx="1" fill="#04303d" stroke="#d9fbff" stroke-width=".8"/>
      <path d="M14 16h4M16 14v4" stroke="#7fe9ff" stroke-width="1.1"/>`,
    energy: `<g filter="url(#if-glow-green)"><rect x="9.5" y="7" width="13" height="21" rx="2.5" fill="url(#ig-plasma)" stroke="#c9ffd9" stroke-width="1"/></g>
      <rect x="13" y="3.8" width="6" height="3.6" rx="1" fill="#b9c4c0" stroke="#33413b" stroke-width=".8"/>
      <path d="M17.6 10.5 12.6 18.4h3.6l-1.6 6.3 5.2-8.3h-3.7Z" fill="#fbffe9" stroke="#1d6b3c" stroke-width=".7"/>
      <path d="M11.5 9.5v16" stroke="#fff" stroke-opacity=".45" stroke-width="1.2"/>`,
    medals: `<path d="M9 2.5h6l3 10h-6Z" fill="#b3202c" stroke="#4a0b10" stroke-width=".8"/>
      <path d="M23 2.5h-6l-3 10h6Z" fill="#d22d38" stroke="#4a0b10" stroke-width=".8"/>
      <path d="M11.6 2.5h1.6l3 10h-1.6ZM20.4 2.5h-1.6l-3 10h1.6Z" fill="#f2c94c"/>
      <circle cx="16" cy="20.5" r="8.2" fill="url(#ig-gold)" stroke="#5c3a08" stroke-width="1"/>
      <circle cx="16" cy="20.5" r="6" fill="none" stroke="#fff3c4" stroke-opacity=".7" stroke-width=".8"/>
      <polygon points="${star(16, 20.8, 4.6, 1.9)}" fill="#a3161f" stroke="#ffe39a" stroke-width=".6"/>`,
    atk: `<g filter="url(#if-glow-red)" fill="none" stroke="#ff5a2e" stroke-width="2.2"><circle cx="16" cy="16" r="9"/></g>
      <g stroke="#ffb35c" stroke-width="2" stroke-linecap="round"><path d="M16 2.5v7M16 22.5v7M2.5 16h7M22.5 16h7"/></g>
      <path d="M4 28 13.5 18.5M28 4 18.5 13.5" stroke="#ff8a3d" stroke-opacity=".75" stroke-width="1.2"/>
      <circle cx="16" cy="16" r="2.4" fill="#ffe3b0" stroke="#ff4a1c" stroke-width="1"/>`,
    def: `<polygon points="${hex(16, 16, 13.5)}" fill="url(#ig-shield)" stroke="#f1cf73" stroke-width="1.6"/>
      <polygon points="${hex(16, 16, 8.5)}" fill="none" stroke="#bfe6ff" stroke-opacity=".8" stroke-width="1"/>
      <path d="M16 2.5v27M4.3 9.25 27.7 22.75M27.7 9.25 4.3 22.75" stroke="#bfe6ff" stroke-opacity=".28" stroke-width=".8"/>
      <path d="M8 9.5 16 4.8 24 9.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>`,
    mov: `<g filter="url(#if-glow-green)" fill="none" stroke="#39ff8a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 9l6 7-6 7" stroke-opacity=".45"/><path d="M12 9l6 7-6 7" stroke-opacity=".7"/><path d="M20 9l6 7-6 7"/></g>`,
    rng: `<path d="M4 25a12 12 0 0 1 24 0" fill="none" stroke="#ffe066" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M8.5 25a7.5 7.5 0 0 1 15 0" fill="none" stroke="#fff6cf" stroke-opacity=".55" stroke-width="1.2" stroke-dasharray="2 2"/>
      <g stroke="#fff6cf" stroke-width="1.4" stroke-linecap="round"><path d="M4 25h3M25 25h3M16 13v3M7.5 16.5l2.1 2.1M24.5 16.5l-2.1 2.1"/></g>
      <polygon points="${hex(16, 25, 2.6)}" fill="#ffe066" stroke="#5c4a10" stroke-width=".6"/>`,
  };
  const defs = `<defs>
    <linearGradient id="ig-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".45" stop-color="#f0c04a"/><stop offset="1" stop-color="#8a5a14"/></linearGradient>
    <linearGradient id="ig-gold-in" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#b9821f"/></linearGradient>
    <linearGradient id="ig-bronze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4d29a"/><stop offset=".5" stop-color="#a8743c"/><stop offset="1" stop-color="#4e3218"/></linearGradient>
    <linearGradient id="ig-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f6f8"/><stop offset="1" stop-color="#8e9aa4"/></linearGradient>
    <linearGradient id="ig-chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cf3ff"/><stop offset="1" stop-color="#0a7fa6"/></linearGradient>
    <linearGradient id="ig-plasma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9dffbf"/><stop offset=".55" stop-color="#19d36a"/><stop offset="1" stop-color="#0a6e36"/></linearGradient>
    <radialGradient id="ig-shield" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#7fd0ff" stop-opacity=".95"/><stop offset="1" stop-color="#1b4fa0" stop-opacity=".85"/></radialGradient>
    <filter id="if-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2" result="b"/><feFlood flood-color="#4fe6ff"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="if-glow-green" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1" result="b"/><feFlood flood-color="#39ff8a"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="if-glow-red" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1" result="b"/><feFlood flood-color="#ff4a1c"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${defs}${Object.entries(
    symbols,
  )
    .map(([k, v]) => `<symbol id="ico-${k}" viewBox="0 0 32 32">${v}</symbol>`)
    .join('')}</svg>`;
  const hpColor = f => (f >= 0.6 ? '#5fd35b' : f >= 0.3 ? '#e8c43a' : '#e5533d');
  return {
    names: Object.keys(symbols),
    hpColor,
    mount() {
      if (typeof document !== 'undefined' && document.body && !document.getElementById('ico-atk'))
        document.body.insertAdjacentHTML('afterbegin', sprite);
    },
    use(name, cls = '', title = '') {
      return `<svg class="ico ico-${name} ${cls}" viewBox="0 0 32 32"${title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"'}>${title ? `<title>${title}</title>` : ''}<use href="#ico-${name}"/></svg>`;
    },
    // Circular hull-integrity gauge: green → yellow → red.
    hp(hp, max, cls = '') {
      const f = Math.max(0, Math.min(1, hp / max)),
        c = 2 * Math.PI * 15;
      return `<svg class="hp-ring ${cls}" viewBox="0 0 36 36" role="img" aria-label="Hull integrity ${Math.round(f * 100)}%"><circle cx="18" cy="18" r="15" fill="#08141c" stroke="#24333b" stroke-width="4"/><circle cx="18" cy="18" r="15" fill="none" stroke="${hpColor(f)}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 18 18)"/><text x="18" y="21.5" text-anchor="middle">${Math.round(f * 100)}</text></svg>`;
    },
  };
})();
ICONS.mount();
