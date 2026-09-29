// One-click story presets. Each sets the view/properties, may recolor the frame
// (decorate), and supplies a caption. Numbers in captions come from the data.
import { palette, fmt, textOn } from "./scales.js";
import { h } from "./panels.js";
import { subscript } from "./data.js";

const paper = (id) => (typeof PAPERS === "undefined" ? null : PAPERS.find((p) => p.id === id));

const doiLink = (id, text) => {
  const p = paper(id);
  return p ? h("a", { href: `https://doi.org/${p.doi}`, target: "_blank", rel: "noopener" }, text) : text;
};

// ------------------------------------------------------------------ lanthanide light
// Dominant emission of the trivalent ions (Eu2+ noted separately). Literal
// emission colors, so they deliberately sit outside the data palette.
const EMISSION = {
  La: { color: null, text: "none", note: "4f⁰: no f–f transitions, a clean host" },
  Ce: { color: "#8a73ff", text: "UV–blue", note: "broad 5d→4f band; the color depends on the host" },
  Pr: { color: "#ff6a3d", text: "red", note: "¹D₂→³H₄ red, or ³P₀ blue-green, depending on the host" },
  Nd: { color: null, text: "NIR", note: "1064 nm, the Nd:YAG laser line" },
  Pm: { color: null, text: "—", note: "radioactive, rarely used" },
  Sm: { color: "#ff8a2a", text: "orange", note: "⁴G₅/₂→⁶H₇/₂, about 600 nm" },
  Eu: { color: "#ff3b30", text: "red", note: "⁵D₀→⁷F₁,₂, 590–615 nm; Eu²⁺ emits blue instead" },
  Gd: { color: null, text: "UV", note: "311 nm; Gd³⁺ mostly hands its energy to other ions" },
  Tb: { color: "#3ddc6b", text: "green", note: "⁵D₄→⁷F₅, 545 nm" },
  Dy: { color: "#ffd23f", text: "yellow", note: "575 nm yellow plus 480 nm blue" },
  Ho: { color: "#8be04e", text: "green", note: "⁵S₂→⁵I₈, about 540 nm" },
  Er: { color: "#5fd068", text: "green", note: "about 545 nm, plus the 1.5 µm telecom line" },
  Tm: { color: "#3f7bff", text: "blue", note: "¹G₄→³H₆, about 475 nm" },
  Yb: { color: null, text: "NIR", note: "about 980 nm" },
  Lu: { color: null, text: "none", note: "4f¹⁴: no f–f transitions, a clean host" },
};
const INVISIBLE = "#3a4046";

// ------------------------------------------------------------------ research
// Compounds and groups come from data/research.js (RESEARCH, RESEARCH_GROUPS).
const research = () => (typeof RESEARCH === "undefined" ? [] : RESEARCH);
const researchGroups = () => (typeof RESEARCH_GROUPS === "undefined" ? [] : RESEARCH_GROUPS);

// Element -> its research entries.
function researchByElement() {
  const map = new Map();
  for (const r of research()) {
    for (const symbol of r.elements) map.set(symbol, [...(map.get(symbol) || []), r]);
  }
  return map;
}

// Tile label: the formula if one entry fits the tile, else a count.
function tileLabel(entries) {
  if (entries.length > 1) return `${entries.length} works`;
  const r = entries[0];
  const name = subscript(r.short || r.formula);
  return name.length <= 10 ? name : "1 work";
}

// ------------------------------------------------------------------ timeline
const ERAS = [
  { label: "antiquity", test: (y, el) => el.ancient },
  { label: "before 1800", test: (y) => y < 1800 },
  { label: "1800s", test: (y) => y < 1900 },
  { label: "1900s", test: (y) => y < 2000 },
  { label: "2000s", test: () => true },
];
const eraOf = (y, el) => ERAS.findIndex((e) => e.test(y, el));
const timeline = { year: 1869, timer: null };

export const STORIES = [
  {
    id: "neutron",
    title: "The neutron sponge",
    teaser: "Why Gd₁₀RuCd₃ made the list",
    state: { view: "bubbles", prop: "neutron_cross_section", color: "value", el: "Gd" },
    caption(data) {
      const v = (s) => data.value("neutron_cross_section", s);
      return [
        "Bubble area follows the thermal-neutron capture cross-section (log scale). Gadolinium's ",
        h("strong", {}, `${fmt(v("Gd"))} barns`),
        ` is about ${Math.round(v("Gd") / v("B"))}× boron's ${fmt(v("B"))}, the textbook absorber; samarium, europium and cadmium follow. Pairing Gd with Cd is what put `,
        doiLink("jacs-2025-gd10rucd3", "Gd₁₀RuCd₃"),
        " among the top 0.4% of neutron absorbers.",
      ];
    },
  },
  {
    id: "hund",
    title: "Hund's rule from DFT",
    teaser: "Half-filled shells light up",
    state: { view: "bubbles", prop: "spin_polarization", color: "value", el: null },
    caption(data) {
      const zero = data.elements
        .filter((e) => data.value("spin_polarization", e.symbol) === 0)
        .map((e) => e.symbol);
      return [
        "Bubble area is the energy a free atom gains by letting its electron spins polarize: E(LDA) − E(LSD) from the NIST DFT columns. Closed shells (",
        zero.join(", "),
        ") vanish, while half-filled shells peak: p³ nitrogen, d⁵ chromium and manganese, and f⁷ europium and gadolinium at ",
        h("strong", {}, `${fmt(data.value("spin_polarization", "Gd"))} eV`),
        ". Hund's first rule, straight out of the data.",
      ];
    },
  },
  {
    id: "light",
    title: "Lanthanide light",
    teaser: "The colors of 4f–4f emission",
    state: { view: "table", prop: "valence_f", el: "Eu" },
    highlight: () => new Set(Object.keys(EMISSION)),
    decorate(frame) {
      for (const [symbol, e] of Object.entries(EMISSION)) {
        const s = frame.nodes.get(symbol);
        const fill = e.color || INVISIBLE;
        Object.assign(s, { fill, ink: textOn(fill), valText: e.text, valOpacity: 1, symOpacity: 1 });
      }
      frame.legend = {
        type: "categorical",
        items: [
          ...["Eu", "Sm", "Dy", "Tb", "Tm"].map((s) => ({ label: `${s}³⁺ ${EMISSION[s].text}`, color: EMISSION[s].color })),
          { label: "UV, near-infrared or no f–f emission", color: INVISIBLE },
        ],
      };
    },
    cardValue: (symbol) => EMISSION[symbol] && `${EMISSION[symbol].text} · ${EMISSION[symbol].note}`,
    caption() {
      return [
        "Trivalent lanthanide ions glow in sharp, nearly host-independent colors from 4f–4f transitions: Eu³⁺ red, Tb³⁺ green, Dy³⁺ yellow, Tm³⁺ blue. La³⁺ and Lu³⁺ (4f⁰ and 4f¹⁴) have no f–f transitions at all, which is exactly why LaPO₄ makes a clean host for Eu³⁺, the system I ",
        h("a", { href: "index.html#research" }, "laser-treat at IP Paris"),
        ".",
      ];
    },
  },
  {
    id: "timeline",
    title: "Discovery timeline",
    teaser: "From antiquity to nihonium",
    state: { view: "table", prop: "discovery_year", el: null },
    decorate(frame, data) {
      const pal = palette();
      for (const el of data.elements) {
        const s = frame.nodes.get(el.symbol);
        const y = data.value("discovery_year", el.symbol);
        const known = el.ancient || (y != null && y <= timeline.year);
        if (!known) {
          Object.assign(s, { opacity: 0.12 });
          continue;
        }
        const fill = pal.ordinal5[eraOf(y, el)];
        Object.assign(s, { fill, ink: textOn(fill), valText: el.ancient ? "ancient" : fmt(y, { key: "discovery_year" }) });
      }
      frame.legend = {
        type: "categorical",
        items: ERAS.map((e, i) => ({ label: e.label, color: pal.ordinal5[i] })),
      };
    },
    caption(data, api) {
      const count = () =>
        data.elements.filter((el) => {
          const y = data.value("discovery_year", el.symbol);
          return el.ancient || (y != null && y <= timeline.year);
        }).length;
      const label = h("strong", {});
      const note = h("span", {});
      const slider = h("input", {
        type: "range", min: 1660, max: 2016, step: 1, value: timeline.year,
        "aria-label": "Year", class: "pt-year",
      });
      const play = h("button", { type: "button", class: "badge" }, "Play");
      const sync = () => {
        label.textContent = `${timeline.year}`;
        note.textContent = ` · ${count()} elements known` +
          (timeline.year === 1869 ? ", the year Mendeleev published his table" : "");
        slider.value = timeline.year;
      };
      const set = (year) => {
        timeline.year = year;
        sync();
        api.update({ animate: false });
      };
      slider.addEventListener("input", () => set(+slider.value));
      play.addEventListener("click", () => {
        clearInterval(timeline.timer);
        if (play.textContent === "Pause") {
          play.textContent = "Play";
          return;
        }
        play.textContent = "Pause";
        if (timeline.year >= 2016) set(1660);
        timeline.timer = setInterval(() => {
          if (timeline.year >= 2016 || !slider.isConnected) {
            clearInterval(timeline.timer);
            play.textContent = "Play";
            return;
          }
          set(Math.min(2016, timeline.year + 3));
        }, 60);
      });
      sync();
      return [h("div", { class: "pt-timeline" }, play, slider, h("span", {}, label, note))];
    },
    exit() {
      clearInterval(timeline.timer);
    },
  },
  {
    id: "research",
    title: "Elements in my research",
    teaser: "Papers and projects, on the table",
    state: { view: "table", prop: "pauling_en", el: null },
    highlight: () => new Set(researchByElement().keys()),
    decorate(frame) {
      const pal = palette();
      const order = researchGroups().map((g) => g.id);
      for (const [symbol, entries] of researchByElement()) {
        // An element in several groups (P: Ta3P and LaPO4) takes the first group's color.
        const i = Math.min(...entries.map((r) => order.indexOf(r.group)));
        Object.assign(frame.nodes.get(symbol), {
          fill: pal.cat[i], ink: textOn(pal.cat[i]), valText: tileLabel(entries), valOpacity: 1,
        });
      }
      frame.legend = {
        type: "categorical",
        items: researchGroups().map((g, i) => ({ label: subscript(g.label), color: pal.cat[i] })),
      };
    },
    caption() {
      const parts = [];
      for (const g of researchGroups()) {
        const entries = research().filter((r) => r.group === g.id);
        if (!entries.length) continue;
        parts.push(h("strong", {}, `${subscript(g.label)}: `));
        entries.forEach((r, i) => {
          const name = subscript(r.formula);
          parts.push(r.paper ? doiLink(r.paper, name) : name);
          if (r.note && r.note.includes("=")) parts.push(` (${r.note})`);
          parts.push(i < entries.length - 1 ? ", " : ". ");
        });
      }
      parts.push("Click an element for its compounds and every property.");
      return parts;
    },
  },
];
