/* Galactic Command: deterministic hex tactics rules. No UI or network dependencies. */
(function (root) {
  'use strict';
  // Browser builds preload these data modules from index.html; Node tests load them here.
  if (typeof module !== 'undefined' && typeof require === 'function') {
    require('./engine/admirals.js');
    require('./engine/research.js');
    require('./engine/galaxy.js');
    require('./engine/campaign.js');
  }
  const FACTIONS = {
    empire: { name: 'Galactic Empire', short: 'Empire', color: '#e3b46f' },
    alliance: { name: 'Free Planets Alliance', short: 'Alliance', color: '#65cfdf' },
    neutral: { name: 'Independent', short: 'Neutral', color: '#9b9bb5' },
  };
  const TYPES = {
    corvette: {
      name: 'Corvette',
      short: 'Corvette',
      code: 'CV',
      branch: 'Escort',
      wc: 'Light Infantry',
      hp: 150,
      attack: 37,
      armor: 9,
      move: 4,
      min: 1,
      max: 1,
      cost: 60,
      industry: 10,
      tier: 1,
      crit: 0.08,
      pen: 0.08,
      desc: 'Low-cost fleet screen and fast station capture. Range 1; exchanges counter-fire.',
    },
    frigate: {
      name: 'Frigate',
      short: 'Frigate',
      code: 'FF',
      branch: 'Escort',
      wc: 'Assault Infantry',
      hp: 210,
      attack: 53,
      armor: 16,
      move: 3,
      min: 1,
      max: 1,
      cost: 110,
      industry: 25,
      tier: 1,
      crit: 0.12,
      pen: 0.45,
      boarding: true,
      desc: 'Marine assault pods: +55% damage to Battle Line hulls and stations. Range 1; exchanges counter-fire.',
    },
    destroyer: {
      name: 'Destroyer',
      short: 'Destroyer',
      code: 'DD',
      branch: 'Escort',
      wc: 'Motorized Infantry',
      hp: 200,
      attack: 47,
      armor: 15,
      move: 5,
      min: 1,
      max: 1,
      cost: 115,
      industry: 25,
      tier: 2,
      crit: 0.1,
      pen: 0.15,
      desc: 'Five-hex movement for rapid flanking and station raids. Range 1; exchanges counter-fire.',
    },
    light: {
      name: 'Light Cruiser',
      short: 'Light cruiser',
      code: 'LC',
      branch: 'Battle Line',
      wc: 'Light Tank',
      hp: 245,
      attack: 57,
      armor: 23,
      move: 4,
      min: 1,
      max: 1,
      cost: 135,
      industry: 30,
      tier: 1,
      crit: 0.12,
      pen: 0.2,
      breakthrough: true,
      desc: 'Balanced early combatant. A kill lets it fire once more per turn; if it had not moved yet, movement remains available.',
    },
    heavy: {
      name: 'Heavy Cruiser',
      short: 'Heavy cruiser',
      code: 'HC',
      branch: 'Battle Line',
      wc: 'Medium Tank',
      hp: 330,
      attack: 71,
      armor: 32,
      move: 3,
      min: 1,
      max: 1,
      cost: 215,
      industry: 55,
      tier: 2,
      crit: 0.14,
      pen: 0.3,
      breakthrough: true,
      desc: 'The fleet backbone. Heavy armor; a kill lets it fire once more per turn; if it had not moved yet, movement remains available.',
    },
    battleship: {
      name: 'Battleship',
      short: 'Battleship',
      code: 'BB',
      branch: 'Battle Line',
      wc: 'Heavy Tank',
      hp: 440,
      attack: 89,
      armor: 42,
      move: 3,
      min: 1,
      max: 2,
      cost: 330,
      industry: 90,
      tier: 3,
      crit: 0.18,
      pen: 0.42,
      breakthrough: true,
      relentless: true,
      desc: 'Heavy armor penetration and 1–2 hex guns. Exchanges counter-fire. Every kill lets it fire again and preserves any unused movement.',
    },
    flagship: {
      name: 'Dreadnought',
      short: 'Dreadnought',
      code: 'DN',
      branch: 'Battle Line',
      wc: 'Super Heavy Tank',
      hp: 590,
      attack: 108,
      armor: 52,
      move: 2,
      min: 1,
      max: 2,
      cost: 500,
      industry: 140,
      tier: 3,
      crit: 0.22,
      pen: 0.48,
      breakthrough: true,
      relentless: true,
      desc: 'Super-heavy capital ship. Immense armor, 1–2 hex guns and counter-fire. Every kill lets it fire again and preserves any unused movement.',
    },
    beam: {
      name: 'Artillery Frigate',
      short: 'Artillery frigate',
      code: 'AF',
      branch: 'Artillery',
      wc: 'Field Artillery',
      weapon: 'Forward Neutron Accelerator',
      hp: 150,
      attack: 59,
      armor: 10,
      move: 2,
      min: 1,
      max: 1,
      cost: 130,
      industry: 30,
      tier: 1,
      crit: 0.12,
      pen: 0.45,
      noCounter: true,
      desc: 'Range 1 neutron accelerator. Suppresses enemy counter-fire; protect its vulnerable hull with escorts.',
    },
    missile: {
      name: 'Artillery Cruiser',
      short: 'Artillery cruiser',
      code: 'AC',
      branch: 'Artillery',
      wc: 'Rocket Artillery',
      weapon: 'Mass Fusion Torpedo Racks',
      hp: 185,
      attack: 77,
      armor: 12,
      move: 3,
      min: 2,
      max: 2,
      cost: 235,
      industry: 70,
      tier: 2,
      crit: 0.12,
      pen: 0.55,
      noCounter: true,
      splash: 0.45,
      desc: 'Range 2 fusion salvos; cannot fire at adjacent targets. 45% splash damage and morale loss to enemies next to the target. Suppresses counter-fire.',
    },
    siege: {
      name: 'Siege Cannon',
      short: 'Siege cannon',
      code: 'SC',
      branch: 'Artillery',
      wc: 'Gustav / Siege',
      weapon: 'Fortress-Class Spinal Cannon',
      hp: 280,
      attack: 112,
      armor: 23,
      move: 1,
      min: 2,
      max: 2,
      cost: 380,
      industry: 110,
      tier: 3,
      crit: 0.25,
      critMult: 1.9,
      pen: 0.8,
      noCounter: true,
      siege: 2,
      desc: 'Range 2 fortress cannon; cannot fire at adjacent targets. +100% station damage, 80% armor penetration, movement 1. Suppresses counter-fire.',
    },
    fighter: {
      name: 'Fighter Wing',
      short: 'Fighter wing',
      code: 'FW',
      branch: 'Air',
      wc: 'Fighter',
      weapon: 'Spartanian / Walküre interceptors',
      hp: 130,
      attack: 46,
      armor: 6,
      move: 6,
      min: 1,
      max: 1,
      cost: 110,
      industry: 30,
      tier: 1,
      crit: 0.15,
      pen: 0.3,
      air: true,
      antiAir: 1.6,
      desc: 'Fast interceptors: +60% damage against air wings. Ignores terrain, cannot capture, and loses 10% hull each turn it starts more than 3 hexes from a friendly air base.',
    },
    bomber: {
      name: 'Bomber Wing',
      short: 'Bomber wing',
      code: 'BW',
      branch: 'Air',
      wc: 'Bomber',
      weapon: 'Anti-ship torpedo bombers',
      hp: 150,
      attack: 76,
      armor: 8,
      move: 5,
      min: 1,
      max: 1,
      cost: 200,
      industry: 55,
      tier: 2,
      crit: 0.15,
      pen: 0.55,
      air: true,
      shipKiller: 1.4,
      desc: 'Ship-killers: +40% damage against Battle Line and Artillery hulls. Only escorts and fighters can return fire. Needs a friendly air base within 3 hexes.',
    },
    strategic: {
      name: 'Strategic Bomber Wing',
      short: 'Strategic bomber',
      code: 'SW',
      branch: 'Air',
      wc: 'Strategic Bomber',
      weapon: 'Heavy fusion bomb racks',
      hp: 190,
      attack: 104,
      armor: 10,
      move: 5,
      min: 1,
      max: 1,
      cost: 330,
      industry: 95,
      tier: 3,
      crit: 0.2,
      pen: 0.7,
      air: true,
      siege: 2.2,
      desc: 'Heavy bombers: +120% damage against station defenses. Only escorts and fighters can return fire. Needs a friendly air base within 3 hexes.',
    },
  };
  const ADMIRALS = root.GalacticData.ADMIRALS;
  // HQ technology, as in World Conqueror 4: bought with command tokens earned by winning operations, kept in the
  // player's profile across every operation and side. Each level unlocks at a tier gated by total victories.
  const { BRANCHES, BRANCH_NAMES, RATING_NAMES, TECH_TIERS, TECH_TREE, TECH_NODES, TECHS } = root.GalacticData;
  function branchOf(type) {
    return BRANCHES[TYPES[type].branch];
  }
  function techLevel(g, side, id) {
    return g?.tech?.[side]?.[id] || 0;
  }
  function techValue(g, side, id) {
    const l = techLevel(g, side, id);
    return l ? TECH_NODES[id].values[l - 1] : 0;
  }
  // Branch-wide tech for a fleet, e.g. unitTech(g, u, 'guns') reads 'line.guns' for a cruiser.
  function unitTech(g, u, k) {
    return techValue(g, u.side, `${branchOf(u.type)}.${k}`);
  }
  // A hex is in air supply when a friendly station with an air base lies within supply range.
  function airSupplied(g, side, p) {
    return g.stations.some(s => s.owner === side && (s.air || 0) > 0 && distance(s, p) <= airSupply(g, side));
  }
  function airSupply(g, side) {
    return techLevel(g, side, 'air.carrier') >= 1 ? 5 : 3;
  }

  // Admiral development, as in WC4: naval ranks bought with command tokens raise the commanded fleet's hull,
  // and branch stars raise its damage. Each admiral keeps one signature ability. Records persist between operations.
  const RANKS = [
    'Ensign',
    'Lieutenant JG',
    'Lieutenant',
    'Lt Commander',
    'Commander',
    'Captain',
    'Commodore',
    'Rear Admiral',
    'Vice Admiral',
    'Admiral',
    'Fleet Admiral',
  ];
  const RANK_HP = [1.12, 1.16, 1.2, 1.24, 1.28, 1.33, 1.38, 1.43, 1.48, 1.54, 1.6];
  // Tokens to reach each rank.
  const PROMOTE_COST = [0, 50, 80, 120, 160, 220, 280, 350, 430, 520, 650];
  const MEDALS = {
    valor: { name: 'Order of Valor', desc: '+8% damage.', earn: 'Destroy a fleet commanded by an enemy admiral.' },
    laurel: { name: 'Golden Laurel', desc: '8% less damage taken.', earn: 'Win a scenario with three stars.' },
    star: { name: "Conqueror's Star", desc: '+1 movement.', earn: 'Capture an enemy capital.' },
    marksman: {
      name: 'Marksman Ribbon',
      desc: '+8% critical chance.',
      earn: 'One admiral destroys 5 fleets in a single operation.',
    },
    campaign: { name: 'Campaign Ribbon', desc: '+4% damage and 4% less damage taken.', earn: 'Win any operation.' },
  };
  // Starting ratings (stars, up to 6 with command tokens): Escort, Battle Line, Artillery, Aerospace, plus Movement.
  const RATINGS = root.GalacticData.RATINGS;
  // Two kinds of admiral. Scenario commanders come with an operation, sit on their fleets with fixed stats
  // (g.officers) and are never upgraded. Your admirals (profile.roster) are bought once, upgraded in HQ, kept
  // between operations and assignable in any operation, even beside the scenario's own version (u.personal).
  const STARTERS = { empire: ['reinhard', 'mittermeyer'], alliance: ['yang', 'attenborough'] };
  function recruitPrice(k) {
    const a = ADMIRALS[k];
    return a?.recruit ?? (a?.stars >= 5 ? 400 : 300);
  }
  function defaultOfficer(k) {
    return { rank: ADMIRALS[k].stars >= 5 ? 1 : 0, ratings: { ...RATINGS[k] }, medals: [] };
  }
  function cleanOfficer(k, rec) {
    const base = defaultOfficer(k);
    if (!rec) return base;
    return {
      rank: clamp(Number.isInteger(rec.rank) ? rec.rank : base.rank, 0, RANKS.length - 1),
      ratings: Object.fromEntries(
        Object.entries({ ...base.ratings, ...(rec.ratings || {}) }).map(([b, n]) => [b, clamp(n | 0, 1, MAX_RATING)]),
      ),
      medals: (rec.medals || []).filter(m => MEDALS[m]),
    };
  }
  // The persistent roster, created on first use: the two starters per side, plus anyone recruited before.
  function roster(profile) {
    if (!profile.roster) {
      profile.roster = {};
      const keep = [...STARTERS.empire, ...STARTERS.alliance, ...(profile.recruited || [])];
      for (const k of keep) if (ADMIRALS[k]) profile.roster[k] = cleanOfficer(k, profile.officers?.[k]);
    }
    // Ratings added after a profile was made (such as Movement) start at the admiral's default.
    for (const [k, o] of Object.entries(profile.roster))
      if (RATINGS[k]) o.ratings = { ...RATINGS[k], ...(o.ratings || {}) };
    return profile.roster;
  }
  function owns(profile, k) {
    return !!roster(profile)[k];
  }
  function officer(g, k) {
    if (!k || !ADMIRALS[k]) return null;
    g.officers ||= {};
    return withRatings(k, (g.officers[k] ||= defaultOfficer(k)));
  }
  // Saves made before a rating existed (such as Movement) pick up the admiral's default for it.
  function withRatings(k, o) {
    if (o && Object.keys(RATINGS[k] || {}).some(b => o.ratings?.[b] == null))
      o.ratings = { ...RATINGS[k], ...o.ratings };
    return o;
  }
  // The record behind a fleet's admiral: your admiral for personal fleets, the scenario commander otherwise.
  function officerOf(g, u) {
    if (!u?.admiral) return null;
    return (u.personal && withRatings(u.admiral, g.roster?.[u.admiral])) || officer(g, u.admiral);
  }
  function wears(g, u, medal) {
    return !!officerOf(g, u)?.medals?.includes(medal);
  }
  function medalSlots(o) {
    return 1 + Math.floor(o.rank / 4);
  }
  // Damage dealt and taken by an admiral's fleet: branch rating and medals.
  function officerAttack(g, u) {
    if (!u.admiral) return 1;
    const o = officerOf(g, u);
    return (
      (1 + 0.04 * ((o.ratings[branchOf(u.type)] || 3) - 3)) *
      (wears(g, u, 'valor') ? 1.08 : 1) *
      (wears(g, u, 'campaign') ? 1.04 : 1)
    );
  }
  function officerDefense(g, u) {
    if (!u.admiral) return 1;
    const o = officerOf(g, u);
    return Math.max(
      0.5,
      (1 - 0.03 * ((o.ratings[branchOf(u.type)] || 3) - 3)) *
        (wears(g, u, 'laurel') ? 0.92 : 1) *
        (wears(g, u, 'campaign') ? 0.96 : 1),
    );
  }
  // Movement rating: 2 stars ±0, then +1 hex per star (3 stars +1 … 6 stars +4); 1 star −1.
  function moveBonus(o, k) {
    const n = o?.ratings?.move ?? RATINGS[k]?.move ?? 3;
    return n - 2;
  }
  function auraRange(g, a) {
    return a && ['eisenach', 'merkatz'].includes(a.admiral) ? 2 : 1;
  }
  // Lowest morale a fleet can be pushed to: Reinhard, Wahlen and Bucock hold steady; Murai's staff stops confusion.
  function moraleFloor(g, v) {
    if (['reinhard', 'wahlen', 'bucock'].includes(v.admiral)) return 0;
    return g.units.some(m => m.hp > 0 && m.side === v.side && m.admiral === 'murai' && distance(m, v) <= 1) ? -1 : -3;
  }
  // ---- HQ admirals: every action below works on the profile, outside or inside an operation ----
  function tokenShort(profile, cost) {
    const have = profile?.tokens || 0;
    return cost > have ? `Need ${cost - have} more command tokens` : null;
  }
  function recruitReason(profile, k) {
    if (!ADMIRALS[k]) return 'Unknown admiral';
    if (owns(profile, k)) return 'Already one of your admirals';
    return tokenShort(profile, recruitPrice(k));
  }
  function recruitAdmiral(profile, k) {
    const why = recruitReason(profile, k);
    if (why) return { ok: false, reason: why };
    profile.tokens -= recruitPrice(k);
    roster(profile)[k] = defaultOfficer(k);
    return { ok: true };
  }
  function ownedReason(profile, k) {
    if (!ADMIRALS[k]) return 'Unknown admiral';
    return owns(profile, k) ? null : `Recruit for ${recruitPrice(k)} command tokens first`;
  }
  function promoteCost(o) {
    return PROMOTE_COST[o.rank + 1] ?? Infinity;
  }
  function promoteReason(profile, k) {
    const why = ownedReason(profile, k);
    if (why) return why;
    const o = roster(profile)[k];
    return o.rank >= RANKS.length - 1 ? 'Highest rank reached' : tokenShort(profile, promoteCost(o));
  }
  function promote(profile, k) {
    const why = promoteReason(profile, k);
    if (why) return { ok: false, reason: why };
    const o = roster(profile)[k];
    profile.tokens -= promoteCost(o);
    o.rank++;
    return { ok: true, rank: o.rank };
  }
  // As in WC4, command tokens (the medals of this game) buy extra branch and Movement stars, up to six.
  const MAX_RATING = 6;
  const STAR_COST = [0, 0, 0, 60, 120, 220, 360];
  function starCost(profile, k, branch) {
    const o = roster(profile)[k] || defaultOfficer(k);
    return STAR_COST[(o.ratings[branch] || 0) + 1] ?? Infinity;
  }
  function starReason(profile, k, branch) {
    if (!RATING_NAMES[branch]) return 'Unknown rating';
    const why = ownedReason(profile, k);
    if (why) return why;
    return (roster(profile)[k].ratings[branch] || 0) >= MAX_RATING
      ? `Already ${MAX_RATING} stars`
      : tokenShort(profile, starCost(profile, k, branch));
  }
  function buyStar(profile, k, branch) {
    const why = starReason(profile, k, branch);
    if (why) return { ok: false, reason: why };
    profile.tokens -= starCost(profile, k, branch);
    const o = roster(profile)[k];
    o.ratings[branch]++;
    return { ok: true, stars: o.ratings[branch] };
  }
  function equipReason(profile, k, medal) {
    const why = ownedReason(profile, k);
    if (why) return why;
    const o = roster(profile)[k];
    return (
      (!(profile.medals || []).includes(medal) ? 'Not in your medal case' : null) ||
      (o.medals.includes(medal) ? 'Already wearing this medal' : null) ||
      (o.medals.length >= medalSlots(o) ? `All ${medalSlots(o)} medal slots in use` : null)
    );
  }
  function equipMedal(profile, k, medal) {
    const why = equipReason(profile, k, medal);
    if (why) return { ok: false, reason: why };
    profile.medals.splice(profile.medals.indexOf(medal), 1);
    roster(profile)[k].medals.push(medal);
    return { ok: true };
  }
  function unequipMedal(profile, k, medal) {
    const why = ownedReason(profile, k);
    if (why) return { ok: false, reason: why };
    const o = roster(profile)[k],
      i = o.medals.indexOf(medal);
    if (i < 0) return { ok: false, reason: 'Not wearing that medal' };
    o.medals.splice(i, 1);
    (profile.medals ||= []).push(medal);
    return { ok: true };
  }
  function award(g, side, id, reason) {
    if (side !== g.player || !MEDALS[id]) return;
    (g.medalInventory ||= []).push(id);
    (g.medalsEarned ||= []).push({ id, reason, turn: g.turn });
    log(g, `${MEDALS[id].name} awarded: ${reason}.`, side);
  }

  // ======== Reasons an order is unavailable (null when it is allowed) ========
  function shortfall(e, cost) {
    const need = [
      ['credits', 'credits'],
      ['industry', 'industry'],
      ['science', 'research'],
    ]
      .filter(([k]) => (cost[k] || 0) > (e?.[k] || 0))
      .map(([k, label]) => `${Math.ceil(cost[k] - (e?.[k] || 0))} more ${label}`);
    return need.length ? 'Need ' + need.join(' and ') : null;
  }
  function turnReason(g, side) {
    return g.over ? 'Operation over' : g.phase !== side ? 'Not your turn' : null;
  }
  function actedReason(u) {
    return u.morale <= -3
      ? 'Fleet is confused'
      : u.attacked
        ? 'Already fired'
        : u.moved
          ? 'Already moved this turn'
          : null;
  }
  function nearFriendlyStation(g, u) {
    return g.stations.some(s => s.owner === u.side && distance(s, u) <= 1);
  }
  function repairReason(g, u) {
    if (!u) return 'Select a fleet';
    return (
      turnReason(g, u.side) ||
      actedReason(u) ||
      (u.hp >= maxHP(u) ? 'Hull already intact' : null) ||
      (!nearFriendlyStation(g, u) ? 'No friendly station nearby' : null) ||
      shortfall(funds(g, u.side), { credits: repairCost(u, g) })
    );
  }
  function reinforceReason(g, u) {
    if (!u) return 'Select a fleet';
    return (
      turnReason(g, u.side) ||
      (TYPES[u.type].elite ? 'Cannot be stacked' : null) ||
      (u.stack >= 3 ? 'Already at 3 stacks' : null) ||
      actedReason(u) ||
      (!nearFriendlyStation(g, u) ? 'No friendly station nearby' : null) ||
      shortfall(funds(g, u.side), reinforceCost(u.type))
    );
  }
  function buyReason(g, s, type, stack = 1) {
    const t = TYPES[type];
    if (!t || !s) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your station' : null) ||
      (t.air
        ? (s.air || 0) < t.tier
          ? `Requires air base level ${t.tier}`
          : null
        : s.tier < t.tier
          ? `Requires shipyard tier ${t.tier}`
          : null) ||
      (t.elite && stack !== 1 ? 'Cannot be stacked' : null) ||
      (!Number.isInteger(stack) || stack < 1 || stack > 3 ? 'Choose 1–3 stacks' : null) ||
      (s.producedTurn === g.turn ? 'Already built here this turn' : null) ||
      (!recruitOptions(g, s, s.owner).length ? 'No free hex next to the station' : null) ||
      shortfall(funds(g, s.owner), price(type, stack, g, s.owner))
    );
  }
  function buildReason(g, s, kind) {
    if (!s || !BUILDINGS[kind]) return 'Unavailable';
    return (
      (g.over ? 'Operation over' : s.owner !== g.phase ? 'Not your station' : null) ||
      (buildingLevel(s, kind) >= 3 ? 'Maximum level' : null) ||
      shortfall(funds(g, s.owner), buildCost(s, kind))
    );
  }
  // HQ research works on the persistent profile: { tokens, wins, research: { 'line.armor': 2, ... } }.
  function researchReason(profile, id) {
    const n = TECH_NODES[id];
    if (!n) return 'Unavailable';
    const research = profile?.research || {},
      l = research[id] || 0;
    if (l >= n.max) return 'Fully researched';
    const tier = n.tiers[l],
      wins = profile?.wins || 0;
    if (wins < TECH_TIERS[tier])
      return `Tier ${tier}: win ${TECH_TIERS[tier] - wins} more operation${TECH_TIERS[tier] - wins > 1 ? 's' : ''}`;
    if (n.req) {
      const [k, need] = n.req,
        rid = `${n.branch}.${k}`;
      if ((research[rid] || 0) < need) return `Requires ${TECH_NODES[rid].name} ${ROMAN[need]}`;
    }
    const cost = researchCost(id, l),
      have = profile?.tokens || 0;
    return cost > have ? `Need ${cost - have} more command tokens` : null;
  }
  // Only your own admirals can be assigned; a scenario's commanders stay on the fleets they came with.
  function assignReason(g, u, k) {
    const a = ADMIRALS[k];
    if (!a) return 'Unknown admiral';
    if (!g.roster?.[k]) return `Not one of your admirals: recruit in HQ for ${recruitPrice(k)} command tokens`;
    const busy = g.units.find(v => v.hp > 0 && v.personal && v.admiral === k);
    if (busy) return `Commanding ${TYPES[busy.type].short}`;
    if (!u) return 'Select one of your fleets first';
    return (
      turnReason(g, u.side) ||
      (a.side !== u.side ? 'Serves the other side' : null) ||
      (u.admiral ? 'Fleet already has an admiral' : null) ||
      shortfall(funds(g, u.side), { credits: a.cost })
    );
  }
  function confuseReason(g, u) {
    if (!u || u.admiral !== 'yang') return 'Only Yang can use Confusion';
    return (
      turnReason(g, u.side) ||
      (u.morale <= -3 ? 'Fleet is confused' : null) ||
      (u.confusionCD > 0 ? `Ready in ${u.confusionCD} turn${u.confusionCD > 1 ? 's' : ''}` : null) ||
      (!g.units.some(v => v.hp > 0 && v.side !== u.side && distance(u, v) <= 2) ? 'No enemy within 2 hexes' : null)
    );
  }
  // Bring the profile into an operation: a copy of your admirals (for assignment and personal fleets) and research.
  function applyProfile(g, profile = {}) {
    applyRoster(g, profile);
    return applyTech(g, profile?.research);
  }
  // Refresh your admirals inside an operation, e.g. after an HQ promotion; personal fleets keep their damage.
  function applyRoster(g, profile = {}) {
    g.roster = Object.fromEntries(Object.entries(roster(profile)).map(([k, rec]) => [k, cleanOfficer(k, rec)]));
    for (const u of g.units) {
      if (!u.admiral) continue;
      const old = maxHP(u);
      u.cmdRank = officerOf(g, u).rank;
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    return g;
  }
  // Profiles are edited directly; the game never writes officer records back.
  function exportProfile(g, profile = {}) {
    return { ...profile };
  }
  // Load HQ research into the player's side: hull bonuses keep each fleet's damage, station defenses follow.
  function applyTech(g, research = {}) {
    g.tech ||= {};
    g.tech[g.player] = Object.fromEntries(
      Object.entries(research || {})
        .filter(([id, l]) => TECH_NODES[id] && Number.isInteger(l) && l > 0)
        .map(([id, l]) => [id, Math.min(l, TECH_NODES[id].max)]),
    );
    for (const u of g.units) {
      if (u.side !== g.player) continue;
      const old = maxHP(u);
      u.hpTech = unitTech(g, u, 'hull');
      if (u.hp > 0) u.hp = Math.max(1, maxHP(u) - (old - u.hp));
    }
    g.stations.forEach(s => fortify(g, s));
    return g;
  }
  // Fortification research raises the defenses of stations its owner holds.
  function fortify(g, s) {
    const bonus = techValue(g, s.owner, 'station.fort'),
      old = s.fortBonus || 0;
    if (bonus === old) return;
    s.maxShield += bonus - old;
    s.shield = clamp(s.shield + Math.max(0, bonus - old), 0, s.maxShield);
    s.fortBonus = bonus;
  }
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
  function researchCost(id, level = 0) {
    return TECH_NODES[id]?.costs[level] ?? Infinity;
  }
  function research(profile, id) {
    const why = researchReason(profile, id);
    if (why) return { ok: false, reason: why };
    const l = profile.research?.[id] || 0;
    profile.tokens -= researchCost(id, l);
    (profile.research ||= {})[id] = l + 1;
    return { ok: true, level: l + 1 };
  }
  // Command tokens are paid only for the first victory in each operation at each difficulty (Hard ×1.5,
  // Challenge ×2); the first victory ever earns a bonus. Banked research converts 5 : 1.
  const TOKEN_REWARD = { victory: 250, star: 50, conquest: 150, first: 150, research: 5 };
  function operationKey(g) {
    return `${g.mode === 'conquest' ? 'conquest:' + (g.era || 'frontier') : g.mode}:${DIFFICULTIES[g.difficulty] ? g.difficulty : 'normal'}`;
  }
  function missionReward(g, wins = 0, cleared = {}) {
    if (!g.over || g.over.winner !== g.player) return { total: 0, parts: [] };
    if (cleared[operationKey(g)]) return { total: 0, parts: [], repeat: true };
    const parts = [['Victory', TOKEN_REWARD.victory]];
    if (g.mode === 'conquest') parts.push(['Conquest', TOKEN_REWARD.conquest]);
    else parts.push([`${g.over.stars || 1}★ rating`, TOKEN_REWARD.star * (g.over.stars || 1)]);
    const banked = Math.floor((funds(g, g.player)?.science || 0) / TOKEN_REWARD.research);
    if (banked) parts.push(['Banked research', banked]);
    const scale = DIFFICULTIES[g.difficulty]?.tokens || 1;
    if (scale !== 1) parts.push([`${DIFFICULTIES[g.difficulty].name} ×${scale}`, 0]);
    let total = Math.round(parts.reduce((a, [, v]) => a + v, 0) * scale);
    if (!wins) {
      parts.push(['First victory', TOKEN_REWARD.first]);
      total += TOKEN_REWARD.first;
    }
    return { total, parts };
  }
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1],
  ];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const axial = p => ({ q: p.c - Math.floor(p.r / 2), r: p.r });
  const distance = (a, b) => {
    a = axial(a);
    b = axial(b);
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  };
  const key = p => p.c + ',' + p.r;
  const opponent = s => (s === 'empire' ? 'alliance' : 'empire');
  function tile(g, c, r) {
    return c >= 0 && r >= 0 && c < g.cols && r < g.rows ? g.tiles[r * g.cols + c] : null;
  }
  function adjacent(g, p) {
    const a = axial(p);
    return DIRS.map(d => {
      const r = a.r + d[1],
        c = a.q + d[0] + Math.floor(r / 2);
      return tile(g, c, r);
    }).filter(Boolean);
  }
  function unitAt(g, p) {
    return g.units.find(u => u.hp > 0 && u.c === p.c && u.r === p.r);
  }
  function stationAt(g, p) {
    return g.stations.find(s => s.c === p.c && s.r === p.r);
  }
  function random(g) {
    g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
    return g.seed / 4294967296;
  }
  function log(g, text, side) {
    g.log.unshift({ turn: g.turn, text, side: side || g.phase });
    g.log = g.log.slice(0, 30);
  }
  function funds(g, side) {
    return g.economy[side];
  }
  // An admiral's naval rank sets the hull bonus of the fleet they command (112% for an Ensign to 160%).
  function maxHP(u) {
    return Math.round(
      TYPES[u.type].hp *
        (1 + 0.7 * (u.stack - 1)) *
        (u.cmdRank == null ? 1 : RANK_HP[u.cmdRank] || 1) *
        (1 + (u.hpTech || 0)),
    );
  }
  // Saves from earlier rules versions are not carried forward.
  function migrateSave(g) {
    if (!g || g.version !== 2 || g.rulesVersion !== 11 || !Array.isArray(g.units)) return null;
    return g.units.every(u => TYPES[u.type]) ? g : null;
  }
  function newUnit(g, type, side, c, r, stack = 1, admiral = null, ready = true) {
    const u = {
      id: g.nextId++,
      type,
      side,
      c,
      r,
      stack,
      hp: 0,
      morale: 0,
      moved: !ready,
      attacked: !ready,
      admiral,
      kills: 0,
      chain: 0,
      xp: 0,
      confusionCD: 0,
    };
    u.hpTech = unitTech(g, u, 'hull');
    u.hp = maxHP(u);
    g.units.push(u);
    return u;
  }
  function movement(g, u) {
    const t = TYPES[u.type];
    if (t.elite) return 1;
    let n = t.move + unitTech(g, u, 'drives');
    n += wears(g, u, 'star') ? 1 : 0;
    if (u.admiral === 'reinhard' && t.branch === 'Battle Line') n++;
    if (u.admiral === 'mittermeyer') n += 2;
    if (g?.rules?.blitz && u.side === g.rules.blitz.side && g.turn <= g.rules.blitz.turns) n++;
    if (['attenborough', 'fischer'].includes(u.admiral)) n++;
    if (u.admiral && g) n += moveBonus(officerOf(g, u), u.admiral);
    return Math.max(1, n);
  }
  function terrainCost(g, u, t) {
    if (u.admiral === 'yang' || TYPES[u.type].air) return 1;
    const nav = TYPES[u.type].branch === 'Escort' ? techLevel(g, u.side, 'escort.nav') : 0;
    if (nav >= 2 || (nav >= 1 && t.terrain === 'asteroid')) return 1;
    return t.terrain === 'nebula' || t.terrain === 'asteroid' ? 2 : 1;
  }
  function canCapture(u) {
    return TYPES[u.type].branch !== 'Artillery' && !TYPES[u.type].air;
  }
  function isReady(g, u) {
    return !g.over && g.phase === u.side && u.hp > 0 && u.morale > -3;
  }
  function reachable(g, u) {
    const found = new Map();
    if (!isReady(g, u) || u.moved || (u.attacked && !u.sortie)) return found;
    const start = key(u),
      costs = new Map([[start, 0]]),
      queue = [{ p: tile(g, u.c, u.r), cost: 0 }];
    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const { p, cost } = queue.shift();
      if (cost > costs.get(key(p))) continue;
      for (const n of adjacent(g, p)) {
        if (n.terrain === 'rift') continue;
        const occ = unitAt(g, n),
          st = stationAt(g, n);
        if (occ && occ.side !== u.side) continue;
        if (st && st.owner !== u.side && (st.shield > 0 || !canCapture(u))) continue;
        const nc = cost + terrainCost(g, u, n);
        if (nc > movement(g, u) || nc >= (costs.get(key(n)) ?? Infinity)) continue;
        costs.set(key(n), nc);
        queue.push({ p: n, cost: nc });
        if (!occ && key(n) !== start) found.set(key(n), nc);
      }
    }
    return found;
  }
  // Fire Control II adds one hex of range to all artillery.
  function rangeOf(g, u) {
    const t = TYPES[u.type];
    return {
      min: t.min,
      max: t.max + (g && t.branch === 'Artillery' && techLevel(g, u.side, 'artillery.fire') >= 2 ? 1 : 0),
    };
  }
  function inRange(a, p, g) {
    const { min, max } = rangeOf(g, a),
      d = distance(a, p);
    return d >= min && d <= max;
  }
  function hostileTarget(g, u, p) {
    const target = unitAt(g, p),
      st = stationAt(g, p);
    // Artillery cannot engage air wings.
    if (target) return target.side !== u.side && !(TYPES[u.type].branch === 'Artillery' && TYPES[target.type].air);
    return !!st && st.owner !== u.side && st.shield > 0;
  }
  // Whether a fleet still has any order besides holding position: firing, moving, repairing, reinforcing or Confusion.
  function hasOrders(g, u) {
    if (!u || !isReady(g, u)) return false;
    if (!u.attacked && targets(g, u).length) return true;
    if (!u.moved && reachable(g, u).size) return true;
    if (!repairReason(g, u) || !reinforceReason(g, u)) return true;
    // Confusion is a free order, so it only keeps a fleet active until that fleet has moved and fired.
    return u.admiral === 'yang' && !(u.moved && u.attacked) && !confuseReason(g, u);
  }
  function targets(g, u) {
    return g.tiles.filter(p => hostileTarget(g, u, p) && inRange(u, p, g));
  }
  function move(g, id, c, r) {
    const u = g.units.find(u => u.id === id);
    if (!u) return { ok: false, reason: 'Fleet not found.' };
    const dest = tile(g, c, r);
    if (!dest || !reachable(g, u).has(key(dest))) return { ok: false, reason: 'That hex is not reachable this turn.' };
    const from = { c: u.c, r: u.r };
    u.c = c;
    u.r = r;
    u.moved = true;
    dest.owner = u.side;
    const s = stationAt(g, u);
    let captured = null;
    if (s && s.owner !== u.side && canCapture(u)) {
      // Lippstadt War: rebel strongholds pay a bounty when taken.
      if (s.owner === 'neutral' && g.rules?.rebelBounty) {
        funds(g, u.side).credits += g.rules.rebelBounty;
        log(g, `Rebel stronghold ${s.name} taken: +${g.rules.rebelBounty} credits bounty.`, u.side);
      }
      s.owner = u.side;
      s.shield = 0;
      s.capturedTurn = g.turn;
      captured = s.name;
      u.morale = 1;
      funds(g, u.side).credits += 40;
      fortify(g, s);
      if (s.capital) award(g, u.side, 'star', `${s.name} captured`);
      if (u.admiral === 'schonkopf') u.hp = Math.min(maxHP(u), u.hp + maxHP(u) * 0.3);
      log(g, `${ADMIRALS[u.admiral]?.short || TYPES[u.type].short} captures ${s.name}.`, u.side);
    }
    checkVictory(g);
    return { ok: true, from, to: { c, r }, captured };
  }
  function auraBonus(g, u) {
    let bonus = 0;
    for (const a of g.units) {
      if (a.hp <= 0 || a.side !== u.side || !a.admiral || a.id === u.id) continue;
      if (distance(a, u) > auraRange(g, a)) continue;
      const t = TYPES[u.type],
        b =
          a.admiral === 'fischer'
            ? 0.1
            : a.admiral === 'eisenach'
              ? 0.12
              : a.admiral === 'merkatz' && (t.branch === 'Escort' || t.air)
                ? 0.15
                : 0.08;
      bonus = Math.max(bonus, b);
    }
    return bonus;
  }
  function power(g, u, target, st, counter = false) {
    const t = TYPES[u.type],
      victim = target ? TYPES[target.type] : null;
    let attack = t.attack * (1 + 0.45 * (u.stack - 1)) * (1 + 0.07 * Math.min(5, u.xp));
    attack *= u.morale >= 1 ? 1.25 : u.morale === -1 ? 0.75 : u.morale === -2 ? 0.5 : u.morale <= -3 ? 0 : 1;
    attack *= u.hp / maxHP(u) < 0.5 ? 0.72 : 1;
    attack *= 1 + auraBonus(g, u);
    if (u.admiral === 'kircheis' && t.branch === 'Escort') attack *= 1.2;
    if (u.admiral === 'schonkopf' && t.branch === 'Escort') attack *= 1.35;
    if (u.admiral === 'attenborough') attack *= 1.15;
    if (counter && u.admiral === 'yang') attack *= 1.65;
    // Recruitable admirals' signature abilities (attacker side).
    const k = u.admiral;
    if (k === 'bittenfeld' && !counter && t.branch === 'Battle Line') attack *= 1.25;
    if (k === 'fahrenheit' && !counter && !u.moved) attack *= 1.3;
    if (k === 'kempff' && (t.air || u.type === 'siege')) attack *= 1.25;
    if (k === 'lennenkampf' && t.branch === 'Battle Line') attack *= 1.1;
    if (k === 'borodin') attack *= 1.08;
    if (k === 'nguyen' && !counter) attack *= 1.2;
    if (k === 'poplin' && victim?.air) attack *= 1.4;
    if (counter && k === 'steinmetz') attack *= 1.4;
    if (counter && k === 'bucock') attack *= 1.35;
    if (k === 'mecklinger' && target)
      attack *=
        1 +
        0.1 *
          Math.min(
            3,
            g.units.filter(v => v.hp > 0 && v.side === u.side && v.id !== u.id && distance(v, target) === 1).length,
          );
    if (t.boarding && (target ? victim.branch === 'Battle Line' : !!st)) attack *= 1.55;
    if (victim?.air && t.antiAir) attack *= t.antiAir;
    if (victim?.air && t.branch === 'Escort') attack *= 1.5;
    if (t.shipKiller && (victim?.branch === 'Battle Line' || victim?.branch === 'Artillery')) attack *= t.shipKiller;
    attack *= officerAttack(g, u);
    // HQ research: branch weapons, class counters and stealth.
    attack *= 1 + unitTech(g, u, 'guns');
    if (t.branch === 'Escort' && victim?.branch === 'Battle Line') attack *= 1 + techValue(g, u.side, 'escort.torpedo');
    if (t.branch === 'Battle Line' && victim?.branch === 'Escort') attack *= 1 + techValue(g, u.side, 'line.secondary');
    if (t.branch === 'Artillery' && victim?.branch === 'Escort') attack *= 1 + techValue(g, u.side, 'artillery.shells');
    if (t.air) attack *= 1 + techValue(g, u.side, 'air.stealth');
    const friends = (side, at, test) =>
      g.units.some(v => v.hp > 0 && v.side === side && v.id !== u.id && distance(v, at) === 1 && test(TYPES[v.type]));
    // Line of Battle (formation) and Fire Control (spotted targets).
    if (
      t.branch === 'Battle Line' &&
      techLevel(g, u.side, 'line.formation') >= 1 &&
      friends(u.side, u, v => v.branch === 'Battle Line')
    )
      attack *= 1.15;
    if (
      t.branch === 'Artillery' &&
      target &&
      techLevel(g, u.side, 'artillery.fire') >= 1 &&
      friends(u.side, target, v => v.branch !== 'Artillery')
    )
      attack *= 1.2;
    const pen = clamp(t.pen + (u.admiral === 'reuenthal' ? 0.25 : 0), 0, 0.95);
    const armor = target ? victim.armor + unitTech(g, target, 'armor') : 35;
    attack *= 100 / (100 + armor * (1 - pen) * 2);
    if (target) {
      attack *= officerDefense(g, target);
      if (t.air && victim.branch === 'Battle Line') attack *= 1 - techValue(g, target.side, 'line.flak');
      if (t.air && g.stations.some(s => s.owner === target.side && distance(s, target) <= 1))
        attack *= 1 - techValue(g, target.side, 'station.flak');
      if (u.type === 'siege' && victim.branch === 'Battle Line')
        attack *= 1 - techValue(g, target.side, 'line.bulkheads');
      if (counter && victim.air) attack *= 1 - techValue(g, target.side, 'air.guidance');
      // Picket Screen: escorts shield neighbouring artillery and air wings.
      if (
        (victim.branch === 'Artillery' || victim.air) &&
        techLevel(g, target.side, 'escort.picket') >= 1 &&
        g.units.some(
          v => v.hp > 0 && v.side === target.side && TYPES[v.type].branch === 'Escort' && distance(v, target) === 1,
        )
      )
        attack *= 0.85;
      if (target.admiral === 'yang') attack *= 0.8;
      // Recruitable admirals' signature abilities (defender side).
      const dk = target.admiral;
      if (dk === 'muller' && target.hp / maxHP(target) < 0.5) attack *= 0.7;
      if (dk === 'wahlen') attack *= 0.9;
      if (dk === 'borodin') attack *= 0.92;
      if (dk === 'konev') attack *= 0.7;
      if (dk === 'bittenfeld' && counter) attack *= 1.1;
      if (dk === 'steinmetz' && target.type === 'flagship') attack *= 0.9;
      if (dk === 'kessler' && g.stations.some(s => s.owner === target.side && distance(s, target) <= 1)) attack *= 0.75;
      if (g.units.some(v => v.hp > 0 && v.side === target.side && v.admiral === 'ulanhu' && distance(v, target) <= 1))
        attack *= 0.9;
      const terrain = tile(g, target.c, target.r).terrain;
      if (terrain === 'asteroid') attack *= 0.85;
      if (victim.evasion) attack *= 1 - victim.evasion * 0.5;
    }
    if (counter) attack *= t.branch === 'Escort' && techLevel(g, u.side, 'escort.picket') >= 2 ? 1 : 0.65;
    return Math.max(1, Math.round(attack));
  }
  function preview(g, id, c, r) {
    const a = g.units.find(u => u.id === id),
      p = tile(g, c, r);
    if (!a || !p || !hostileTarget(g, a, p) || !inRange(a, p, g)) return null;
    const t = TYPES[a.type],
      d = unitAt(g, p),
      s = stationAt(g, p);
    const base = power(g, a, d, s),
      shield = s && s.owner !== a.side && s.shield > 0;
    const unitDmg = d ? Math.round(base * (shield ? 0.55 : 1)) : 0;
    // Boarding Charges and Bombing Doctrine raise station damage; Interceptor Missiles cut air raids.
    const intercept = t.air ? techLevel(g, s?.owner, 'station.interceptors') : 0,
      raid =
        (1 + (t.branch === 'Escort' ? techValue(g, a.side, 'escort.boarding') : 0)) *
        (1 + (t.air ? techValue(g, a.side, 'air.bombing') : 0)) *
        (intercept >= 2 ? 0.5 : intercept >= 1 && a.type === 'strategic' ? 0.7 : 1) *
        (a.admiral === 'kempff' ? 1.3 : 1);
    const shieldDmg = shield
      ? Math.round(
          base *
            (t.boarding && d && TYPES[d.type].branch !== 'Battle Line' ? 1.55 : 1) *
            (t.siege || 1) *
            (d ? 0.8 : 1.45) *
            raid,
        )
      : 0;
    // Air wings only draw return fire from escorts (point defense) and fighters.
    const counter =
      !!d &&
      !t.noCounter &&
      d.morale > -3 &&
      inRange(d, a, g) &&
      hostileTarget(g, d, a) &&
      (!t.air || TYPES[d.type].branch === 'Escort' || !!TYPES[d.type].antiAir);
    const crit = clamp(
      t.crit +
        (a.admiral === 'reinhard' && t.branch === 'Battle Line' ? 0.3 : 0) +
        (a.admiral === 'lutz' ? 0.2 : 0) +
        (a.admiral === 'poplin' ? 0.25 : 0) +
        (wears(g, a, 'marksman') ? 0.08 : 0),
      0,
      0.85,
    );
    return {
      unit: unitDmg,
      shield: shieldDmg,
      counter: counter ? power(g, d, a, stationAt(g, a), true) : 0,
      counterAllowed: counter,
      crit,
      critMult: (t.critMult || 1.55) + (a.admiral === 'lutz' ? 0.25 : 0),
      splash: t.splash ? t.splash + techValue(g, a.side, 'artillery.salvo') : 0,
      armorPen: clamp(t.pen + (a.admiral === 'reuenthal' ? 0.25 : 0), 0, 0.95),
    };
  }
  function kill(g, v, attacker) {
    if (v.hp > 0) return;
    v.hp = 0;
    if (attacker) {
      if (attacker.admiral) {
        const k = attacker.admiral,
          tally = (g.missionKills ||= {});
        tally[k] = (tally[k] || 0) + 1;
        if (v.admiral) award(g, attacker.side, 'valor', `${ADMIRALS[k].short} defeated ${ADMIRALS[v.admiral].short}`);
        if (tally[k] === 5) award(g, attacker.side, 'marksman', `${ADMIRALS[k].short} destroyed 5 fleets`);
      }
      attacker.kills++;
      attacker.xp = Math.min(5, attacker.xp + 1);
      attacker.morale = clamp(attacker.morale + 1, -3, 1);
    }
    if (v.admiral) log(g, `${ADMIRALS[v.admiral].short}'s command fleet is lost.`, v.side);
  }
  function attack(g, id, c, r) {
    const a = g.units.find(u => u.id === id);
    if (!a) return { ok: false, reason: 'Fleet not found.' };
    const why =
      turnReason(g, a.side) ||
      (a.hp <= 0 ? 'Fleet destroyed' : a.morale <= -3 ? 'Fleet is confused' : a.attacked ? 'Already fired' : null);
    if (why) return { ok: false, reason: why };
    const pr = preview(g, id, c, r);
    if (!pr) return { ok: false, reason: 'No hostile target within firing range.' };
    const p = tile(g, c, r),
      d = unitAt(g, p),
      s = stationAt(g, p),
      crit = random(g) < pr.crit,
      mult = (0.92 + random(g) * 0.16) * (crit ? pr.critMult : 1),
      hit = [];
    // Remember whether movement was still unused before the shot. A successful breakthrough
    // preserves that movement instead of spending it; it never restores movement already used.
    const hadMovement = !a.moved;
    // Carrier Operations II: an air wing that fires before moving may still move.
    const sortie = !!TYPES[a.type].air && hadMovement && techLevel(g, a.side, 'air.carrier') >= 2;
    a.attacked = true;
    a.moved = !sortie;
    a.sortie = sortie;
    let dmg = 0,
      sd = 0;
    if (d) {
      dmg = Math.round(pr.unit * mult);
      d.hp = Math.max(0, d.hp - dmg);
      hit.push({ id: d.id, c, r, damage: dmg });
    }
    if (s && pr.shield) {
      sd = Math.min(s.shield, Math.round(pr.shield * mult));
      s.shield -= sd;
    }
    if (a.admiral === 'oberstein' && d && d.hp > 0) d.morale = Math.max(moraleFloor(g, d), d.morale - 1);
    let retaliation = 0;
    if (d && d.hp > 0 && pr.counterAllowed) {
      retaliation = Math.round(pr.counter * (0.94 + random(g) * 0.12));
      a.hp = Math.max(0, a.hp - retaliation);
      if (a.admiral === 'reuenthal') {
        d.hp = Math.max(0, d.hp - Math.round(retaliation * 0.2));
      }
      kill(g, a, d);
    }
    if (pr.splash) {
      for (const v of g.units) {
        if (v.hp <= 0 || v.side === a.side || v.id === d?.id || distance(v, p) !== 1) continue;
        const amount = Math.round(power(g, a, v, stationAt(g, v)) * pr.splash);
        v.hp = Math.max(0, v.hp - amount);
        v.morale = Math.max(moraleFloor(g, v), v.morale - 1);
        hit.push({ id: v.id, c: v.c, r: v.r, damage: amount });
        kill(g, v, a);
      }
    }
    const destroyed = !!d && d.hp <= 0;
    if (destroyed) kill(g, d, a);
    let cap = ['mittermeyer', 'attenborough', 'nguyen'].includes(a.admiral) ? 2 : 1;
    // Assault Doctrine: a kill at the cap may still earn one more breakthrough.
    if (destroyed && a.hp > 0 && TYPES[a.type].breakthrough && a.chain === cap) {
      const chance = techValue(g, a.side, 'line.assault');
      if (chance && random(g) < chance) cap++;
    }
    let breakthrough = false;
    if (destroyed && a.hp > 0 && TYPES[a.type].breakthrough && a.chain < cap) {
      // Breakthrough: a kill lets the hull fire again and preserves movement that was unused
      // before the shot. Movement already spent earlier in the turn is never restored.
      a.chain++;
      a.attacked = false;
      if (hadMovement) a.moved = false;
      a.sortie = false;
      breakthrough = true;
    } else if (destroyed && a.hp > 0 && TYPES[a.type].relentless) {
      // Battleships and dreadnoughts always fire again after a kill, beyond the breakthrough cap.
      // As above, keep movement available only if it was still unused before this shot.
      a.attacked = false;
      if (hadMovement) a.moved = false;
      a.sortie = false;
      breakthrough = true;
    }
    log(
      g,
      `${ADMIRALS[a.admiral]?.short || TYPES[a.type].short}: ${crit ? 'critical hit · ' : ''}${dmg ? dmg + ' hull damage' : ''}${sd ? (dmg ? ' + ' : '') + sd + ' station damage' : ''}${destroyed ? ' · enemy destroyed' : ''}${breakthrough ? ' · breakthrough' : ''}${retaliation ? ' · ' + retaliation + ' counter-fire' : ''}.`,
      a.side,
    );
    checkVictory(g);
    return {
      ok: true,
      from: { c: a.c, r: a.r },
      to: { c, r },
      damage: dmg,
      shieldDamage: sd,
      crit,
      counter: retaliation,
      hit,
      destroyed,
      breakthrough,
      canMove: breakthrough && !a.moved,
    };
  }
  function income(g, side) {
    return g.stations
      .filter(s => s.owner === side)
      .reduce(
        (a, s) => ({
          credits: a.credits + s.income,
          industry: a.industry + s.industry,
          science: a.science + s.science,
        }),
        { credits: 0, industry: 0, science: 0 },
      );
  }
  function recruitOptions(g, s, side) {
    if (s.owner !== side) return [];
    return [tile(g, s.c, s.r), ...adjacent(g, s)].filter(
      p => p && p.terrain !== 'rift' && !unitAt(g, p) && (!stationAt(g, p) || stationAt(g, p).owner === side),
    );
  }
  // Fuel Cells research discounts the buyer's air wings.
  function price(type, stack = 1, g = null, side = null) {
    const t = TYPES[type],
      off = t.air && g ? 1 - techValue(g, side, 'air.fuel') : 1;
    return {
      credits: Math.round(t.cost * (1 + 0.85 * (stack - 1)) * off),
      industry: Math.round(t.industry * (1 + 0.85 * (stack - 1)) * off),
    };
  }
  function canBuy(g, s, type, stack = 1) {
    return !buyReason(g, s, type, stack);
  }
  function recruit(g, stationId, type, stack = 1, position) {
    const s = g.stations.find(s => s.id === stationId);
    const why = buyReason(g, s, type, stack);
    if (why) return { ok: false, reason: why };
    const options = recruitOptions(g, s, s.owner);
    const p = position ? options.find(p => p.c === position.c && p.r === position.r) : options[0];
    if (!p) return { ok: false, reason: 'Deployment hex unavailable.' };
    const cost = price(type, stack, g, s.owner);
    funds(g, s.owner).credits -= cost.credits;
    funds(g, s.owner).industry -= cost.industry;
    s.producedTurn = g.turn;
    const u = newUnit(g, type, s.owner, p.c, p.r, stack, null, false);
    log(g, `${TYPES[type].short} ×${stack} commissioned at ${s.name}. Ready next turn.`, s.owner);
    return { ok: true, unit: u };
  }
  function reinforceCost(type) {
    return { credits: TYPES[type].cost, industry: TYPES[type].industry };
  }
  // Repairs restore 35% hull for a fifth of the fleet's build price.
  function repairCost(u, g = null) {
    const half = g && g.units.some(v => v.hp > 0 && v.side === u.side && v.admiral === 'cazerne') ? 0.5 : 1;
    return Math.max(10, Math.round(baseRepairCost(u) * half));
  }
  function baseRepairCost(u) {
    return Math.max(20, Math.round(price(u.type, u.stack).credits * 0.2));
  }
  function reinforce(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = reinforceReason(g, u);
    if (why) return { ok: false, reason: why };
    const cost = reinforceCost(u.type),
      e = funds(g, u.side);
    e.credits -= cost.credits;
    e.industry -= cost.industry;
    const old = maxHP(u);
    u.stack++;
    u.hp += maxHP(u) - old;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} reinforced to ${u.stack} stacks.`, u.side);
    return { ok: true };
  }
  function repair(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = repairReason(g, u);
    if (why) return { ok: false, reason: why };
    const cost = repairCost(u, g);
    funds(g, u.side).credits -= cost;
    const amount = Math.min(maxHP(u) - u.hp, Math.round(maxHP(u) * 0.35));
    u.hp += amount;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} repairs ${amount} HP.`, u.side);
    return { ok: true, amount };
  }
  const BUILDINGS = {
    shipyard: { name: 'Shipyard', field: 'tier', desc: 'Unlocks larger hulls and produces industry (+10 per level).' },
    lab: {
      name: 'Research station',
      field: 'lab',
      desc: 'Produces research (+8 per level). Research banked when you win becomes command tokens.',
    },
    air: {
      name: 'Air base',
      field: 'air',
      desc: 'Builds and supplies air wings: fighters at level 1, bombers at 2, strategic bombers at 3.',
    },
  };
  function buildingLevel(s, kind) {
    return s[BUILDINGS[kind].field] || 0;
  }
  function buildCost(s, kind) {
    const l = buildingLevel(s, kind);
    if (kind === 'shipyard') return { credits: 160 * l, industry: 40 * l };
    if (kind === 'lab') return { credits: 110 * (l + 1), industry: 25 * (l + 1) };
    return { credits: 140 * (l + 1), industry: 45 * (l + 1) };
  }
  function upgradeCost(s) {
    return buildCost(s, 'shipyard');
  }
  function build(g, id, kind) {
    const s = g.stations.find(s => s.id === id),
      b = BUILDINGS[kind];
    const why = buildReason(g, s, kind);
    if (why) return { ok: false, reason: why };
    const cost = buildCost(s, kind),
      e = funds(g, s.owner);
    e.credits -= cost.credits;
    e.industry -= cost.industry;
    s[b.field] = buildingLevel(s, kind) + 1;
    if (kind === 'shipyard') {
      s.industry += 10;
      s.maxShield += 60;
      s.shield = Math.min(s.maxShield, s.shield + 60);
    } else if (kind === 'lab') s.science += 8;
    log(g, `${s.name}: ${b.name} upgraded to level ${s[b.field]}.`, s.owner);
    return { ok: true };
  }
  function upgrade(g, id) {
    return build(g, id, 'shipyard');
  }
  function assign(g, id, admiral) {
    const u = g.units.find(u => u.id === id),
      a = ADMIRALS[admiral];
    const why = assignReason(g, u, admiral);
    if (why) return { ok: false, reason: why };
    funds(g, u.side).credits -= a.cost;
    const old = maxHP(u);
    u.admiral = admiral;
    u.personal = true;
    u.cmdRank = g.roster[admiral].rank;
    u.hp += maxHP(u) - old;
    log(g, `${a.short} assumes command of ${TYPES[u.type].short}.`, u.side);
    return { ok: true };
  }
  function confuse(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = confuseReason(g, u);
    if (why) return { ok: false, reason: why };
    const victims = g.units.filter(v => v.hp > 0 && v.side !== u.side && distance(u, v) <= 2);
    victims.forEach(v => (v.morale = Math.max(moraleFloor(g, v), v.morale - 2)));
    u.confusionCD = 3;
    log(g, `Yang's feint disrupts ${victims.length} enemy fleets.`, u.side);
    return { ok: true, affected: victims.length };
  }
  function beginTurn(g, side, collect = true) {
    g.phase = side;
    if (collect) {
      const inc = income(g, side),
        e = funds(g, side),
        modifier = side !== g.player ? DIFFICULTIES[g.difficulty]?.income || 1 : 1;
      e.credits += Math.round(inc.credits * modifier);
      e.industry += Math.round(inc.industry * modifier);
      e.science += Math.round(inc.science * modifier);
    }
    for (const u of g.units) {
      if (u.hp <= 0 || u.side !== side) continue;
      u.moved = false;
      u.attacked = false;
      u.sortie = false;
      u.chain = 0;
      u.confusionCD = Math.max(0, u.confusionCD - 1);
      const nearby = g.units.filter(v => v.hp > 0 && v.side !== side && distance(u, v) === 1).length;
      let desired = nearby >= 3 ? -2 : nearby >= 2 ? -1 : 0;
      desired = Math.max(moraleFloor(g, u), desired);
      if (u.morale < desired) u.morale++;
      else if (u.morale > desired) u.morale--;
      if (nearby >= 2) u.morale = Math.min(u.morale, desired);
      // Patrichev reassures fleets within 2 hexes: one extra morale step and 5% hull.
      if (g.units.some(m => m.hp > 0 && m.side === side && m.admiral === 'patrichev' && distance(m, u) <= 2)) {
        u.morale = Math.min(1, u.morale + 1);
        u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.05));
      }
      if (u.admiral === 'cazerne') u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.08));
      const auras = g.units.filter(
          v => v.hp > 0 && v.side === side && v.admiral && v.id !== u.id && distance(u, v) <= auraRange(g, v),
        ),
        aura = auras.find(v => v.admiral === 'kircheis') || auras[0];
      if (aura && nearby < 3) u.morale = Math.min(1, u.morale + (aura.admiral === 'kircheis' ? 2 : 1));
      const t = tile(g, u.c, u.r);
      // Amritsar offensive: overextended fleets far from a friendly station run out of supplies.
      const over = g.rules?.overextended;
      if (over && over.side === side && !g.stations.some(s => s.owner === side && distance(s, u) <= over.range))
        u.hp = Math.max(1, u.hp - Math.round(maxHP(u) * over.pct));
      if (t.terrain === 'nebula') {
        const shielded = TYPES[u.type].branch === 'Escort' ? techValue(g, side, 'escort.shield') : 0;
        u.hp = Math.max(1, u.hp - Math.round(maxHP(u) * 0.025 * (1 - shielded)));
      }
      const s = stationAt(g, u);
      if (s?.owner === side) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.08));
      if (TYPES[u.type].air && u.admiral !== 'konev' && !airSupplied(g, side, u))
        u.hp = Math.max(1, u.hp - Math.round(maxHP(u) * 0.1));
    }
    g.strikes = [];
    for (const s of g.stations) {
      if (s.owner === side) s.shield = Math.min(s.maxShield, s.shield + Math.round(s.maxShield * 0.12));
    }
    checkVictory(g);
  }
  // Fortress main guns (Thor's Hammer): fired by the owner, range 3, then two turns to recharge.
  const FORTRESS_GUN = { range: 3, recharge: 2, share: 0.4 };
  function fortressName(s) {
    return s.name === 'Iserlohn' ? "Thor's Hammer" : `${s.name} main cannon`;
  }
  function fortressRecharge(g, s) {
    return FORTRESS_GUN.recharge - (techLevel(g, s.owner, 'station.overcharge') >= 1 ? 1 : 0);
  }
  function fortressReady(g, s) {
    return !!s?.fort && s.owner === g.phase && !g.over && s.shield > 0 && (s.gunReady || 0) <= g.turn;
  }
  // Thor Capacitors raise the owner's fortress gun damage; Reinforced Bulkheads shrug part of it off.
  function fortressDamage(g, foe, owner = opponent(foe.side)) {
    return Math.max(
      1,
      Math.round(
        maxHP(foe) *
          FORTRESS_GUN.share *
          (1 + techValue(g, owner, 'station.thor')) *
          (TYPES[foe.type].branch === 'Battle Line' ? 1 - techValue(g, foe.side, 'line.bulkheads') : 1),
      ),
    );
  }
  function fortressTargets(g, s) {
    if (!fortressReady(g, s)) return [];
    return g.units
      .filter(u => u.hp > 0 && u.side !== s.owner && distance(s, u) <= FORTRESS_GUN.range)
      .map(u => tile(g, u.c, u.r));
  }
  function fireFortress(g, id, c, r) {
    const s = g.stations.find(s => s.id === id);
    if (!fortressReady(g, s)) return { ok: false, reason: 'The fortress gun is not ready.' };
    const foe = unitAt(g, { c, r });
    if (!foe || foe.side === s.owner || distance(s, foe) > FORTRESS_GUN.range)
      return { ok: false, reason: 'No enemy fleet within 3 hexes of the fortress.' };
    const damage = fortressDamage(g, foe, s.owner),
      name = fortressName(s),
      hit = [];
    foe.hp = Math.max(0, foe.hp - damage);
    foe.morale = Math.max(moraleFloor(g, foe), foe.morale - 1);
    s.gunReady = g.turn + fortressRecharge(g, s);
    log(g, `${name} strikes ${TYPES[foe.type].short} for ${damage}.`, s.owner);
    const destroyed = foe.hp <= 0;
    // Thor Overcharge II: the blast also catches enemy fleets next to the target.
    if (techLevel(g, s.owner, 'station.overcharge') >= 2)
      for (const v of g.units) {
        if (v.hp <= 0 || v.side === s.owner || v.id === foe.id || distance(v, foe) !== 1) continue;
        const amount = Math.round(fortressDamage(g, v, s.owner) * 0.5);
        v.hp = Math.max(0, v.hp - amount);
        hit.push({ id: v.id, c: v.c, r: v.r, damage: amount });
        kill(g, v, null);
      }
    kill(g, foe, null);
    checkVictory(g);
    return { ok: true, name, from: { c: s.c, r: s.r }, to: { c, r }, id: foe.id, damage, destroyed, hit };
  }
  function checkVictory(g) {
    if (g.over) return g.over;
    decideVictory(g);
    if (g.over && g.over.winner === g.player) {
      award(g, g.player, 'campaign', 'Operation won');
      if (g.over.stars === 3) award(g, g.player, 'laurel', 'Three-star rating');
    }
    return g.over;
  }
  function decideVictory(g) {
    if (g.mode !== 'conquest') return scenarioVictory(g);
    for (const side of ['empire', 'alliance']) {
      const capitals = g.stations.filter(s => s.capital);
      if (capitals.every(s => s.owner === side))
        g.over = { winner: side, reason: 'Both capitals are under one command. The war is over.' };
      else if (!g.stations.some(s => s.owner === side) && !g.units.some(u => u.hp > 0 && u.side === side))
        g.over = { winner: opponent(side), reason: 'The last enemy fleets and stations have fallen.' };
    }
    const armistice = g.cols > 20 ? 80 : 50;
    if (g.turn > armistice && !g.over) {
      const a = g.stations.filter(s => s.owner === g.player).length,
        b = g.stations.filter(s => s.owner === opponent(g.player)).length;
      g.over = {
        winner: a === b ? 'draw' : a > b ? g.player : opponent(g.player),
        reason: `The ${armistice}-turn armistice: ${a} stations held against ${b}.`,
      };
    }
    return g.over;
  }
  function scenarioVictory(g) {
    const o = g.objective,
      def = SCENARIOS[g.mode],
      P = g.player,
      foe = opponent(P),
      alive = side => g.units.filter(u => u.hp > 0 && u.side === side),
      byTurn = () => (g.turn <= o.stars[0] ? 3 : g.turn <= o.stars[1] ? 2 : 1),
      win = (reason, stars) => (g.over = { winner: P, reason, stars }),
      lose = reason => (g.over = { winner: foe, reason, stars: 0 }),
      owned = n => g.stations.find(s => s.name === n)?.owner === P;
    if (o.type === 'capture') {
      if (o.stations.every(owned)) win(def.win, byTurn());
      else if (!alive(P).some(canCapture)) lose('No assault-capable fleets remain.');
    } else if (o.type === 'destroy') {
      if (!alive(foe).length) win(def.win, byTurn());
    } else if (o.type === 'kill') {
      if (!g.units.some(u => u.hp > 0 && u.admiral === o.admiral)) win(def.win, byTurn());
    } else if (o.type === 'survive') {
      if (o.admiral && !g.units.some(u => u.hp > 0 && u.admiral === o.admiral))
        lose(`${ADMIRALS[o.admiral].short}'s flagship has been destroyed.`);
      else if (g.turn > o.turns) {
        const kept = alive(P).length / Math.max(1, g.startFleets?.[P] || 1);
        win(def.win, kept >= 0.6 ? 3 : kept >= 0.35 ? 2 : 1);
      }
    } else if (o.type === 'hold') {
      if (!o.stations.every(owned)) lose(`${o.stations.join(' and ')} has fallen.`);
      else if (g.turn > o.turns) {
        const kept = alive(P).length / Math.max(1, g.startFleets?.[P] || 1);
        win(def.win, kept >= 0.7 ? 3 : kept >= 0.4 ? 2 : 1);
      }
    }
    if (!g.over && !alive(P).length) lose('Your last fleet has been destroyed.');
    if (!g.over && o.type !== 'hold' && o.type !== 'survive' && g.turn > o.turns) lose(def.timeout);
    return g.over;
  }
  function objectiveText(g) {
    if (g.mode === 'conquest')
      return `Capture ${g.player === 'alliance' ? 'Odin' : 'Heinessen'} while holding your own capital.`;
    const o = g.objective,
      stars = o.stars
        ? ` ★★★ by turn ${o.stars[0]}.`
        : ` ★★★ with ${o.type === 'survive' ? 60 : 70}% of your fleets intact.`;
    if (o.type === 'capture') return `Capture ${o.stations.join(' and ')} by turn ${o.turns}.${stars}`;
    if (o.type === 'destroy') return `Destroy every enemy fleet by turn ${o.turns}.${stars}`;
    if (o.type === 'kill') return `Destroy ${ADMIRALS[o.admiral].name}'s flagship by turn ${o.turns}.${stars}`;
    if (o.type === 'survive')
      return `${o.admiral ? `Keep ${ADMIRALS[o.admiral].name} alive` : 'Keep a fleet alive'} through turn ${o.turns}.${stars}`;
    return `Hold ${o.stations.join(' and ')} through turn ${o.turns}.${stars}`;
  }
  function modeTitle(g) {
    return g.mode === 'conquest' ? ERAS[g.era || 'frontier'].name : SCENARIOS[g.mode].name;
  }
  // Conquest start dates on the shared 17 × 11 galaxy map.
  const ERAS = root.GalacticData.ERAS;
  // Scenarios:  // Scenarios: a fixed map, a single objective, a turn limit and a 1–3 star rating.
  const { SCENARIOS, CAMPAIGNS } = root.GalacticData;
  // Operation difficulty  // Operation difficulty, as in WC4. Normal is the operation as designed. Hard gives every enemy side all tier I–II
  // HQ research, upgrades every other enemy fleet one class and adds one fleet per four. Challenge gives them all
  // research, upgrades every fleet (with an extra stack), adds one fleet per two and a richer treasury.
  const DIFFICULTIES = {
    normal: { name: 'Normal', level: 0, tokens: 1, desc: 'The operation as designed.' },
    hard: {
      name: 'Hard',
      level: 1,
      tokens: 1.5,
      techTier: 2,
      upgradeEvery: 2,
      extraPer: 4,
      ranks: 1,
      income: 1,
      desc: 'Enemies have all tier I–II research, half their fleets are upgraded a class and there are more of them.',
    },
    challenge: {
      name: 'Challenge',
      level: 2,
      tokens: 2,
      techTier: 4,
      upgradeEvery: 1,
      extraPer: 2,
      stack: true,
      ranks: 2,
      income: 1.25,
      desc: 'Enemies have every technology, every fleet is upgraded with an extra stack, and their numbers swell.',
    },
  };
  // One class up within each branch: an escort becomes a light cruiser, a cruiser a heavier hull, and so on.
  const UPGRADE = {
    corvette: 'frigate',
    frigate: 'light',
    destroyer: 'light',
    light: 'heavy',
    heavy: 'battleship',
    battleship: 'flagship',
    beam: 'missile',
    missile: 'siege',
    fighter: 'bomber',
    bomber: 'strategic',
  };
  function techUpToTier(tier) {
    return Object.fromEntries(
      Object.values(TECH_NODES)
        .map(n => [n.id, n.tiers.filter(t => t <= tier).length])
        .filter(([, l]) => l > 0),
    );
  }
  function harden(g, d) {
    const foes = ['empire', 'alliance', 'neutral'].filter(side => side !== g.player),
      enemyUnits = g.units.filter(u => foes.includes(u.side));
    for (const side of foes) {
      g.tech[side] = techUpToTier(d.techTier);
      if (g.economy[side]) g.economy[side].credits = Math.round(g.economy[side].credits * d.income);
    }
    for (const [k, a] of Object.entries(ADMIRALS))
      if (a.side !== g.player) g.officers[k].rank = Math.min(RANKS.length - 1, g.officers[k].rank + d.ranks);
    enemyUnits.forEach((u, i) => {
      if (i % d.upgradeEvery === 0 && UPGRADE[u.type] && !(u.admiral && u.type === 'battleship'))
        u.type = UPGRADE[u.type];
      if (d.stack && !TYPES[u.type].elite) u.stack = Math.min(3, u.stack + 1);
    });
    // Reinforcements: copies of existing enemy fleets (never dreadnoughts) on free hexes beside them.
    const extra = Math.ceil(enemyUnits.length / d.extraPer);
    for (let n = 0, tries = 0; n < extra && tries < extra * 6; tries++) {
      const src = enemyUnits[Math.floor(random(g) * enemyUnits.length)],
        spot = adjacent(g, src).find(
          p => p.terrain !== 'rift' && !unitAt(g, p) && (!stationAt(g, p) || stationAt(g, p).owner === src.side),
        );
      if (!spot) continue;
      const v = newUnit(g, src.type === 'flagship' ? 'battleship' : src.type, src.side, spot.c, spot.r, src.stack);
      if (src.art) v.art = src.art;
      n++;
    }
    for (const u of g.units)
      if (foes.includes(u.side)) {
        u.hpTech = unitTech(g, u, 'hull');
        u.hp = maxHP(u);
      }
    g.stations.forEach(st => fortify(g, st));
  }
  // mode: 'conquest' or 'conquest:<era>' for a Conquest start date; a scenario id (or 'scenario:<id>') otherwise.
  function createGame(player = 'alliance', difficulty = 'normal', mode = 'conquest', seed = 246801) {
    let era = null,
      scen = null;
    if (mode === 'conquest' || String(mode).startsWith('conquest:')) era = String(mode).split(':')[1] || 'frontier';
    else scen = String(mode).replace('scenario:', '');
    if (era && !ERAS[era]) era = 'frontier';
    if (scen && !SCENARIOS[scen]) scen = 'iserlohn';
    const def = scen ? SCENARIOS[scen] : null,
      // Some scenarios are fought on a former Conquest start date's map (conquestMap), with their own objective.
      mapEra = era || def?.conquestMap || null;
    if (def?.side) player = def.side;
    const g = {
      version: 2,
      rulesVersion: 11,
      player,
      difficulty,
      mode: era ? 'conquest' : scen,
      era,
      objective: def ? { ...def.objective } : null,
      retired: (mapEra && ERAS[mapEra].retired) || def?.retired || [],
      seed,
      cols: def ? def.cols : ERAS[era].cols || 17,
      rows: def ? def.rows : ERAS[era].rows || 11,
      turn: 1,
      phase: player,
      nextId: 1,
      tiles: [],
      units: [],
      stations: [],
      log: [],
      strikes: [],
      economy: {
        empire: { credits: 300, industry: 120, science: 40 },
        alliance: { credits: 300, industry: 120, science: 40 },
      },
      tech: { empire: {}, alliance: {}, neutral: {} },
      officers: Object.fromEntries(Object.keys(ADMIRALS).map(k => [k, defaultOfficer(k)])),
      roster: {},
      medalInventory: [],
      medalsEarned: [],
      over: null,
      stats: {},
    };
    const enemy = opponent(player);
    // Each Conquest start date has its own geography: terrain mix, rift crossings and asteroid belts.
    const eraSpec = mapEra ? ERAS[mapEra] : null,
      mix = eraSpec?.terrain || { nebula: 0.085, asteroid: 0.075 },
      rift = eraSpec ? (eraSpec.rift === undefined ? { col: 8, open: [2, 5, 8] } : eraSpec.rift) : null;
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++) {
        const n = random(g);
        let terrain = n < mix.nebula ? 'nebula' : n < mix.nebula + mix.asteroid ? 'asteroid' : 'space';
        const riftCols = rift ? (rift.cols || [rift.col]) : [];
        if (rift && riftCols.includes(c) && !rift.open.includes(r)) terrain = 'rift';
        if (eraSpec?.band?.cols.includes(c) && random(g) < eraSpec.band.chance) terrain = eraSpec.band.terrain;
        g.tiles.push({
          c,
          r,
          terrain,
          owner: mapEra
            ? c < (g.cols - 1) / 2 - 1
              ? 'empire'
              : c > (g.cols - 1) / 2 + 1
                ? 'alliance'
                : 'neutral'
            : 'neutral',
        });
      }
    function claim(p, owner) {
      for (const t of [tile(g, p.c, p.r), ...adjacent(g, p)]) if (t.terrain !== 'rift') t.owner = owner;
    }
    function station(name, c, r, owner, tier, capital = false, fort = false) {
      const s = {
        id: g.stations.length,
        name,
        c,
        r,
        owner,
        tier,
        lab: capital ? 1 : 0,
        air: capital || fort ? 1 : 0,
        capital,
        fort,
        shield: fort ? 450 : capital ? 260 : 150,
        maxShield: fort ? 450 : capital ? 260 : 150,
        income: capital ? 60 : fort ? 40 : 25 + 15 * tier,
        industry: capital ? 30 : 10 * tier,
        science: capital ? 10 : 6,
        producedTurn: 0,
      };
      g.stations.push(s);
      tile(g, c, r).terrain = 'space';
      tile(g, c, r).owner = owner;
      return s;
    }
    // The galactic frontier is data-driven from engine/galaxy.js so the large Conquest map stays out of the rules core.
    function buildFrontier() {
      const spec = ERAS.frontier,
        W = g.cols - 1;
      for (const [name, c, r, owner, tier, capital = false, fort = false] of spec.stations || [])
        claim(station(name, c, r, owner, tier, capital, fort), owner);

      // Keep ordinary frontier worlds economically meaningful without letting 44 shipyards create runaway income.
      // Capitals / fortresses retain their normal yields; minor hubs are scaled down for the expanded map.
      for (const s of g.stations) {
        if (s.capital || s.fort || s.owner === 'neutral') continue;
        s.income = s.tier >= 2 ? 26 : 18;
        s.industry = s.tier >= 2 ? 14 : 8;
        s.science = s.tier >= 2 ? 5 : 3;
      }

      const leads = {
        empire: ['reinhard', 'mittermeyer', 'reuenthal', 'kircheis'],
        alliance: ['yang', 'attenborough', 'fischer', 'schonkopf'],
      };
      for (const side of ['empire', 'alliance']) {
        const at = x => (side === 'empire' ? x : W - x),
          admirals = leads[side];
        for (const [type, x, r, stack, admiralIndex] of spec.fleets || [])
          newUnit(g, type, side, at(x), r, stack, admiralIndex == null ? null : admirals[admiralIndex]);
      }

      // The expanded front starts with a little more treasury, but total income is intentionally kept near the
      // old map's scale so the extra shipyards create strategic choice rather than exponential fleet spam.
      g.economy.empire = { credits: 500, industry: 180, science: 45 };
      g.economy.alliance = { credits: 500, industry: 180, science: 45 };
    }
    const place = ([side, type, c, r, stack = 1, admiral = null, art = null]) => {
      const u = newUnit(g, type, side, c, r, stack, admiral);
      if (art) u.art = art;
      return u;
    };
    const setEconomy = eco => {
      for (const [side, [credits, industry]] of Object.entries(eco || {}))
        Object.assign(g.economy[side], { credits, industry });
    };
    if (mapEra === 'frontier') buildFrontier();
    else if (mapEra) {
      station('Odin', 1, 5, 'empire', 3, true);
      station('Valhalla', 3, 8, 'empire', 2);
      station('Geiersburg', 4, 2, 'empire', 2, false, true);
      station('Kempff', 5, 5, 'empire', 1);
      station('Iserlohn', 8, 2, 'neutral', 3, false, true);
      station('Fezzan', 8, 8, 'neutral', 2);
      station('Vermilion', 8, 5, 'neutral', 1);
      station('El Facil', 11, 2, 'alliance', 1);
      station('Rantemario', 11, 7, 'alliance', 2);
      station('Amritsar', 13, 4, 'alliance', 2);
      station('Heinessen', 15, 6, 'alliance', 3, true);
      station('Doria', 14, 9, 'alliance', 1);
      // The Alliance holds one extra hub; Imperial worlds yield more so both sides start with equal income.
      const ally = income(g, 'alliance'),
        imp = income(g, 'empire'),
        valhalla = g.stations.find(s => s.name === 'Valhalla'),
        kempff = g.stations.find(s => s.name === 'Kempff');
      valhalla.income += Math.ceil((ally.credits - imp.credits) / 2);
      kempff.income += Math.floor((ally.credits - imp.credits) / 2);
      kempff.industry += ally.industry - imp.industry;
      valhalla.science += ally.science - imp.science;
      const spec = ERAS[mapEra];
      g.rules = spec.rules || null;
      for (const name of spec.removeStations || []) {
        const gone = g.stations.find(s => s.name === name);
        if (rift && (rift.cols || [rift.col]).includes(gone.c)) tile(g, gone.c, gone.r).terrain = 'rift';
        g.stations = g.stations.filter(s => s !== gone);
      }
      g.stations.forEach((s, i) => (s.id = i));
      for (const [name, owner] of Object.entries(spec.owners || {})) {
        const s = g.stations.find(s => s.name === name);
        s.owner = owner;
        claim(s, owner);
        if (owner === 'neutral' && g.rules?.rebelShield)
          s.maxShield = s.shield = Math.round(s.maxShield * g.rules.rebelShield);
      }
      spec.units.forEach(place);
      // Astarte: the Imperial fleets open the battle with high morale.
      if (g.rules?.morale) {
        for (const u of g.units) if (u.side === g.rules.morale.side) u.morale = g.rules.morale.value;
      }
      setEconomy(spec.economy);
    } else if (def?.layout) {
      const L = def.layout;
      g.tiles.forEach(t => (t.owner = t.c < L.split ? L.owners[0] : L.owners[1]));
      for (const [name, c, r, owner, tier, capital = false, fort = false, shield] of L.stations) {
        const st = station(name, c, r, owner, tier, capital, fort);
        if (shield) st.maxShield = st.shield = shield;
        claim(st, owner);
      }
      L.units.forEach(place);
      g.economy[L.owners[0]] = { credits: 0, industry: 0, science: 0 };
      g.economy[L.owners[1]] = { credits: 0, industry: 0, science: 0 };
      setEconomy(L.economy);
    } else if (scen === 'iserlohn') {
      g.tiles.forEach(t => (t.owner = t.c < 4 ? player : enemy));
      station('Forward Base', 1, 4, player, 3, true);
      station('Iserlohn', 8, 4, enemy, 3, false, true);
      station('Outer Dock', 8, 1, enemy, 1);
      newUnit(g, 'flagship', player, 2, 4, 1, player === 'alliance' ? 'yang' : 'reinhard');
      newUnit(g, 'frigate', player, 3, 3, 2, player === 'alliance' ? 'schonkopf' : 'kircheis');
      newUnit(g, 'heavy', player, 3, 5, 2);
      newUnit(g, 'siege', player, 2, 2, 2);
      newUnit(g, 'missile', player, 2, 6, 1);
      newUnit(g, 'beam', player, 1, 3, 2);
      newUnit(g, 'corvette', player, 4, 4, 1);
      newUnit(g, 'battleship', enemy, 7, 4, 2, enemy === 'empire' ? 'reuenthal' : 'attenborough');
      newUnit(g, 'heavy', enemy, 6, 2, 1);
      newUnit(g, 'light', enemy, 6, 6, 2);
      newUnit(g, 'beam', enemy, 8, 3, 2);
      newUnit(g, 'missile', enemy, 8, 5, 1);
      g.economy[enemy] = { credits: 140, industry: 70, science: 0 };
    } else if (scen === 'astarte') {
      claim(station('Brünhild Anchorage', 1, 4, 'empire', 2, true), 'empire');
      [
        ['empire', 'flagship', 5, 4, 1, 'reinhard'],
        ['empire', 'heavy', 5, 3, 2, 'kircheis'],
        ['empire', 'battleship', 6, 5, 1],
        ['empire', 'heavy', 4, 5, 1],
        ['empire', 'light', 6, 3, 2],
        ['empire', 'beam', 4, 4, 2],
        ['empire', 'missile', 4, 3, 1],
        ['empire', 'corvette', 5, 5, 2],
        ['empire', 'destroyer', 3, 4, 1],
        ['alliance', 'heavy', 8, 0, 2],
        ['alliance', 'light', 9, 1, 2],
        ['alliance', 'beam', 9, 0, 1],
        ['alliance', 'corvette', 7, 1, 1],
        ['alliance', 'heavy', 8, 8, 2],
        ['alliance', 'light', 9, 7, 2],
        ['alliance', 'missile', 9, 8, 1],
        ['alliance', 'corvette', 7, 7, 1],
        ['alliance', 'flagship', 12, 4, 1, 'yang'],
        ['alliance', 'heavy', 11, 4, 2],
        ['alliance', 'light', 11, 3, 1],
        ['alliance', 'beam', 12, 5, 2],
        ['alliance', 'frigate', 11, 5, 1],
      ].forEach(place);
      g.economy.alliance = { credits: 0, industry: 0, science: 0 };
    } else if (scen === 'amritsar') {
      const hold = station('Amritsar', 3, 4, 'alliance', 2, true);
      hold.maxShield = hold.shield = 320;
      claim(hold, 'alliance');
      claim(station('Supply Depot', 0, 1, 'alliance', 1), 'alliance');
      claim(station('Imperial Staging', 11, 4, 'empire', 2), 'empire');
      [
        ['alliance', 'flagship', 4, 4, 1, 'yang'],
        ['alliance', 'heavy', 4, 3, 2, 'attenborough'],
        ['alliance', 'light', 4, 5, 2, 'fischer'],
        ['alliance', 'heavy', 3, 3, 1],
        ['alliance', 'beam', 2, 4, 2],
        ['alliance', 'missile', 2, 5, 1],
        ['alliance', 'corvette', 5, 4, 2],
        ['alliance', 'destroyer', 3, 5, 1],
        ['alliance', 'frigate', 2, 3, 1],
        ['empire', 'flagship', 10, 4, 1, 'reinhard'],
        ['empire', 'heavy', 8, 3, 2, 'mittermeyer'],
        ['empire', 'battleship', 8, 5, 2, 'reuenthal'],
        ['empire', 'frigate', 9, 2, 2, 'kircheis'],
        ['empire', 'heavy', 9, 6, 1],
        ['empire', 'light', 8, 4, 2],
        ['empire', 'missile', 10, 3, 1],
        ['empire', 'siege', 10, 5, 1],
        ['empire', 'corvette', 7, 2, 2],
        ['empire', 'destroyer', 7, 6, 1],
      ].forEach(place);
      setEconomy({ alliance: [150, 60], empire: [200, 80] });
    } else if (scen === 'vermilion') {
      claim(station('Forward Base', 0, 4, 'alliance', 1, true), 'alliance');
      claim(station('Vermilion Depot', 12, 4, 'empire', 2), 'empire');
      [
        ['alliance', 'flagship', 2, 4, 1, 'yang'],
        ['alliance', 'heavy', 3, 3, 2, 'attenborough'],
        ['alliance', 'light', 3, 5, 2, 'fischer'],
        ['alliance', 'heavy', 2, 3, 1],
        ['alliance', 'missile', 1, 4, 1],
        ['alliance', 'beam', 2, 5, 2],
        ['alliance', 'corvette', 4, 4, 2],
        ['alliance', 'destroyer', 3, 4, 1],
        ['alliance', 'frigate', 1, 3, 1],
        ['empire', 'flagship', 11, 4, 1, 'reinhard'],
        ['empire', 'heavy', 10, 3, 2],
        ['empire', 'heavy', 10, 5, 2],
        ['empire', 'battleship', 9, 4, 1],
        ['empire', 'light', 9, 2, 2],
        ['empire', 'light', 9, 6, 2],
        ['empire', 'beam', 11, 3, 1],
        ['empire', 'missile', 11, 5, 1],
        ['empire', 'corvette', 8, 3, 1],
        ['empire', 'corvette', 8, 5, 1],
        ['empire', 'destroyer', 10, 4, 1],
      ].forEach(place);
      setEconomy({ alliance: [250, 90], empire: [220, 80] });
    }
    for (const u of g.units) tile(g, u.c, u.r).terrain = 'space';
    if (DIFFICULTIES[difficulty]?.level) harden(g, DIFFICULTIES[difficulty]);
    for (const u of g.units)
      if (u.admiral) {
        u.cmdRank = g.officers[u.admiral].rank;
        u.hp = maxHP(u);
      }
    g.startFleets = {
      empire: g.units.filter(u => u.side === 'empire').length,
      alliance: g.units.filter(u => u.side === 'alliance').length,
    };
    log(g, era ? ERAS[era].desc : def.desc, player);
    if (mapEra && ERAS[mapEra].rulesText) log(g, ERAS[mapEra].rulesText, player);
    return g;
  }
  // Enemy high command, run once at the start of each AI turn before its fleets act:
  // repair, save for dreadnoughts, upgrade rear shipyards, reinforce, then build stacked fleets. No fleet cap.
  // Strategic AI lives in engine/ai.js. These stable delegates keep the public API unchanged.
  function aiProduction(g) {
    return root.GalacticAI?.aiProduction ? root.GalacticAI.aiProduction(g) : undefined;
  }
  function aiOrder(g, id) {
    return root.GalacticAI?.aiOrder ? root.GalacticAI.aiOrder(g, id) : [];
  }
  root.Galactic = {
    FACTIONS,
    reinforceCost,
    repairCost,
    upgradeCost,
    BUILDINGS,
    buildingLevel,
    buildCost,
    build,
    FORTRESS_GUN,
    fortressName,
    fortressReady,
    fortressDamage,
    fortressTargets,
    fireFortress,
    ERAS,
    SCENARIOS,
    CAMPAIGNS,
    objectiveText,
    modeTitle,
    TYPES,
    ADMIRALS,
    TECHS,
    TECH_TREE,
    TECH_NODES,
    TECH_TIERS,
    TOKEN_REWARD,
    DIFFICULTIES,
    UPGRADE,
    operationKey,
    ROMAN,
    BRANCHES,
    BRANCH_NAMES,
    RATING_NAMES,
    moveBonus,
    branchOf,
    techLevel,
    techValue,
    applyTech,
    missionReward,
    fortressRecharge,
    rangeOf,
    airSupply,
    airSupplied,
    RANKS,
    RANK_HP,
    PROMOTE_COST,
    MEDALS,
    officer,
    medalSlots,
    moraleFloor,
    STARTERS,
    recruitPrice,
    roster,
    owns,
    officerOf,
    applyRoster,
    recruitReason,
    recruitAdmiral,
    MAX_RATING,
    starCost,
    starReason,
    buyStar,
    promoteCost,
    promote,
    equipMedal,
    unequipMedal,
    applyProfile,
    exportProfile,
    shortfall,
    repairReason,
    reinforceReason,
    buyReason,
    buildReason,
    researchReason,
    assignReason,
    confuseReason,
    promoteReason,
    equipReason,
    clamp,
    key,
    distance,
    opponent,
    tile,
    adjacent,
    unitAt,
    stationAt,
    random,
    log,
    maxHP,
    migrateSave,
    newUnit,
    movement,
    reachable,
    hasOrders,
    targets,
    preview,
    move,
    attack,
    income,
    price,
    canBuy,
    recruitOptions,
    recruit,
    reinforce,
    repair,
    upgrade,
    researchCost,
    research,
    assign,
    confuse,
    beginTurn,
    checkVictory,
    createGame,
    aiProduction,
    aiOrder,
    canCapture,
  };
  if (typeof module !== 'undefined' && typeof require === 'function') {
    require('./engine/orders.js');
    require('./engine/ai.js');
  }
  if (typeof module !== 'undefined') module.exports = root.Galactic;
})(typeof window !== 'undefined' ? window : globalThis);
