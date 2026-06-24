// Marbling palettes. Global / US-Gen-Z aesthetic per instant-play rules — no
// single culture frames the toy. Each defines a rich two-stop "bath" (so the
// empty water reads as luxe paper, never dead-black), a fleck/shimmer tint, and
// an ordered ink set the tap-drop cycles through.
export interface Palette {
  id: string;
  name: string; // English label shown on the theme chip
  base: string; // bath gradient — center (the lit pool)
  base2: string; // bath gradient — outer (soft edge)
  fleck: string; // drifting shimmer specks
  vein: string; // thin contour line drawn between ink colors (rgba)
  inks: string[]; // cycled on each ink drop
}

export const PALETTES: Palette[] = [
  {
    id: 'indigo',
    name: 'Indigo & Gold',
    base: '#243066',
    base2: '#0c1026',
    fleck: 'rgba(242,201,94,0.9)',
    vein: 'rgba(8,10,28,0.30)',
    inks: ['#3b5bdb', '#5c7cfa', '#f2c14e', '#e8eefc', '#7048e8', '#22b8cf', '#d9a3ff'],
  },
  {
    id: 'sunset',
    name: 'Peach Sunset',
    base: '#ffe6d2',
    base2: '#f3b58f',
    fleck: 'rgba(255,255,255,0.95)',
    vein: 'rgba(150,60,40,0.22)',
    inks: ['#ff6b6b', '#ff922b', '#ffd43b', '#f06595', '#fff0e6', '#845ef7', '#ff8787'],
  },
  {
    id: 'botanical',
    name: 'Botanical',
    base: '#1c3a2c',
    base2: '#08130d',
    fleck: 'rgba(207,232,160,0.9)',
    vein: 'rgba(6,18,10,0.30)',
    inks: ['#2f9e44', '#94d82d', '#66d9e8', '#f4f1de', '#ffd43b', '#20c997', '#b2f2bb'],
  },
  {
    id: 'orchid',
    name: 'Orchid Ink',
    base: '#3a1f52',
    base2: '#140a22',
    fleck: 'rgba(255,210,245,0.9)',
    vein: 'rgba(20,6,28,0.32)',
    inks: ['#d6336c', '#e64980', '#f783ac', '#cc5de8', '#fcc2d7', '#7048e8', '#ffe3ec'],
  },
];

export function paletteById(id: string): Palette {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0];
}
