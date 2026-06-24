// Minimal WebAudio kit. iOS-safe per instant-play audio rules:
//   • AudioContext lazily created on first user gesture
//   • resume() called once
//   • a single noise buffer pre-allocated; no per-voice createBuffer()
//   • no per-pointermove audio — only discrete events (drop / seal / hang)

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let resumed = false;
let muted = false;

function ensure() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 0.5);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
}

export function unlockAudio() {
  ensure();
  if (ctx && !resumed) {
    ctx.resume().catch(() => {});
    resumed = true;
  }
}

export function setMuted(m: boolean) {
  muted = m;
}

function ready(): boolean {
  return !!ctx && !!master && ctx.state === 'running' && !muted;
}

// soft water "bloop" — pitch falls as the ring blooms
export function playDrop(pitch = 1) {
  if (!ready()) return;
  const c = ctx!;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(520 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(190 * pitch, t + 0.18);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
  o.connect(g);
  g.connect(master!);
  o.start(t);
  o.stop(t + 0.3);
}

// wax-seal press — a low thunk + a short damped click
export function playSeal() {
  if (!ready()) return;
  const c = ctx!;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.16);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g);
  g.connect(master!);
  o.start(t);
  o.stop(t + 0.36);

  const src = c.createBufferSource();
  src.buffer = noise!;
  const ng = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  ng.gain.setValueAtTime(0.28, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  src.connect(lp);
  lp.connect(ng);
  ng.connect(master!);
  src.start(t);
  src.stop(t + 0.14);
}

// paper "hang it" — airy filtered swell
export function playHang() {
  if (!ready()) return;
  const c = ctx!;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise!;
  const ng = c.createGain();
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2200;
  bp.Q.value = 0.7;
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  src.connect(bp);
  bp.connect(ng);
  ng.connect(master!);
  src.start(t);
  src.stop(t + 0.42);
}
