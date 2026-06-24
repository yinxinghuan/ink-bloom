// Inline SVG assets — no network font dependency.

export function GhostFinger({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74a4 4 0 1 0-8 0c0 1.56.79 2.93 2 3.74zM18.84 15.87l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6a1.5 1.5 0 0 0-3 0v10.74l-3.43-.72a1 1 0 0 0-1.05.49 1 1 0 0 0 .12 1.16l3.84 4.15c.37.4.89.63 1.43.63h6.55c.85 0 1.56-.6 1.74-1.42l.95-4.47a1.5 1.5 0 0 0-.8-1.92z"
        fill="rgba(30, 32, 44, 0.92)"
        style={{
          filter:
            'drop-shadow(0 0 5px rgba(255,255,255,0.95)) drop-shadow(0 2px 3px rgba(0,0,0,0.30))',
        }}
      />
    </svg>
  );
}

// Six wax-seal styles. Each: a soft wax blob + an embossed emblem.
const WAX_COLORS = ['#b5402f', '#3850b0', '#c79320', '#1f8a8a', '#7a3f97', '#2f8a4a'];

const EMBLEMS: string[] = [
  // star
  'M12 5l1.9 4.3 4.6.4-3.5 3 1.1 4.6L12 19l-4.1 2.3 1.1-4.6-3.5-3 4.6-.4z',
  // droplet
  'M12 4c3 4 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 2-5 5-9z',
  // leaf
  'M6 18c0-7 5-12 12-12 0 7-5 12-12 12zm2-1c4-1 7-4 8-8-4 1-7 4-8 8z',
  // spiral
  'M12 7a5 5 0 1 1-4.6 7M12 9.5a2.5 2.5 0 1 0 2.4 3.2',
  // diamond
  'M12 4l5 8-5 8-5-8z',
  // bloom (4-petal)
  'M12 5a3 3 0 0 1 3 3 3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1 3-3 3 3 0 0 1 3-3z',
];

export function WaxSeal({
  style = 0,
  size = 56,
}: {
  style?: number;
  size?: number;
}) {
  const i = ((style % WAX_COLORS.length) + WAX_COLORS.length) % WAX_COLORS.length;
  const wax = WAX_COLORS[i];
  const emblem = EMBLEMS[i % EMBLEMS.length];
  const stroke = i === 3; // spiral emblem is a stroke, not a fill
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id={`wax-${i}`} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor={lighten(wax, 28)} />
          <stop offset="70%" stopColor={wax} />
          <stop offset="100%" stopColor={darken(wax, 30)} />
        </radialGradient>
      </defs>
      <path
        d="M12 1.5c2 1.4 3.6.2 5 1.8 1.3 1.5 0 3.2 1.2 4.8 1.2 1.6 3 1.6 3 3.9s-1.8 2.3-3 3.9c-1.2 1.6.1 3.3-1.2 4.8-1.4 1.6-3 .4-5 1.8-2-1.4-3.6-.2-5-1.8-1.3-1.5 0-3.2-1.2-4.8-1.2-1.6-3-1.6-3-3.9s1.8-2.3 3-3.9c1.2-1.6-.1-3.3 1.2-4.8 1.4-1.6 3-.4 5-1.8z"
        fill={`url(#wax-${i})`}
        stroke={darken(wax, 36)}
        strokeWidth="0.4"
      />
      <path
        d={emblem}
        fill={stroke ? 'none' : darken(wax, 38)}
        stroke={stroke ? darken(wax, 38) : 'none'}
        strokeWidth={stroke ? 1.3 : 0}
        strokeLinecap="round"
        opacity="0.85"
        transform="scale(0.78) translate(3.4 3.4)"
      />
    </svg>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function shift(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const r = clamp(parseInt(h.slice(0, 2), 16) + amt);
  const g = clamp(parseInt(h.slice(2, 4), 16) + amt);
  const b = clamp(parseInt(h.slice(4, 6), 16) + amt);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}
function lighten(hex: string, amt: number) {
  return shift(hex, amt);
}
function darken(hex: string, amt: number) {
  return shift(hex, -amt);
}
