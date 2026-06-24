import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameEvent, useUpload, telegramId } from '@shared/runtime';
import { useGameSave } from '@shared/save';
import { createMarbling, type MarblingEngine } from './utils/marbling';
import { unlockAudio, playDrop, playSeal, playHang } from './utils/sounds';
import { PALETTES } from './data/palettes';
import { t } from './i18n';
import { useWall } from './hooks/useWall';
import { GhostFinger } from './assets/icons';
import Wall from './components/Wall';
import Detail from './components/Detail';
import type { InkSave, Sheet, SealRecord, WallSheet } from './types';
import './InkBloom.less';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function InkBloom() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<MarblingEngine | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const ghostLabelRef = useRef<HTMLSpanElement | null>(null);
  const interactedRef = useRef(false);
  const colorIdxRef = useRef(0);
  const pointer = useRef({ down: false, x: 0, y: 0 });

  const [paletteIdx, setPaletteIdx] = useState(0);
  const palette = PALETTES[paletteIdx];
  const [interacted, setInteracted] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [hanging, setHanging] = useState(false);
  const [screen, setScreen] = useState<'studio' | 'wall' | 'detail'>('studio');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { savedData, loaded, persist } = useGameSave<InkSave>('ink-bloom');
  const [mySheets, setMySheets] = useState<Sheet[]>([]);
  const [mySeals, setMySeals] = useState<SealRecord[]>([]);
  const seeded = useRef(false);

  const events = useGameEvent();
  const { upload } = useUpload();
  const wall = useWall();

  const selfId = telegramId ? String(telegramId) : 'self';

  // ── seed local mirror once (useGameSave-mirror rule) ───────────────────────
  useEffect(() => {
    if (!loaded || seeded.current) return;
    seeded.current = true;
    if (savedData) {
      setMySheets(savedData.sheets || []);
      setMySeals(savedData.seals || []);
    }
  }, [loaded, savedData]);

  // ── engine lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = createMarbling(canvasRef.current);
    engineRef.current = eng;
    const p0 = PALETTES[0];
    eng.setStyle({ base: p0.base, base2: p0.base2, fleck: p0.fleck, vein: p0.vein });
    eng.start();
    const onResize = () => eng.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      eng.stop();
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setStyle({ base: palette.base, base2: palette.base2, fleck: palette.fleck, vein: palette.vein });
  }, [palette]);

  // ── attract demo (bounded, looping, stops on first touch) ──────────────────
  useEffect(() => {
    if (interacted || screen !== 'studio') return;
    const eng = engineRef.current;
    if (!eng) return;
    let raf = 0;
    let start = performance.now();
    let lastLocal = -1;
    let lgx = 0;
    let lgy = 0;
    const CYCLE = 6.6;
    const DROPS = [
      { t: 0.35, x: 0.4, y: 0.43 },
      { t: 1.05, x: 0.6, y: 0.5 },
      { t: 1.75, x: 0.5, y: 0.62 },
    ];

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (interactedRef.current) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const W = rect.width;
      const H = rect.height;
      const local = ((now - start) / 1000) % CYCLE;
      if (local < lastLocal) {
        eng.clear();
        colorIdxRef.current = 0;
      }
      for (const d of DROPS) {
        if (lastLocal < d.t && local >= d.t) {
          eng.drop(d.x * W, d.y * H, 42, palette.inks[colorIdxRef.current++ % palette.inks.length]);
        }
      }
      let gx = lgx;
      let gy = lgy;
      let label = t('hint_tap');
      if (local < 2.1) {
        const seg = local < 0.7 ? DROPS[0] : local < 1.4 ? DROPS[1] : DROPS[2];
        gx = seg.x * W;
        gy = seg.y * H;
      } else if (local < 4.5) {
        const u = (local - 2.1) / 2.4;
        gx = (0.22 + 0.56 * u) * W;
        gy = (0.5 + 0.17 * Math.sin(u * Math.PI * 2)) * H;
        eng.smear(lgx, lgy, gx, gy);
        label = t('hint_drag');
      } else {
        label = t('hint_drag');
      }
      if (ghostRef.current) ghostRef.current.style.transform = `translate(${gx}px, ${gy}px)`;
      if (ghostLabelRef.current && ghostLabelRef.current.textContent !== label) {
        ghostLabelRef.current.textContent = label;
      }
      lgx = gx;
      lgy = gy;
      lastLocal = local;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [interacted, screen, palette]);

  function firstInteract() {
    if (interactedRef.current) return;
    interactedRef.current = true;
    setInteracted(true);
  }

  // ── studio pointer (tap = bloom, drag = swirl) ─────────────────────────────
  function pt(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (screen !== 'studio') return;
    e.preventDefault();
    unlockAudio();
    firstInteract();
    const { x, y } = pt(e);
    pointer.current = { down: true, x, y };
    const color = palette.inks[colorIdxRef.current++ % palette.inks.length];
    engineRef.current?.drop(x, y, 32 + Math.random() * 16, color);
    playDrop(0.85 + Math.random() * 0.45);
    setHasInk(true);
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = pointer.current;
    if (!p.down) return;
    const { x, y } = pt(e);
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy < 9) return;
    engineRef.current?.smear(p.x, p.y, x, y);
    p.x = x;
    p.y = y;
  }
  function onUp() {
    pointer.current.down = false;
  }

  function newSheet() {
    engineRef.current?.clear();
    colorIdxRef.current = 0;
    setHasInk(false);
  }

  async function hang() {
    const eng = engineRef.current;
    if (!eng || !hasInk || hanging) return;
    unlockAudio();
    setHanging(true);
    playHang();
    try {
      const blob = await eng.snapshot();
      if (!blob) return;
      let url = '';
      try {
        const r = await upload(blob, `ink-${Date.now()}.jpg`);
        url = r.url;
      } catch {
        url = URL.createObjectURL(blob);
      }
      const sheet: Sheet = { id: uid(), imageUrl: url, paletteId: palette.id, createdAt: Date.now() };
      const next = [sheet, ...mySheets].slice(0, 20);
      setMySheets(next);
      persist({ sheets: next, seals: mySeals });
      wall.refresh();
      setScreen('wall');
    } finally {
      setHanging(false);
    }
  }

  // ── seal ───────────────────────────────────────────────────────────────────
  function sealStyleForMe(): number {
    let h = 0;
    for (let i = 0; i < selfId.length; i++) h = (h * 31 + selfId.charCodeAt(i)) >>> 0;
    return h % 6;
  }
  function sealSheet(ws: WallSheet) {
    if (mySeals.some(s => s.sheetId === ws.sheet.id)) return;
    unlockAudio();
    const style = sealStyleForMe();
    const rec: SealRecord = { sheetId: ws.sheet.id, authorId: ws.authorId, style, at: Date.now() };
    const next = [rec, ...mySeals].slice(0, 200);
    setMySeals(next);
    persist({ sheets: mySheets, seals: next });
    playSeal();
    if (ws.authorId && ws.authorId !== selfId && ws.authorId !== 'self' && ws.sheet.imageUrl) {
      events.trigger(`seal:${ws.sheet.id}`, {
        actions: [
          {
            type: 'notify',
            target_user_id: ws.authorId,
            image: { ref_url: ws.sheet.imageUrl, prompt: 'a hand-marbled ink sheet, Ink Bloom' },
            message: { template: t('notify_seal'), variables: ['sender_name'] },
          },
        ],
      });
    }
  }

  // ── merged wall (optimistic own sheets + own seals) ────────────────────────
  const wallSheets = useMemo<WallSheet[]>(() => {
    const cloud = wall.sheets;
    const cloudIds = new Set(cloud.map(w => w.sheet.id));
    const mineExtra: WallSheet[] = mySheets
      .filter(s => !cloudIds.has(s.id))
      .map(s => ({ sheet: s, authorId: selfId, authorName: t('you'), sealers: [] }));
    let merged = [...mineExtra, ...cloud];
    merged = merged.map(ws => {
      const mine = mySeals.find(sr => sr.sheetId === ws.sheet.id);
      if (mine && !ws.sealers.some(se => se.userId === selfId)) {
        return { ...ws, sealers: [...ws.sealers, { userId: selfId, name: t('you'), style: mine.style }] };
      }
      return ws;
    });
    merged.sort((a, b) => (b.sheet.createdAt ?? 0) - (a.sheet.createdAt ?? 0));
    return merged.slice(0, 36);
  }, [wall.sheets, mySheets, mySeals, selfId]);

  const detailWs = detailId ? wallSheets.find(w => w.sheet.id === detailId) ?? null : null;

  // bounce back if the opened sheet vanished from the merged list
  useEffect(() => {
    if (screen === 'detail' && !detailWs) setScreen('wall');
  }, [screen, detailWs]);

  return (
    <div className="ib-root">
      <canvas
        ref={canvasRef}
        className="ib-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
      />

      {/* ── Studio overlay ── */}
      <div className={`ib-studio ${screen === 'studio' ? '' : 'ib-hidden'}`}>
        <header className="ib-top">
          <button
            className="ib-top__line"
            onClick={() => {
              wall.refresh();
              setScreen('wall');
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M3 7h18M6 7v3a3 3 0 0 0 6 0M12 10a3 3 0 0 0 6 0V7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {t('line')}
          </button>
          <button
            className="ib-top__theme"
            style={{ borderColor: palette.inks[0] }}
            onClick={() => setPaletteIdx((paletteIdx + 1) % PALETTES.length)}
          >
            <span className="ib-swatch" style={{ background: palette.inks[0] }} />
            <span className="ib-swatch" style={{ background: palette.inks[2] }} />
            {palette.name}
          </button>
        </header>

        {!interacted && (
          <div className="ib-ghost" ref={ghostRef}>
            <GhostFinger size={60} />
            <span className="ib-ghost__label" ref={ghostLabelRef}>
              {t('hint_tap')}
            </span>
          </div>
        )}

        <div className="ib-bottom">
          <div className="ib-brand">{t('brand')}</div>
          <div className="ib-actions">
            <button className="ib-pill" onClick={newSheet} disabled={!hasInk}>
              {t('new')}
            </button>
            <button
              className="ib-pill ib-pill--go"
              onClick={hang}
              disabled={!hasInk || hanging}
              style={{ background: hasInk && !hanging ? palette.inks[0] : undefined }}
            >
              {hanging ? t('hanging') : t('hang')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Wall overlay ── */}
      {screen === 'wall' && (
        <Wall
          sheets={wallSheets}
          loaded={wall.loaded || mySheets.length > 0}
          selfId={selfId}
          accent={palette.inks[0]}
          onOpen={id => {
            setDetailId(id);
            setScreen('detail');
          }}
          onBack={() => setScreen('studio')}
        />
      )}

      {/* ── Detail overlay ── */}
      {screen === 'detail' && detailWs && (
        <Detail
          ws={detailWs}
          selfId={selfId}
          accent={palette.inks[0]}
          hasSealed={mySeals.some(s => s.sheetId === detailWs.sheet.id)}
          onSeal={() => sealSheet(detailWs)}
          onBack={() => setScreen('wall')}
        />
      )}
    </div>
  );
}
