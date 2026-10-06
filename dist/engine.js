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
      relentless: true,
      desc: 'Heavy armor penetration and 1–2 hex guns. Exchanges counter-fire. Every kill lets it fire again; the first also refreshes its movement.',
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
      desc: 'Super-heavy capital ship. Immense armor, 1–2 hex guns and counter-fire. Every kill lets it fire again; the first also refreshes its movement.',
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
    // Recruitable admirals: bought once with command tokens (recruit), then assignable in every operation.
    bittenfeld: {
      name: 'Fritz Joseph Bittenfeld',
      short: 'Bittenfeld',
      side: 'empire',
      stars: 4,
      cost: 150,
      role: 'Battle Line',
      hull: 'Königs Tiger',
      skill: 'Black Lancers',
      desc: 'Battle Line attacks deal +25% damage, but the fleet takes 10% more counter-fire.',
      trait: 'lancer',
      recruit: 300,
    },
    muller: {
      name: 'Neidhart Müller',
      short: 'Müller',
      side: 'empire',
      stars: 4,
      cost: 145,
      role: 'Battle Line',
      hull: 'Percival',
      skill: 'Iron Wall',
      desc: 'Takes 30% less damage while below half hull.',
      trait: 'ironwall',
      recruit: 300,
    },
    fahrenheit: {
      name: 'Adalbert von Fahrenheit',
      short: 'Fahrenheit',
      side: 'empire',
      stars: 4,
      cost: 140,
      role: 'Battle Line',
      hull: 'Ásgrímm',
      skill: 'Opening Strike',
      desc: '+30% damage when firing before moving this turn.',
      trait: 'opening',
      recruit: 300,
    },
    kempff: {
      name: 'Karl Gustav Kempff',
      short: 'Kempff',
      side: 'empire',
      stars: 3,
      cost: 120,
      role: 'Air',
      hull: 'Jotunheim',
      skill: 'Fighter Ace',
      desc: 'Air wings and Siege Cannons deal +25% damage; +30% damage to station defenses.',
      trait: 'ace',
      recruit: 200,
    },
    eisenach: {
      name: 'Ernst von Eisenach',
      short: 'Eisenach',
      side: 'empire',
      stars: 4,
      cost: 140,
      role: 'Battle Line',
      hull: 'Wiesengrund',
      skill: 'The Silent Admiral',
      desc: 'Command aura reaches 2 hexes and grants nearby fleets +12% damage.',
      trait: 'silent',
      recruit: 300,
    },
    oberstein: {
      name: 'Paul von Oberstein',
      short: 'Oberstein',
      side: 'empire',
      stars: 4,
      cost: 135,
      role: 'Escort',
      hull: 'Staff command ship',
      skill: 'Calculated Terror',
      desc: 'Each attack also lowers the surviving target’s morale by 1.',
      trait: 'terror',
      recruit: 300,
    },
    wahlen: {
      name: 'August Samuel Wahlen',
      short: 'Wahlen',
      side: 'empire',
      stars: 4,
      cost: 140,
      role: 'Battle Line',
      hull: 'Salamander',
      skill: 'Steadfast',
      desc: 'Morale never falls below steady; takes 10% less damage.',
      trait: 'steadfast',
      recruit: 300,
    },
    lutz: {
      name: 'Cornelius Lutz',
      short: 'Lutz',
      side: 'empire',
      stars: 4,
      cost: 140,
      role: 'Battle Line',
      hull: 'Skírnir',
      skill: 'Marksman',
      desc: '+20% critical chance and critical hits deal +25% more.',
      trait: 'marksman',
      recruit: 300,
    },
    mecklinger: {
      name: 'Ernest Mecklinger',
      short: 'Mecklinger',
      side: 'empire',
      stars: 4,
      cost: 135,
      role: 'Artillery',
      hull: 'Kvasir',
      skill: 'Artist Admiral',
      desc: '+10% damage for each other friendly fleet next to the target (up to +30%).',
      trait: 'artist',
      recruit: 300,
    },
    kessler: {
      name: 'Ulrich Kessler',
      short: 'Kessler',
      side: 'empire',
      stars: 3,
      cost: 110,
      role: 'Escort',
      hull: 'Capital Guard flagship',
      skill: 'Capital Defense',
      desc: 'Takes 25% less damage on or next to a friendly station.',
      trait: 'guardian',
      recruit: 200,
    },
    steinmetz: {
      name: 'Karl Robert Steinmetz',
      short: 'Steinmetz',
      side: 'empire',
      stars: 3,
      cost: 110,
      role: 'Battle Line',
      hull: 'Fornheim',
      skill: 'Brünhild’s Captain',
      desc: 'Counter-fire +40%; commanding a Dreadnought, takes 10% less damage.',
      trait: 'captain',
      recruit: 200,
    },
    lennenkampf: {
      name: 'Helmut Lennenkampf',
      short: 'Lennenkampf',
      side: 'empire',
      stars: 3,
      cost: 90,
      role: 'Battle Line',
      hull: 'Gálahad',
      skill: 'Old School',
      desc: 'A low-cost commander: Battle Line +10% damage.',
      trait: 'oldschool',
      recruit: 200,
    },
    bucock: {
      name: 'Alexandre Bucock',
      short: 'Bucock',
      side: 'alliance',
      stars: 4,
      cost: 145,
      role: 'Battle Line',
      hull: 'Rio Grande',
      skill: 'Old Guard',
      desc: 'Counter-fire +35%; morale never falls below steady.',
      trait: 'oldguard',
      recruit: 300,
    },
    merkatz: {
      name: 'Willibald Joachim von Merkatz',
      short: 'Merkatz',
      side: 'alliance',
      stars: 4,
      cost: 140,
      role: 'Escort',
      hull: 'Shiva',
      skill: 'Combined Arms',
      desc: 'Escorts and air wings within 2 hexes deal +15% damage; other fleets nearby +8%.',
      trait: 'combined',
      recruit: 300,
    },
    ulanhu: {
      name: 'Ulanhu',
      short: 'Ulanhu',
      side: 'alliance',
      stars: 3,
      cost: 110,
      role: 'Battle Line',
      hull: '10th Fleet flagship',
      skill: 'Rearguard',
      desc: 'His fleet and adjacent friendly fleets take 10% less damage.',
      trait: 'rearguard',
      recruit: 200,
    },
    borodin: {
      name: 'Borodin',
      short: 'Borodin',
      side: 'alliance',
      stars: 3,
      cost: 90,
      role: 'Battle Line',
      hull: '12th Fleet flagship',
      skill: 'Steady Hand',
      desc: '+8% damage and 8% less damage taken.',
      trait: 'steady',
      recruit: 200,
    },
    cazerne: {
      name: 'Alex Cazerne',
      short: 'Cazerne',
      side: 'alliance',
      stars: 3,
      cost: 100,
      role: 'Escort',
      hull: 'Supply flagship',
      skill: 'Quartermaster',
      desc: 'While he commands, all your repairs cost half; his fleet repairs 8% hull each turn.',
      trait: 'quartermaster',
      recruit: 200,
    },
    poplin: {
      name: 'Olivier Poplin',
      short: 'Poplin',
      side: 'alliance',
      stars: 3,
      cost: 110,
      role: 'Air',
      hull: 'Spartanian',
      skill: 'Spartanian Ace',
      desc: '+25% critical chance; +40% damage against air wings.',
      trait: 'spartanian',
      recruit: 200,
    },
    konev: {
      name: 'Ivan Konev',
      short: 'Konev',
      side: 'alliance',
      stars: 3,
      cost: 100,
      role: 'Air',
      hull: 'Spartanian',
      skill: 'Wingman',
      desc: 'Takes 30% less damage and never loses hull for being out of air supply.',
      trait: 'wingman',
      recruit: 200,
    },
    murai: {
      name: 'Murai',
      short: 'Murai',
      side: 'alliance',
      stars: 3,
      cost: 100,
      role: 'Escort',
      hull: 'Hyperion staff',
      skill: 'Calm Analysis',
      desc: 'His fleet and fleets within 1 hex never drop below low morale (no diminished or confused).',
      trait: 'calm',
      recruit: 200,
    },
    patrichev: {
      name: 'Fyodor Patrichev',
      short: 'Patrichev',
      side: 'alliance',
      stars: 3,
      cost: 100,
      role: 'Battle Line',
      hull: 'Hyperion staff',
      skill: 'Reassuring Presence',
      desc: 'Friendly fleets within 2 hexes recover 1 extra morale and 5% hull each turn.',
      trait: 'reassure',
      recruit: 200,
    },
    nguyen: {
      name: 'Nguyen Van Huu',
      short: 'Nguyen',
      side: 'alliance',
      stars: 3,
      cost: 110,
      role: 'Battle Line',
      hull: 'Iserlohn detachment flagship',
      skill: 'Aggressive Raider',
      desc: '+20% damage when attacking; Battle Line can refresh actions twice per turn.',
      trait: 'raider',
      recruit: 200,
    },
  };
  // HQ technology, as in World Conqueror 4: bought with command tokens earned by winning operations, kept in the
  // player's profile across every operation and side. Each level unlocks at a tier gated by total victories.
  const BRANCHES = { Escort: 'escort', 'Battle Line': 'line', Artillery: 'artillery', Air: 'air' };
  const BRANCH_NAMES = { escort: 'Escort', line: 'Battle Line', artillery: 'Artillery', air: 'Aerospace' };
  const TECH_TIERS = [0, 0, 2, 4, 7];
  const pct = v => `${Math.round(v * 100)}%`;
  const TECH_TREE = {
    escort: {
      name: 'Escort',
      desc: 'Corvettes, frigates and destroyers: the screens and station raiders of the fleet.',
      nodes: {
        drives: {
          name: 'Afterburner Drives',
          values: [1, 2],
          tiers: [1, 3],
          costs: [60, 220],
          text: v => `+${v} movement`,
        },
        guns: {
          name: 'Pulse Laser Batteries',
          values: [0.06, 0.12, 0.2, 0.3],
          tiers: [1, 1, 2, 3],
          costs: [40, 80, 160, 300],
          text: v => `+${pct(v)} damage`,
        },
        hull: {
          name: 'Composite Hulls',
          values: [0.08, 0.16, 0.25, 0.35],
          tiers: [1, 2, 2, 3],
          costs: [40, 90, 150, 280],
          text: v => `+${pct(v)} hull`,
        },
        torpedo: {
          name: 'Torpedo Salvo',
          values: [0.4, 0.5],
          tiers: [1, 2],
          costs: [90, 200],
          req: ['guns', 1],
          text: v => `+${pct(v)} damage to Battle Line hulls`,
        },
        nav: {
          name: 'Nebula Navigation',
          values: [1, 2],
          tiers: [1, 2],
          costs: [70, 150],
          text: v => (v === 1 ? 'Asteroid fields cost 1 movement' : 'Every terrain costs 1 movement'),
        },
        shield: {
          name: 'Particle Shields',
          values: [0.75, 0.9],
          tiers: [1, 3],
          costs: [50, 120],
          text: v => `−${pct(v)} nebula attrition`,
        },
        boarding: {
          name: 'Boarding Charges',
          values: [0.55, 0.7],
          tiers: [2, 3],
          costs: [140, 260],
          req: ['torpedo', 1],
          text: v => `+${pct(v)} damage to station defenses`,
        },
        picket: {
          name: 'Picket Screen',
          values: [1, 2],
          tiers: [2, 3],
          costs: [150, 280],
          text: v =>
            v === 1
              ? 'Friendly artillery and air wings next to an escort take 15% less damage'
              : 'Escort counter-fire hits at full strength',
        },
        armor: {
          name: 'Ablative Armor',
          values: [6],
          tiers: [4],
          costs: [400],
          req: ['hull', 4],
          text: v => `+${v} armor`,
        },
      },
    },
    line: {
      name: 'Battle Line',
      desc: 'Cruisers, battleships and dreadnoughts: the armored wall that breaks the enemy line.',
      nodes: {
        armor: {
          name: 'Liquid-Metal Armor',
          values: [3, 6, 9, 13, 18],
          tiers: [1, 1, 2, 3, 4],
          costs: [50, 100, 170, 280, 420],
          text: v => `+${v} armor`,
        },
        hull: {
          name: 'Hull Frames',
          values: [0.06, 0.12, 0.2, 0.3],
          tiers: [1, 2, 3, 4],
          costs: [50, 110, 200, 360],
          text: v => `+${pct(v)} hull`,
        },
        guns: {
          name: 'Main Batteries',
          values: [0.05, 0.1, 0.16, 0.23, 0.32],
          tiers: [1, 2, 2, 3, 4],
          costs: [50, 100, 170, 280, 420],
          text: v => `+${pct(v)} damage`,
        },
        drives: {
          name: 'Fusion Engines',
          values: [1, 2],
          tiers: [2, 4],
          costs: [150, 380],
          text: v => `+${v} movement`,
        },
        secondary: {
          name: 'Secondary Batteries',
          values: [0.45, 0.55],
          tiers: [2, 3],
          costs: [120, 220],
          req: ['guns', 1],
          text: v => `+${pct(v)} damage to escorts`,
        },
        flak: {
          name: 'Flak Screens',
          values: [0.3, 0.35],
          tiers: [2, 3],
          costs: [110, 200],
          text: v => `−${pct(v)} damage from air wings`,
        },
        assault: {
          name: 'Assault Doctrine',
          values: [0.75, 1],
          tiers: [2, 4],
          costs: [160, 400],
          req: ['guns', 2],
          text: v => `${pct(v)} chance a kill grants one more breakthrough than the cap`,
        },
        formation: {
          name: 'Line of Battle',
          values: [0.15],
          tiers: [3],
          costs: [240],
          req: ['armor', 2],
          text: v => `+${pct(v)} damage when next to another friendly Battle Line fleet`,
        },
        bulkheads: {
          name: 'Reinforced Bulkheads',
          values: [0.25],
          tiers: [4],
          costs: [320],
          req: ['hull', 3],
          text: v => `−${pct(v)} damage from fortress guns and Siege Cannons`,
        },
      },
    },
    artillery: {
      name: 'Artillery',
      desc: 'Artillery Frigates, Artillery Cruisers and Siege Cannons: firepower that suppresses counter-fire.',
      nodes: {
        guns: {
          name: 'Neutron Capacitors',
          values: [0.05, 0.1, 0.18, 0.26, 0.35],
          tiers: [1, 1, 2, 3, 4],
          costs: [50, 100, 180, 300, 440],
          text: v => `+${pct(v)} damage`,
        },
        hull: {
          name: 'Gun Carriages',
          values: [0.08, 0.16, 0.26],
          tiers: [1, 2, 3],
          costs: [40, 100, 200],
          text: v => `+${pct(v)} hull`,
        },
        drives: {
          name: 'Fusion Thrusters',
          values: [1, 2],
          tiers: [2, 4],
          costs: [160, 400],
          text: v => `+${v} movement`,
        },
        shells: {
          name: 'Fragmentation Shells',
          values: [0.45, 0.55],
          tiers: [2, 3],
          costs: [120, 220],
          req: ['guns', 1],
          text: v => `+${pct(v)} damage to escorts`,
        },
        fire: {
          name: 'Fire Control',
          values: [1, 2],
          tiers: [2, 4],
          costs: [150, 450],
          req: ['guns', 2],
          text: v =>
            v === 1
              ? '+20% damage against targets next to a friendly non-artillery fleet'
              : '+1 range for all artillery',
        },
        salvo: {
          name: 'Saturation Salvos',
          values: [0.15, 0.3],
          tiers: [2, 3],
          costs: [120, 240],
          text: v => `Artillery Cruiser splash +${pct(v)} of the hit`,
        },
        armor: {
          name: 'Sensor Baffles',
          values: [5],
          tiers: [4],
          costs: [300],
          req: ['hull', 2],
          text: v => `+${v} armor`,
        },
      },
    },
    air: {
      name: 'Aerospace',
      desc: 'Fighter, bomber and strategic bomber wings flown from station air bases.',
      nodes: {
        guns: {
          name: 'Avionics',
          values: [0.06, 0.12, 0.2, 0.28, 0.38],
          tiers: [1, 1, 2, 3, 4],
          costs: [50, 100, 180, 300, 440],
          text: v => `+${pct(v)} damage`,
        },
        hull: {
          name: 'Reinforced Airframes',
          values: [0.1, 0.2, 0.32],
          tiers: [1, 2, 3],
          costs: [40, 100, 200],
          text: v => `+${pct(v)} hull`,
        },
        fuel: {
          name: 'Fuel Cells',
          values: [0.05, 0.1, 0.15],
          tiers: [1, 2, 3],
          costs: [60, 120, 220],
          text: v => `Air wings cost ${pct(v)} less`,
        },
        carrier: {
          name: 'Carrier Operations',
          values: [1, 2],
          tiers: [2, 3],
          costs: [140, 260],
          text: v =>
            v === 1
              ? 'Air supply range grows from 3 to 5 hexes'
              : 'Hit and run: a wing that attacks before moving may still move',
        },
        bombing: {
          name: 'Bombing Doctrine',
          values: [0.4, 0.6],
          tiers: [2, 3],
          costs: [130, 240],
          req: ['guns', 1],
          text: v => `+${pct(v)} damage to station defenses`,
        },
        guidance: {
          name: 'Precision Guidance',
          values: [0.3],
          tiers: [3],
          costs: [260],
          req: ['guns', 2],
          text: v => `Air wings take ${pct(v)} less counter-fire`,
        },
        stealth: {
          name: 'Stealth Coating',
          values: [0.2],
          tiers: [4],
          costs: [380],
          req: ['guidance', 1],
          text: v => `+${pct(v)} air attack damage`,
        },
      },
    },
    station: {
      name: 'Stations',
      desc: 'Station defenses, fortress main guns and point defense.',
      nodes: {
        fort: {
          name: 'Fortification',
          values: [20, 40, 70, 100, 150],
          tiers: [1, 2, 2, 3, 4],
          costs: [40, 80, 140, 220, 360],
          text: v => `+${v} defense on your stations`,
        },
        thor: {
          name: 'Thor Capacitors',
          values: [0.1, 0.25],
          tiers: [1, 2],
          costs: [60, 140],
          text: v => `+${pct(v)} fortress gun damage`,
        },
        flak: {
          name: 'Point-Defense Grid',
          values: [0.2, 0.35],
          tiers: [1, 2],
          costs: [60, 140],
          text: v => `Fleets on or next to your stations take ${pct(v)} less damage from air wings`,
        },
        interceptors: {
          name: 'Interceptor Missiles',
          values: [1, 2],
          tiers: [3, 4],
          costs: [180, 320],
          req: ['flak', 2],
          text: v =>
            v === 1
              ? 'Strategic bombers deal 30% less damage to your stations'
              : 'All air wings deal 50% less damage to your stations',
        },
        overcharge: {
          name: 'Thor Overcharge',
          values: [1, 2],
          tiers: [3, 4],
          costs: [240, 420],
          req: ['thor', 2],
          text: v =>
            v === 1
              ? 'Fortress guns recharge 1 turn faster'
              : 'Fortress gun blasts hit enemies next to the target for 50%',
        },
      },
    },
  };
  // Flat index: 'line.armor' → node, with its branch and id.
  const TECH_NODES = Object.fromEntries(
    Object.entries(TECH_TREE).flatMap(([b, tree]) =>
      Object.entries(tree.nodes).map(([k, n]) => [
        `${b}.${k}`,
        { ...n, id: `${b}.${k}`, branch: b, max: n.values.length },
      ]),
    ),
  );
  const TECHS = TECH_TREE;
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
  // Starting branch ratings (stars, up to 6 with command tokens): Escort, Battle Line, Artillery, Aerospace.
  const RATINGS = {
    reinhard: { escort: 3, line: 5, artillery: 4, air: 3 },
    yang: { escort: 4, line: 5, artillery: 4, air: 4 },
    mittermeyer: { escort: 4, line: 5, artillery: 3, air: 3 },
    reuenthal: { escort: 3, line: 5, artillery: 4, air: 3 },
    kircheis: { escort: 5, line: 4, artillery: 3, air: 3 },
    attenborough: { escort: 4, line: 4, artillery: 3, air: 3 },
    fischer: { escort: 4, line: 4, artillery: 3, air: 3 },
    schonkopf: { escort: 5, line: 2, artillery: 2, air: 3 },
    bittenfeld: { escort: 3, line: 5, artillery: 3, air: 3 },
    muller: { escort: 4, line: 5, artillery: 3, air: 3 },
    fahrenheit: { escort: 4, line: 4, artillery: 3, air: 3 },
    kempff: { escort: 3, line: 3, artillery: 4, air: 5 },
    eisenach: { escort: 4, line: 4, artillery: 4, air: 3 },
    oberstein: { escort: 4, line: 3, artillery: 4, air: 3 },
    wahlen: { escort: 3, line: 5, artillery: 3, air: 3 },
    lutz: { escort: 3, line: 4, artillery: 5, air: 3 },
    mecklinger: { escort: 3, line: 4, artillery: 5, air: 3 },
    kessler: { escort: 4, line: 3, artillery: 3, air: 3 },
    steinmetz: { escort: 3, line: 4, artillery: 3, air: 3 },
    lennenkampf: { escort: 3, line: 4, artillery: 3, air: 2 },
    bucock: { escort: 3, line: 5, artillery: 4, air: 3 },
    merkatz: { escort: 5, line: 4, artillery: 3, air: 4 },
    ulanhu: { escort: 3, line: 4, artillery: 3, air: 3 },
    borodin: { escort: 3, line: 4, artillery: 3, air: 3 },
    cazerne: { escort: 4, line: 3, artillery: 3, air: 3 },
    poplin: { escort: 3, line: 2, artillery: 2, air: 5 },
    konev: { escort: 3, line: 2, artillery: 2, air: 5 },
    murai: { escort: 4, line: 3, artillery: 3, air: 3 },
    patrichev: { escort: 3, line: 4, artillery: 3, air: 3 },
    nguyen: { escort: 4, line: 4, artillery: 3, air: 3 },
  };
  function defaultOfficer(k) {
    return { rank: ADMIRALS[k].stars >= 5 ? 1 : 0, ratings: { ...RATINGS[k] }, medals: [] };
  }
  function officer(g, k) {
    if (!k || !ADMIRALS[k]) return null;
    g.officers ||= {};
    return (g.officers[k] ||= defaultOfficer(k));
  }
  function wears(g, k, medal) {
    return !!k && !!officer(g, k)?.medals.includes(medal);
  }
  function medalSlots(o) {
    return 1 + Math.floor(o.rank / 4);
  }
  // Damage dealt and taken by an admiral's fleet: branch rating and medals.
  function officerAttack(g, u) {
    if (!u.admiral) return 1;
    const o = officer(g, u.admiral);
    return (
      (1 + 0.04 * ((o.ratings[branchOf(u.type)] || 3) - 3)) *
      (wears(g, u.admiral, 'valor') ? 1.08 : 1) *
      (wears(g, u.admiral, 'campaign') ? 1.04 : 1)
    );
  }
  function officerDefense(g, u) {
    if (!u.admiral) return 1;
    const o = officer(g, u.admiral);
    return Math.max(
      0.5,
      (1 - 0.03 * ((o.ratings[branchOf(u.type)] || 3) - 3)) *
        (wears(g, u.admiral, 'laurel') ? 0.92 : 1) *
        (wears(g, u.admiral, 'campaign') ? 0.96 : 1),
    );
  }
  function auraRange(g, a) {
    return a && ['eisenach', 'merkatz'].includes(a.admiral) ? 2 : 1;
  }
  // Lowest morale a fleet can be pushed to: Reinhard, Wahlen and Bucock hold steady; Murai's staff stops confusion.
  function moraleFloor(g, v) {
    if (['reinhard', 'wahlen', 'bucock'].includes(v.admiral)) return 0;
    return g.units.some(m => m.hp > 0 && m.side === v.side && m.admiral === 'murai' && distance(m, v) <= 1) ? -1 : -3;
  }
  function recruited(g, k) {
    return !ADMIRALS[k]?.recruit || (g.recruited || []).includes(k);
  }
  function recruitReason(g, profile, k) {
    const a = ADMIRALS[k];
    if (!a?.recruit) return 'Not recruitable';
    if (a.side !== g.player) return 'Serves the other side';
    if ((profile?.recruited || []).includes(k) || recruited(g, k)) return 'Already recruited';
    const have = profile?.tokens || 0;
    return a.recruit > have ? `Need ${a.recruit - have} more command tokens` : null;
  }
  // Recruiting is permanent: the admiral joins the profile and is assignable in every operation on their side.
  function recruitAdmiral(g, profile, k) {
    const why = recruitReason(g, profile, k);
    if (why) return { ok: false, reason: why };
    profile.tokens -= ADMIRALS[k].recruit;
    (profile.recruited ||= []).push(k);
    (g.recruited ||= []).push(k);
    log(g, `${ADMIRALS[k].name} joins the high command.`, ADMIRALS[k].side);
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
  function assignReason(g, u, k) {
    const a = ADMIRALS[k];
    if (!a) return 'Unknown admiral';
    if ((g.retired || []).includes(k)) return 'Fallen in this era';
    if (!recruited(g, k)) return `Recruit for ${a.recruit} command tokens first`;
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
    return PROMOTE_COST[o.rank + 1] ?? Infinity;
  }
  function officerReason(g, k) {
    const a = ADMIRALS[k];
    if (!a) return 'Unknown admiral';
    if (a.side !== g.player) return 'Not your officer';
    if (!recruited(g, k)) return `Recruit for ${a.recruit} command tokens first`;
    return turnReason(g, a.side);
  }
  function promoteReason(g, profile, k) {
    const o = officer(g, k);
    if (!o) return 'Unknown admiral';
    const cost = promoteCost(o),
      have = profile?.tokens || 0;
    return (
      officerReason(g, k) ||
      (o.rank >= RANKS.length - 1 ? 'Highest rank reached' : null) ||
      (cost > have ? `Need ${cost - have} more command tokens` : null)
    );
  }
  // As in WC4, command tokens (the medals of this game) buy extra branch stars, up to six. Stars are part of the
  // officer record, so they carry into every operation and mode the officer serves in.
  const MAX_RATING = 6;
  const STAR_COST = [0, 0, 0, 60, 120, 220, 360];
  function starCost(g, k, branch) {
    return STAR_COST[(officer(g, k)?.ratings[branch] || 0) + 1] ?? Infinity;
  }
  function starReason(g, profile, k, branch) {
    const o = officer(g, k);
    if (!o) return 'Unknown admiral';
    if (!BRANCH_NAMES[branch]) return 'Unknown branch';
    const cost = starCost(g, k, branch),
      have = profile?.tokens || 0;
    return (
      officerReason(g, k) ||
      ((o.ratings[branch] || 0) >= MAX_RATING ? `Already ${MAX_RATING} stars` : null) ||
      (cost > have ? `Need ${cost - have} more command tokens` : null)
    );
  }
  function buyStar(g, profile, k, branch) {
    const why = starReason(g, profile, k, branch);
    if (why) return { ok: false, reason: why };
    profile.tokens -= starCost(g, k, branch);
    const o = officer(g, k);
    o.ratings[branch]++;
    log(g, `${ADMIRALS[k].short} rises to ${o.ratings[branch]}★ in ${BRANCH_NAMES[branch]}.`, ADMIRALS[k].side);
    return { ok: true, stars: o.ratings[branch] };
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
  function promote(g, profile, k) {
    const why = promoteReason(g, profile, k);
    if (why) return { ok: false, reason: why };
    const o = officer(g, k);
    profile.tokens -= promoteCost(o);
    o.rank++;
    const u = g.units.find(u => u.hp > 0 && u.admiral === k);
    if (u) {
      const old = maxHP(u);
      u.cmdRank = o.rank;
      u.hp += maxHP(u) - old;
    }
    log(g, `${ADMIRALS[k].short} is promoted to ${RANKS[o.rank]}.`, ADMIRALS[k].side);
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
        ratings: Object.fromEntries(
          Object.entries({ ...base.ratings, ...(rec.ratings || {}) }).map(([b, n]) => [b, clamp(n | 0, 1, MAX_RATING)]),
        ),
        medals: (rec.medals || []).filter(m => MEDALS[m]),
      };
    }
    g.medalInventory = (profile?.medals || []).filter(m => MEDALS[m]);
    g.recruited = (profile?.recruited || []).filter(k => ADMIRALS[k]?.recruit);
    for (const u of g.units)
      if (u.admiral) {
        u.cmdRank = officer(g, u.admiral).rank;
        u.hp = maxHP(u);
      }
    return applyTech(g, profile?.research);
  }
  // Tokens, victories and HQ research live only in the profile; the game keeps a copy of the research.
  function exportProfile(g, profile = {}) {
    const officers = { ...(profile.officers || {}) };
    for (const [k, o] of Object.entries(g.officers || {}))
      if (ADMIRALS[k]?.side === g.player) officers[k] = JSON.parse(JSON.stringify(o));
    return { ...profile, officers, medals: [...(g.medalInventory || [])] };
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
    if (!g || g.version !== 2 || g.rulesVersion !== 10 || !Array.isArray(g.units)) return null;
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
    n += wears(g, u.admiral, 'star') ? 1 : 0;
    if (u.admiral === 'reinhard' && t.branch === 'Battle Line') n++;
    if (u.admiral === 'mittermeyer') n += 2;
    if (['attenborough', 'fischer'].includes(u.admiral)) n++;
    return n;
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
        (wears(g, a.admiral, 'marksman') ? 0.08 : 0),
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
    // Carrier Operations II: an air wing that fires before moving may still move.
    const sortie = !!TYPES[a.type].air && !a.moved && techLevel(g, a.side, 'air.carrier') >= 2;
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
      a.chain++;
      a.attacked = false;
      a.moved = false;
      a.sortie = false;
      breakthrough = true;
    } else if (destroyed && a.hp > 0 && TYPES[a.type].relentless) {
      // Battleships and dreadnoughts always fire again after a kill, beyond the breakthrough cap.
      a.attacked = false;
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
      name: 'Seventh Battle of Iserlohn',
      side: 'alliance',
      year: 'RC 796',
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
      year: 'UC 487 · RC 796',
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
      year: 'RC 796',
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
      year: 'RC 799',
      cols: 13,
      rows: 9,
      desc: 'Brünhild is within reach. Break through the Imperial screen and destroy Reinhard’s flagship before Mittermeyer arrives.',
      objective: { type: 'kill', admiral: 'reinhard', turns: 15, stars: [9, 12] },
      win: 'Brünhild is lost. The Imperial offensive collapses.',
      timeout: 'Imperial reinforcements arrived. Brünhild escaped.',
    },
    // Data-built scenarios: territory splits at a column, then stations and fleets are placed from the layout.
    tiamat: {
      name: 'Third Battle of Tiamat',
      side: 'empire',
      year: 'UC 486 · RC 795',
      cols: 12,
      rows: 9,
      desc: 'UC 486. The Alliance 11th Fleet charges the Imperial line. Reinhard’s detachment strikes its flank: destroy every Alliance fleet.',
      objective: { type: 'destroy', turns: 14, stars: [8, 11] },
      win: 'The 11th Fleet is shattered on Reinhard’s flank.',
      timeout: 'The Alliance fleet broke contact and escaped.',
      layout: {
        owners: ['empire', 'alliance'],
        split: 6,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Imperial Picket', 0, 4, 'empire', 1, true, false],
          ['Tiamat Relay', 11, 6, 'alliance', 1, false, false],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['empire', 'flagship', 2, 4, 1, 'reinhard'],
          ['empire', 'frigate', 3, 3, 2, 'kircheis'],
          ['empire', 'heavy', 3, 5, 2],
          ['empire', 'light', 2, 2, 2],
          ['empire', 'light', 2, 6, 2],
          ['empire', 'beam', 1, 4, 2],
          ['empire', 'missile', 1, 3, 1],
          ['empire', 'corvette', 4, 4, 2],
          ['empire', 'destroyer', 3, 7, 1],
          ['alliance', 'heavy', 9, 3, 2],
          ['alliance', 'heavy', 9, 5, 2],
          ['alliance', 'battleship', 10, 4, 1],
          ['alliance', 'light', 8, 2, 1],
          ['alliance', 'light', 8, 6, 1],
          ['alliance', 'beam', 10, 3, 1],
          ['alliance', 'missile', 10, 5, 1],
          ['alliance', 'corvette', 8, 4, 1],
          ['alliance', 'frigate', 11, 4, 1],
        ],
        economy: { empire: [200, 80], alliance: [120, 40] },
      },
    },
    amritsar_e: {
      name: 'Amritsar Counteroffensive',
      side: 'empire',
      year: 'UC 487 · RC 796',
      cols: 13,
      rows: 9,
      desc: 'RC 796. The Alliance invasion has outrun its supplies. Strike back and take the Alliance base at Amritsar.',
      objective: { type: 'capture', stations: ['Amritsar'], turns: 16, stars: [10, 13] },
      win: 'Amritsar falls. The invasion of the Empire is over.',
      timeout: 'The Alliance held Amritsar long enough to withdraw.',
      layout: {
        owners: ['empire', 'alliance'],
        split: 7,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Imperial Rally', 0, 4, 'empire', 2, true, false],
          ['Amritsar', 10, 4, 'alliance', 2, false, false, 260],
          ['Alliance Depot', 12, 1, 'alliance', 1, false, false],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['empire', 'flagship', 1, 4, 1, 'reinhard'],
          ['empire', 'heavy', 3, 3, 2, 'mittermeyer'],
          ['empire', 'battleship', 3, 5, 2, 'reuenthal'],
          ['empire', 'frigate', 2, 2, 2, 'kircheis'],
          ['empire', 'heavy', 2, 6, 1],
          ['empire', 'light', 4, 4, 2],
          ['empire', 'missile', 1, 3, 1],
          ['empire', 'siege', 1, 5, 1],
          ['empire', 'corvette', 4, 2, 2],
          ['empire', 'destroyer', 4, 6, 1],
          ['alliance', 'heavy', 9, 3, 2],
          ['alliance', 'heavy', 9, 5, 1],
          ['alliance', 'battleship', 10, 5, 1],
          ['alliance', 'light', 8, 4, 2],
          ['alliance', 'beam', 10, 3, 2],
          ['alliance', 'missile', 11, 4, 1],
          ['alliance', 'corvette', 8, 2, 1],
          ['alliance', 'corvette', 8, 6, 1],
          ['alliance', 'frigate', 11, 5, 1],
          ['alliance', 'destroyer', 9, 7, 1],
        ],
        economy: { empire: [220, 90], alliance: [100, 40] },
      },
    },
    geiersburg: {
      name: 'Eighth Battle of Iserlohn',
      side: 'empire',
      year: 'UC 489 · RC 798',
      cols: 12,
      rows: 9,
      desc: 'UC 489. The fortress Geiersburg has been warped to the corridor. Use its main gun to break Iserlohn’s defenders, then take the fortress.',
      objective: { type: 'capture', stations: ['Iserlohn'], turns: 18, stars: [11, 15] },
      win: 'Iserlohn falls to the fortress-versus-fortress gambit.',
      timeout: 'Alliance reinforcements arrived. The gambit failed.',
      retired: ['kircheis'],
      layout: {
        owners: ['empire', 'alliance'],
        split: 6,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Geiersburg', 3, 4, 'empire', 3, false, true],
          ['Iserlohn', 9, 4, 'alliance', 3, false, true],
          ['Corridor Outpost', 10, 1, 'alliance', 1, false, false],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['empire', 'battleship', 4, 3, 2],
          ['empire', 'heavy', 4, 5, 2],
          ['empire', 'heavy', 2, 3, 1],
          ['empire', 'light', 5, 4, 2],
          ['empire', 'siege', 2, 5, 1],
          ['empire', 'missile', 2, 4, 1],
          ['empire', 'beam', 4, 6, 1],
          ['empire', 'corvette', 5, 2, 2],
          ['empire', 'frigate', 5, 6, 2],
          ['empire', 'destroyer', 1, 4, 1],
          ['alliance', 'battleship', 8, 3, 1],
          ['alliance', 'heavy', 8, 5, 2],
          ['alliance', 'light', 7, 4, 2],
          ['alliance', 'beam', 9, 3, 2],
          ['alliance', 'missile', 9, 5, 1],
          ['alliance', 'corvette', 7, 2, 1],
          ['alliance', 'corvette', 7, 6, 1],
          ['alliance', 'frigate', 10, 4, 1],
          ['alliance', 'heavy', 10, 5, 1],
        ],
        economy: { empire: [220, 90], alliance: [140, 60] },
      },
    },
    ragnarok_e: {
      name: 'Operation Ragnarök',
      side: 'empire',
      year: 'UC 489 · RC 798',
      cols: 13,
      rows: 9,
      desc: 'UC 489. Mittermeyer drives through the Fezzan corridor while the Alliance rushes a task force to stop him. Seize Fezzan.',
      objective: { type: 'capture', stations: ['Fezzan'], turns: 14, stars: [8, 11] },
      win: 'Fezzan is in Imperial hands. The road to Heinessen is open.',
      timeout: 'The Alliance sealed the Fezzan corridor.',
      retired: ['kircheis'],
      layout: {
        owners: ['empire', 'alliance'],
        split: 6,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Imperial Staging', 0, 4, 'empire', 2, true, false],
          ['Fezzan', 8, 4, 'neutral', 2, false, false, 200],
          ['Alliance Gate', 12, 4, 'alliance', 2, false, false],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['empire', 'heavy', 2, 4, 2, 'mittermeyer'],
          ['empire', 'flagship', 1, 5, 1, 'reinhard'],
          ['empire', 'battleship', 2, 6, 1],
          ['empire', 'heavy', 3, 3, 2],
          ['empire', 'light', 3, 5, 2],
          ['empire', 'destroyer', 4, 4, 2],
          ['empire', 'beam', 1, 3, 2],
          ['empire', 'missile', 1, 4, 1],
          ['empire', 'corvette', 4, 2, 2],
          ['neutral', 'heavy', 8, 3, 1, null, 'empire'],
          ['neutral', 'light', 8, 5, 1, null, 'empire'],
          ['alliance', 'heavy', 11, 3, 2],
          ['alliance', 'heavy', 11, 5, 2],
          ['alliance', 'battleship', 12, 5, 1],
          ['alliance', 'light', 10, 4, 2],
          ['alliance', 'beam', 12, 3, 1],
          ['alliance', 'missile', 11, 6, 1],
          ['alliance', 'corvette', 10, 2, 1],
          ['alliance', 'destroyer', 10, 6, 1],
        ],
        economy: { empire: [240, 90], alliance: [180, 70] },
      },
    },
    vermilion_e: {
      name: 'Vermilion: Hold the Line',
      side: 'empire',
      year: 'UC 490 · RC 799',
      cols: 13,
      rows: 9,
      desc: 'UC 490. Yang has caught Brünhild with a thin screen. Keep Reinhard alive until Mittermeyer arrives.',
      objective: { type: 'survive', admiral: 'reinhard', turns: 12 },
      win: 'Mittermeyer’s fleet arrives. Brünhild is saved.',
      timeout: 'Brünhild has been destroyed.',
      retired: ['kircheis'],
      layout: {
        owners: ['empire', 'alliance'],
        split: 7,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Brünhild Anchorage', 0, 4, 'empire', 2, true, false],
          ['Alliance Forward', 12, 4, 'alliance', 1, true, false],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['empire', 'flagship', 1, 4, 1, 'reinhard'],
          ['empire', 'heavy', 2, 3, 2],
          ['empire', 'heavy', 2, 5, 2],
          ['empire', 'battleship', 3, 4, 1],
          ['empire', 'light', 3, 2, 2],
          ['empire', 'light', 3, 6, 2],
          ['empire', 'beam', 1, 3, 1],
          ['empire', 'missile', 1, 5, 1],
          ['empire', 'corvette', 4, 3, 1],
          ['empire', 'corvette', 4, 5, 1],
          ['empire', 'destroyer', 2, 4, 1],
          ['alliance', 'flagship', 10, 4, 1, 'yang'],
          ['alliance', 'heavy', 9, 3, 2, 'attenborough'],
          ['alliance', 'light', 9, 5, 2, 'fischer'],
          ['alliance', 'heavy', 10, 3, 1],
          ['alliance', 'heavy', 10, 5, 1],
          ['alliance', 'missile', 11, 4, 1],
          ['alliance', 'beam', 11, 3, 2],
          ['alliance', 'corvette', 8, 4, 2],
          ['alliance', 'destroyer', 9, 4, 1],
        ],
        economy: { empire: [120, 40], alliance: [200, 80] },
      },
    },
    rantemario: {
      name: 'Battle of Rantemario',
      side: 'empire',
      year: 'UC 490 · RC 799',
      cols: 13,
      rows: 9,
      desc: 'UC 490. The last Alliance main fleet makes its stand before Heinessen. Destroy it and the war is won.',
      objective: { type: 'destroy', turns: 15, stars: [9, 12] },
      win: 'The Alliance main fleet is gone. Heinessen lies open.',
      timeout: 'The Alliance fleet withdrew to fight again.',
      retired: ['kircheis'],
      layout: {
        owners: ['empire', 'alliance'],
        split: 7,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Imperial Vanguard', 0, 4, 'empire', 2, true, false],
          ['Rantemario', 12, 4, 'alliance', 2, true, false],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['empire', 'flagship', 1, 4, 1, 'reinhard'],
          ['empire', 'heavy', 2, 2, 2, 'mittermeyer'],
          ['empire', 'battleship', 2, 6, 2, 'reuenthal'],
          ['empire', 'heavy', 3, 3, 2],
          ['empire', 'heavy', 3, 5, 2],
          ['empire', 'light', 4, 4, 2],
          ['empire', 'missile', 1, 2, 1],
          ['empire', 'siege', 1, 6, 1],
          ['empire', 'beam', 2, 4, 2],
          ['empire', 'corvette', 4, 2, 2],
          ['empire', 'destroyer', 4, 6, 1],
          ['alliance', 'battleship', 10, 4, 2],
          ['alliance', 'heavy', 9, 3, 2],
          ['alliance', 'heavy', 9, 5, 2],
          ['alliance', 'light', 8, 4, 2],
          ['alliance', 'missile', 11, 3, 1],
          ['alliance', 'beam', 11, 5, 2],
          ['alliance', 'corvette', 8, 2, 1],
          ['alliance', 'corvette', 8, 6, 1],
          ['alliance', 'frigate', 10, 2, 1],
          ['alliance', 'destroyer', 10, 6, 1],
          ['alliance', 'heavy', 11, 4, 1],
        ],
        economy: { empire: [200, 80], alliance: [180, 70] },
      },
    },
    corridor_e: {
      name: 'Battle of the Corridor',
      side: 'empire',
      year: 'UC 491 · RC 800',
      cols: 13,
      rows: 9,
      desc: 'UC 491. Yang holds the Iserlohn corridor with the last free fleet. Break through and destroy Hyperion.',
      objective: { type: 'kill', admiral: 'yang', turns: 18, stars: [11, 15] },
      win: 'Hyperion is destroyed. The corridor belongs to the Empire.',
      timeout: 'Yang held the corridor. The campaign stalls.',
      retired: ['kircheis'],
      layout: {
        owners: ['empire', 'alliance'],
        split: 7,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Imperial Front', 0, 4, 'empire', 3, true, false],
          ['Iserlohn', 11, 4, 'alliance', 3, false, true],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['empire', 'flagship', 1, 4, 1, 'reinhard'],
          ['empire', 'heavy', 2, 3, 2, 'mittermeyer'],
          ['empire', 'battleship', 2, 5, 2, 'reuenthal'],
          ['empire', 'battleship', 3, 4, 1],
          ['empire', 'heavy', 3, 2, 2],
          ['empire', 'heavy', 3, 6, 2],
          ['empire', 'siege', 1, 3, 1],
          ['empire', 'siege', 1, 5, 1],
          ['empire', 'missile', 2, 7, 1],
          ['empire', 'light', 4, 3, 2],
          ['empire', 'light', 4, 5, 2],
          ['empire', 'corvette', 4, 1, 2],
          ['empire', 'destroyer', 4, 7, 1],
          ['alliance', 'flagship', 10, 4, 1, 'yang'],
          ['alliance', 'heavy', 9, 3, 2, 'attenborough'],
          ['alliance', 'light', 9, 5, 2, 'fischer'],
          ['alliance', 'frigate', 10, 5, 2, 'schonkopf'],
          ['alliance', 'heavy', 10, 3, 1],
          ['alliance', 'beam', 11, 3, 2],
          ['alliance', 'missile', 11, 5, 1],
          ['alliance', 'corvette', 8, 4, 2],
          ['alliance', 'destroyer', 9, 4, 1],
          ['alliance', 'battleship', 12, 4, 1],
        ],
        economy: { empire: [260, 100], alliance: [160, 60] },
      },
    },
    astarte_a: {
      name: 'Astarte: The Second Fleet',
      side: 'alliance',
      year: 'UC 487 · RC 796',
      cols: 13,
      rows: 9,
      desc: 'RC 796. The 2nd Fleet’s commander is down and Reinhard is closing in. Take command and keep Yang alive until the fleet can withdraw.',
      objective: { type: 'survive', admiral: 'yang', turns: 10 },
      win: 'The 2nd Fleet fought Reinhard to a standstill and withdrew intact.',
      timeout: 'Yang’s flagship has been destroyed.',
      layout: {
        owners: ['alliance', 'empire'],
        split: 6,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Second Fleet Rally', 0, 4, 'alliance', 1, true, false],
          ['Imperial Picket', 12, 4, 'empire', 1, false, false],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['alliance', 'flagship', 1, 4, 1, 'yang'],
          ['alliance', 'heavy', 2, 3, 2],
          ['alliance', 'heavy', 2, 5, 1],
          ['alliance', 'light', 3, 4, 2],
          ['alliance', 'beam', 1, 3, 1],
          ['alliance', 'missile', 1, 5, 1],
          ['alliance', 'corvette', 3, 2, 1],
          ['alliance', 'corvette', 3, 6, 1],
          ['alliance', 'destroyer', 2, 7, 1],
          ['empire', 'flagship', 10, 4, 1, 'reinhard'],
          ['empire', 'frigate', 9, 3, 2, 'kircheis'],
          ['empire', 'heavy', 9, 5, 2],
          ['empire', 'battleship', 10, 5, 1],
          ['empire', 'light', 8, 3, 2],
          ['empire', 'light', 8, 5, 2],
          ['empire', 'beam', 10, 3, 2],
          ['empire', 'missile', 11, 4, 1],
          ['empire', 'corvette', 8, 4, 2],
          ['empire', 'destroyer', 11, 5, 1],
        ],
        economy: { alliance: [120, 40], empire: [180, 70] },
      },
    },
    iserlohn_def: {
      name: 'Defense of Iserlohn',
      side: 'alliance',
      year: 'UC 489 · RC 798',
      cols: 12,
      rows: 9,
      desc: 'RC 798. The Empire has warped the fortress Geiersburg into the corridor. Hold Iserlohn until Yang returns.',
      objective: { type: 'hold', stations: ['Iserlohn'], turns: 12 },
      win: 'Iserlohn holds. Geiersburg’s gambit has failed.',
      timeout: 'Iserlohn has fallen.',
      retired: ['kircheis'],
      layout: {
        owners: ['alliance', 'empire'],
        split: 6,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Iserlohn', 3, 4, 'alliance', 3, false, true],
          ['Corridor Depot', 0, 1, 'alliance', 1, false, false],
          ['Geiersburg', 9, 4, 'empire', 3, false, true],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['alliance', 'heavy', 4, 3, 2, 'attenborough'],
          ['alliance', 'light', 4, 5, 2, 'fischer'],
          ['alliance', 'frigate', 3, 5, 2, 'schonkopf'],
          ['alliance', 'heavy', 4, 4, 1],
          ['alliance', 'beam', 2, 3, 2],
          ['alliance', 'missile', 2, 5, 1],
          ['alliance', 'corvette', 5, 4, 2],
          ['alliance', 'destroyer', 3, 3, 1],
          ['alliance', 'battleship', 2, 4, 1],
          ['empire', 'battleship', 8, 3, 2],
          ['empire', 'heavy', 8, 5, 2],
          ['empire', 'heavy', 7, 4, 2],
          ['empire', 'light', 7, 2, 2],
          ['empire', 'light', 7, 6, 2],
          ['empire', 'siege', 9, 3, 1],
          ['empire', 'missile', 9, 5, 1],
          ['empire', 'beam', 10, 4, 2],
          ['empire', 'corvette', 6, 4, 2],
          ['empire', 'frigate', 8, 7, 1],
          ['empire', 'destroyer', 8, 1, 1],
        ],
        economy: { alliance: [180, 70], empire: [220, 90] },
      },
    },
    maradetta: {
      name: 'Battle of Mar-Adetta',
      side: 'alliance',
      year: 'UC 491 · RC 800',
      cols: 13,
      rows: 9,
      desc: 'RC 800. The Alliance’s last fleet stands at Mar-Adetta against Reinhard’s armada. Make the Empire pay for every hex and survive.',
      objective: { type: 'survive', turns: 12 },
      win: 'The old guard held. The Empire pays dearly for Mar-Adetta.',
      timeout: 'The last Alliance fleet is gone.',
      retired: ['kircheis'],
      layout: {
        owners: ['alliance', 'empire'],
        split: 7,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Mar-Adetta', 0, 4, 'alliance', 2, true, false],
          ['Imperial Grand Fleet', 12, 1, 'empire', 2, false, false],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['alliance', 'battleship', 1, 4, 2],
          ['alliance', 'heavy', 2, 3, 2],
          ['alliance', 'heavy', 2, 5, 2],
          ['alliance', 'light', 3, 4, 2],
          ['alliance', 'beam', 1, 3, 1],
          ['alliance', 'missile', 1, 5, 1],
          ['alliance', 'corvette', 3, 2, 2],
          ['alliance', 'corvette', 3, 6, 2],
          ['alliance', 'destroyer', 2, 7, 1],
          ['alliance', 'frigate', 2, 1, 1],
          ['empire', 'flagship', 11, 4, 1, 'reinhard'],
          ['empire', 'heavy', 10, 3, 2, 'mittermeyer'],
          ['empire', 'battleship', 10, 5, 2, 'reuenthal'],
          ['empire', 'heavy', 9, 2, 2],
          ['empire', 'heavy', 9, 6, 2],
          ['empire', 'light', 9, 4, 2],
          ['empire', 'missile', 11, 3, 1],
          ['empire', 'siege', 11, 5, 1],
          ['empire', 'beam', 12, 4, 2],
          ['empire', 'corvette', 8, 3, 2],
          ['empire', 'corvette', 8, 5, 2],
          ['empire', 'destroyer', 10, 7, 1],
        ],
        economy: { alliance: [150, 60], empire: [220, 90] },
      },
    },
    corridor_a: {
      name: 'Battle of the Corridor',
      side: 'alliance',
      year: 'UC 491 · RC 800',
      cols: 13,
      rows: 9,
      desc: 'RC 800. Reinhard’s whole armada comes for Iserlohn. Hold the fortress and keep the fleet alive.',
      objective: { type: 'hold', stations: ['Iserlohn'], turns: 14 },
      win: 'Iserlohn stands. Reinhard agrees to talk.',
      timeout: 'Iserlohn has fallen.',
      retired: ['kircheis'],
      layout: {
        owners: ['alliance', 'empire'],
        split: 7,
        // [name, c, r, owner, tier, capital, fort, shield]
        stations: [
          ['Iserlohn', 2, 4, 'alliance', 3, false, true],
          ['Imperial Front', 12, 1, 'empire', 3, true, false],
        ],
        // [side, type, c, r, stack, admiral, art]
        units: [
          ['alliance', 'flagship', 3, 4, 1, 'yang'],
          ['alliance', 'heavy', 3, 3, 2, 'attenborough'],
          ['alliance', 'light', 3, 5, 2, 'fischer'],
          ['alliance', 'frigate', 4, 4, 2, 'schonkopf'],
          ['alliance', 'heavy', 2, 3, 1],
          ['alliance', 'beam', 1, 3, 2],
          ['alliance', 'missile', 1, 5, 1],
          ['alliance', 'battleship', 2, 5, 1],
          ['alliance', 'corvette', 4, 2, 1],
          ['alliance', 'destroyer', 4, 6, 1],
          ['empire', 'flagship', 11, 4, 1, 'reinhard'],
          ['empire', 'heavy', 10, 3, 2, 'mittermeyer'],
          ['empire', 'battleship', 10, 5, 2, 'reuenthal'],
          ['empire', 'battleship', 9, 4, 2],
          ['empire', 'heavy', 9, 2, 2],
          ['empire', 'heavy', 9, 6, 2],
          ['empire', 'siege', 11, 3, 1],
          ['empire', 'siege', 11, 5, 1],
          ['empire', 'missile', 12, 4, 1],
          ['empire', 'light', 8, 3, 2],
          ['empire', 'light', 8, 5, 2],
          ['empire', 'corvette', 8, 1, 2],
          ['empire', 'destroyer', 8, 7, 1],
        ],
        economy: { alliance: [200, 80], empire: [260, 100] },
      },
    },
  };
  // WC4-style campaigns: each side plays its chapters in order; a chapter unlocks when the previous one is won.
  const CAMPAIGNS = {
    empire: ['tiamat', 'astarte', 'amritsar_e', 'geiersburg', 'ragnarok_e', 'vermilion_e', 'rantemario', 'corridor_e'],
    alliance: ['astarte_a', 'iserlohn', 'amritsar', 'iserlohn_def', 'vermilion', 'maradetta', 'corridor_a'],
  };
  // Operation difficulty, as in WC4. Normal is the operation as designed. Hard gives every enemy side all tier I–II
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
    const def = scen ? SCENARIOS[scen] : null;
    if (def?.side) player = def.side;
    const g = {
      version: 2,
      rulesVersion: 10,
      player,
      difficulty,
      mode: era ? 'conquest' : scen,
      era,
      objective: def ? { ...def.objective } : null,
      retired: (era && ERAS[era].retired) || def?.retired || [],
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
      tech: { empire: {}, alliance: {}, neutral: {} },
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
      if (e.credits - repairCost(u, g) >= 60) repair(g, u.id);
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
        if (TYPES[u.type].air && !airSupplied(g, u.side, p)) sc -= 80;
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
    for (let chain = 0; chain < 8 && !u.attacked && !g.over; chain++) {
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
    recruited,
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
