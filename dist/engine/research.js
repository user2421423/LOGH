/* Galactic Command research data. Data-only module loaded before engine.js. */
(function (root) {
  'use strict';
  const BRANCHES = { Escort: 'escort', 'Battle Line': 'line', Artillery: 'artillery', Air: 'air' };
  const BRANCH_NAMES = { escort: 'Escort', line: 'Battle Line', artillery: 'Artillery', air: 'Aerospace' };
  // Every rating an admiral holds: the four branches and Movement.
  const RATING_NAMES = { ...BRANCH_NAMES, move: 'Movement' };
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
      desc: 'Unlimited paid fighter, bomber and strategic-bomber sorties launched directly from upgraded station air bases.',
      nodes: {
        guns: {
          name: 'Avionics',
          values: [0.06, 0.12, 0.2, 0.28, 0.38],
          tiers: [1, 1, 2, 3, 4],
          costs: [50, 100, 180, 300, 440],
          text: v => `+${pct(v)} damage`,
        },
        hull: {
          name: 'Armor-Piercing Munitions',
          values: [0.05, 0.1, 0.15],
          tiers: [1, 2, 3],
          costs: [40, 100, 200],
          text: v => `+${pct(v)} armor penetration for station-launched airstrikes`,
        },
        fuel: {
          name: 'Fuel Cells',
          values: [0.05, 0.1, 0.15],
          tiers: [1, 2, 3],
          costs: [60, 120, 220],
          text: v => `Airstrikes cost ${pct(v)} less each launch`,
        },
        carrier: {
          name: 'Long-Range Sorties',
          values: [1, 2],
          tiers: [2, 3],
          costs: [140, 260],
          text: v => v === 1 ? '+2 sortie range from all air bases' : '+3 total sortie range from all air bases',
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
          text: v => `+${pct(v)} damage against enemy fleets from precision targeting`,
        },
        stealth: {
          name: 'Electronic Warfare',
          values: [0.2],
          tiers: [4],
          costs: [380],
          req: ['guidance', 1],
          text: v => `+${pct(v)} damage from launched sorties`,
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

  Object.assign((root.GalacticData ||= {}), { BRANCHES, BRANCH_NAMES, RATING_NAMES, TECH_TIERS, TECH_TREE, TECH_NODES, TECHS });
})(typeof window !== 'undefined' ? window : globalThis);
