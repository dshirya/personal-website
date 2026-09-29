// Color and size scales. Palette values follow the dataviz reference palette and
// were checked with its validator against the site's light/dark backgrounds:
// categorical = first three slots (the cap for all-pairs forms like this grid),
// sequential = one blue ramp (anchor flips in dark), diverging = red <-> blue
// with a neutral gray midpoint.
import d3 from "./d3.js";

const BLUE = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5",
  "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"];

export const PALETTE = {
  light: {
    seq: BLUE,
    divNeg: ["#8a2322", "#b3302f", "#e34948", "#f19a98", "#f9cfcd"], // extreme -> midpoint
    divMid: "#f0efec",
    divPos: ["#b7d3f6", "#6da7ec", "#2a78d6", "#184f95", "#0d366b"], // midpoint -> extreme
    cat: ["#2a78d6", "#eb6834", "#1baf7a"],
    other: "#b9bec3",
    ordinal4: ["#86b6ef", "#3987e5", "#1c5cab", "#0d366b"],
    ordinal5: ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#0d366b"],
  },
  dark: {
    seq: [...BLUE].reverse(),
    divNeg: ["#f7b4b2", "#ec7a79", "#cf4a49", "#8f3433", "#5c2a29"],
    divMid: "#383835",
    divPos: ["#1f3f66", "#1f5aa3", "#3987e5", "#6da7ec", "#b7d3f6"],
    cat: ["#3987e5", "#d95926", "#199e70"],
    other: "#4a5157",
    ordinal4: ["#184f95", "#2a78d6", "#6da7ec", "#cde2fb"],
    ordinal5: ["#184f95", "#2a78d6", "#5598e7", "#86b6ef", "#cde2fb"],
  },
};

export const theme = () =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export const palette = () => PALETTE[theme()];

export const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ---------------------------------------------------------------- transforms
// Maps values onto the axis the property is plotted on.
export function transformFor(prop, values) {
  const positive = values.length > 0 && values.every((v) => v > 0);
  if (prop.scale === "log" && positive) return { kind: "log", f: Math.log10 };
  if (prop.scale === "symlog" || prop.scale === "log") {
    return { kind: "symlog", f: (v) => Math.sign(v) * Math.log10(1 + Math.abs(v)) };
  }
  return { kind: "linear", f: (v) => v };
}

const numericValues = (column) => column.filter((v) => typeof v === "number");

// ---------------------------------------------------------------- color
// Returns { color(v) -> hex | null, legend } for a numeric property.
export function valueColor(prop, column) {
  const pal = palette();
  const values = numericValues(column);
  const { f, kind } = transformFor(prop, values);
  let t = values.map(f);
  // All-negative quantities (DFT energies) read by magnitude.
  const flip = d3.max(t) <= 0;
  if (flip) t = t.map((x) => -x);
  const [lo, hi] = d3.extent(t);
  const g = (v) => (flip ? -f(v) : f(v));

  // Diverging only when the raw values change sign (log values of 0.01 don't count).
  if (d3.min(values) < 0 && d3.max(values) > 0) {
    const neg = d3.piecewise(d3.interpolateLab, [...pal.divNeg, pal.divMid]);
    const pos = d3.piecewise(d3.interpolateLab, [pal.divMid, ...pal.divPos]);
    const color = (v) =>
      typeof v !== "number" ? null : g(v) < 0 ? neg(1 - g(v) / lo) : pos(g(v) / hi);
    const stops = d3.range(0, 1.0001, 0.1).map((s) => (s < 0.5 ? neg(s * 2) : pos((s - 0.5) * 2)));
    return { color, legend: { type: "diverging", stops, kind, values } };
  }

  const ramp = d3.piecewise(d3.interpolateLab, pal.seq);
  const span = hi - lo || 1;
  const color = (v) => (typeof v !== "number" ? null : ramp((g(v) - lo) / span));
  const stops = d3.range(0, 1.0001, 0.1).map(ramp);
  return { color, legend: { type: "sequential", stops, kind, values } };
}

// Nominal categories: the three most common keep a slot, the rest fold to "Other".
// Ordered categories (block s < p < d < f) use the one-hue ordinal ramp instead.
export function categoryColor(prop, column) {
  const pal = palette();
  const labels = prop.labels || {};
  const counts = d3.rollup(column.filter((v) => v != null), (g) => g.length, (v) => String(v));

  if (prop.key === "quantum_l") {
    const color = (v) => (v == null ? null : pal.ordinal4[+v]);
    const items = [0, 1, 2, 3].map((v) => ({
      label: labels[v] || String(v), color: pal.ordinal4[v], count: counts.get(String(v)) || 0,
    }));
    return { color, legend: { type: "categorical", items } };
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, 3).map(([k]) => k);
  const color = (v) => {
    if (v == null) return null;
    const i = top.indexOf(String(v));
    return i >= 0 ? pal.cat[i] : pal.other;
  };
  const items = top.map((k, i) => ({ label: labels[k] || k, color: pal.cat[i], count: counts.get(k) }));
  const rest = ranked.slice(3);
  if (rest.length) {
    items.push({
      label: `other (${rest.map(([k]) => labels[k] || k).join(", ")})`,
      color: pal.other,
      count: d3.sum(rest, ([, n]) => n),
    });
  }
  return { color, legend: { type: "categorical", items } };
}

// Readable text on a filled mark: ink or white, whichever contrasts more.
export function textOn(fill) {
  const c = d3.rgb(fill);
  const lum = (x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lum(c.r) + 0.7152 * lum(c.g) + 0.0722 * lum(c.b);
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? "#0b0b0b" : "#ffffff";
}

// ---------------------------------------------------------------- size
// Bubble radius: area proportional to the value for plain positive properties,
// to the position on the log/signed axis otherwise. rMax adapts so the bubbles
// cover about the same share of the table whatever the distribution.
export function sizeScale(prop, column, { area, rMin = 4, rCap = 64 }) {
  const values = numericValues(column);
  const { f, kind } = transformFor(prop, values);
  const plain = kind === "linear" && d3.min(values) >= 0;
  const target = area / Math.PI;

  if (plain) {
    const vmax = d3.max(values) || 1;
    const share = d3.sum(values, (v) => v / vmax) || 1;
    const R = Math.min(rCap, Math.sqrt(target / share));
    const r = (v) => Math.max(rMin, R * Math.sqrt(Math.max(0, v) / vmax));
    return { r, kind, max: vmax, R };
  }

  const flip = d3.max(values, f) <= 0; // all-negative (DFT energies): size by magnitude
  const g = (v) => (flip ? -f(v) : f(v));
  const [lo, hi] = d3.extent(values, g);
  const span = hi - lo || 1;
  const norm = (v) => (g(v) - lo) / span;
  const share = d3.sum(values, norm) || 1;
  const R2 = Math.min(rCap ** 2, (target - values.length * rMin ** 2) / share + rMin ** 2);
  const r = (v) => Math.sqrt(rMin ** 2 + norm(v) * (Math.max(R2, rMin ** 2) - rMin ** 2));
  return { r, kind, R: Math.sqrt(R2) };
}

// ---------------------------------------------------------------- axes
export function axisScale(prop, column, range) {
  const values = numericValues(column);
  const { kind } = transformFor(prop, values);
  const scale =
    kind === "log" ? d3.scaleLog() : kind === "symlog" ? d3.scaleSymlog() : d3.scaleLinear();
  return scale.domain(d3.extent(values)).range(range).nice();
}

// ---------------------------------------------------------------- numbers
const SUPERSCRIPT = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

export function fmt(v, prop) {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (prop && prop.key === "discovery_year") return String(Math.round(v));
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) {
    const [m, e] = v.toExponential(1).split("e");
    const exp = [...String(+e)].map((c) => SUPERSCRIPT[c]).join("");
    return `${m.replace(/\.0$/, "")}×10${exp}`;
  }
  if (a >= 1000) return d3.format(",.0f")(v);
  return d3.format(".3~g")(v);
}

export function fmtWithUnit(v, prop) {
  const text = fmt(v, prop);
  if (v == null || !prop.unit || typeof v === "string") return text;
  return `${text} ${prop.unit}`;
}
