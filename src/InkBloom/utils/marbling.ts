// Vector marbling engine (suminagashi / paper-marbling math) with a rich,
// living surface.
//
// Ink is stored as filled polygons. Two area-preserving operations recreate the
// real physics of floating ink on water:
//   • drop(c, r): inject a new ink ring; every existing point is pushed radially
//     outward as if area πr² were added under it  → nested concentric rings.
//   • smear(a→b): drag a stylus through the bath; nearby ink follows the finger
//     with a gaussian falloff → the combed, feathered marble swirl.
//
// Surface richness (so it never reads as flat blobs on black):
//   • a two-stop radial BATH gradient (lit pool → soft edge), not dead-black
//   • a thin contour VEIN stroked between ink colours (signature of real marble)
//   • a tiled paper GRAIN overlay (soft-light) so the sheet looks like paper
//   • drifting FLECKS of shimmer + a gentle breathing FLOW (render-time only,
//     never mutates stored ink) so the bath is always quietly alive
//
// All bounded by design (fixed drop cap + fixed fleck count) → preload-safe.

const POLY_N = 110;
const MAX_DROPS = 40;
const SMEAR_RADIUS = 88;
const FLECK_COUNT = 26;

interface Drop {
  color: string;
  pts: Float64Array;
}
interface Fleck {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
}

export interface Style {
  base: string;
  base2: string;
  fleck: string;
  vein: string;
}

export interface MarblingEngine {
  drop(x: number, y: number, r: number, color: string): void;
  smear(ax: number, ay: number, bx: number, by: number): void;
  clear(): void;
  isEmpty(): boolean;
  setStyle(s: Style): void;
  resize(): void;
  start(): void;
  stop(): void;
  snapshot(): Promise<Blob | null>;
}

export function createMarbling(canvas: HTMLCanvasElement): MarblingEngine {
  const ctx = canvas.getContext('2d')!;
  let drops: Drop[] = [];
  let style: Style = { base: '#243066', base2: '#0c1026', fleck: 'rgba(242,201,94,0.9)', vein: 'rgba(8,10,28,0.3)' };
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let raf = 0;
  let t0 = performance.now();
  let lastDraw = 0;
  let flecks: Fleck[] = [];
  let grain: HTMLCanvasElement | null = null;

  function buildGrain() {
    const g = document.createElement('canvas');
    g.width = 128;
    g.height = 128;
    const gc = g.getContext('2d')!;
    const img = gc.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + Math.random() * 130;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    gc.putImageData(img, 0, 0);
    grain = g;
  }

  function seedFlecks() {
    flecks = [];
    for (let i = 0; i < FLECK_COUNT; i++) {
      flecks.push({
        x: Math.random() * cssW,
        y: Math.random() * cssH,
        r: 0.6 + Math.random() * 1.8,
        vy: 3 + Math.random() * 7, // px/sec, slow upward drift
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width || canvas.clientWidth || 360;
    cssH = rect.height || canvas.clientHeight || 640;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!grain) buildGrain();
    if (!flecks.length) seedFlecks();
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
  }

  function clear() {
    drops = [];
  }

  function draw(now: number) {
    const t = (now - t0) / 1000;

    // 1. rich bath gradient (lit pool → soft edge) — never dead-black
    const g = ctx.createRadialGradient(
      cssW / 2,
      cssH * 0.42,
      Math.min(cssW, cssH) * 0.12,
      cssW / 2,
      cssH * 0.5,
      Math.max(cssW, cssH) * 0.78,
    );
    g.addColorStop(0, style.base);
    g.addColorStop(1, style.base2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);

    // 2. ink polygons with a gentle breathing flow (render-time only) + vein
    const amp = 2.4;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    ctx.strokeStyle = style.vein;
    for (const d of drops) {
      const p = d.pts;
      ctx.beginPath();
      for (let i = 0; i < p.length; i += 2) {
        const x = p[i] + Math.sin(p[i + 1] * 0.018 + t * 0.7) * amp;
        const y = p[i + 1] + Math.cos(p[i] * 0.018 + t * 0.6) * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      ctx.stroke();
    }

    // 3. paper grain (soft-light) — subtle texture over the whole sheet
    if (grain) {
      const pat = ctx.createPattern(grain, 'repeat');
      if (pat) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // 4. drifting shimmer flecks
    ctx.globalCompositeOperation = 'lighter';
    for (const f of flecks) {
      f.y -= f.vy * (1 / 60);
      if (f.y < -4) {
        f.y = cssH + 4;
        f.x = Math.random() * cssW;
      }
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(f.phase + t * 1.6));
      ctx.globalAlpha = tw;
      ctx.fillStyle = style.fleck;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  const FRAME_MS = 1000 / 60;
  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (now - lastDraw < FRAME_MS - 1) return;
    lastDraw = now;
    draw(now);
  }

  function start() {
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function setStyle(s: Style) {
    style = s;
  }

  function snapshot(): Promise<Blob | null> {
    draw(performance.now());
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(b), 'image/jpeg', 0.88);
    });
  }

  resize();
  return {
    drop,
    smear,
    clear,
    isEmpty: () => drops.length === 0,
    setStyle,
    resize,
    start,
    stop,
    snapshot,
  };
}
