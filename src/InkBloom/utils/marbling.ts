// Vector marbling engine (suminagashi / paper-marbling math).
//
// Ink is stored as filled polygons. Two area-preserving operations recreate the
// real physics of floating ink on water:
//   • drop(c, r): inject a new ink ring; every existing point is pushed radially
//     outward as if area πr² were added under it  → nested concentric rings.
//   • smear(a→b): drag a stylus through the bath; nearby ink follows the finger
//     with a gaussian falloff → the combed, feathered marble swirl.
//
// Everything runs in CSS-pixel space; the canvas is scaled by devicePixelRatio
// once per resize. Bounded by design (max drops) so it is preload-safe: left
// idle it never accumulates past the cap.

const POLY_N = 110; // vertices per ink drop
const MAX_DROPS = 40; // hard cap → preload-safe, bounded memory
const SMEAR_RADIUS = 88; // px gaussian radius of the stylus drag

interface Drop {
  color: string;
  pts: Float64Array; // [x0,y0,x1,y1,...] length 2*POLY_N
}

export interface MarblingEngine {
  drop(x: number, y: number, r: number, color: string): void;
  smear(ax: number, ay: number, bx: number, by: number): void;
  clear(): void;
  isEmpty(): boolean;
  setBase(base: string, vignette: string): void;
  resize(): void;
  start(): void;
  stop(): void;
  snapshot(): Promise<Blob | null>;
}

export function createMarbling(canvas: HTMLCanvasElement): MarblingEngine {
  const ctx = canvas.getContext('2d')!;
  let drops: Drop[] = [];
  let base = '#10131f';
  let vignette = '#05060c';
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let raf = 0;
  let dirty = true;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width || canvas.clientWidth || 360;
    cssH = rect.height || canvas.clientHeight || 640;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  }

  function makeCircle(cx: number, cy: number, r: number): Float64Array {
    const pts = new Float64Array(POLY_N * 2);
    for (let i = 0; i < POLY_N; i++) {
      const a = (i / POLY_N) * Math.PI * 2;
      pts[i * 2] = cx + Math.cos(a) * r;
      pts[i * 2 + 1] = cy + Math.sin(a) * r;
    }
    return pts;
  }

  function drop(cx: number, cy: number, r: number, color: string) {
    // Push every existing point radially outward (area-preserving injection).
    for (const d of drops) {
      const p = d.pts;
      for (let i = 0; i < p.length; i += 2) {
        const dx = p[i] - cx;
        const dy = p[i + 1] - cy;
        const d2 = dx * dx + dy * dy || 1e-6;
        const f = Math.sqrt(1 + (r * r) / d2);
        p[i] = cx + dx * f;
        p[i + 1] = cy + dy * f;
      }
    }
    drops.push({ color, pts: makeCircle(cx, cy, r) });
    if (drops.length > MAX_DROPS) drops.shift();
    dirty = true;
  }

  function smear(ax: number, ay: number, bx: number, by: number) {
    const dx = bx - ax;
    const dy = by - ay;
    if (dx === 0 && dy === 0) return;
    const inv = 1 / (SMEAR_RADIUS * SMEAR_RADIUS);
    for (const d of drops) {
      const p = d.pts;
      for (let i = 0; i < p.length; i += 2) {
        const ex = p[i] - ax;
        const ey = p[i + 1] - ay;
        const w = Math.exp(-(ex * ex + ey * ey) * inv);
        if (w < 0.01) continue;
        p[i] += dx * w;
        p[i + 1] += dy * w;
      }
    }
    dirty = true;
  }

  function clear() {
    drops = [];
    dirty = true;
  }

  function draw() {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, cssW, cssH);

    for (const d of drops) {
      const p = d.pts;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
    }

    // soft paper vignette so edges read as a floating sheet
    const g = ctx.createRadialGradient(
      cssW / 2,
      cssH / 2,
      Math.min(cssW, cssH) * 0.3,
      cssW / 2,
      cssH / 2,
      Math.max(cssW, cssH) * 0.72,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, hexToRgba(vignette, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  let last = 0;
  const FRAME_MS = 1000 / 60;
  function loop(t: number) {
    raf = requestAnimationFrame(loop);
    if (t - last < FRAME_MS - 1) return;
    last = t;
    if (dirty) {
      draw();
      dirty = false;
    }
  }

  function start() {
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function setBase(b: string, v: string) {
    base = b;
    vignette = v;
    dirty = true;
  }

  function snapshot(): Promise<Blob | null> {
    // force a fresh draw so the latest state is captured
    draw();
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(b), 'image/jpeg', 0.86);
    });
  }

  resize();
  return {
    drop,
    smear,
    clear,
    isEmpty: () => drops.length === 0,
    setBase,
    resize,
    start,
    stop,
    snapshot,
  };
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
