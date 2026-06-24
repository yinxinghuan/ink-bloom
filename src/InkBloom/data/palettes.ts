// Three marbling palettes. Global / US-Gen-Z aesthetic per instant-play rules —
// no single culture frames the toy. Each: a paper "bath" base + an ordered ink
// set the tap-drop cycles through.
export interface Palette {
  id: string;
  name: string; // English label shown on the theme chip
  base: string; // the water/bath background
  vignette: string; // soft edge tint
  inks: string[]; // cycled on each ink drop
}

export const PALETTES: Palette[] = [
  {
    id: 'indigo',
    name: 'Indigo & Gold',
    base: '#10131f',
    vignette: '#05060c',
    inks: ['#3b5bdb', '#5c7cfa', '#f2c14e', '#e8eefc', '#7048e8', '#22b8cf'],
  },
  {
    id: 'sunset',
    name: 'Peach Sunset',
    base: '#fff4ec',
    vignette: '#ffd9c2',
    inks: ['#ff6b6b', '#ff922b', '#ffd43b', '#f06595', '#fff0e6', '#845ef7'],
  },
  {
    id: 'botanical',
    name: 'Botanical',
    base: '#0e1714',
    vignette: '#06100c',
    inks: ['#2f9e44', '#94d82d', '#66d9e8', '#f4f1de', '#ffd43b', '#20c997'],
  },
];

export function paletteById(id: string): Palette {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0];
}
