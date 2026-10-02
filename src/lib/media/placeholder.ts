/**
 * Deterministic natural-gradient placeholder SVG. Shared by the image route so
 * any slot without an uploaded image still renders a tasteful, brand-consistent
 * stand-in. Pure function — no I/O.
 */
const PALETTES: [string, string, string][] = [
  ["#2f6b6b", "#5c9a8f", "#e9e0d1"],
  ["#c9744a", "#e0a06e", "#f4efe6"],
  ["#5c7a52", "#8aa77c", "#e9e0d1"],
  ["#1b4242", "#2f6b6b", "#cfe3e3"],
  ["#a95b36", "#d98a5f", "#f4efe6"],
  ["#3a352c", "#6b6357", "#d8cab2"],
  ["#245757", "#7fae9f", "#f4efe6"],
  ["#b06a3f", "#e5b483", "#efe6d8"],
];

// Spend Time Off Grid slots (seeds starting "stog-") get forest / earth / wood
// tones and a soft horizon, so un-photographed slots still read as land.
const EARTH_PALETTES: [string, string, string][] = [
  ["#2c4029", "#6f8a5f", "#efe4cf"],
  ["#7c5331", "#c49a6c", "#f3ead9"],
  ["#203020", "#4a6644", "#dbe3d5"],
  ["#5b4630", "#a9875e", "#efe6d8"],
  ["#3a5236", "#9aae7f", "#f4efe6"],
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function placeholderSvg(seed: string, width: number, height: number): string {
  const w = Math.min(3000, Math.max(16, width));
  const h = Math.min(3000, Math.max(16, height));
  const n = hash(seed);
  const earth = /(^|-)stog-/.test(seed);
  const [a, b, c] = earth ? EARTH_PALETTES[n % EARTH_PALETTES.length] : PALETTES[n % PALETTES.length];
  const angle = (n % 8) * 45;
  const x1 = 15 + (n % 40);
  const y1 = 20 + ((n >> 3) % 40);
  const x2 = 60 + ((n >> 6) % 30);
  const y2 = 55 + ((n >> 9) % 35);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient>
    <radialGradient id="h1" cx="${x1}%" cy="${y1}%" r="60%"><stop offset="0%" stop-color="${c}" stop-opacity="0.55"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>
    <radialGradient id="h2" cx="${x2}%" cy="${y2}%" r="55%"><stop offset="0%" stop-color="${a}" stop-opacity="0.5"/><stop offset="100%" stop-color="${a}" stop-opacity="0"/></radialGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.05"/></feComponentTransfer></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#h1)"/>
  <rect width="${w}" height="${h}" fill="url(#h2)"/>
  ${earth ? horizon(w, h, n, a) : ""}<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.6"/>
</svg>`;
}

/** Two soft hill lines across the lower third (earth placeholders only). */
function horizon(w: number, h: number, n: number, color: string): string {
  const y = h * (0.62 + ((n >> 4) % 10) / 100);
  const back = `M0 ${y} C ${w * 0.25} ${y - h * 0.12}, ${w * 0.55} ${y + h * 0.04}, ${w} ${y - h * 0.08} L ${w} ${h} L 0 ${h} Z`;
  const y2 = y + h * 0.1;
  const front = `M0 ${y2} C ${w * 0.3} ${y2 + h * 0.05}, ${w * 0.6} ${y2 - h * 0.09}, ${w} ${y2 + h * 0.02} L ${w} ${h} L 0 ${h} Z`;
  return `<path d="${back}" fill="${color}" opacity="0.35"/><path d="${front}" fill="${color}" opacity="0.55"/>`;
}
