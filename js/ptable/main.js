// Periodic table page entry: loads the element data and mounts either the full
// interactive table (>= 900px) or the phone teaser. State lives in the URL hash
// (e.g. #view=bubbles&p=neutron_cross_section&el=Gd) so every view is shareable.
import { loadData, isNumeric } from "./data.js";
import { createStage } from "./engine.js";
import { computeFrame } from "./views.js";
import {
  renderLegend, renderCard, renderDetails, renderDataTable, tooltipBuilder, h,
} from "./panels.js";
import { STORIES } from "./stories.js";
import { mountTeaser } from "./teaser.js";

const DEFAULTS = {
  view: "table", prop: "pauling_en", x: "atomic_radius_calc", y: "pauling_en",
  color: "class", el: null, story: null,
};
const VIEWS = [
  ["table", "Table"],
  ["bubbles", "Bubbles"],
  ["scatter", "Scatter"],
  ["pca", "PCA map"],
];
const HASH_KEYS = { view: "view", prop: "p", x: "x", y: "y", color: "c", el: "el", story: "story" };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DURATION = reduceMotion ? 0 : 850;

function readHash(data) {
  const params = new URLSearchParams(location.hash.slice(1));
  const state = {};
  for (const [key, param] of Object.entries(HASH_KEYS)) {
    const v = params.get(param);
    if (v != null) state[key] = v;
  }
  const numeric = (k) => data.props.has(k) && isNumeric(data.props.get(k));
  if (!VIEWS.some(([id]) => id === state.view)) delete state.view;
  if (state.prop && !data.props.has(state.prop)) delete state.prop;
  if (state.x && !numeric(state.x)) delete state.x;
  if (state.y && !numeric(state.y)) delete state.y;
  if (state.el && !data.elements.some((e) => e.symbol === state.el)) delete state.el;
  if (state.story && !STORIES.some((s) => s.id === state.story)) delete state.story;
  return state;
}

function writeHash(state) {
  const params = new URLSearchParams();
  for (const [key, param] of Object.entries(HASH_KEYS)) {
    if (state[key] != null && state[key] !== DEFAULTS[key]) params.set(param, state[key]);
  }
  const hash = params.toString();
  history.replaceState(null, "", hash ? `#${hash}` : location.pathname + location.search);
}

function propertySelect(data, { numericOnly }) {
  const select = h("select", {});
  for (const category of data.categories) {
    const group = h("optgroup", { label: category });
    for (const p of data.properties) {
      if (p.category !== category || (numericOnly && !isNumeric(p))) continue;
      if (p.key === "pc1" || p.key === "pc2") continue;
      group.append(h("option", { value: p.key }, p.label));
    }
    if (group.children.length) select.append(group);
  }
  return select;
}

const field = (label, control) => h("label", { class: "pt-field" }, label, control);

function mountApp(root, data) {
  const state = { ...DEFAULTS, ...readHash(data), highlight: null };
  let story = null;
  let hovered = null;

  // ---------------------------------------------------------------- DOM
  const storyButtons = STORIES.map((s) =>
    h("button", { type: "button", class: "pt-story", "data-story": s.id, "aria-pressed": "false" },
      h("span", { class: "pt-story-title" }, s.title),
      h("span", { class: "pt-story-teaser" }, s.teaser)));
  const tabs = VIEWS.map(([id, label]) =>
    h("button", { type: "button", role: "tab", "data-view": id }, label));
  const propSelect = propertySelect(data, { numericOnly: false });
  const xSelect = propertySelect(data, { numericOnly: true });
  const ySelect = propertySelect(data, { numericOnly: true });
  const colorSelect = h("select", {},
    h("option", { value: "class" }, "metal / metalloid / nonmetal"),
    h("option", { value: "value" }, "the size property"));
  const propField = field("Property", propSelect);
  const xField = field("X", xSelect);
  const yField = field("Y", ySelect);
  const colorField = field("Color", colorSelect);
  const pcaNote = h("span", { class: "pt-field pt-muted" },
    `PCA of ${data.pca.features.length} properties over ${data.pca.n} elements, the same technique as in my `,
    h("a", { href: "papers.html" }, "J. Chem. Educ. paper"));

  const caption = h("div", { class: "pt-caption", hidden: true, "aria-live": "polite" });
  root.append(
    h("div", { class: "pt-stories" }, storyButtons),
    h("div", { class: "pt-controls" },
      h("div", { class: "pt-views", role: "tablist", "aria-label": "View" }, tabs),
      propField, xField, yField, colorField, pcaNote),
    caption,
  );
  const stage = createStage(root, data.elements, { hover, select: selectElement });
  const legend = h("div", { class: "pt-legend" });
  const details = h("section", { class: "pt-details", hidden: true });
  const tableBody = h("div", {});
  const table = h("details", { class: "pt-datatable" }, h("summary", {}, "Data table"), tableBody);
  const corrected = new Set(
    [...data.corrections.values()].filter((c) => c.status !== "excluded").map((c) => c.symbol)
  ).size;
  const sources = h("p", { class: "pt-sources" },
    `Data: the lab elemental property list (${data.elements.filter((e) => e.inSheet).length} elements; `,
    `cells corrected for ${corrected} elements, marked in the details), the `,
    h("a", { href: "https://github.com/lmmentel/mendeleev", target: "_blank", rel: "noopener" }, "mendeleev"),
    " package (names, structures, discovery, supply) and ",
    h("a", { href: "https://www.nist.gov/pml/atomic-reference-data-electronic-structure-calculations", target: "_blank", rel: "noopener" }, "NIST SRD 141"),
    " (DFT energies). ",
    h("a", { href: "data/elements.json", download: "" }, "Download elements.json"),
    ".");
  root.append(legend, details, table, sources);

  // ---------------------------------------------------------------- render
  const scatterKeys = () =>
    state.view === "pca" ? ["pc1", "pc2"] : state.view === "scatter" ? [state.x, state.y] : [state.prop];

  function syncControls() {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.view === state.view)));
    storyButtons.forEach((b) => {
      const active = b.dataset.story === state.story;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    propField.hidden = !["table", "bubbles"].includes(state.view);
    propField.firstChild.textContent = state.view === "bubbles" ? "Size" : "Property";
    for (const option of propSelect.querySelectorAll("option")) {
      option.disabled = state.view === "bubbles" && !isNumeric(data.props.get(option.value));
    }
    xField.hidden = yField.hidden = state.view !== "scatter";
    colorField.hidden = state.view !== "bubbles";
    pcaNote.hidden = state.view !== "pca";
    propSelect.value = state.prop;
    xSelect.value = state.x;
    ySelect.value = state.y;
    colorSelect.value = state.color;
  }

  function refreshCard() {
    const symbol = hovered || state.el;
    const spec = symbol && stage.frame() && stage.frame().nodes.get(symbol);
    renderCard(stage.card, {
      data, prop: data.props.get(state.prop), symbol,
      fill: spec && spec.fill, ink: spec && spec.ink,
      override: story && story.cardValue && symbol ? story.cardValue(symbol) : null,
    });
  }

  function refreshTip() {
    const plot = state.view === "scatter" || state.view === "pca";
    stage.showTip(plot ? hovered : null, plot && hovered ? tooltipBuilder(data, scatterKeys(), hovered) : null);
  }

  function refreshTable() {
    table.querySelector("summary").textContent =
      `Data table · ${scatterKeys().map((k) => data.props.get(k).label).join(" vs ")}`;
    if (table.open) renderDataTable(tableBody, data, scatterKeys());
  }

  function update({ animate = true } = {}) {
    if (state.view === "bubbles" && !isNumeric(data.props.get(state.prop))) state.prop = DEFAULTS.prop;
    syncControls();
    const frame = computeFrame(state, data, story);
    stage.render(frame, animate ? DURATION : 0);
    renderLegend(legend, frame.legend, data);
    stage.mark(hovered, state.el);
    refreshCard();
    refreshTip();
    renderDetails(details, data, state.el, () => selectElement(null));
    refreshTable();
    writeHash(state);
  }

  // ---------------------------------------------------------------- handlers
  function hover(symbol) {
    if (symbol === hovered) return;
    hovered = symbol;
    stage.mark(hovered, state.el);
    refreshCard();
    refreshTip();
  }

  // Clicking the selected element again clears the selection.
  function selectElement(symbol, { toggle = true } = {}) {
    state.el = symbol && !(toggle && symbol === state.el) ? symbol : null;
    stage.mark(hovered, state.el);
    refreshCard();
    renderDetails(details, data, state.el, () => selectElement(null));
    writeHash(state);
  }

  function leaveStory() {
    if (!story) return;
    if (story.exit) story.exit();
    story = null;
    state.story = null;
    state.highlight = null;
    caption.hidden = true;
    caption.replaceChildren();
  }

  function enterStory(s) {
    leaveStory();
    story = s;
    Object.assign(state, s.state, { story: s.id });
    state.highlight = s.highlight ? s.highlight(data) : null;
    caption.replaceChildren(...s.caption(data, { update }));
    caption.hidden = false;
    update();
  }

  const change = (fn) => () => {
    leaveStory();
    fn();
    update();
  };
  tabs.forEach((t) => t.addEventListener("click", change(() => (state.view = t.dataset.view))));
  propSelect.addEventListener("change", change(() => (state.prop = propSelect.value)));
  xSelect.addEventListener("change", change(() => (state.x = xSelect.value)));
  ySelect.addEventListener("change", change(() => (state.y = ySelect.value)));
  colorSelect.addEventListener("change", change(() => (state.color = colorSelect.value)));
  storyButtons.forEach((b) =>
    b.addEventListener("click", () => {
      const s = STORIES.find((x) => x.id === b.dataset.story);
      if (story === s) {
        leaveStory();
        update();
      } else {
        enterStory(s);
      }
    }));
  table.addEventListener("toggle", refreshTable);

  const onTheme = () => update({ animate: false });
  document.addEventListener("themechange", onTheme);

  // First paint: tiles appear in place, then any story in the URL applies.
  const initialStory = STORIES.find((s) => s.id === state.story);
  state.story = null;
  update({ animate: false });
  if (initialStory) {
    const linked = state.el;
    enterStory(initialStory);
    if (linked) selectElement(linked, { toggle: false });
  }

  return () => {
    leaveStory();
    document.removeEventListener("themechange", onTheme);
  };
}

async function start() {
  const root = document.getElementById("ptable");
  let data;
  try {
    data = await loadData();
  } catch (error) {
    root.replaceChildren(h("p", {}, "Couldn't load the element data."));
    console.error(error);
    return;
  }
  const small = matchMedia("(max-width: 899px)");
  let cleanup = null;
  const mount = () => {
    if (cleanup) cleanup();
    root.replaceChildren();
    root.classList.toggle("is-teaser", small.matches);
    cleanup = (small.matches ? mountTeaser : mountApp)(root, data);
  };
  mount();
  small.addEventListener("change", mount);
}

start();
