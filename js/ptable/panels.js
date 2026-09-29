// HTML around the SVG: legend, focus card, tooltip, element details, data table.
// Text goes in with textContent; only our own markup is built as elements.
import d3 from "./d3.js";
import { fmt, fmtWithUnit, transformFor } from "./scales.js";
import { researchFor, subscript, isNumeric } from "./data.js";

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style") Object.assign(node.style, v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

const plain = (html) => html.replace(/<[^>]+>/g, "");

// Rank of an element for a numeric property, highest first.
export function rankOf(data, key, symbol) {
  const v = data.value(key, symbol);
  if (typeof v !== "number") return null;
  const values = data.column(key).filter((x) => typeof x === "number");
  return { rank: values.filter((x) => x > v).length + 1, of: values.length };
}

function extremes(data, key) {
  let lo = null;
  let hi = null;
  data.elements.forEach((el, i) => {
    const v = data.values[key][i];
    if (typeof v !== "number") return;
    if (!lo || v < lo.v) lo = { el, v };
    if (!hi || v > hi.v) hi = { el, v };
  });
  return { lo, hi };
}

// ------------------------------------------------------------------ legend
export function renderLegend(root, legend, data) {
  root.replaceChildren();
  if (!legend) return;
  const blocks = [];

  if (legend.type === "bubbles") {
    const { prop } = legend;
    const size = h("div", { class: "pt-legend-block" },
      h("div", { class: "pt-legend-title" }, "Size · ", prop.label, prop.unit ? ` (${prop.unit})` : "",
        legend.sizeKind !== "linear" ? h("span", { class: "pt-chip" }, "log scale") : null));
    const maxR = d3.max(legend.sizes, (s) => s.r) || 10;
    const scale = Math.min(1, 26 / maxR);
    const row = h("div", { class: "pt-size-row" });
    for (const s of legend.sizes) {
      const d = Math.max(6, s.r * 2 * scale);
      row.append(h("span", { class: "pt-size-item" },
        h("span", { class: "pt-size-dot", style: { width: `${d}px`, height: `${d}px` } }),
        fmt(s.value, prop)));
    }
    size.append(row);
    if (scale < 1) size.append(h("div", { class: "pt-legend-note" }, `circles shown at ${Math.round(scale * 100)}% of the table's size`));
    blocks.push(size);
    blocks.push(colorBlock(legend.color, data));
  } else {
    blocks.push(colorBlock(legend, data));
  }
  if (legend.stats) blocks.push(h("div", { class: "pt-legend-block pt-legend-note" }, legend.stats));
  root.append(...blocks);
}

function colorBlock(legend, data) {
  const block = h("div", { class: "pt-legend-block" });
  if (legend.type === "categorical") {
    if (legend.prop) block.append(h("div", { class: "pt-legend-title" }, legend.prop.label));
    const list = h("ul", { class: "pt-swatches" });
    for (const item of legend.items) {
      list.append(h("li", {},
        h("span", { class: "pt-swatch", style: { background: item.color } }),
        item.label,
        item.count != null ? h("span", { class: "pt-muted" }, ` ${item.count}`) : null));
    }
    block.append(list);
    return block;
  }

  const { prop } = legend;
  const { lo, hi } = extremes(data, prop.key);
  const kind = transformFor(prop, legend.column.filter((v) => typeof v === "number")).kind;
  block.append(h("div", { class: "pt-legend-title" }, "Color · ", prop.label, prop.unit ? ` (${prop.unit})` : "",
    kind !== "linear" ? h("span", { class: "pt-chip" }, kind === "log" ? "log scale" : "signed log scale") : null));
  block.append(h("div", {
    class: "pt-ramp",
    style: { background: `linear-gradient(90deg, ${legend.stops.join(", ")})` },
  }));
  const ends = h("div", { class: "pt-ramp-labels" },
    h("span", {}, lo ? `${lo.el.symbol} ${fmt(lo.v, prop)}` : ""),
    legend.type === "diverging" ? h("span", {}, "0") : null,
    h("span", {}, hi ? `${hi.el.symbol} ${fmt(hi.v, prop)}` : ""));
  block.append(ends);
  const missing = data.elements.length - legend.column.filter((v) => v != null).length;
  if (missing) block.append(h("div", { class: "pt-legend-note" }, `${missing} elements have no value (gray)`));
  return block;
}

// ------------------------------------------------------------------ focus card
// `override` replaces the value line (stories that recolor the table use it).
export function renderCard(root, { data, prop, symbol, fill, ink, override }) {
  root.replaceChildren();
  if (!symbol) {
    const { lo, hi } = isNumeric(prop) ? extremes(data, prop.key) : {};
    root.append(h("div", { class: "pt-card-prop" },
      h("div", { class: "pt-card-name" }, prop.label, prop.unit ? h("span", { class: "pt-muted" }, ` · ${prop.unit}`) : null),
      prop.description ? h("p", { class: "pt-card-desc" }, prop.description) : null,
      h("p", { class: "pt-card-meta" },
        hi ? `Highest ${hi.el.symbol} ${fmt(hi.v, prop)} · lowest ${lo.el.symbol} ${fmt(lo.v, prop)} · ` : "",
        `${prop.coverage} of ${data.elements.length} elements · ${prop.source}`),
      h("p", { class: "pt-card-hint" }, "Hover an element, or click it for every property.")));
    return;
  }

  const el = data.element(symbol);
  const v = data.value(prop.key, symbol);
  const rank = isNumeric(prop) ? rankOf(data, prop.key, symbol) : null;
  const shown = v == null ? "no data" : prop.labels ? prop.labels[String(v)] || String(v) : fmtWithUnit(v, prop);
  const made = researchFor(symbol);
  const discovered = el.ancient ? "known since antiquity"
    : data.value("discovery_year", symbol) ? `discovered ${fmt(data.value("discovery_year", symbol), { key: "discovery_year" })}` : null;

  root.append(h("div", { class: "pt-card-el" },
    h("div", { class: "pt-card-tile", style: { background: fill || "var(--color-surface-strong)", color: ink || "inherit" } },
      h("span", { class: "pt-card-z" }, el.Z),
      h("span", { class: "pt-card-sym" }, el.symbol)),
    h("div", { class: "pt-card-body" },
      h("div", { class: "pt-card-name" }, el.name, h("span", { class: "pt-muted" }, ` · ${el.series}`)),
      override
        ? h("div", { class: "pt-card-value" }, h("strong", {}, override))
        : h("div", { class: "pt-card-value" },
          h("strong", {}, shown), " ",
          h("span", { class: "pt-muted" }, prop.label, rank ? ` · #${rank.rank} of ${rank.of}` : "")),
      h("div", { class: "pt-card-meta" }, [el.econf, el.state, discovered].filter(Boolean).join(" · ")),
      made.length
        ? h("div", { class: "pt-card-meta" }, "Compounds: ", made.map((r) => subscript(r.formula)).join(", "))
        : null)));
}

// ------------------------------------------------------------------ tooltip
export function tooltipBuilder(data, keys, symbol) {
  return (root) => {
    const el = data.element(symbol);
    root.append(h("div", { class: "pt-tip-head" }, h("strong", {}, el.symbol), " ", el.name));
    for (const key of keys) {
      const prop = data.props.get(key);
      root.append(h("div", { class: "pt-tip-row" },
        h("strong", {}, fmtWithUnit(data.value(key, symbol), prop)), " ",
        h("span", { class: "pt-muted" }, prop.label)));
    }
  };
}

// ------------------------------------------------------------------ details
export function renderDetails(root, data, symbol, onClose) {
  root.replaceChildren();
  root.hidden = !symbol;
  if (!symbol) return;
  const el = data.element(symbol);
  const made = researchFor(symbol);

  const head = h("div", { class: "pt-details-head" },
    h("div", {},
      h("h3", {}, `${el.name} (${el.symbol}), Z = ${el.Z}`),
      h("p", { class: "pt-muted" }, [el.series, el.econf, el.state,
        el.radioactive ? "radioactive" : null,
        el.discoverers ? `discovered by ${el.discoverers}${el.discoveryLocation ? ` (${el.discoveryLocation})` : ""}` : null,
      ].filter(Boolean).join(" · "))),
    h("button", { type: "button", class: "pt-close", "aria-label": "Close details" }, "×"));
  head.querySelector("button").addEventListener("click", onClose);
  root.append(head);

  if (made.length) {
    const list = h("ul", { class: "pt-details-papers" });
    for (const r of made) {
      const source = r.paper
        ? h("a", { href: `https://doi.org/${r.paper.doi}`, target: "_blank", rel: "noopener", title: plain(r.paper.title) },
          `${r.paper.journal} ${r.paper.year}`)
        : null;
      list.append(h("li", {}, h("strong", {}, subscript(r.formula)),
        r.note ? h("span", { class: "pt-muted" }, ` (${r.note})`) : null,
        source ? " — " : null, source));
    }
    root.append(h("p", { class: "pt-details-label" }, "In my research"), list);
  }
  if (!el.inSheet) {
    root.append(h("p", { class: "pt-muted" }, "Not in the lab property list; showing the properties available from other sources."));
  }

  const grid = h("div", { class: "pt-details-grid" });
  for (const category of data.categories) {
    const rows = data.properties
      .filter((p) => p.category === category && data.value(p.key, symbol) != null)
      .map((p) => {
        const v = data.value(p.key, symbol);
        const fix = data.corrections.get(`${symbol}:${p.key}`);
        return [
          h("dt", {}, p.label),
          h("dd", {}, p.labels ? p.labels[String(v)] || String(v) : fmtWithUnit(v, p),
            fix ? h("span", { class: "pt-chip", title: fix.note }, fix.status === "assumed" ? "corrected (assumed)" : "corrected") : null),
        ];
      });
    if (!rows.length) continue;
    grid.append(h("div", { class: "pt-details-group" }, h("h4", {}, category), h("dl", {}, rows.flat())));
  }
  root.append(grid);
}

// ------------------------------------------------------------------ data table
export function renderDataTable(root, data, keys) {
  const props = keys.map((k) => data.props.get(k));
  const rows = data.elements
    .map((el) => ({ el, values: keys.map((k) => data.value(k, el.symbol)) }))
    .filter((r) => r.values.some((v) => v != null));
  if (isNumeric(props[0])) {
    rows.sort((a, b) => (b.values[0] ?? -Infinity) - (a.values[0] ?? -Infinity));
  }
  const table = h("table", { class: "pt-table" },
    h("thead", {}, h("tr", {}, h("th", {}, "#"), h("th", {}, "Element"),
      props.map((p) => h("th", {}, p.label, p.unit ? ` (${p.unit})` : "")))),
    h("tbody", {}, rows.map((r, i) => h("tr", {},
      h("td", {}, i + 1),
      h("td", {}, `${r.el.symbol} · ${r.el.name}`),
      r.values.map((v, j) => h("td", {}, props[j].labels && v != null ? props[j].labels[String(v)] || String(v) : fmt(v, props[j])))))));
  root.replaceChildren(table);
}

export { h };
