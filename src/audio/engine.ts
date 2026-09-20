"use client";

/**
 * Procedural WebAudio: every sound is synthesized, no audio files.
 * The AudioContext is created lazily on the first user gesture (browser autoplay policy).
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let sfxOn = true;
let musicOn = false;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    const warm = ctx.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = 9000;
    master.connect(warm).connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxOn ? 1 : 0;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);
    const len = ctx.sampleRate;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

/** Call from a user gesture (pointerdown/keydown) to allow sound. */
export function unlockAudio(): void {
  const c = ensure();
  if (c && c.state === "suspended") void c.resume();
  if (musicOn) startMusic();
}

export function setSfxEnabled(on: boolean): void {
  sfxOn = on;
  if (sfxBus && ctx) sfxBus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.02);
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  dur?: number;
  gain?: number;
  attack?: number;
  slideTo?: number;
  delay?: number;
  bus?: GainNode | null;
  lowpass?: number;
}

function tone(o: ToneOpts): void {
  const c = ensure();
  if (!c) return;
  const bus = o.bus ?? sfxBus;
  if (!bus) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.15;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
  const peak = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node: AudioNode = osc;
  if (o.lowpass) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.lowpass;
    osc.connect(f);
    node = f;
  }
  node.connect(g).connect(bus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, gain: number, freq: number, bus: GainNode | null, delay = 0, type: BiquadFilterType = "highpass"): void {
  const c = ensure();
  if (!c || !noiseBuffer || !bus) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
/** Major pentatonic degrees, used for line-complete chimes so streaks climb musically. */
const PENTATONIC = [0, 2, 4, 7, 9];

export const sfx = {
  fill() {
    tone({ freq: 420 * (0.97 + Math.random() * 0.06), slideTo: 250, type: "sine", dur: 0.09, gain: 0.22 });
    noise(0.03, 0.05, 1800, sfxBus, 0, "bandpass");
  },
  cross() {
    tone({ freq: 900, slideTo: 700, type: "triangle", dur: 0.06, gain: 0.12 });
  },
  erase() {
    tone({ freq: 300, slideTo: 520, type: "sine", dur: 0.08, gain: 0.14 });
  },
  /** Rising chime; `streak` (1, 2, 3, …) climbs the pentatonic scale. */
  line(streak: number) {
    const s = Math.max(0, streak - 1);
    const note = 72 + PENTATONIC[s % 5] + 12 * Math.min(2, Math.floor(s / 5));
    tone({ freq: midi(note), type: "sine", dur: 0.5, gain: 0.2, attack: 0.008 });
    tone({ freq: midi(note + 12), type: "triangle", dur: 0.35, gain: 0.07, delay: 0.03 });
    tone({ freq: midi(note + 7), type: "sine", dur: 0.4, gain: 0.08, delay: 0.09 });
  },
  mistake() {
    tone({ freq: 160, slideTo: 90, type: "square", dur: 0.22, gain: 0.12, lowpass: 700 });
    tone({ freq: 118, slideTo: 80, type: "sawtooth", dur: 0.25, gain: 0.08, lowpass: 500 });
  },
  hint() {
    tone({ freq: midi(84), type: "sine", dur: 0.25, gain: 0.14 });
    tone({ freq: midi(91), type: "sine", dur: 0.35, gain: 0.12, delay: 0.09 });
  },
  check() {
    tone({ freq: midi(76), type: "triangle", dur: 0.2, gain: 0.12 });
  },
  ui() {
    tone({ freq: 620, slideTo: 520, type: "sine", dur: 0.05, gain: 0.1 });
  },
  victory() {
    // C major fanfare: arpeggio up, then a shimmering chord.
    const seq = [72, 76, 79, 84];
    seq.forEach((n, i) => {
      tone({ freq: midi(n), type: "triangle", dur: 0.28, gain: 0.16, delay: i * 0.12 });
      tone({ freq: midi(n + 12), type: "sine", dur: 0.22, gain: 0.05, delay: i * 0.12 });
    });
    [72, 76, 79, 84, 88].forEach((n) => tone({ freq: midi(n), type: "sine", dur: 1.4, gain: 0.09, delay: 0.55, attack: 0.02 }));
    [96, 100, 103].forEach((n, i) => tone({ freq: midi(n), type: "sine", dur: 0.5, gain: 0.05, delay: 0.75 + i * 0.09 }));
  },
  fail() {
    [67, 64, 60, 55].forEach((n, i) => tone({ freq: midi(n), type: "triangle", dur: 0.35, gain: 0.14, delay: i * 0.16, lowpass: 1200 }));
  },
};

/* ---------------- Soft lo-fi music ---------------- */

const CHORDS: number[][] = [
  [60, 64, 67, 71],
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [55, 59, 62, 65],
];
const BASS = [36, 33, 29, 31];
const MELODY = [72, 74, 76, 79, 81, 84];
const BPM = 68;
const BEAT = 60 / BPM;

let musicTimer: ReturnType<typeof setInterval> | null = null;
let nextBeatTime = 0;
let beatCount = 0;
let melodySeed = 7;

function rnd(): number {
  melodySeed = (melodySeed * 1664525 + 1013904223) >>> 0;
  return melodySeed / 4294967296;
}

function scheduleBeat(time: number, beat: number): void {
  const c = ctx;
  const bus = musicBus;
  if (!c || !bus) return;
  const bar = Math.floor(beat / 4) % CHORDS.length;
  const inBar = beat % 4;
  const delay = time - c.currentTime;
  if (inBar === 0) {
    for (const n of CHORDS[bar]) {
      tone({ freq: midi(n), type: "triangle", dur: BEAT * 4.2, gain: 0.03, attack: 0.5, delay, bus, lowpass: 1100 });
      tone({ freq: midi(n + 12), type: "sine", dur: BEAT * 4, gain: 0.012, attack: 0.7, delay, bus });
    }
  }
  if (inBar === 0 || inBar === 2) {
    tone({ freq: midi(BASS[bar]), type: "sine", dur: BEAT * 1.6, gain: 0.09, attack: 0.02, delay, bus });
    tone({ freq: 70, slideTo: 40, type: "sine", dur: 0.18, gain: 0.07, delay, bus });
  }
  if (inBar === 1 || inBar === 3) noise(0.05, 0.018, 7000, bus, delay + 0.02);
  if (rnd() < 0.42) {
    const n = MELODY[Math.floor(rnd() * MELODY.length)];
    tone({ freq: midi(n), type: "triangle", dur: BEAT * 1.2, gain: 0.028, attack: 0.03, delay: delay + (rnd() < 0.5 ? 0.04 : 0), bus, lowpass: 2200 });
  }
}

function pump(): void {
  const c = ctx;
  if (!c) return;
  while (nextBeatTime < c.currentTime + 0.6) {
    scheduleBeat(nextBeatTime, beatCount);
    nextBeatTime += BEAT;
    beatCount++;
  }
}

function startMusic(): void {
  const c = ensure();
  if (!c || !musicBus || musicTimer) return;
  musicBus.gain.cancelScheduledValues(c.currentTime);
  musicBus.gain.setTargetAtTime(0.9, c.currentTime, 0.6);
  nextBeatTime = c.currentTime + 0.1;
  beatCount = 0;
  musicTimer = setInterval(pump, 120);
  pump();
}

function stopMusic(): void {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  if (ctx && musicBus) musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
}

export function setMusicEnabled(on: boolean): void {
  musicOn = on;
  if (on) {
    if (ctx) startMusic();
  } else stopMusic();
}

/* ---------------- Haptics ---------------- */

let hapticsOn = true;
export function setHapticsEnabled(on: boolean): void {
  hapticsOn = on;
}

export function vibrate(pattern: number | number[]): void {
  if (!hapticsOn || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw without a recent user gesture */
  }
}

export const haptics = {
  fill: () => vibrate(8),
  cross: () => vibrate(5),
  erase: () => vibrate(4),
  line: () => vibrate([12, 30, 14]),
  mistake: () => vibrate([45, 35, 45]),
  hint: () => vibrate(15),
  win: () => vibrate([20, 40, 20, 40, 90]),
  fail: () => vibrate([80, 40, 120]),
};
