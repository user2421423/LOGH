/* Galactic Command: deterministic hex tactics rules. No UI or network dependencies. */
(function (root) {
  'use strict';
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
      desc: 'Balanced early combatant. A kill refreshes its attack and movement once per turn.',
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
      desc: 'The fleet backbone. Heavy armor and breakthrough on a kill.',
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
      desc: 'Heavy armor penetration and 1–2 hex guns. Exchanges counter-fire; a kill triggers breakthrough.',
    },
    flagship: {
      name: 'Dreadnought / Fleet Flagship',
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
      desc: 'Brünhild or Hyperion-class command vessel. Immense armor, 1–2 hex guns, counter-fire and breakthrough.',
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
  const ADMIRALS = {
    reinhard: {
      name: 'Reinhard von Lohengramm',
      short: 'Reinhard',
      side: 'empire',
      stars: 5,
      cost: 210,
      role: 'Battle Line',
      hull: 'Brünhild',
      skill: 'Fleet Leader',
      desc: 'Battle Line: +30% critical chance, +1 movement. Morale never falls below steady.',
      trait: 'leader',
    },
    yang: {
      name: 'Yang Wen-li',
      short: 'Yang',
      side: 'alliance',
      stars: 5,
      cost: 210,
      role: 'Battle Line',
      hull: 'Hyperion',
      skill: 'The Magician',
      desc: '−20% damage taken, +65% counter-fire. Ignores terrain movement costs. Confusion lowers nearby enemy morale by 2.',
      trait: 'magician',
    },
    mittermeyer: {
      name: 'Wolfgang Mittermeyer',
      short: 'Mittermeyer',
      side: 'empire',
      stars: 5,
      cost: 160,
      role: 'Battle Line',
      hull: 'Beowulf',
      skill: 'Gale Wolf',
      desc: '+2 movement. Battle Line can refresh actions twice per turn.',
      trait: 'gale',
    },
    reuenthal: {
      name: 'Oskar von Reuenthal',
      short: 'Reuenthal',
      side: 'empire',
      stars: 5,
      cost: 160,
      role: 'Battle Line',
      hull: 'Tristan',
      skill: 'Twin Pillar',
      desc: '+25% armor penetration. Reflects 20% of counter-fire received.',
      trait: 'reflection',
    },
    kircheis: {
      name: 'Siegfried Kircheis',
      short: 'Kircheis',
      side: 'empire',
      stars: 4,
      cost: 145,
      role: 'Escort',
      hull: 'Barbarossa',
      skill: 'Unwavering Loyalty',
      desc: '+20% escort damage. Nearby friendly fleets recover one extra morale step each turn.',
      trait: 'loyal',
    },
    attenborough: {
      name: 'Dusty Attenborough',
      short: 'Attenborough',
      side: 'alliance',
      stars: 4,
      cost: 145,
      role: 'Battle Line',
      hull: 'Triglaph',
      skill: 'Flexible Command',
      desc: '+1 movement, +15% damage. Breakthrough-capable hulls refresh actions twice per turn.',
      trait: 'flexible',
    },
    fischer: {
      name: 'Edwin Fischer',
      short: 'Fischer',
      side: 'alliance',
      stars: 4,
      cost: 125,
      role: 'Battle Line',
      hull: 'Patroklos',
      skill: 'Fleet Maneuver',
      desc: '+1 movement. Nearby units gain +10% damage from the command aura.',
      trait: 'maneuver',
    },
    schonkopf: {
      name: 'Walter von Schönkopf',
      short: 'Schönkopf',
      side: 'alliance',
      stars: 4,
      cost: 145,
      role: 'Escort',
      hull: 'Rosen Ritter',
      skill: 'Boarding Specialist',
      desc: 'Escort hulls deal +35% damage. Capturing a station restores 30% of the fleet’s maximum HP.',
      trait: 'boarding',
    },
  };
  // Branch technology trees: Drives, Plating and Weapons for each branch, plus a Doctrine with class abilities.
  const BRANCHES = { Escort: 'escort', 'Battle Line': 'line', Artillery: 'artillery', Air: 'air' };
  const TECH_TREE = {
    escort: {
      name: 'Escort',
      tracks: {
        drives: { name: 'Afterburner Drives', max: 2, base: 100, desc: '+1 movement per level for escorts.' },
        plating: { name: 'Composite Plating', max: 3, base: 110, desc: 'Escorts take 8% less damage per level.' },
        weapons: {
          name: 'Rapid-Fire Lasers',
          max: 3,
          base: 120,
          desc: 'Escorts gain +10% armor penetration and +0.15 critical multiplier per level.',
        },
        doctrine: {
          name: 'Picket Screen',
          max: 2,
          base: 150,
          levels: [
            'Friendly artillery and air wings next to an escort take 15% less damage.',
            'Escort counter-fire hits at full strength.',
          ],
        },
      },
    },
    line: {
      name: 'Battle Line',
      tracks: {
        drives: {
          name: 'Warp Drive Efficiency',
          max: 2,
          base: 115,
          desc: '+1 movement per level for Battle Line hulls.',
        },
        plating: {
          name: 'Liquid Metal Armor',
          max: 3,
          base: 125,
          desc: 'Battle Line hulls take 8% less damage per level.',
        },
        weapons: {
          name: 'Seft Armor-Piercing Lasers',
          max: 3,
          base: 135,
          desc: 'Battle Line hulls gain +10% armor penetration and +0.15 critical multiplier per level.',
        },
        doctrine: {
          name: 'Breakthrough Doctrine',
          max: 2,
          base: 160,
          levels: [
            'Battle Line fleets get one extra breakthrough refresh per turn.',
            '+15% damage when next to another friendly Battle Line fleet.',
          ],
        },
      },
    },
    artillery: {
      name: 'Artillery',
      tracks: {
        drives: { name: 'Fusion Thrusters', max: 2, base: 105, desc: '+1 movement per level for artillery.' },
        plating: { name: 'Ablative Shielding', max: 3, base: 115, desc: 'Artillery takes 8% less damage per level.' },
        weapons: {
          name: 'Neutron Accelerators',
          max: 3,
          base: 135,
          desc: 'Artillery gains +10% armor penetration and +0.15 critical multiplier per level.',
        },
        doctrine: {
          name: 'Fire Control',
          max: 2,
          base: 160,
          levels: [
            '+20% damage against targets next to a friendly non-artillery fleet (spotted).',
            '+1 maximum range for all artillery.',
          ],
        },
      },
    },
    air: {
      name: 'Aerospace',
      tracks: {
        drives: { name: 'Spartanian Engines', max: 2, base: 105, desc: '+1 movement per level for air wings.' },
        plating: { name: 'Reinforced Airframes', max: 3, base: 115, desc: 'Air wings take 8% less damage per level.' },
        weapons: {
          name: 'Guided Munitions',
          max: 3,
          base: 130,
          desc: 'Air wings gain +10% armor penetration and +0.15 critical multiplier per level.',
        },
        doctrine: {
          name: 'Carrier Operations',
          max: 2,
          base: 160,
          levels: [
            'Air supply range grows from 3 to 5 hexes.',
            'Hit and run: an air wing that attacks before moving may still move.',
          ],
        },
      },
    },
  };
  const TECHS = TECH_TREE;
  function blankTech() {
    return Object.fromEntries(
      Object.entries(TECH_TREE).map(([b, d]) => [b, Object.fromEntries(Object.keys(d.tracks).map(k => [k, 0]))]),
    );
  }
  function branchOf(type) {
    return BRANCHES[TYPES[type].branch];
  }
  function techLevel(g, side, branch, track) {
    return g.tech?.[side]?.[branch]?.[track] || 0;
  }
  function airSupply(g, side) {
    return techLevel(g, side, 'air', 'doctrine') >= 1 ? 5 : 3;
  }

  // Admiral development: ranks, branch ratings, upgradeable skills and medals. Progress persists between operations.
  const RANKS = ['Commodore', 'Rear Admiral', 'Vice Admiral', 'Admiral', 'Fleet Admiral'];
  const RANK_XP = [0, 10, 25, 45, 70];
  const SKILLS = {
    gunnery: { name: 'Precision Gunnery', desc: '+5% damage per level.' },
    bulwark: { name: 'Damage Control', desc: '5% less damage taken per level.' },
    maneuver: { name: 'Fleet Maneuver', desc: 'Level 1 ignores terrain costs; levels 2 and 3 each add +1 movement.' },
    command: {
      name: 'Command Network',
      desc: 'The command aura reaches 1 hex further and grants +2% more damage per level.',
    },
    logistics: { name: 'Logistics', desc: 'The fleet repairs 4% hull per level at the start of each turn.' },
    tactics: {
      name: 'Tactical Insight',
      desc: '+5% critical chance per level; level 3 adds one breakthrough refresh.',
    },
  };
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
  // Branch ratings (1–5 stars): Escort, Battle Line, Artillery, Aerospace.
  const RATINGS = {
    reinhard: { escort: 3, line: 5, artillery: 4, air: 3 },
    yang: { escort: 4, line: 5, artillery: 4, air: 4 },
    mittermeyer: { escort: 4, line: 5, artillery: 3, air: 3 },
    reuenthal: { escort: 3, line: 5, artillery: 4, air: 3 },
    kircheis: { escort: 5, line: 4, artillery: 3, air: 3 },
    attenborough: { escort: 4, line: 4, artillery: 3, air: 3 },
    fischer: { escort: 4, line: 4, artillery: 3, air: 3 },
    schonkopf: { escort: 5, line: 2, artillery: 2, air: 3 },
  };
  function defaultOfficer(k) {
    const rank = ADMIRALS[k].stars >= 5 ? 2 : 1;
    return { rank, xp: RANK_XP[rank], points: 1, ratings: { ...RATINGS[k] }, skills: {}, medals: [] };
  }
  function officer(g, k) {
    if (!k || !ADMIRALS[k]) return null;
    g.officers ||= {};
    return (g.officers[k] ||= defaultOfficer(k));
  }
  function skill(g, k, name) {
    return k ? officer(g, k)?.skills[name] || 0 : 0;
  }
  function wears(g, k, medal) {
    return !!k && !!officer(g, k)?.medals.includes(medal);
  }
  function medalSlots(o) {
    return 1 + Math.floor(o.rank / 2);
  }
  // Damage dealt and taken by an admiral's fleet: branch rating, skills and medals.
  function officerAttack(g, u) {
    if (!u.admiral) return 1;
    const o = officer(g, u.admiral);
    return (
      (1 + 0.04 * ((o.ratings[branchOf(u.type)] || 3) - 3) + 0.05 * skill(g, u.admiral, 'gunnery')) *
      (wears(g, u.admiral, 'valor') ? 1.08 : 1) *
      (wears(g, u.admiral, 'campaign') ? 1.04 : 1)
    );
  }
  function officerDefense(g, u) {
    if (!u.admiral) return 1;
    const o = officer(g, u.admiral);
    return Math.max(
      0.5,
      (1 - 0.03 * ((o.ratings[branchOf(u.type)] || 3) - 3) - 0.05 * skill(g, u.admiral, 'bulwark')) *
        (wears(g, u.admiral, 'laurel') ? 0.92 : 1) *
        (wears(g, u.admiral, 'campaign') ? 0.96 : 1),
    );
  }
  function auraRange(g, a) {
    return 1 + skill(g, a.admiral, 'command');
  }
  function gainXP(g, u, amount) {
    if (u?.admiral) officer(g, u.admiral).xp += amount;
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
      shortfall(funds(g, u.side), { credits: repairCost(u) })
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
      shortfall(funds(g, s.owner), price(type, stack))
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
  function researchReason(g, side, branch, track) {
    const t = TECH_TREE[branch]?.tracks[track];
    if (!t) return 'Unavailable';
    return (
      turnReason(g, side) ||
      (techLevel(g, side, branch, track) >= t.max ? 'Fully researched' : null) ||
      shortfall(funds(g, side), researchCost(g, side, branch, track))
    );
  }
  function assignReason(g, u, k) {
    const a = ADMIRALS[k];
    if (!a) return 'Unknown admiral';
    if ((g.retired || []).includes(k)) return 'Fallen in this era';
    const busy = g.units.find(v => v.hp > 0 && v.admiral === k);
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
  function promoteCost(o) {
    return { credits: 100 * (o.rank + 1) };
  }
  function officerReason(g, k) {
    const a = ADMIRALS[k];
    if (!a) return 'Unknown admiral';
    if (a.side !== g.player) return 'Not your officer';
    return turnReason(g, a.side);
  }
  function promoteReason(g, k) {
    const o = officer(g, k);
    return (
      officerReason(g, k) ||
      (o.rank >= RANKS.length - 1 ? 'Highest rank reached' : null) ||
      (o.xp < RANK_XP[o.rank + 1] ? `Need ${RANK_XP[o.rank + 1] - o.xp} more XP` : null) ||
      shortfall(funds(g, ADMIRALS[k].side), promoteCost(o))
    );
  }
  function learnReason(g, k, name) {
    const o = officer(g, k);
    if (!SKILLS[name]) return 'Unknown skill';
    return (
      officerReason(g, k) ||
      ((o.skills[name] || 0) >= 3 ? 'Mastered' : null) ||
      (o.points < 1 ? 'No skill points: promote to earn more' : null)
    );
  }
  function rateReason(g, k, branch) {
    const o = officer(g, k);
    if (!TECH_TREE[branch]) return 'Unknown branch';
    return (
      officerReason(g, k) ||
      ((o.ratings[branch] || 0) >= 5 ? 'Already five stars' : null) ||
      (o.points < 1 ? 'No skill points: promote to earn more' : null)
    );
  }
  function equipReason(g, k, medal) {
    const o = officer(g, k);
    return (
      officerReason(g, k) ||
      (!(g.medalInventory || []).includes(medal) ? 'Not in your medal case' : null) ||
      (o.medals.includes(medal) ? 'Already wearing this medal' : null) ||
      (o.medals.length >= medalSlots(o) ? `All ${medalSlots(o)} medal slots in use` : null)
    );
  }
  function promote(g, k) {
    const why = promoteReason(g, k);
    if (why) return { ok: false, reason: why };
    const o = officer(g, k);
    funds(g, ADMIRALS[k].side).credits -= promoteCost(o).credits;
    o.rank++;
    o.points++;
    const u = g.units.find(u => u.hp > 0 && u.admiral === k);
    if (u) {
      const old = maxHP(u);
      u.cmdRank = o.rank;
      u.hp += maxHP(u) - old;
    }
    log(g, `${ADMIRALS[k].short} is promoted to ${RANKS[o.rank]}.`, ADMIRALS[k].side);
    return { ok: true };
  }
  function learnSkill(g, k, name) {
    const why = learnReason(g, k, name);
    if (why) return { ok: false, reason: why };
    const o = officer(g, k);
    o.skills[name] = (o.skills[name] || 0) + 1;
    o.points--;
    log(g, `${ADMIRALS[k].short} trains ${SKILLS[name].name} to level ${o.skills[name]}.`, ADMIRALS[k].side);
    return { ok: true };
  }
  function raiseRating(g, k, branch) {
    const why = rateReason(g, k, branch);
    if (why) return { ok: false, reason: why };
    const o = officer(g, k);
    o.ratings[branch]++;
    o.points--;
    return { ok: true };
  }
  function equipMedal(g, k, medal) {
    const why = equipReason(g, k, medal);
    if (why) return { ok: false, reason: why };
    g.medalInventory.splice(g.medalInventory.indexOf(medal), 1);
    officer(g, k).medals.push(medal);
    return { ok: true };
  }
  function unequipMedal(g, k, medal) {
    const why = officerReason(g, k),
      o = officer(g, k);
    if (why) return { ok: false, reason: why };
    const i = o.medals.indexOf(medal);
    if (i < 0) return { ok: false, reason: 'Not wearing that medal' };
    o.medals.splice(i, 1);
    (g.medalInventory ||= []).push(medal);
    return { ok: true };
  }
  // Officer records carry between operations: load them for the player's side, and export them afterwards.
  function applyProfile(g, profile) {
    for (const [k, rec] of Object.entries(profile?.officers || {})) {
      if (!ADMIRALS[k] || ADMIRALS[k].side !== g.player || !rec) continue;
      const base = defaultOfficer(k);
      g.officers[k] = {
        rank: clamp(Number.isInteger(rec.rank) ? rec.rank : base.rank, 0, RANKS.length - 1),
        xp: Number.isFinite(rec.xp) ? Math.max(0, rec.xp) : base.xp,
        points: Number.isInteger(rec.points) ? Math.max(0, rec.points) : base.points,
        ratings: { ...base.ratings, ...(rec.ratings || {}) },
        skills: { ...(rec.skills || {}) },
        medals: (rec.medals || []).filter(m => MEDALS[m]),
      };
    }
    g.medalInventory = (profile?.medals || []).filter(m => MEDALS[m]);
    for (const u of g.units)
      if (u.admiral) {
        u.cmdRank = officer(g, u.admiral).rank;
        u.hp = maxHP(u);
      }
    return g;
  }
  function exportProfile(g, profile = {}) {
    const officers = { ...(profile.officers || {}) };
    for (const [k, o] of Object.entries(g.officers || {}))
      if (ADMIRALS[k]?.side === g.player) officers[k] = JSON.parse(JSON.stringify(o));
    return { officers, medals: [...(g.medalInventory || [])] };
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
  // Each admiral rank adds 6% hull to the fleet they command.
  function maxHP(u) {
    return Math.round(TYPES[u.type].hp * (1 + 0.7 * (u.stack - 1)) * (1 + 0.06 * (u.cmdRank || 0)));
  }
  // Saves from earlier rules versions are not carried forward.
  function migrateSave(g) {
    if (!g || g.version !== 2 || g.rulesVersion !== 7 || !Array.isArray(g.units)) return null;
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
    u.hp = maxHP(u);
    g.units.push(u);
    return u;
  }
  function movement(g, u) {
    const t = TYPES[u.type];
    if (t.elite) return 1;
    let n = t.move + techLevel(g, u.side, branchOf(u.type), 'drives');
    n += Math.max(0, skill(g, u.admiral, 'maneuver') - 1) + (wears(g, u.admiral, 'star') ? 1 : 0);
    if (u.admiral === 'reinhard' && t.branch === 'Battle Line') n++;
    if (u.admiral === 'mittermeyer') n += 2;
    if (['attenborough', 'fischer'].includes(u.admiral)) n++;
    return n;
  }
  function terrainCost(g, u, t) {
    if (u.admiral === 'yang' || TYPES[u.type].air || skill(g, u.admiral, 'maneuver') >= 1) return 1;
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
  // Fire Control doctrine level 2 adds one hex of range to all artillery.
  function rangeOf(g, u) {
    const t = TYPES[u.type];
    return {
      min: t.min,
      max: t.max + (g && t.branch === 'Artillery' && techLevel(g, u.side, 'artillery', 'doctrine') >= 2 ? 1 : 0),
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
      s.owner = u.side;
      s.shield = 0;
      s.capturedTurn = g.turn;
      captured = s.name;
      u.morale = 1;
      funds(g, u.side).credits += 40;
      gainXP(g, u, 4);
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
      if (distance(a, u) <= auraRange(g, a))
        bonus = Math.max(bonus, (a.admiral === 'fischer' ? 0.1 : 0.08) + 0.02 * skill(g, a.admiral, 'command'));
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
    if (t.boarding && (target ? victim.branch === 'Battle Line' : !!st)) attack *= 1.55;
    if (victim?.air && t.antiAir) attack *= t.antiAir;
    if (victim?.air && t.branch === 'Escort') attack *= 1.5;
    if (t.shipKiller && (victim?.branch === 'Battle Line' || victim?.branch === 'Artillery')) attack *= t.shipKiller;
    attack *= officerAttack(g, u);
    const friends = (side, at, test) =>
      g.units.some(v => v.hp > 0 && v.side === side && v.id !== u.id && distance(v, at) === 1 && test(TYPES[v.type]));
    // Doctrines: Breakthrough (line formation) and Fire Control (spotted targets).
    if (
      t.branch === 'Battle Line' &&
      techLevel(g, u.side, 'line', 'doctrine') >= 2 &&
      friends(u.side, u, v => v.branch === 'Battle Line')
    )
      attack *= 1.15;
    if (
      t.branch === 'Artillery' &&
      target &&
      techLevel(g, u.side, 'artillery', 'doctrine') >= 1 &&
      friends(u.side, target, v => v.branch !== 'Artillery')
    )
      attack *= 1.2;
    const pen = clamp(
      t.pen + techLevel(g, u.side, branchOf(u.type), 'weapons') * 0.1 + (u.admiral === 'reuenthal' ? 0.25 : 0),
      0,
      0.95,
    );
    const armor = target ? victim.armor : 35;
    attack *= 100 / (100 + armor * (1 - pen) * 2);
    if (target) {
      attack *= 1 - techLevel(g, target.side, branchOf(target.type), 'plating') * 0.08;
      attack *= officerDefense(g, target);
      // Picket Screen: escorts shield neighbouring artillery and air wings.
      if (
        (victim.branch === 'Artillery' || victim.air) &&
        techLevel(g, target.side, 'escort', 'doctrine') >= 1 &&
        g.units.some(
          v => v.hp > 0 && v.side === target.side && TYPES[v.type].branch === 'Escort' && distance(v, target) === 1,
        )
      )
        attack *= 0.85;
      if (target.admiral === 'yang') attack *= 0.8;
      const terrain = tile(g, target.c, target.r).terrain;
      if (terrain === 'asteroid') attack *= 0.85;
      if (victim.evasion) attack *= 1 - victim.evasion * 0.5;
    }
    if (counter) attack *= t.branch === 'Escort' && techLevel(g, u.side, 'escort', 'doctrine') >= 2 ? 1 : 0.65;
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
    const shieldDmg = shield
      ? Math.round(
          base *
            (t.boarding && d && TYPES[d.type].branch !== 'Battle Line' ? 1.55 : 1) *
            (t.siege || 1) *
            (d ? 0.8 : 1.45),
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
        0.05 * skill(g, a.admiral, 'tactics') +
        (wears(g, a.admiral, 'marksman') ? 0.08 : 0),
      0,
      0.85,
    );
    const weapons = techLevel(g, a.side, branchOf(a.type), 'weapons');
    return {
      unit: unitDmg,
      shield: shieldDmg,
      counter: counter ? power(g, d, a, stationAt(g, a), true) : 0,
      counterAllowed: counter,
      crit,
      critMult: (t.critMult || 1.55) + weapons * 0.15,
      splash: t.splash || 0,
      armorPen: clamp(t.pen + weapons * 0.1 + (a.admiral === 'reuenthal' ? 0.25 : 0), 0, 0.95),
    };
  }
  function kill(g, v, attacker) {
    if (v.hp > 0) return;
    v.hp = 0;
    if (attacker) {
      gainXP(g, attacker, 3);
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
    // Carrier Operations level 2: an air wing that fires before moving may still move.
    const sortie = !!TYPES[a.type].air && !a.moved && techLevel(g, a.side, 'air', 'doctrine') >= 2;
    a.attacked = true;
    a.moved = !sortie;
    a.sortie = sortie;
    gainXP(g, a, 1);
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
        v.morale = Math.max(v.admiral === 'reinhard' ? 0 : -3, v.morale - 1);
        hit.push({ id: v.id, c: v.c, r: v.r, damage: amount });
        kill(g, v, a);
      }
    }
    const destroyed = !!d && d.hp <= 0;
    if (destroyed) kill(g, d, a);
    const cap =
      (['mittermeyer', 'attenborough'].includes(a.admiral) ? 2 : 1) +
      (TYPES[a.type].branch === 'Battle Line' && techLevel(g, a.side, 'line', 'doctrine') >= 1 ? 1 : 0) +
      (skill(g, a.admiral, 'tactics') >= 3 ? 1 : 0);
    let breakthrough = false;
    if (destroyed && a.hp > 0 && TYPES[a.type].breakthrough && a.chain < cap) {
      a.chain++;
      a.attacked = false;
      a.moved = false;
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
  function price(type, stack = 1) {
    const t = TYPES[type];
    return {
      credits: Math.round(t.cost * (1 + 0.85 * (stack - 1))),
      industry: Math.round(t.industry * (1 + 0.85 * (stack - 1))),
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
    const cost = price(type, stack);
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
  function repairCost(u) {
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
    const cost = repairCost(u);
    funds(g, u.side).credits -= cost;
    const amount = Math.min(maxHP(u) - u.hp, Math.round(maxHP(u) * 0.35));
    u.hp += amount;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} repairs ${amount} HP.`, u.side);
    return { ok: true, amount };
  }
  const BUILDINGS = {
    shipyard: { name: 'Shipyard', field: 'tier', desc: 'Unlocks larger hulls and produces industry (+10 per level).' },
    lab: { name: 'Research station', field: 'lab', desc: 'Produces research (+8 per level).' },
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
  function researchCost(g, side, branch, track) {
    const t = TECH_TREE[branch]?.tracks[track],
      l = techLevel(g, side, branch, track);
    return { credits: (t?.base || 120) * (l + 1), science: 40 + 35 * l + (track === 'doctrine' ? 20 : 0) };
  }
  function research(g, branch, track) {
    const why = researchReason(g, g.phase, branch, track);
    if (why) return { ok: false, reason: why };
    const e = funds(g, g.phase),
      c = researchCost(g, g.phase, branch, track);
    e.credits -= c.credits;
    e.science -= c.science;
    g.tech[g.phase][branch][track]++;
    const t = TECH_TREE[branch].tracks[track];
    log(g, `${TECH_TREE[branch].name}: ${t.name} reaches level ${g.tech[g.phase][branch][track]}.`, g.phase);
    return { ok: true };
  }
  function assign(g, id, admiral) {
    const u = g.units.find(u => u.id === id),
      a = ADMIRALS[admiral];
    const why = assignReason(g, u, admiral);
    if (why) return { ok: false, reason: why };
    funds(g, u.side).credits -= a.cost;
    const old = maxHP(u);
    u.admiral = admiral;
    u.cmdRank = officer(g, admiral).rank;
    u.hp += maxHP(u) - old;
    log(g, `${a.short} assumes command of ${TYPES[u.type].short}.`, u.side);
    return { ok: true };
  }
  function confuse(g, id) {
    const u = g.units.find(u => u.id === id);
    const why = confuseReason(g, u);
    if (why) return { ok: false, reason: why };
    const victims = g.units.filter(v => v.hp > 0 && v.side !== u.side && distance(u, v) <= 2);
    victims.forEach(v => (v.morale = Math.max(v.admiral === 'reinhard' ? 0 : -3, v.morale - 2)));
    u.confusionCD = 3;
    log(g, `Yang's feint disrupts ${victims.length} enemy fleets.`, u.side);
    return { ok: true, affected: victims.length };
  }
  function beginTurn(g, side, collect = true) {
    g.phase = side;
    if (collect) {
      const inc = income(g, side),
        e = funds(g, side),
        modifier = side !== g.player ? (g.difficulty === 'hard' ? 1.2 : g.difficulty === 'easy' ? 0.8 : 1) : 1;
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
      if (u.admiral === 'reinhard') desired = Math.max(0, desired);
      if (u.morale < desired) u.morale++;
      else if (u.morale > desired) u.morale--;
      if (nearby >= 2) u.morale = Math.min(u.morale, desired);
      const auras = g.units.filter(
          v => v.hp > 0 && v.side === side && v.admiral && v.id !== u.id && distance(u, v) <= auraRange(g, v),
        ),
        aura = auras.find(v => v.admiral === 'kircheis') || auras[0];
      if (aura && nearby < 3) u.morale = Math.min(1, u.morale + (aura.admiral === 'kircheis' ? 2 : 1));
      const t = tile(g, u.c, u.r);
      if (t.terrain === 'nebula') u.hp = Math.max(1, u.hp - Math.round(maxHP(u) * 0.025));
      const s = stationAt(g, u);
      if (s?.owner === side) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.08));
      if (u.admiral && skill(g, u.admiral, 'logistics'))
        u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.04 * skill(g, u.admiral, 'logistics')));
      if (
        TYPES[u.type].air &&
        !g.stations.some(s => s.owner === side && (s.air || 0) > 0 && distance(s, u) <= airSupply(g, side))
      )
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
  function fortressReady(g, s) {
    return !!s?.fort && s.owner === g.phase && !g.over && s.shield > 0 && (s.gunReady || 0) <= g.turn;
  }
  function fortressDamage(g, foe) {
    return Math.max(
      1,
      Math.round(maxHP(foe) * FORTRESS_GUN.share * (1 - techLevel(g, foe.side, branchOf(foe.type), 'plating') * 0.08)),
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
    const damage = fortressDamage(g, foe),
      name = fortressName(s);
    foe.hp = Math.max(0, foe.hp - damage);
    foe.morale = Math.max(foe.admiral === 'reinhard' ? 0 : -3, foe.morale - 1);
    s.gunReady = g.turn + FORTRESS_GUN.recharge;
    log(g, `${name} strikes ${TYPES[foe.type].short} for ${damage}.`, s.owner);
    const destroyed = foe.hp <= 0;
    kill(g, foe, null);
    checkVictory(g);
    return { ok: true, name, from: { c: s.c, r: s.r }, to: { c, r }, id: foe.id, damage, destroyed };
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
    if (g.turn > 50 && !g.over) {
      const a = g.stations.filter(s => s.owner === g.player).length,
        b = g.stations.filter(s => s.owner === opponent(g.player)).length;
      g.over = {
        winner: a === b ? 'draw' : a > b ? g.player : opponent(g.player),
        reason: `The 50-turn armistice: ${a} stations held against ${b}.`,
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
    } else if (o.type === 'hold') {
      if (!o.stations.every(owned)) lose(`${o.stations.join(' and ')} has fallen.`);
      else if (g.turn > o.turns) {
        const kept = alive(P).length / Math.max(1, g.startFleets?.[P] || 1);
        win(def.win, kept >= 0.7 ? 3 : kept >= 0.4 ? 2 : 1);
      }
    }
    if (!g.over && !alive(P).length) lose('Your last fleet has been destroyed.');
    if (!g.over && o.type !== 'hold' && g.turn > o.turns) lose(def.timeout);
    return g.over;
  }
  function objectiveText(g) {
    if (g.mode === 'conquest')
      return `Capture ${g.player === 'alliance' ? 'Odin' : 'Heinessen'} while holding your own capital.`;
    const o = g.objective,
      stars = o.stars ? ` ★★★ by turn ${o.stars[0]}.` : ' ★★★ with 70% of your fleets intact.';
    if (o.type === 'capture') return `Capture ${o.stations.join(' and ')} by turn ${o.turns}.${stars}`;
    if (o.type === 'destroy') return `Destroy every enemy fleet by turn ${o.turns}.${stars}`;
    if (o.type === 'kill') return `Destroy ${ADMIRALS[o.admiral].name}'s flagship by turn ${o.turns}.${stars}`;
    return `Hold ${o.stations.join(' and ')} through turn ${o.turns}.${stars}`;
  }
  function modeTitle(g) {
    return g.mode === 'conquest' ? ERAS[g.era || 'frontier'].name : SCENARIOS[g.mode].name;
  }
  // Conquest start dates on the shared 17 × 11 galaxy map.
  const ERAS = {
    frontier: {
      name: 'The galactic frontier',
      year: 'Standard',
      desc: 'A balanced start: both powers mass at the three corridor crossings.',
    },
    astarte: {
      name: 'Battle of Astarte',
      year: 'UC 487 · RC 796',
      desc: 'The Empire holds Iserlohn. Three Alliance fleets close in from beyond the corridor.',
      owners: { Iserlohn: 'empire' },
      units: [
        ['empire', 'flagship', 6, 3, 1, 'reinhard'],
        ['empire', 'heavy', 7, 1, 2, 'kircheis'],
        ['empire', 'battleship', 6, 2, 1],
        ['empire', 'light', 5, 3, 2],
        ['empire', 'beam', 6, 4, 2],
        ['empire', 'missile', 5, 2, 1],
        ['empire', 'frigate', 8, 2, 1],
        ['empire', 'siege', 3, 5, 1],
        ['empire', 'destroyer', 4, 6, 1],
        ['empire', 'corvette', 5, 7, 2],
        ['alliance', 'flagship', 12, 8, 1, 'yang'],
        ['alliance', 'light', 12, 9, 2],
        ['alliance', 'heavy', 13, 7, 1],
        ['alliance', 'heavy', 11, 4, 2],
        ['alliance', 'battleship', 12, 5, 1],
        ['alliance', 'beam', 12, 4, 2],
        ['alliance', 'missile', 13, 5, 1],
        ['alliance', 'heavy', 11, 1, 2],
        ['alliance', 'light', 12, 1, 2],
        ['alliance', 'corvette', 10, 2, 2],
        ['alliance', 'destroyer', 10, 6, 1],
        ['alliance', 'frigate', 14, 3, 1],
      ],
    },
    amritsar: {
      name: 'Amritsar offensive',
      year: 'RC 796 · UC 487',
      desc: 'The Alliance has overrun Iserlohn, Kempff and Vermilion, but its supply lines are stretched thin against the full Imperial counterattack.',
      owners: { Iserlohn: 'alliance', Kempff: 'alliance', Vermilion: 'alliance' },
      economy: { empire: [450, 160], alliance: [150, 80] },
      units: [
        ['empire', 'flagship', 2, 5, 1, 'reinhard'],
        ['empire', 'heavy', 3, 4, 2, 'mittermeyer'],
        ['empire', 'battleship', 3, 6, 2, 'reuenthal'],
        ['empire', 'frigate', 2, 3, 2, 'kircheis'],
        ['empire', 'heavy', 1, 7, 1],
        ['empire', 'light', 4, 8, 2],
        ['empire', 'beam', 2, 6, 2],
        ['empire', 'missile', 1, 4, 1],
        ['empire', 'siege', 0, 5, 1],
        ['empire', 'corvette', 4, 1, 2],
        ['empire', 'destroyer', 2, 8, 1],
        ['alliance', 'flagship', 6, 6, 1, 'yang'],
        ['alliance', 'heavy', 6, 4, 2, 'attenborough'],
        ['alliance', 'light', 7, 5, 2, 'fischer'],
        ['alliance', 'frigate', 8, 2, 1, 'schonkopf'],
        ['alliance', 'heavy', 5, 5, 1],
        ['alliance', 'beam', 7, 4, 2],
        ['alliance', 'missile', 7, 6, 1],
        ['alliance', 'corvette', 6, 7, 2],
        ['alliance', 'destroyer', 9, 4, 1],
        ['alliance', 'light', 9, 6, 1],
        ['alliance', 'battleship', 10, 5, 1],
      ],
    },
    lippstadt: {
      name: 'Lippstadt War',
      year: 'UC 488 · RC 797',
      desc: 'Civil war on both sides. Lippstadt nobles hold Geiersburg and Valhalla; the Military Congress holds Rantemario and Doria. Crush the rebels before your rival does.',
      owners: {
        Iserlohn: 'alliance',
        Geiersburg: 'neutral',
        Valhalla: 'neutral',
        Rantemario: 'neutral',
        Doria: 'neutral',
      },
      units: [
        ['neutral', 'battleship', 4, 2, 2, null, 'empire'],
        ['neutral', 'heavy', 3, 2, 2, null, 'empire'],
        ['neutral', 'light', 4, 1, 1, null, 'empire'],
        ['neutral', 'beam', 5, 1, 2, null, 'empire'],
        ['neutral', 'heavy', 3, 8, 2, null, 'empire'],
        ['neutral', 'light', 2, 8, 1, null, 'empire'],
        ['neutral', 'missile', 3, 9, 1, null, 'empire'],
        ['neutral', 'heavy', 11, 7, 2, null, 'alliance'],
        ['neutral', 'light', 12, 7, 1, null, 'alliance'],
        ['neutral', 'beam', 11, 8, 1, null, 'alliance'],
        ['neutral', 'heavy', 14, 9, 1, null, 'alliance'],
        ['neutral', 'corvette', 13, 9, 2, null, 'alliance'],
        ['empire', 'flagship', 2, 5, 1, 'reinhard'],
        ['empire', 'heavy', 2, 4, 2, 'kircheis'],
        ['empire', 'heavy', 5, 4, 2, 'mittermeyer'],
        ['empire', 'battleship', 5, 6, 2, 'reuenthal'],
        ['empire', 'light', 4, 5, 2],
        ['empire', 'beam', 1, 6, 2],
        ['empire', 'missile', 2, 6, 1],
        ['empire', 'corvette', 6, 7, 2],
        ['empire', 'destroyer', 6, 3, 1],
        ['alliance', 'flagship', 8, 2, 1, 'yang'],
        ['alliance', 'frigate', 9, 2, 2, 'schonkopf'],
        ['alliance', 'heavy', 9, 3, 2, 'attenborough'],
        ['alliance', 'light', 14, 5, 2, 'fischer'],
        ['alliance', 'heavy', 15, 6, 1],
        ['alliance', 'light', 13, 5, 2],
        ['alliance', 'beam', 12, 4, 2],
        ['alliance', 'missile', 14, 7, 1],
        ['alliance', 'corvette', 12, 2, 2],
        ['alliance', 'destroyer', 10, 4, 1],
      ],
    },
    ragnarok: {
      name: 'Operation Ragnarök',
      year: 'UC 489 · RC 798',
      desc: 'The Empire has seized Fezzan and pours through the second corridor while Yang holds Iserlohn. Kircheis has fallen.',
      owners: { Iserlohn: 'alliance', Fezzan: 'empire' },
      economy: { empire: [500, 180], alliance: [250, 90] },
      retired: ['kircheis'],
      units: [
        ['empire', 'flagship', 7, 8, 1, 'reinhard'],
        ['empire', 'heavy', 9, 8, 3, 'mittermeyer'],
        ['empire', 'battleship', 6, 2, 3, 'reuenthal'],
        ['empire', 'battleship', 7, 7, 2],
        ['empire', 'heavy', 6, 3, 2],
        ['empire', 'light', 7, 9, 2],
        ['empire', 'light', 7, 1, 2],
        ['empire', 'beam', 6, 8, 2],
        ['empire', 'missile', 7, 10, 1],
        ['empire', 'siege', 5, 2, 1],
        ['empire', 'corvette', 9, 9, 2],
        ['empire', 'destroyer', 6, 9, 2],
        ['empire', 'frigate', 5, 8, 2],
        ['alliance', 'flagship', 8, 2, 1, 'yang'],
        ['alliance', 'frigate', 9, 2, 2, 'schonkopf'],
        ['alliance', 'heavy', 9, 1, 2, 'attenborough'],
        ['alliance', 'light', 10, 3, 2, 'fischer'],
        ['alliance', 'heavy', 12, 7, 1],
        ['alliance', 'light', 11, 6, 2],
        ['alliance', 'beam', 13, 6, 1],
        ['alliance', 'missile', 14, 6, 1],
        ['alliance', 'corvette', 11, 8, 2],
        ['alliance', 'destroyer', 12, 9, 1],
        ['alliance', 'heavy', 15, 6, 1],
      ],
    },
  };
  // Scenarios: a fixed map, a single objective, a turn limit and a 1–3 star rating.
  const SCENARIOS = {
    iserlohn: {
      name: 'Assault on Iserlohn',
      side: null,
      cols: 11,
      rows: 9,
      desc: 'Breach the fortress shields, eliminate the garrison, then occupy Iserlohn with an Escort or Battle Line fleet.',
      objective: { type: 'capture', stations: ['Iserlohn'], turns: 18, stars: [10, 14] },
      win: 'Iserlohn Fortress has fallen. The corridor is open.',
      timeout: 'The fortress held until enemy reinforcements arrived.',
    },
    astarte: {
      name: 'Battle of Astarte',
      side: 'empire',
      cols: 13,
      rows: 9,
      desc: 'Three Alliance fleets converge on Reinhard. Strike each before they can unite.',
      objective: { type: 'destroy', turns: 14, stars: [8, 11] },
      win: 'All three Alliance fleets are broken. Astarte is an Imperial triumph.',
      timeout: 'The Alliance fleets regrouped and withdrew.',
    },
    amritsar: {
      name: 'Hold Amritsar',
      side: 'alliance',
      cols: 12,
      rows: 9,
      desc: 'The Imperial counteroffensive falls on Amritsar. Hold the station until the evacuation is complete.',
      objective: { type: 'hold', stations: ['Amritsar'], turns: 12 },
      win: 'Amritsar held. The fleet withdraws in good order.',
      timeout: 'Amritsar has fallen.',
    },
    vermilion: {
      name: 'Battle of Vermilion',
      side: 'alliance',
      cols: 13,
      rows: 9,
      desc: 'Brünhild is within reach. Break through the Imperial screen and destroy Reinhard’s flagship before Mittermeyer arrives.',
      objective: { type: 'kill', admiral: 'reinhard', turns: 15, stars: [9, 12] },
      win: 'Brünhild is lost. The Imperial offensive collapses.',
      timeout: 'Imperial reinforcements arrived. Brünhild escaped.',
    },
  };
  // mode: 'conquest' or 'conquest:<era>' for a Conquest start date; a scenario id (or 'scenario:<id>') otherwise.
  function createGame(player = 'alliance', difficulty = 'normal', mode = 'conquest', seed = 246801) {
    let era = null,
      scen = null;
    if (mode === 'conquest' || String(mode).startsWith('conquest:')) era = String(mode).split(':')[1] || 'frontier';
    else scen = String(mode).replace('scenario:', '');
    if (era && !ERAS[era]) era = 'frontier';
    if (scen && !SCENARIOS[scen]) scen = 'iserlohn';
    const def = scen ? SCENARIOS[scen] : null;
    if (def?.side) player = def.side;
    const g = {
      version: 2,
      rulesVersion: 7,
      player,
      difficulty,
      mode: era ? 'conquest' : scen,
      era,
      objective: def ? { ...def.objective } : null,
      retired: (era && ERAS[era].retired) || [],
      seed,
      cols: def ? def.cols : 17,
      rows: def ? def.rows : 11,
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
      tech: { empire: blankTech(), alliance: blankTech(), neutral: blankTech() },
      officers: Object.fromEntries(Object.keys(ADMIRALS).map(k => [k, defaultOfficer(k)])),
      medalInventory: [],
      medalsEarned: [],
      over: null,
      stats: {},
    };
    const enemy = opponent(player);
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++) {
        const n = random(g);
        let terrain = n < 0.085 ? 'nebula' : n < 0.16 ? 'asteroid' : 'space';
        if (era && c === 8 && ![2, 5, 8].includes(r)) terrain = 'rift';
        g.tiles.push({
          c,
          r,
          terrain,
          owner: era
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
    const place = ([side, type, c, r, stack = 1, admiral = null, art = null]) => {
      const u = newUnit(g, type, side, c, r, stack, admiral);
      if (art) u.art = art;
      return u;
    };
    const setEconomy = eco => {
      for (const [side, [credits, industry]] of Object.entries(eco || {}))
        Object.assign(g.economy[side], { credits, industry });
    };
    if (era) {
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
      const spec = ERAS[era];
      for (const [name, owner] of Object.entries(spec.owners || {})) {
        const s = g.stations.find(s => s.name === name);
        s.owner = owner;
        claim(s, owner);
      }
      if (spec.units) spec.units.forEach(place);
      else
        for (const side of ['empire', 'alliance']) {
          const mirror = c => (side === 'empire' ? c : 16 - c);
          newUnit(g, 'flagship', side, mirror(4), 5, 1, side === 'empire' ? 'reinhard' : 'yang');
          newUnit(g, 'heavy', side, mirror(5), 3, 2, side === 'empire' ? 'mittermeyer' : 'attenborough');
          newUnit(g, 'light', side, mirror(5), 7, 2);
          newUnit(g, 'beam', side, mirror(4), 4, 2);
          newUnit(g, 'siege', side, mirror(5), 1, 1);
          newUnit(g, 'missile', side, mirror(3), 6, 1);
          newUnit(g, 'frigate', side, mirror(6), 2, 1);
          newUnit(g, 'corvette', side, mirror(6), 8, 2);
          newUnit(g, 'destroyer', side, mirror(3), 9, 1);
        }
      setEconomy(spec.economy);
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
    // Enemy officers are veterans on Fleet Marshal difficulty.
    if (difficulty === 'hard')
      for (const [k, a] of Object.entries(ADMIRALS))
        if (a.side === enemy) g.officers[k].rank = Math.min(4, g.officers[k].rank + 1);
    for (const u of g.units)
      if (u.admiral) {
        u.cmdRank = g.officers[u.admiral].rank;
        u.hp = maxHP(u);
      }
    if (difficulty === 'easy') {
      g.economy[player].credits += 150;
      g.economy[player].industry += 50;
    }
    g.startFleets = {
      empire: g.units.filter(u => u.side === 'empire').length,
      alliance: g.units.filter(u => u.side === 'alliance').length,
    };
    log(g, era ? ERAS[era].desc : def.desc, player);
    return g;
  }
  // Enemy high command, run once at the start of each AI turn before its fleets act:
  // repair, save for dreadnoughts, upgrade rear shipyards, reinforce, then build stacked fleets. No fleet cap.
  function aiProduction(g) {
    const side = g.phase,
      e = funds(g, side),
      foes = g.units.filter(u => u.hp > 0 && u.side !== side),
      own = () => g.units.filter(u => u.hp > 0 && u.side === side),
      front = p => Math.min(...foes.map(u => distance(u, p)), 99),
      nearFriendlyStation = u => g.stations.some(s => s.owner === side && distance(s, u) <= 1),
      plan = ((g.ai ||= {})[side] ||= { saving: false });
    const bases = g.stations.filter(s => s.owner === side).sort((a, b) => front(a) - front(b));
    const yard3 = bases.filter(s => s.tier >= 3);
    const flagPrice = price('flagship');

    // 0. Fire every ready fortress main gun at the strongest enemy fleet in range (the UI animates g.strikes).
    g.strikes = [];
    for (const s of bases) {
      const target = fortressTargets(g, s)
        .map(p => unitAt(g, p))
        .sort((a, b) => b.hp - a.hp || a.id - b.id)[0];
      if (target) {
        const shot = fireFortress(g, s.id, target.c, target.r);
        if (shot.ok) g.strikes.push(shot);
      }
    }

    // 1. Repair badly damaged fleets resting at a friendly station (this spends their turn).
    for (const u of own()
      .filter(u => u.hp / maxHP(u) < 0.55 && nearFriendlyStation(u))
      .sort((a, b) => a.hp / maxHP(a) - b.hp / maxHP(b))) {
      if (e.credits - repairCost(u) >= 60) repair(g, u.id);
    }

    // 2. Decide whether to save for a dreadnought (at most two alive, needs a tier-3 shipyard).
    const flagships = own().filter(u => u.type === 'flagship').length;
    if (!yard3.length || flagships >= 2) plan.saving = false;
    else if (!plan.saving && g.turn >= 3 && random(g) < 0.35) plan.saving = true;
    if (plan.saving) {
      const yard = yard3.find(s => canBuy(g, s, 'flagship', 1));
      if (yard) {
        recruit(g, yard.id, 'flagship', 1);
        plan.saving = false;
      }
    }
    // While saving, keep the dreadnought fund untouched; otherwise hold a small emergency reserve.
    const reserve = plan.saving ? Math.min(e.credits, flagPrice.credits) : 60;
    const reserveInd = plan.saving ? Math.min(e.industry, flagPrice.industry) : 0;
    const spendable = () => Math.max(0, e.credits - reserve);
    const affordable = c => c.credits <= spendable() && e.industry - (c.industry || 0) >= reserveInd;

    // 3. Research every third turn when the treasury can spare it.
    if (g.mode === 'conquest' && g.turn % 3 === 0 && !plan.saving) {
      const branches = Object.keys(TECH_TREE),
        b = branches[Math.floor(random(g) * branches.length)],
        tracks = Object.keys(TECH_TREE[b].tracks),
        k = tracks[Math.floor(random(g) * tracks.length)];
      if (!researchReason(g, side, b, k) && affordable(researchCost(g, side, b, k))) research(g, b, k);
    }

    // 4. Upgrade one building per turn when there is surplus: the lowest-level building at the safest station.
    if (!plan.saving && g.turn >= 2) {
      const options = bases
        .flatMap(s => ['shipyard', 'lab', 'air'].map(kind => ({ s, kind, level: buildingLevel(s, kind) })))
        .filter(o => o.level < 3)
        .sort((a, b) => a.level - b.level || front(b.s) - front(a.s) || random(g) - 0.5);
      const pick = options[0];
      if (pick && spendable() - buildCost(pick.s, pick.kind).credits >= 250 && affordable(buildCost(pick.s, pick.kind)))
        build(g, pick.s.id, pick.kind);
    }

    // 5. Reinforce healthy Battle Line and Artillery fleets parked at a friendly station.
    for (const u of own()
      .filter(
        u =>
          u.stack < 3 &&
          !u.moved &&
          !u.attacked &&
          TYPES[u.type].branch !== 'Escort' &&
          u.hp / maxHP(u) >= 0.7 &&
          nearFriendlyStation(u),
      )
      .sort((a, b) => TYPES[b.type].cost - TYPES[a.type].cost)) {
      if (affordable(reinforceCost(u.type)) && spendable() - reinforceCost(u.type).credits >= 150) reinforce(g, u.id);
    }

    // 6. Build: front-line shipyards first; stack up when the budget allows.
    bases.forEach((s, i) => {
      const ships =
          s.tier >= 3
            ? ['battleship', 'siege', 'heavy', 'missile', 'frigate', 'corvette']
            : s.tier === 2
              ? ['heavy', 'missile', 'destroyer', 'corvette']
              : ['light', 'beam', 'frigate', 'corvette'],
        air = ['strategic', 'bomber', 'fighter'].filter(k => (s.air || 0) >= TYPES[k].tier),
        menu = [...ships.slice(0, 2), ...air.slice(0, 1), ...ships.slice(2), ...air.slice(1)];
      const preferred = menu[Math.floor(random(g) * Math.min(menu.length, 3))];
      const share = i === bases.length - 1 ? 1 : 0.6;
      for (const type of [preferred, ...menu.filter(x => x !== preferred)]) {
        let built = false;
        for (let n = 3; n >= 1 && !built; n--) {
          const c = price(type, n);
          // Single hulls may use the whole budget; stacks only this shipyard's share of it.
          if (!canBuy(g, s, type, n) || !affordable(c) || (n > 1 && c.credits > spendable() * share)) continue;
          recruit(g, s.id, type, n);
          built = true;
        }
        if (built) break;
      }
    });
  }
  function aiOrder(g, id) {
    const u = g.units.find(u => u.id === id);
    if (!u || !isReady(g, u)) return [];
    const events = [];
    if (u.admiral === 'yang' && u.confusionCD === 0) confuse(g, id);
    const choose = () =>
      targets(g, u)
        .map(p => {
          const d = unitAt(g, p),
            s = stationAt(g, p),
            pr = preview(g, id, p.c, p.r);
          const score =
            pr.unit +
            pr.shield * 0.7 +
            (d && pr.unit >= d.hp ? 130 : 0) +
            (s ? 35 : 0) +
            (d?.admiral ? 30 : 0) -
            pr.counter * 0.5;
          return { p, score };
        })
        .sort((a, b) => b.score - a.score)[0];
    if (!u.moved && !u.attacked) {
      const spots = [...reachable(g, u).keys()].map(k => {
        const [c, r] = k.split(',').map(Number);
        return tile(g, c, r);
      });
      const enemies = g.units.filter(v => v.hp > 0 && v.side !== u.side);
      const goals = g.stations.filter(s => s.owner !== u.side);
      const old = { c: u.c, r: u.r };
      let best = null,
        bestScore = -Infinity;
      for (const p of spots) {
        const station = stationAt(g, p);
        let sc = station && station.owner !== u.side && station.shield === 0 ? 400 : 0;
        const nearestGoal = Math.min(...goals.map(s => distance(p, s)), 15),
          nearestEnemy = Math.min(...enemies.map(v => distance(p, v)), 15);
        sc -= nearestGoal * 8;
        const danger = enemies.filter(v => distance(v, p) <= 1).length;
        if (TYPES[u.type].branch === 'Artillery') {
          sc -= danger * 28;
          sc -= Math.abs(nearestEnemy - TYPES[u.type].max) * 6;
        } else sc -= nearestEnemy * 2;
        // Air wings stay within supply range of a friendly air base.
        if (
          TYPES[u.type].air &&
          !g.stations.some(s => s.owner === u.side && (s.air || 0) > 0 && distance(s, p) <= airSupply(g, u.side))
        )
          sc -= 80;
        u.c = p.c;
        u.r = p.r;
        const shot = choose();
        u.c = old.c;
        u.r = old.r;
        if (shot) sc += shot.score * 0.6;
        if (station?.owner === u.side && u.hp / maxHP(u) < 0.5) sc += 20;
        if (sc > bestScore) {
          bestScore = sc;
          best = p;
        }
      }
      const current = choose();
      if (
        best &&
        (!current || bestScore > current.score * 0.6 - Math.min(...goals.map(s => distance(u, s)), 15) * 8 + 6)
      ) {
        const m = move(g, id, best.c, best.r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    }
    for (let chain = 0; chain < 3 && !u.attacked && !g.over; chain++) {
      const shot = choose();
      if (!shot) break;
      const a = attack(g, id, shot.p.c, shot.p.r);
      if (a.ok) events.push({ kind: 'attack', ...a, id });
      else break;
    }
    return events;
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
    objectiveText,
    modeTitle,
    TYPES,
    ADMIRALS,
    TECHS,
    TECH_TREE,
    BRANCHES,
    branchOf,
    techLevel,
    rangeOf,
    airSupply,
    RANKS,
    RANK_XP,
    SKILLS,
    MEDALS,
    officer,
    medalSlots,
    promoteCost,
    promote,
    learnSkill,
    raiseRating,
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
    learnReason,
    rateReason,
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
  if (typeof module !== 'undefined') module.exports = root.Galactic;
})(typeof window !== 'undefined' ? window : globalThis);
