// Turns the app state into a frame: one visual spec per element plus axes and
// legend. Pure functions of (state, data); the engine animates between frames.
import d3 from "./d3.js";
import { gridCenter, bubbleLayout, CELL, CARD_RECT, W, H, PLOT } from "./layout.js";
import {
  valueColor, categoryColor, sizeScale, axisScale, transformFor, textOn,
  palette, cssVar, fmt, fmtWithUnit,
} from "./scales.js";
import { elementClass, CLASSES, isNumeric } from "./data.js";

const DIMMED = 0.16;

export function computeFrame(state, data, story) {
  const frame =
    state.view === "table" ? tableFrame(state, data)
    : state.view === "bubbles" ? bubbleFrame(state, data)
    : scatterFrame(state, data);
  if (story && story.decorate) story.decorate(frame, data, state);
  if (state.highlight) {
    for (const [symbol, s] of frame.nodes) {
      if (!state.highlight.has(symbol) && s.opacity > 0) s.opacity = DIMMED;
    }
  }
  return frame;
}

function classLegend() {
  const pal = palette();
  return { type: "categorical", items: CLASSES.map((c, i) => ({ label: c, color: pal.cat[i] })) };
}

function classColor(el) {
  return palette().cat[CLASSES.indexOf(elementClass(el))];
}

// ------------------------------------------------------------------ table
function tableFrame(state, data) {
  const prop = data.props.get(state.prop);
  const column = data.column(prop.key);
  const scale = isNumeric(prop) ? valueColor(prop, column) : categoryColor(prop, column);
  const empty = cssVar("--color-surface-strong");
  const muted = cssVar("--color-muted");

  const nodes = new Map();
  for (const el of data.elements) {
    const v = data.value(prop.key, el.symbol);
    const fill = scale.color(v) || empty;
    const missing = v == null;
    const label = prop.labels && v != null ? prop.labels[String(v)] || String(v) : fmt(v, prop);
    nodes.set(el.symbol, {
      ...gridCenter(el.Z),
      w: CELL, h: CELL, rx: 6, fill,
      opacity: 1,
      ink: missing ? muted : textOn(fill),
      symSize: 18, symY: 3, symOpacity: missing ? 0.75 : 1,
      zOpacity: 0.8, valOpacity: missing ? 0.6 : 0.95,
      valText: missing ? "—" : truncate(isNumeric(prop) ? fmt(v, prop) : String(v), 9),
      label: `${el.name}: ${prop.label} ${missing ? "not available" : label}`,
    });
  }
  return {
    nodes, axes: null, decor: true, card: true,
    legend: { ...scale.legend, prop, column },
  };
}

const truncate = (text, n) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);

// ------------------------------------------------------------------ bubbles
function bubbleFrame(state, data) {
  const prop = data.props.get(state.prop);
  const column = data.column(prop.key);
  const size = sizeScale(prop, column, { area: 0.3 * (W * H - CARD_RECT.w * CARD_RECT.h) });
  const byValue = state.color === "value";
  const colors = byValue ? valueColor(prop, column) : null;
  const ring = cssVar("--color-bg");
  const muted = cssVar("--color-muted");

  const items = data.elements.map((el) => {
    const v = data.value(prop.key, el.symbol);
    const { x, y } = gridCenter(el.Z);
    return { symbol: el.symbol, ax: x, ay: y, r: v == null ? 3 : size.r(v) };
  });
  const placed = bubbleLayout(items);

  const nodes = new Map();
  for (const el of data.elements) {
    const p = placed.get(el.symbol);
    const v = data.value(prop.key, el.symbol);
    const missing = v == null;
    const fill = missing ? null : byValue ? colors.color(v) : classColor(el);
    const symSize = Math.min(17, p.r * 0.78);
    nodes.set(el.symbol, {
      x: p.x, y: p.y, w: p.r * 2, h: p.r * 2, rx: p.r,
      fill,
      stroke: missing ? muted : ring,
      strokeWidth: missing ? 1 : 2,
      opacity: missing ? 0.55 : 1,
      ink: fill ? textOn(fill) : muted,
      symSize, symY: symSize * 0.36, symOpacity: !missing && p.r >= 9 ? 1 : 0,
      label: `${el.name}: ${prop.label} ${fmtWithUnit(v, prop)}`,
    });
  }

  const present = column.filter((v) => typeof v === "number");
  const examples = [d3.max(present), d3.median(present), d3.min(present)]
    .filter((v, i, a) => v != null && a.indexOf(v) === i)
    .map((v) => ({ value: v, r: size.r(v) }));
  return {
    nodes, axes: null, decor: false, card: true,
    legend: {
      type: "bubbles", prop, column, sizes: examples, sizeKind: size.kind,
      color: byValue ? { ...colors.legend, prop, column } : classLegend(),
    },
  };
}

// ------------------------------------------------------------------ scatter + PCA
function pearson(pairs) {
  const n = pairs.length;
  if (n < 3) return null;
  const mx = d3.mean(pairs, (p) => p[0]);
  const my = d3.mean(pairs, (p) => p[1]);
  const sxy = d3.sum(pairs, (p) => (p[0] - mx) * (p[1] - my));
  const sxx = d3.sum(pairs, (p) => (p[0] - mx) ** 2);
  const syy = d3.sum(pairs, (p) => (p[1] - my) ** 2);
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

function scatterFrame(state, data) {
  const pca = state.view === "pca";
  const px = data.props.get(pca ? "pc1" : state.x);
  const py = data.props.get(pca ? "pc2" : state.y);
  const cx = data.column(px.key);
  const cy = data.column(py.key);
  const x = axisScale(px, cx, [PLOT.left, PLOT.right]);
  const y = axisScale(py, cy, [PLOT.bottom, PLOT.top]);
  const tx = transformFor(px, cx.filter((v) => typeof v === "number")).f;
  const ty = transformFor(py, cy.filter((v) => typeof v === "number")).f;
  const ring = cssVar("--color-bg");
  const r = 12;

  const nodes = new Map();
  const pairs = [];
  for (const el of data.elements) {
    const vx = data.value(px.key, el.symbol);
    const vy = data.value(py.key, el.symbol);
    if (typeof vx !== "number" || typeof vy !== "number") {
      nodes.set(el.symbol, { keep: true, opacity: 0, w: 0, h: 0, label: `${el.name}: no data` });
      continue;
    }
    pairs.push([tx(vx), ty(vy)]);
    const fill = classColor(el);
    nodes.set(el.symbol, {
      x: x(vx), y: y(vy), w: r * 2, h: r * 2, rx: r,
      fill, stroke: ring, strokeWidth: 2, opacity: 1,
      ink: textOn(fill), symSize: 10, symY: 3.6, symOpacity: 1,
      label: `${el.name}: ${px.label} ${fmtWithUnit(vx, px)}, ${py.label} ${fmtWithUnit(vy, py)}`,
    });
  }

  // Principal components are uncorrelated by construction, so no r for PCA.
  const corr = pca ? null : pearson(pairs);
  const stats = `n = ${pairs.length} of ${data.elements.length}` + (corr == null ? "" : ` · Pearson r = ${corr.toFixed(2)}`);
  const axes = { id: `${px.key}|${py.key}`, x, y, notes: [] };

  if (pca) {
    const [e1, e2] = data.pca.explained;
    axes.xLabel = `PC1 · ${(e1 * 100).toFixed(0)}% of variance`;
    axes.yLabel = `PC2 · ${(e2 * 100).toFixed(0)}% of variance`;
    const ends = (loadings, sign) =>
      loadings.filter(([, w]) => Math.sign(w) === sign).slice(0, 2).map(([name]) => name.toLowerCase()).join(", ");
    // Only the positive ends: the build anchors them (heavier -> right, more
    // electronegative -> up). Negative ends are often negative-valued DFT
    // energies, where "more" reads backwards.
    const { pc1, pc2 } = data.pca.loadings;
    const right = ends(pc1, 1);
    const up = ends(pc2, 1);
    if (right) axes.notes.push({ x: PLOT.right - 6, y: PLOT.bottom - 10, text: `${right} →`, anchor: "end" });
    if (up) axes.notes.push({ x: PLOT.left + 10, y: PLOT.top + 12, text: `↑ ${up}` });
  } else {
    const unit = (p) => (p.unit ? ` (${p.unit})` : "");
    const logNote = (p) => (transformFor(p, data.column(p.key).filter((v) => typeof v === "number")).kind !== "linear" ? ", log scale" : "");
    axes.xLabel = `${px.label}${unit(px)}${logNote(px)}`;
    axes.yLabel = `${py.label}${unit(py)}${logNote(py)}`;
  }
  axes.notes.push({ x: PLOT.right - 6, y: PLOT.top + 12, text: stats, anchor: "end", className: "pt-axis-stat" });

  return { nodes, axes, decor: false, card: false, legend: classLegend() };
}
