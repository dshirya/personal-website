// SVG stage: one <g> per element whose rect morphs between a table tile and a
// bubble/dot (rx animates to half the size). Frames come from views.js; this
// file only draws them, animates between them, and handles pointer + keyboard.
import d3 from "./d3.js";
import { W, H, PLOT, CARD_RECT, F_BLOCK_MARKERS } from "./layout.js";
import { fmt } from "./scales.js";

const TRANSPARENT = "rgba(0,0,0,0)";

export function createStage(root, elements, handlers) {
  const stage = d3.select(root).append("div").attr("class", "pt-stage");
  const svg = stage
    .append("svg")
    .attr("class", "pt-svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("role", "group")
    .attr("aria-label", "Periodic table of the elements. Use the arrow keys to move between elements and Enter for details.");

  const axes = svg.append("g").attr("class", "pt-axes");
  const decor = svg.append("g").attr("class", "pt-decor").style("opacity", 0);
  decor
    .selectAll("text")
    .data(F_BLOCK_MARKERS)
    .join("text")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .text((d) => d.label);

  const nodes = svg
    .append("g")
    .attr("class", "pt-nodes")
    .selectAll("g.el")
    .data(elements, (d) => d.symbol)
    .join((enter) => {
      const g = enter
        .append("g")
        .attr("class", "el")
        .attr("role", "button")
        .attr("tabindex", (d) => (d.Z === 1 ? 0 : -1))
        .attr("data-symbol", (d) => d.symbol)
        .style("opacity", 0);
      g.append("rect").attr("class", "el-shape");
      g.append("text").attr("class", "el-z").text((d) => d.Z);
      g.append("text").attr("class", "el-sym").attr("text-anchor", "middle").text((d) => d.symbol);
      g.append("text").attr("class", "el-val").attr("text-anchor", "middle");
      return g;
    });

  const card = stage
    .append("div")
    .attr("class", "pt-card")
    .style("left", `${(CARD_RECT.x / W) * 100}%`)
    .style("top", `${(CARD_RECT.y / H) * 100}%`)
    .style("width", `${(CARD_RECT.w / W) * 100}%`)
    .style("height", `${(CARD_RECT.h / H) * 100}%`);
  const tip = stage.append("div").attr("class", "pt-tip").attr("hidden", true);

  let frame = null;
  let points = [];
  let delaunay = null;

  // ------------------------------------------------------------ drawing
  function render(next, duration) {
    frame = next;
    const S = (d) => next.nodes.get(d.symbol);
    const moving = (d) => !S(d).keep;
    const t = svg.transition("layout").duration(duration).ease(d3.easeCubicInOut);

    nodes.attr("aria-label", (d) => S(d).label);
    nodes.filter(moving).transition(t).attr("transform", (d) => `translate(${S(d).x},${S(d).y})`);
    nodes.transition(t).style("opacity", (d) => S(d).opacity);

    const shape = nodes.filter(moving).select(".el-shape");
    shape
      .transition(t)
      .attr("x", (d) => -S(d).w / 2)
      .attr("y", (d) => -S(d).h / 2)
      .attr("width", (d) => S(d).w)
      .attr("height", (d) => S(d).h)
      .attr("rx", (d) => S(d).rx)
      .attr("fill", (d) => S(d).fill || TRANSPARENT)
      .attr("stroke", (d) => S(d).stroke || TRANSPARENT)
      .attr("stroke-width", (d) => S(d).strokeWidth || 0);

    const text = (sel) => nodes.filter(moving).select(sel).transition(t);
    text(".el-sym")
      .attr("y", (d) => S(d).symY)
      .attr("font-size", (d) => S(d).symSize)
      .attr("fill", (d) => S(d).ink)
      .style("opacity", (d) => S(d).symOpacity);
    text(".el-z")
      .attr("x", (d) => -S(d).w / 2 + 5)
      .attr("y", (d) => -S(d).h / 2 + 12)
      .attr("fill", (d) => S(d).ink)
      .style("opacity", (d) => S(d).zOpacity || 0);
    nodes.select(".el-val").text((d) => S(d).valText || "");
    text(".el-val")
      .attr("y", (d) => S(d).h / 2 - 7)
      .attr("fill", (d) => S(d).ink)
      .style("opacity", (d) => S(d).valOpacity || 0);

    decor.transition(t).style("opacity", next.decor ? 1 : 0);
    card.classed("is-hidden", !next.card);
    renderAxes(next.axes, t);

    points = [...next.nodes]
      .filter(([, s]) => s.opacity > 0.05 && !s.keep)
      .map(([symbol, s]) => ({ symbol, x: s.x, y: s.y, r: Math.max(s.w, s.h) / 2 }));
    delaunay = points.length ? d3.Delaunay.from(points, (p) => p.x, (p) => p.y) : null;
  }

  function renderAxes(spec, t) {
    const sets = axes
      .selectAll("g.axis-set")
      .data(spec ? [spec] : [], (d) => d.id)
      .join(
        (enter) => enter.append("g").attr("class", "axis-set").style("opacity", 0),
        (update) => update,
        (exit) => exit.call((g) => g.transition(t).style("opacity", 0).remove())
      );
    sets.each(function (d) {
      drawAxes(d3.select(this), d);
    });
    sets.transition(t).style("opacity", 1);
  }

  function drawAxes(g, spec) {
    g.selectAll("*").remove();
    const { x, y } = spec;
    const ticks = (scale) =>
      typeof scale.base === "function"
        ? scale.ticks().filter((v) => Number.isInteger(Math.log10(v)))
        : scale.ticks(7);
    const xt = ticks(x);
    const yt = ticks(y);

    const grid = g.append("g").attr("class", "pt-grid");
    grid.selectAll("line.vx").data(xt).join("line")
      .attr("x1", x).attr("x2", x).attr("y1", PLOT.top).attr("y2", PLOT.bottom);
    grid.selectAll("line.hy").data(yt).join("line")
      .attr("x1", PLOT.left).attr("x2", PLOT.right).attr("y1", y).attr("y2", y);

    const axis = g.append("g").attr("class", "pt-axis");
    axis.append("line").attr("x1", PLOT.left).attr("x2", PLOT.right).attr("y1", PLOT.bottom).attr("y2", PLOT.bottom);
    axis.append("line").attr("x1", PLOT.left).attr("x2", PLOT.left).attr("y1", PLOT.top).attr("y2", PLOT.bottom);
    axis.selectAll("text.tx").data(xt).join("text").attr("class", "tick")
      .attr("x", x).attr("y", PLOT.bottom + 18).attr("text-anchor", "middle").text((v) => fmt(v));
    axis.selectAll("text.ty").data(yt).join("text").attr("class", "tick")
      .attr("x", PLOT.left - 10).attr("y", y).attr("dy", "0.35em").attr("text-anchor", "end").text((v) => fmt(v));

    g.append("text").attr("class", "pt-axis-title")
      .attr("x", (PLOT.left + PLOT.right) / 2).attr("y", H - 12).attr("text-anchor", "middle")
      .text(spec.xLabel);
    g.append("text").attr("class", "pt-axis-title")
      .attr("transform", `translate(18,${(PLOT.top + PLOT.bottom) / 2}) rotate(-90)`)
      .attr("text-anchor", "middle").text(spec.yLabel);

    for (const note of spec.notes || []) {
      g.append("text").attr("class", `pt-axis-note ${note.className || ""}`)
        .attr("x", note.x).attr("y", note.y).attr("text-anchor", note.anchor || "start")
        .text(note.text);
    }
  }

  // ------------------------------------------------------------ pointer
  function nearest(event) {
    if (!delaunay) return null;
    const [mx, my] = d3.pointer(event, svg.node());
    const p = points[delaunay.find(mx, my)];
    return Math.hypot(p.x - mx, p.y - my) <= Math.max(p.r + 6, 16) ? p.symbol : null;
  }

  svg.on("pointermove", (event) => handlers.hover(nearest(event)));
  svg.on("pointerleave", () => handlers.hover(null));
  svg.on("click", (event) => handlers.select(nearest(event)));

  // ------------------------------------------------------------ keyboard
  const node = (symbol) => nodes.filter((d) => d.symbol === symbol);

  function focusElement(symbol) {
    nodes.attr("tabindex", (d) => (d.symbol === symbol ? 0 : -1));
    node(symbol).node().focus();
  }

  // Closest visible element in the arrow's direction.
  function neighbour(symbol, [dx, dy]) {
    const from = frame.nodes.get(symbol);
    let best = null;
    let bestScore = Infinity;
    for (const p of points) {
      if (p.symbol === symbol) continue;
      const along = dx ? (p.x - from.x) * dx : (p.y - from.y) * dy;
      const across = Math.abs(dx ? p.y - from.y : p.x - from.x);
      if (along <= 1 || across > along * 1.5 + 20) continue;
      const score = along + across * 2;
      if (score < bestScore) [best, bestScore] = [p.symbol, score];
    }
    return best;
  }

  nodes.on("focus", (event, d) => handlers.hover(d.symbol));
  nodes.on("blur", () => handlers.hover(null));
  svg.on("keydown", (event) => {
    const el = event.target.closest && event.target.closest("g.el");
    if (!el) return;
    const symbol = el.dataset.symbol;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handlers.select(symbol);
      return;
    }
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!dir) return;
    event.preventDefault();
    const next = neighbour(symbol, dir);
    if (next) focusElement(next);
  });

  // ------------------------------------------------------------ state marks
  function mark(hovered, selected) {
    nodes.classed("is-hover", (d) => d.symbol === hovered);
    nodes.classed("is-selected", (d) => d.symbol === selected);
    if (hovered) node(hovered).raise();
    if (selected && selected !== hovered) node(selected).raise();
  }

  function showTip(symbol, build) {
    if (!symbol || !frame) {
      tip.attr("hidden", true);
      return;
    }
    const s = frame.nodes.get(symbol);
    tip.attr("hidden", null).html("");
    build(tip.node());
    const right = s.x > W * 0.62;
    tip
      .style("left", `${(s.x / W) * 100}%`)
      .style("top", `${((s.y - s.h / 2) / H) * 100}%`)
      .classed("pt-tip--left", right);
  }

  return { svg, render, mark, showTip, card: card.node(), frame: () => frame };
}
