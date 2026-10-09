'use strict';
function claimReward() {
  if (!game.over || game.rewardClaimed) return;
  const p = loadProfile();
  p.medals = [...(p.medals || []), ...(game.medalsEarned || []).map(m => m.id)];
  if (game.over.winner === game.player) {
    const r = E.missionReward(game, p.wins || 0, p.cleared || {});
    if (!r.repeat) {
      p.tokens = (p.tokens || 0) + r.total;
      p.wins = (p.wins || 0) + 1;
      (p.cleared ||= {})[E.operationKey(game)] = true;
    }
    game.reward = r;
  }
  game.rewardClaimed = true;
  undoStack = [];
  saveProfile(p);
  try {
    localStorage.setItem('galactic-command-hex-v2', JSON.stringify(game, (k, val) => k === '_plan' || k === '_planTurn' ? undefined : val));
  } catch (e) {}
}
function resultDialog() {
  claimReward();
  const win = game.over.winner === game.player;
  if (win && game.mode !== 'conquest' && game.over.stars) {
    const best = bestStars(),
      key = starKey(game.mode, game.difficulty);
    if ((best[key] || 0) < game.over.stars) {
      best[key] = game.over.stars;
      try {
        localStorage.setItem('galactic-command-stars', JSON.stringify(best));
      } catch (e) {}
    }
  }
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="Operation result"><div class="eyebrow">${win ? 'Operation successful' : game.over.winner === 'draw' ? 'Armistice' : 'Operation ended'}</div><h2>${win ? 'The galaxy remembers.' : game.over.winner === 'draw' ? 'A fragile peace.' : 'The fleet’s last order.'}</h2>${game.mode !== 'conquest' ? `<div class="star-rating" aria-label="${win ? game.over.stars : 0} of 3 stars">${starText(win ? game.over.stars || 1 : 0)}</div>` : ''}<p>${game.over.reason}</p>${(game.medalsEarned || []).length ? `<div class="medal-case"><span class="label">Medals earned</span>${game.medalsEarned.map(m => `<span class="medal-chip" title="${esc(m.reason)}">🎖 ${E.MEDALS[m.id].name}</span>`).join('')}</div>` : ''}${game.reward ? (game.reward.repeat ? `<div class="reward"><span class="label">No command tokens</span><small>Tokens are paid only for the first victory in each operation at each difficulty. Try ${game.difficulty === 'challenge' ? 'another operation' : 'a harder difficulty'} for more.</small></div>` : `<div class="reward"><span class="label">Command tokens earned</span><b>${ICONS.use('token', 'cost-ico')} +${game.reward.total}</b><small>${game.reward.parts.map(([k, v]) => (v ? `${k} +${v}` : k)).join(' · ')}</small></div>`) : ''}<p class="description">Medals earned go to your medal case. Spend command tokens on HQ research and on your admirals in HQ → Admirals.</p><div class="result-numbers"><div><b>${game.turn}</b><small>Turns elapsed</small></div><div><b>${game.stations.filter(s => s.owner === game.player).length}</b><small>Stations held</small></div><div><b>${ownUnits().length}</b><small>Fleets remaining</small></div></div><div class="dialog-footer"><button data-action="close">Inspect battlefield</button><button data-action="research">HQ research</button><button class="primary" data-action="new">New operation</button></div></section></div>`;
  focusDialog();
}
function openShop(id, branch = shop.branch) {
  const s = game.stations.find(s => s.id === id);
  if (!s || s.owner !== game.player || !interactive()) return;
  shop.station = id;
  shop.branch = branch;
  const free = E.recruitOptions(game, s, game.player);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Shipyard"><div class="dialog-head"><div><div class="eyebrow">${E.FACTIONS[s.owner].name} · ${s.name} · Shipyard tier ${s.tier}</div><h2>Commission a fleet</h2><p>${costHTML({ credits: game.economy[game.player].credits, industry: game.economy[game.player].industry }, true)}</p></div><button class="small close" data-action="close">Close</button></div><div class="toolbar-row"><div class="tabs">${['Escort', 'Battle Line', 'Artillery'].map(b => `<button data-branch="${b}" class="${b === branch ? 'active' : ''}">${b}</button>`).join('')}</div><div><label for="stack-select">Fleet strength &nbsp;</label><select class="select" id="stack-select">${[1, 2, 3].map(n => `<option value="${n}" ${shop.stack === n ? 'selected' : ''}>${n} ${n === 1 ? 'stack' : 'stacks'}</option>`).join('')}</select></div></div>${s.producedTurn === game.turn ? '<div class="info-strip">This shipyard has completed production for this turn.</div>' : !free.length ? '<div class="info-strip">No free deployment hex. Move friendly fleets away from the station.</div>' : '<p class="description">One fleet per station per turn. Deployment uses the station hex, or a free adjacent hex. New fleets act next turn.</p>'}<div class="cards">${Object.entries(
    E.TYPES,
  )
    .filter(([k, t]) => t.branch === branch && !t.air)
    .map(([k, t]) => {
      const n = t.elite ? 1 : shop.stack,
        p = E.price(k, n, game, game.player),
        stats = E.fleetStats(game, { type: k, side: game.player, stack: n }),
        can = E.canBuy(game, s, k, n);
      return `<article class="unit-card ${(t.air ? s.air || 0 : s.tier) < t.tier ? 'locked' : ''}">${ART.ship(k, 'catalog-ship', s.owner)}<span class="unit-code">${t.code} · Tier ${t.tier} · ×${n}</span><h3>${t.name}</h3>${t.weapon ? `<span class="weapon-focus">${t.weapon}</span>` : ''}<p>${t.desc}</p><div class="unit-spec"><span>HP ${stats.hp}</span><span>${ICONS.use('atk')}${stats.attack}</span><span>${ICONS.use('def')}${stats.armor}</span><span>${ICONS.use('mov')}${stats.move}</span><span>${ICONS.use('rng')}${rangeText({ type: k, side: game.player })}</span></div><div class="cost">${costHTML(p)}</div>${act(`data-recruit="${k}"`, t.elite ? 'Commission fleet · 1 stack' : 'Commission fleet', can ? null : E.buyReason(game, s, k, n))}</article>`;
    })
    .join('')}</div></section></div>`;
  focusDialog();
}
let researchBranch = 'escort',
  researchBack = 'game';
function tokenCost(n, have) {
  return `<span class="cost-line"><span class="cost-item${n > have ? ' short' : ''}">${ICONS.use('token', 'cost-ico')}${count(n)}</span></span>`;
}
// HQ research: command tokens from victories buy permanent technology kept across every operation.
function researchDialog(branch = researchBranch) {
  researchBranch = branch;
  const p = loadProfile(),
    research = p.research || {},
    tokens = p.tokens || 0,
    wins = p.wins || 0,
    tree = E.TECH_TREE[branch];
  const tiers = [1, 2, 3, 4]
    .map(
      t =>
        `<span class="tier ${wins >= E.TECH_TIERS[t] ? 'open' : ''}">Tier ${E.ROMAN[t]} · ${E.TECH_TIERS[t] ? (wins >= E.TECH_TIERS[t] ? 'unlocked' : `${E.TECH_TIERS[t]} victories`) : 'open'}</span>`,
    )
    .join('');
  const cards = Object.keys(tree.nodes)
    .map(k => {
      const id = `${branch}.${k}`,
        n = E.TECH_NODES[id],
        l = research[id] || 0,
        done = l >= n.max,
        req = n.req ? E.TECH_NODES[`${branch}.${n.req[0]}`] : null;
      return `<section class="tech-card hq"><span class="label">${tree.name} · Level ${l} / ${n.max}</span><h3>${n.name}</h3><ol class="doctrine">${n.values.map((v, i) => `<li class="${i < l ? 'unlocked' : ''}"><b>${E.ROMAN[i + 1]}</b> ${n.text(v)} <small>Tier ${E.ROMAN[n.tiers[i]]}</small></li>`).join('')}</ol>${req ? `<small class="req">Requires ${req.name} ${E.ROMAN[n.req[1]]}</small>` : ''}<div class="tech-levels">${n.values.map((_, i) => `<i class="${i < l ? 'unlocked' : ''}"></i>`).join('')}</div>${act(`data-research="${id}"`, done ? 'Fully researched' : `Research ${E.ROMAN[l + 1]}`, done ? 'Fully researched' : E.researchReason(p, id), done ? '' : tokenCost(E.researchCost(id, l), tokens), '', !done)}</section>`;
    })
    .join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="HQ research"><div class="dialog-head"><div><div class="eyebrow">Command HQ · kept across every operation and side</div><h2>HQ research</h2><p class="hq-balance">${ICONS.use('token', 'cost-ico')} <b>${count(tokens)}</b> command tokens · ${wins} ${wins === 1 ? 'victory' : 'victories'}</p></div><button class="small close" data-action="research-close">Close</button></div>${tokens || Object.keys(research).length ? '' : `<div class="info-strip">Command tokens are earned by the first victory in each operation at each difficulty: ${E.TOKEN_REWARD.victory} per victory, plus ${E.TOKEN_REWARD.star} per star (or ${E.TOKEN_REWARD.conquest} for a Conquest) and 1 per ${E.TOKEN_REWARD.research} research banked, ×1.5 on Hard and ×2 on Challenge, and ${E.TOKEN_REWARD.first} more for your first win ever.</div>`}<div class="tier-row">${tiers}</div><div class="tabs">${Object.entries(
    E.TECH_TREE,
  )
    .map(([k, b]) => `<button data-research-branch="${k}" class="${k === branch ? 'active' : ''}">${b.name}</button>`)
    .join('')}</div><p class="description">${tree.desc}</p><div class="tech-grid">${cards}</div></section></div>`;
  focusDialog();
}
function ratingStars(n) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, E.MAX_RATING - n));
}
// A clickable portrait: opens the Admiral Info card, for your own admiral (personal) or a scenario commander.
function generalPortrait(k, cls = '', personal = false) {
  return ART.portrait(k, cls).replace(
    '<span ',
    `<span data-general="${k}" data-personal="${personal ? 1 : 0}" role="button" tabindex="0" title="${esc(E.ADMIRALS[k].name)}: admiral info" `,
  );
}
const BRANCH_ICONS = { escort: 'destroyer', line: 'battleship', artillery: 'siege', move: 'corvette' };
// What one rating does, for the Admiral Info tooltips.
function ratingHelp(b, name, n) {
  return b === 'move'
    ? `${name}: ${n} of ${E.MAX_RATING} stars. Fleet movement: +1 hex per star above 2 (3 stars +1, 4 stars +2, 5 stars +3, 6 stars +4); 1 star −1 hex.`
    : `${name}: ${n} of ${E.MAX_RATING} stars. Each star above 3 adds 4% damage and cuts damage taken 3% in this branch.`;
}
// A token-priced button. When unavailable it stays hoverable (aria-disabled) so the reason shows as a tooltip.
function tokenButton(attrs, cost, why, label = '', cls = '') {
  const have = loadProfile().tokens || 0;
  return `<button class="small token-buy ${cls}${why ? ' blocked' : ''}" ${attrs} ${why ? `aria-disabled="true" title="${esc(why)}"` : ''}>${label}${tokenCost(cost, have)}</button>`;
}
// Where HQ screens return to: the start menu or the battlefield.
let hqBack = 'game';
// Admiral Info. Personal: your persistent admiral, upgraded with command tokens. Otherwise: the scenario's
// commander for this operation, shown read-only.
function generalDialog(k, personal = false) {
  const a = E.ADMIRALS[k],
    profile = loadProfile(),
    owned = E.owns(profile, k),
    own = a.side === (hqBack === 'start' ? a.side : game.player),
    o = personal
      ? E.roster(profile)[k] || { rank: 0, ratings: { ...E.officer(game, k).ratings }, medals: [] }
      : E.officer(game, k),
    editable = personal && owned,
    fleet = game.units.find(u => u.hp > 0 && u.admiral === k && !!u.personal === personal),
    top = o.rank >= E.RANKS.length - 1,
    stars = n => Array.from({ length: E.MAX_RATING }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');
  generalOpen = { k, personal };
  const ratings = Object.entries(E.RATING_NAMES)
    .map(
      ([b, name]) =>
        `<div class="gi-rating" title="${ratingHelp(b, name, o.ratings[b])}"><span class="gi-badge">${ART.ship(BRANCH_ICONS[b], '', a.side)}</span><span class="gi-rating-info"><span class="gi-name">${name}</span><span class="gi-stars">${stars(o.ratings[b])}</span></span>${editable && o.ratings[b] < E.MAX_RATING ? tokenButton(`data-buy-star="${b}" data-officer="${k}" aria-label="Buy a ${name} star"`, E.starCost(profile, k, b), E.starReason(profile, k, b)) : ''}</div>`,
    )
    .join('');
  const medals = editable
    ? `<div class="gi-medals"><span class="label">Medals ${o.medals.length}/${E.medalSlots(o)}</span>${o.medals.map(m => `<button class="small medal-chip" data-unequip="${m}" data-officer="${k}" title="${esc(E.MEDALS[m].desc)} · click to remove">🎖 ${E.MEDALS[m].name} ×</button>`).join('')}${[...new Set(profile.medals || [])].map(m => act(`data-equip="${m}" data-officer="${k}"`, `Wear ${E.MEDALS[m].name}`, E.equipReason(profile, k, m), E.MEDALS[m].desc, 'small')).join('')}</div>`
    : '';
  const footer = personal
    ? owned
      ? !top
        ? `<div class="gi-promote-row"><div><span class="label">Next rank</span><b>${E.RANKS[o.rank + 1]}</b><small>Fleet hull ${Math.round(E.RANK_HP[o.rank] * 100)}% → ${Math.round(E.RANK_HP[o.rank + 1] * 100)}%</small></div>${tokenButton(`data-promote="${k}"`, E.promoteCost(o), E.promoteReason(profile, k), 'Promote ')}</div>`
        : '<div class="gi-promote-row"><b>Highest rank</b></div>'
      : `<div class="gi-promote-row"><div><span class="label">Not yet one of your admirals</span><b>Recruit ${a.short}</b><small>A one-time price; then assignable in every operation and upgradable here.</small></div>${tokenButton(`data-recruit-admiral="${k}"`, E.recruitPrice(k), E.recruitReason(profile, k), 'Recruit ')}</div>`
    : `<div class="gi-promote-row"><div><span class="label">${own ? 'Scenario commander' : 'Enemy officer'}</span><b>Fixed for this operation</b><small>${own ? `Scenario commanders cannot be upgraded. Your own ${a.short} is developed in HQ → Admirals.` : `${E.FACTIONS[a.side].name}. Ratings and rank shown as of this operation.`}</small></div></div>`;
  modal.innerHTML = `<div class="overlay"><section class="dialog wide general-info ${a.side}" role="dialog" aria-modal="true" aria-label="Admiral info"><div class="gi-head"><button class="small close" data-action="general-close" aria-label="Close">✕</button><h2>Admiral Info</h2></div><div class="gi-body"><div class="gi-left"><div class="gi-nameplate"><span class="gi-stars-top">${'★'.repeat(a.stars)}</span><b>${a.name}</b></div><div class="gi-portrait">${ART.portrait(k, 'gi-portrait-art')}</div><div class="gi-rank"><div class="gi-rank-line"><span class="gi-insignia">⚓</span><span>${E.RANKS[o.rank]}</span></div><div class="gi-rank-line"><span class="gi-heart">❤</span><span>${Math.round(E.RANK_HP[o.rank] * 100)}% fleet hull</span></div><div class="gi-kind ${personal ? 'mine' : ''}">${personal ? 'Your admiral' : own ? 'Scenario commander' : 'Enemy officer'}</div></div></div><div class="gi-right"><div class="gi-ratings">${ratings}</div><div class="gi-ability"><span class="label">${a.skill}</span><p>${a.desc}</p><small>${a.role} specialist${fleet ? ` · Commanding ${E.TYPES[fleet.type].short} ×${fleet.stack}` : ''}${game.missionKills?.[k] ? ` · ${game.missionKills[k]} kills this operation` : ''}</small></div><div class="gi-ladder"><span class="label">Naval rank · ${o.rank + 1} of ${E.RANKS.length}</span><div class="gi-pips">${E.RANKS.map((r, i) => `<i class="${i < o.rank ? 'done' : i === o.rank ? 'now' : ''}" title="${r} · ${Math.round(E.RANK_HP[i] * 100)}% fleet hull${i ? ` · ${E.PROMOTE_COST[i]} tokens` : ''}"></i>`).join('')}</div></div>${medals}${footer}</div></div><div class="gi-foot">${personal || own ? '<button class="small" data-action="generals">HQ admirals</button>' : ''}${hqBack === 'game' ? '<button class="small" data-action="admirals">Assign admirals</button>' : ''}</div></section></div>`;
  focusDialog();
}
function admiralCard(u) {
  const a = E.ADMIRALS[u.admiral],
    o = E.officerOf(game, u);
  return `<div class="admiral-card">${generalPortrait(u.admiral, '', !!u.personal)}<b>${E.RANKS[o.rank]} ${a.name}</b><p>${a.skill} · ${a.desc}</p><p class="officer-line">${u.personal ? 'Your admiral' : 'Scenario commander'} · ${Math.round(E.RANK_HP[o.rank] * 100)}% hull · ${Object.entries(
    E.RATING_NAMES,
  )
    .map(([b, name]) => `${name} ${o.ratings[b]}★`)
    .join(' · ')}</p></div>`;
}
// In an operation: assign your admirals to fleets. Scenario commanders are listed but stay where they are.
function admiralDialog() {
  if (!interactive()) return;
  generalOpen = null;
  hqBack = 'game';
  const u = selectedUnit(),
    own = u?.side === game.player ? u : null,
    mine = Object.keys(game.roster || {}).filter(k => E.ADMIRALS[k].side === game.player),
    scenario = game.units.filter(v => v.hp > 0 && v.side === game.player && v.admiral && !v.personal);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Fleet admirals"><div class="dialog-head"><div><div class="eyebrow">High command · ${E.FACTIONS[game.player].name}</div><h2>Fleet admirals</h2><p>${costHTML({ credits: game.economy[game.player].credits }, true)} available · ${own && !own.admiral ? 'Assign one of your admirals to ' + E.TYPES[own.type].name + ' ×' + own.stack : 'Select one of your fleets without an admiral to assign an admiral.'}</p></div><button class="small close" data-action="close">Close</button></div><div class="info-strip">Your admirals are yours to keep: assign them to any fleet in any operation, even beside the scenario's own version, and develop them in HQ → Admirals. Scenario commanders come with the operation and cannot be upgraded.</div><h3 class="officer-section">Your admirals · ${mine.length}</h3><div class="admiral-grid officers">${mine.map(k => officerCard(k, own)).join('') || '<p class="description">No admirals for this side yet. Recruit them in HQ → Admirals.</p>'}</div>${scenario.length ? `<h3 class="officer-section">Scenario commanders</h3><div class="scenario-commanders">${scenario.map(v => `<div class="scenario-chip">${generalPortrait(v.admiral, 'chip-portrait', false)}<span><b>${E.ADMIRALS[v.admiral].short}</b><small>${E.TYPES[v.type].short} ×${v.stack} · ${E.RANKS[E.officerOf(game, v).rank]}</small></span></div>`).join('')}</div>` : ''}<div class="dialog-footer"><button data-action="generals">HQ admirals · upgrade &amp; recruit</button></div></section></div>`;
  focusDialog();
}
function officerCard(k, own) {
  const a = E.ADMIRALS[k],
    o = game.roster[k],
    busy = game.units.find(v => v.hp > 0 && v.personal && v.admiral === k);
  return `<section class="officer">${generalPortrait(k, 'officer-portrait', true)}<span class="stars">${'★'.repeat(a.stars)}</span><h3>${a.name}</h3><span class="label">${E.RANKS[o.rank]} · ${Math.round(E.RANK_HP[o.rank] * 100)}% hull · ${a.skill}</span><p>${a.desc}</p><div class="ratings">${Object.entries(
    E.RATING_NAMES,
  )
    .map(
      ([b, name]) =>
        `<div class="rating"><span>${name}</span><span class="stars">${ratingStars(o.ratings[b])}</span></div>`,
    )
    .join(
      '',
    )}</div>${o.medals.length ? `<p class="officer-line">🎖 ${o.medals.map(m => E.MEDALS[m].name).join(', ')}</p>` : ''}<div class="officer-actions">${busy ? `<button class="small" disabled>Commanding ${E.TYPES[busy.type].short}</button>` : act(`data-admiral="${k}"`, 'Assign to selected fleet', E.assignReason(game, own, k), costHTML({ credits: a.cost }))}</div></section>`;
}
// HQ → Admirals, as in WC4: your persistent roster for each side, and the admirals still to recruit.
let generalsSide = 'empire';
function generalsDialog(side = generalsSide) {
  generalsSide = side;
  generalOpen = null;
  const profile = loadProfile(),
    list = Object.entries(E.ADMIRALS).filter(([, a]) => a.side === side),
    mine = list.filter(([k]) => E.owns(profile, k)),
    locked = list.filter(([k]) => !E.owns(profile, k)),
    card = ([k, a]) => {
      const owned = E.owns(profile, k),
        o = owned ? E.roster(profile)[k] : { rank: 0, ratings: { ...E.officer(game, k).ratings } };
      return `<section class="officer ${owned ? '' : 'locked-officer'}">${generalPortrait(k, 'officer-portrait', true)}<span class="stars">${'★'.repeat(a.stars)}</span><h3>${a.name}</h3><span class="label">${owned ? `${E.RANKS[o.rank]} · ${Math.round(E.RANK_HP[o.rank] * 100)}% hull` : 'Recruitable'} · ${a.role} · ${a.skill}</span><p>${a.desc}</p><div class="ratings">${Object.entries(
        E.RATING_NAMES,
      )
        .map(
          ([b, name]) =>
            `<div class="rating"><span>${name}</span><span class="stars">${ratingStars(o.ratings[b])}</span></div>`,
        )
        .join(
          '',
        )}</div><div class="officer-actions">${owned ? `<button class="small" data-general-open="${k}">Upgrade</button>` : tokenButton(`data-recruit-admiral="${k}"`, E.recruitPrice(k), E.recruitReason(profile, k), 'Recruit ')}</div></section>`;
    };
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="HQ admirals"><div class="dialog-head"><div><div class="eyebrow">Command HQ · kept across every operation</div><h2>Admirals</h2><p class="hq-balance">${ICONS.use('token', 'cost-ico')} <b>${count(profile.tokens || 0)}</b> command tokens · ${Object.keys(E.roster(profile)).length} admirals</p></div><button class="small close" data-action="generals-close">Close</button></div><div class="tabs">${['empire', 'alliance'].map(s => `<button data-generals-side="${s}" class="${s === side ? 'active' : ''}">${E.FACTIONS[s].name}</button>`).join('')}</div><p class="description">Your admirals can be assigned to any fleet in any operation on their side, even when the operation already has its own version of them. Promote them and buy branch and Movement stars with command tokens; medals you earn are worn here.</p><h3 class="officer-section">Your admirals · ${mine.length}</h3><div class="admiral-grid officers">${mine.map(card).join('')}</div>${locked.length ? `<h3 class="officer-section">Recruit · ${locked.length}</h3><div class="admiral-grid officers">${locked.map(card).join('')}</div>` : ''}</section></div>`;
  focusDialog();
}
function archiveDialog(branch = 'Escort') {
  const cards = branch === 'Air'
    ? Object.entries(E.AIR_STRIKES).map(([type, sortie]) =>
        `<article class="unit-card">${ART.ship(type, 'catalog-ship', game.player)}
        <span class="unit-code">AIR BASE ${sortie.level} · PAID SORTIE</span>
        <h3>${sortie.name}</h3><p>${sortie.desc}</p>
        <div class="unit-spec"><span>Range ${E.airStrikeRange(game, game.player, type)}</span>
        <span>Base damage ${sortie.damage}</span><span>No per-turn sortie limit</span></div>
        <div class="cost">${costHTML(E.airStrikeCost(game, game.player, type))}</div></article>`).join('')
    : Object.entries(E.TYPES).filter(([, t]) => t.branch === branch && !t.air)
      .map(([k, t]) => {
        const stats = E.fleetStats(game, { type: k, side: game.player, stack: 1 });
        return `<article class="unit-card">${ART.ship(k, 'catalog-ship', game.player)}
        <span class="unit-code">${t.code} · Tier ${t.tier}</span><h3>${t.name}</h3>
        ${t.weapon ? `<span class="weapon-focus">${t.weapon}</span>` : ''}
        <p>${t.desc}</p>
        <div class="unit-spec"><span>HP ${stats.hp}</span><span>ATK ${stats.attack}</span>
        <span>ARM ${stats.armor}</span><span>Move ${stats.move}</span><span>Range ${rangeText({ type: k, side: game.player })}</span></div>
        <div class="cost">${costHTML(E.price(k, 1, game, game.player))}</div></article>`;
      }).join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Unit archive">
    <div class="dialog-head"><div><div class="eyebrow">Order of battle</div><h2>Fleet arsenal & aerospace sorties</h2>
    <p>Fleet hulls are permanent. Airstrikes are paid actions launched from station Air Bases.</p></div>
    <button class="small close" data-action="close">Close</button></div>
    <div class="tabs">${['Escort', 'Battle Line', 'Artillery', 'Air'].map(b =>
      `<button data-archive-branch="${b}" class="${b === branch ? 'active' : ''}">${b}</button>`).join('')}</div>
    <div class="cards">${cards}</div></section></div>`;
  focusDialog();
}
function helpDialog() {
  const armistice = E.conquestTurnLimit(game.mode === 'conquest' ? game : { cols: E.ERAS.frontier.cols });
  modal.innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Field manual"><div class="dialog-head"><div><div class="eyebrow">Field manual</div><h2>War on a hex grid</h2></div><button class="small close" data-action="help-close">Close</button></div><div class="help-grid"><div><b>Movement & firing</b><p>Every fleet can move once, then attack once per turn. Attacking spends its movement too. Select a fleet, click a green hex to move, and click a red hex to attack at once; hover a red hex to see the expected damage. Undo (Z) returns a fleet that moved but has not fired.</p></div><div><b>Capture stations</b><p>Destroy station defenses and remove its garrison, then move an Escort or Battle Line fleet onto the hex. Artillery cannot capture. Friendly stations produce resources and repair garrisons by 8% HP each turn.</p></div><div><b>Artillery & counter-fire</b><p>Artillery Frigates fire at range 1. Artillery Cruisers and Siege Cannons fire at exactly 2 hexes and cannot hit adjacent targets, so screen them with escorts. Artillery Cruisers splash enemies next to the target for 45% damage; Siege Cannons deal +100% station damage. All artillery attacks suppress enemy counter-fire. Escorts and Battle Line hulls exchange counter-fire when in range. Only Battleships and Dreadnoughts have range 2 in the Battle Line; all escorts and other cruisers have range 1.</p></div><div><b>Stacking & breakthroughs</b><p>Build 1–3-stack fleets. Each extra stack adds 70% HP and 45% attack. Fleet statistics include HQ upgrades; attack ratings also include veterancy and admiral bonuses. Morale, formations and target modifiers appear in damage previews. Add stacks near friendly stations. After a kill, cruisers may fire once more per turn; Mittermeyer, Attenborough and Nguyen allow two extra shots. Battleships and Dreadnoughts fire again after every kill. Breakthroughs preserve movement that was unused before firing; they never restore movement already spent.</p></div><div><b>Admirals & morale</b><p>Attach officers to any fleet. Each admiral has one signature ability, branch ratings (up to 6 stars) that raise damage and cut damage taken for that branch, and a Movement rating (up to 6 stars): 3 stars add one hex of movement, 4 stars two, and so on up to +4 at 6 stars (1 star costs a hex). There are two kinds of admiral, as in WC4. Scenario commanders come with an operation, stay on their fleets and cannot be upgraded. Your admirals live in HQ → Admirals: you start with two per side (Reinhard and Mittermeyer, Yang and Attenborough), recruit the rest with command tokens, promote them through eleven naval ranks (fleet hull 112% to 160%), buy branch and Movement stars and equip medals there, and assign them to any fleet in any operation, even beside the scenario's own version. High morale grants +25% damage; low −25%, diminished −50%. Confused fleets cannot act or retaliate. Two adjacent enemies lower morale; three diminish it. Yang’s Confusion reduces nearby enemy morale by 2.</p></div><div><b>Terrain & supply</b><p>Nebulae cost 2 movement and cause 2.5% attrition each turn. Asteroids cost 2 movement and reduce damage by 15%. Yang ignores terrain movement costs. Gravity rifts are impassable. Iserlohn and Fezzan are the only two crossings; securing one creates the bridgehead for an invasion.</p></div><div><b>Shipyards</b><p>Each station builds one fleet per turn. New units act next turn. Upgrade yards through tier 3 to unlock heavy hulls. Artillery unlocks in order: Artillery Frigates at tier 1, Artillery Cruisers at tier 2, Siege Cannons at tier 3.</p></div><div><b>HQ research & command tokens</b><p>As in World Conqueror 4, technology is researched at Command HQ with command tokens and is kept across every operation and side. The first victory in each operation at each difficulty earns tokens: 250, plus 50 per star (150 for a Conquest) and 1 per 5 research banked, ×1.5 on Hard and ×2 on Challenge, with 150 extra for your first win ever. Replays pay nothing. Five trees (Escort, Battle Line, Artillery, Aerospace, Stations) hold weapons, armor, hull, engine and class-ability upgrades. Higher tiers open after 2, 4 and 7 operations won.</p></div><div><b>Difficulty</b><p>Every operation has three difficulties. Normal is the operation as designed. Hard gives the enemy all tier I–II research, upgrades half of their fleets one class (an escort becomes a light cruiser, a cruiser a heavier hull) and adds a fleet for every four. Challenge gives them every technology, upgrades every fleet and adds a stack, adds a fleet for every two, and raises their income 25%. Enemy admirals also start one or two ranks higher.</p></div><div><b>Fortresses & Thor's Hammer</b><p>Iserlohn and Geiersburg carry main guns. Select your fortress and click a red hex to fire at an enemy fleet within 3 hexes for 40% of its hull and a morale hit. The gun then recharges for 2 turns and is silenced while the fortress shields are down. The enemy fires its fortresses the same way.</p></div><div><b>Station buildings</b><p>Every station has an upgradeable Shipyard, Research station and Air Base. Air Base levels unlock different paid sorties.</p></div><div><b>Airstrikes</b><p>Select a friendly station with an Air Base, choose Fighter, Bomber or Strategic Bomber Sortie, then click a red enemy target. Pay credits and industry per launch; there is no per-turn sortie limit. The aircraft fly in from the station using their existing artwork, do not occupy map hexes, cannot capture, and cannot fly across the gravity rift without a corridor base.</p></div><div><b>Campaigns & Conquest</b><p>Each side has its own campaign, played chapter by chapter as in World Conqueror 4: a chapter unlocks when you win the one before it. Empire: Tiamat, Astarte, Amritsar, the Eighth Battle of Iserlohn, Operation Ragnarök, Vermilion, Rantemario and the Corridor. Alliance: Astarte, the Seventh Battle of Iserlohn, Amritsar, the Defense of Iserlohn, Vermilion, Mar-Adetta and the Corridor. Each chapter has one objective, a turn limit and a 1–3 star rating. Conquest is the galactic frontier: a 51 × 29 galaxy of 44 named systems split by a broad gravity rift that only the Iserlohn and Fezzan corridors cross. Take both capitals, or hold more stations at the ${armistice}-turn armistice. The old start dates now live in the campaigns: the Lippstadt War, the Alliance Civil War and Ragnarök: Defend Heinessen.</p></div><div><b>Economy</b><p>The expanded frontier has many shipyards but reduced minor-system yields, so holding more territory broadens your production options without multiplying income at the old per-station rate. Escorts give the most firepower per credit; flagships are the strongest ships per hex but cost about two turns of income. Extra stacks cost 85% of a hull, reinforcing in the field costs a full hull, and repairs cost a fifth of the fleet's price.</p></div><div><b>Your objectives</b><p>Conquest: hold both capitals, or hold more stations at the ${armistice}-turn armistice. Scenarios: complete the objective before the turn limit; finish faster, or with more fleets intact when holding, for more stars.</p></div></div><div class="info-strip">Controls: G sets a standing course · C clears it · N cycles ready fleets · Click or Enter on a red hex attacks · Z undoes the last move · Escape clears the selection or closes a menu · Arrow keys move the hex cursor and Enter selects · Drag or WASD pans · Scroll / + / − zooms · 0 fits the map.</div><p style="font-size:12px">Unofficial fan game. Original code and alternate-history scenarios, using the requested ship-class mappings. Gameplay draws on <a href="https://apps.apple.com/sg/app/world-conqueror-4/id1258468290" target="_blank" rel="noopener noreferrer">EasyTech’s World Conqueror 4</a>; <a href="https://world-conqueror-4.fandom.com/wiki/Units" target="_blank" rel="noopener noreferrer">unit reference</a>. Numbers and some abilities are adapted for this game.</p></section></div>`;
  focusDialog();
}
function menuDialog() {
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="Game menu"><div class="eyebrow">Command headquarters</div><h2>Your orders, Admiral.</h2><p>Your current operation is saved automatically in this browser. The previous real-time game’s save is kept separately.</p><div class="dialog-footer"><div><button class="primary" data-action="close">Resume</button><button data-action="new">New operation</button><button data-action="help">Field manual</button></div></div></section></div>`;
  focusDialog();
}
