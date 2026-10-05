/* Synthesized combat audio (Web Audio API): no sound files to load. */
const SFX = (() => {
  const KEY = 'galactic-command-sound';
  let ac = null,
    master = null,
    noiseBuffer = null,
    enabled = true;
  try {
    enabled = localStorage.getItem(KEY) !== 'off';
  } catch (e) {}
  function ensure() {
    if (!enabled) return null;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    if (!ac) {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.5;
      const limiter = ac.createDynamicsCompressor();
      master.connect(limiter);
      limiter.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  function noise() {
    if (!noiseBuffer) {
      noiseBuffer = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
      const d = noiseBuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ac.createBufferSource();
    s.buffer = noiseBuffer;
    return s;
  }
  function envelope(g, t, attack, peak, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  function tone(t, wave, f0, f1, dur, peak) {
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    envelope(g, t, 0.005, peak, dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function burst(t, filter, f0, f1, dur, peak, q = 1) {
    const n = noise(),
      f = ac.createBiquadFilter(),
      g = ac.createGain();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    envelope(g, t, 0.01, peak, dur);
    n.connect(f);
    f.connect(g);
    g.connect(master);
    n.start(t);
    n.stop(t + dur + 0.05);
  }
  // Imperial weapons ring brighter and cleaner; Alliance weapons sit lower and grittier.
  const voice = side =>
    side === 'empire'
      ? { pitch: 1.1, wave: 'triangle', grit: 'sine' }
      : { pitch: 0.92, wave: 'sawtooth', grit: 'square' };
  const sounds = {
    // Light escorts: sharp, high-pitched twin laser bolts.
    laser(t, v) {
      for (let i = 0; i < 2; i++) {
        tone(t + i * 0.09, v.wave, 2300 * v.pitch, 380 * v.pitch, 0.13, 0.2);
        tone(t + i * 0.09, 'sine', 3400 * v.pitch, 950 * v.pitch, 0.08, 0.08);
      }
    },
    // Cruisers: mid-weight cannon bark.
    cannon(t, v) {
      tone(t, v.grit, 260 * v.pitch, 70, 0.22, 0.35);
      burst(t, 'lowpass', 2400, 300, 0.2, 0.3);
    },
    // Battleships and dreadnoughts: heavy bass railgun thud with a metallic crack.
    railgun(t, v) {
      tone(t, 'square', 1900 * v.pitch, 1200, 0.03, 0.08);
      tone(t, 'sine', 120 * v.pitch, 30, 0.6, 0.9);
      tone(t, v.grit, 75 * v.pitch, 28, 0.45, 0.32);
      burst(t, 'lowpass', 900, 70, 0.55, 0.55);
    },
    // Artillery cruisers: multi-burst rocket WHOOSH, then the impacts.
    rockets(t, v) {
      for (let i = 0; i < 4; i++) {
        const s = t + i * 0.085;
        burst(s, 'bandpass', 500 * v.pitch, 3400 * v.pitch, 0.3, 0.3, 2.5);
        burst(s + 0.28, 'lowpass', 1600, 180, 0.2, 0.22);
      }
    },
    // Artillery frigates: humming neutron beam.
    beam(t, v) {
      const o = ac.createOscillator(),
        lfo = ac.createOscillator(),
        depth = ac.createGain(),
        g = ac.createGain();
      o.type = v.wave;
      o.frequency.value = 230 * v.pitch;
      lfo.frequency.value = 28;
      depth.gain.value = 18;
      lfo.connect(depth);
      depth.connect(o.frequency);
      envelope(g, t, 0.03, 0.22, 0.45);
      o.connect(g);
      g.connect(master);
      o.start(t);
      lfo.start(t);
      o.stop(t + 0.55);
      lfo.stop(t + 0.55);
      tone(t, 'sine', 1760 * v.pitch, 2640 * v.pitch, 0.4, 0.06);
    },
    // Siege cannons: enormous spinal-cannon boom.
    siege(t, v) {
      tone(t, 'sine', 90 * v.pitch, 22, 0.95, 1);
      tone(t, v.grit, 180 * v.pitch, 40, 0.35, 0.3);
      burst(t, 'lowpass', 1400, 50, 0.95, 0.8);
    },
    // Fortress main gun: rising charge, then a world-shaking blast.
    thor(t) {
      tone(t, 'sawtooth', 160, 1500, 0.55, 0.16);
      tone(t + 0.55, 'sine', 70, 18, 1.3, 1);
      burst(t + 0.55, 'lowpass', 2800, 45, 1.3, 0.9);
      burst(t + 0.55, 'highpass', 3200, 700, 0.45, 0.22);
    },
    explosion(t) {
      burst(t, 'lowpass', 1800, 80, 0.65, 0.6);
      tone(t, 'sine', 85, 28, 0.55, 0.5);
    },
    crit(t) {
      tone(t, 'square', 1400, 1400, 0.06, 0.1);
      tone(t + 0.06, 'square', 2100, 2100, 0.09, 0.1);
    },
  };
  const WEAPON = {
    corvette: 'laser',
    frigate: 'laser',
    destroyer: 'laser',
    light: 'cannon',
    heavy: 'cannon',
    battleship: 'railgun',
    flagship: 'railgun',
    beam: 'beam',
    missile: 'rockets',
    siege: 'siege',
  };
  // Browsers only start audio after a user gesture.
  if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.addEventListener)
    window.addEventListener('pointerdown', () => ensure(), { once: true });
  return {
    get enabled() {
      return enabled;
    },
    toggle() {
      enabled = !enabled;
      try {
        localStorage.setItem(KEY, enabled ? 'on' : 'off');
      } catch (e) {}
      if (enabled) ensure();
      return enabled;
    },
    weapon: type => WEAPON[type] || 'cannon',
    play(name, side = 'alliance', delay = 0) {
      const c = ensure();
      if (!c || !sounds[name]) return;
      try {
        sounds[name](c.currentTime + 0.01 + delay, voice(side));
      } catch (e) {}
    },
  };
})();
