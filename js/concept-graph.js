// Interactive "Research Map" concept graph.
// Renders CONCEPT_NODES / CONCEPT_LINKS into #concept-graph using the global
// ForceGraph (force-graph CDN). Wires [data-concept] chips <-> graph nodes.
(function () {
  const container = document.getElementById("concept-graph");
  if (
    !container ||
    typeof ForceGraph === "undefined" ||
    typeof CONCEPT_NODES === "undefined" ||
    typeof CONCEPT_LINKS === "undefined"
  ) {
    return; // progressive enhancement: chips/text still work without the graph
  }

  const cssVar = (name, fallback) =>
    (getComputedStyle(document.documentElement).getPropertyValue(name) || "")
      .trim() || fallback;

  function hexToRgba(hex, alpha) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Palette is read from CSS variables so it follows the active light/dark theme.
  let palette;
  function readPalette() {
    palette = {
      groups: {
        computational: cssVar("--group-computational", "#5d7a8c"),
        experimental: cssVar("--group-experimental", "#b5896e"),
        materials: cssVar("--group-materials", "#7f9b8e"),
      },
      bg: cssVar("--color-bg", "#ffffff"),
      text: cssVar("--color-text", "#111111"),
      border: cssVar("--color-border", "#e3e6e8"),
    };
  }
  readPalette();
  const groupColor = (group) =>
    palette.groups[group] || palette.groups.materials;

  const nodes = CONCEPT_NODES.map((n) => ({ ...n }));
  const links = CONCEPT_LINKS.map((l) => ({ ...l }));

  // Neighbor lookup for highlight propagation.
  const neighbors = new Map();
  nodes.forEach((n) => neighbors.set(n.id, new Set()));
  links.forEach((l) => {
    if (neighbors.has(l.source)) neighbors.get(l.source).add(l.target);
    if (neighbors.has(l.target)) neighbors.get(l.target).add(l.source);
  });

  const linkEndId = (end) => (typeof end === "object" && end ? end.id : end);

  let hoverId = null; // node under cursor / chip
  let pinnedId = null; // node fixed by click

  const focusId = () => hoverId || pinnedId;

  function isNodeActive(id) {
    const f = focusId();
    if (!f) return true;
    if (id === f) return true;
    const ns = neighbors.get(f);
    return ns ? ns.has(id) : false;
  }

  function isLinkActive(l) {
    const f = focusId();
    if (!f) return true;
    return linkEndId(l.source) === f || linkEndId(l.target) === f;
  }

  const chips = Array.from(document.querySelectorAll("[data-concept]"));

  function syncChips() {
    const f = focusId();
    chips.forEach((chip) => {
      const id = chip.getAttribute("data-concept");
      const active = isNodeActive(id);
      chip.classList.toggle("is-active", Boolean(f) && id === f);
      chip.classList.toggle("is-related", Boolean(f) && active && id !== f);
      chip.classList.toggle("concept-dim", Boolean(f) && !active);
    });
  }

  function setHover(id) {
    hoverId = id;
    syncChips();
  }

  function togglePin(id) {
    pinnedId = pinnedId === id ? null : id;
    syncChips();
  }

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const Graph = ForceGraph()(container)
    .graphData({ nodes, links })
    .nodeId("id")
    .backgroundColor("rgba(0,0,0,0)")
    .nodeRelSize(6)
    .linkCurvature(0.1)
    .linkColor((l) => {
      if (!focusId()) return hexToRgba(palette.border, 0.7);
      if (!isLinkActive(l)) return hexToRgba(palette.border, 0.35);
      const src = typeof l.source === "object" ? l.source : null;
      return src ? groupColor(src.group) : palette.groups.computational;
    })
    .linkWidth((l) => (focusId() && isLinkActive(l) ? 2 : 1))
    .warmupTicks(reduceMotion ? 120 : 0)
    .cooldownTicks(reduceMotion ? 0 : Infinity)
    .cooldownTime(reduceMotion ? 0 : 8000)
    .nodeCanvasObject((node, ctx, globalScale) => {
      const active = isNodeActive(node.id);
      const focused = node.id === focusId();
      const r = 6;
      ctx.globalAlpha = active ? 1 : 0.16;

      // Focus ring in the node's own color.
      if (focused) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3.5, 0, 2 * Math.PI);
        ctx.strokeStyle = groupColor(node.group);
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // Node with a thin background-colored halo for crisp separation from edges.
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = groupColor(node.group);
      ctx.fill();
      ctx.lineWidth = 1.5 / globalScale;
      ctx.strokeStyle = palette.bg;
      ctx.stroke();

      const fontSize = Math.max(13 / globalScale, 5);
      ctx.font = `500 ${fontSize}px 'Inter', system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = active
        ? hexToRgba(palette.text, 0.9)
        : hexToRgba(palette.text, 0.4);
      ctx.fillText(node.label, node.x + r + 5, node.y);

      ctx.globalAlpha = 1;
    })
    .nodePointerAreaPaint((node, color, ctx) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 9, 0, 2 * Math.PI);
      ctx.fill();
    })
    .onNodeHover((node) => {
      setHover(node ? node.id : null);
      container.style.cursor = node ? "pointer" : "";
    })
    .onNodeDragEnd((node) => {
      node.fx = node.x;
      node.fy = node.y;
    })
    .onNodeClick((node) => togglePin(node.id))
    .onBackgroundClick(() => {
      pinnedId = null;
      syncChips();
    });

  // Spread nodes out so the larger labels stay readable.
  if (Graph.d3Force("charge")) Graph.d3Force("charge").strength(-320);
  if (Graph.d3Force("link")) Graph.d3Force("link").distance(95);

  let fitted = false;
  Graph.onEngineStop(() => {
    if (!fitted) {
      Graph.zoomToFit(400, 24);
      fitted = true;
    }
  });

  // Responsive sizing.
  function resize() {
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 420;
    Graph.width(w).height(h);
  }
  resize();
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resize).observe(container);
  } else {
    window.addEventListener("resize", resize);
  }

  // Recolor instantly when the light/dark theme changes.
  document.addEventListener("themechange", () => {
    readPalette();
    Graph.nodeRelSize(6); // nudge the kapsule to repaint with the new palette
  });

  // Chip -> graph wiring.
  chips.forEach((chip) => {
    const id = chip.getAttribute("data-concept");
    const enter = () => setHover(id);
    const leave = () => setHover(null);
    chip.addEventListener("mouseenter", enter);
    chip.addEventListener("mouseleave", leave);
    chip.addEventListener("focus", enter);
    chip.addEventListener("blur", leave);
    chip.addEventListener("click", () => {
      togglePin(id);
      const node = nodes.find((n) => n.id === id);
      if (node && typeof node.x === "number") {
        Graph.centerAt(node.x, node.y, 500);
        Graph.zoom(2.2, 500);
      }
    });
  });
})();
