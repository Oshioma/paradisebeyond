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
  const [a, b, c] = PALETTES[n % PALETTES.length];
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
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.6"/>
</svg>`;
}
