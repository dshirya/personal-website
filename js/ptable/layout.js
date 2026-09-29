// Geometry of every view, in SVG viewBox units (the SVG scales to its container).
import d3 from "./d3.js";

export const PITCH = 60; // grid spacing
export const CELL = 56; // tile size; PITCH - CELL is the surface gap
export const MARGIN_X = 10;
export const MARGIN_Y = 14;
export const W = MARGIN_X * 2 + 18 * PITCH; // 1100
export const H = 592;

const F_ROW_OFFSET = 2.45; // f-block rows sit 2.45 rows below periods 6 and 7

// The empty region above the d-block (groups 3-12, periods 1-3) holds the focus card.
export const CARD_RECT = {
  x: MARGIN_X + 2 * PITCH + 4,
  y: MARGIN_Y + 4,
  w: 10 * PITCH - 8,
  h: 3 * PITCH - 12,
};

// [column, row] in the 18-column table. La-Lu and Ac-Lr go to the f-rows,
// placed by atomic number (the property sheet lists them all as group 3).
export function gridPosition(Z) {
  if (Z === 1) return [1, 1];
  if (Z === 2) return [18, 1];
  if (Z <= 18) {
    const period = Z <= 10 ? 2 : 3;
    const idx = Z - (period === 2 ? 3 : 11);
    return [idx < 2 ? idx + 1 : idx + 11, period];
  }
  const starts = [[19, 4], [37, 5], [55, 6], [87, 7]];
  const [start, period] = starts.filter(([s]) => Z >= s).pop();
  const idx = Z - start;
  if (period < 6) return [idx + 1, period];
  if (idx < 2) return [idx + 1, period];
  if (idx < 17) return [idx + 1, period + F_ROW_OFFSET];
  return [idx - 13, period];
}

export function gridCenter(Z) {
  const [col, row] = gridPosition(Z);
  return { x: MARGIN_X + (col - 0.5) * PITCH, y: MARGIN_Y + (row - 0.5) * PITCH };
}

// Placeholders in group 3 pointing to the f-block rows.
export const F_BLOCK_MARKERS = [
  { label: "57–71", ...gridCenter(56), x: MARGIN_X + 2.5 * PITCH },
  { label: "89–103", ...gridCenter(88), x: MARGIN_X + 2.5 * PITCH },
];

// Push circles out of a rectangle (the focus card area).
function keepOutForce(rect, pad = 3) {
  let nodes;
  const force = (alpha) => {
    for (const d of nodes) {
      const r = d.r + pad;
      const left = d.x + r - rect.x;
      const right = rect.x + rect.w - (d.x - r);
      const top = d.y + r - rect.y;
      const bottom = rect.y + rect.h - (d.y - r);
      if (left <= 0 || right <= 0 || top <= 0 || bottom <= 0) continue;
      const k = Math.min(1, alpha * 4);
      const m = Math.min(left, right, top, bottom);
      if (m === left) d.x -= left * k;
      else if (m === right) d.x += right * k;
      else if (m === top) d.y -= top * k;
      else d.y += bottom * k;
    }
  };
  force.initialize = (n) => (nodes = n);
  return force;
}

// Settle bubbles near their table positions. Runs synchronously so every
// transition animates to the same final layout.
export function bubbleLayout(items) {
  const nodes = items.map((d) => ({ ...d, x: d.ax, y: d.ay }));
  const sim = d3
    .forceSimulation(nodes)
    .force("x", d3.forceX((d) => d.ax).strength(0.12))
    .force("y", d3.forceY((d) => d.ay).strength(0.12))
    .force("collide", d3.forceCollide((d) => d.r + 1.5).strength(0.9).iterations(3))
    .force("card", keepOutForce(CARD_RECT))
    .stop();
  for (let i = 0; i < 320; i++) {
    sim.tick();
    for (const d of nodes) {
      d.x = Math.max(d.r + 2, Math.min(W - d.r - 2, d.x));
      d.y = Math.max(d.r + 2, Math.min(H - d.r - 2, d.y));
    }
  }
  return new Map(nodes.map((d) => [d.symbol, d]));
}

export const PLOT = { left: 78, right: W - 24, top: 24, bottom: H - 58 };
