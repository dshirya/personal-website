// Loads data/elements.json (built by scripts/build_elements.py) and adds lookups.

export async function loadData(url = "data/elements.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const data = await res.json();

  const props = new Map(data.properties.map((p) => [p.key, p]));
  const index = new Map(data.elements.map((e, i) => [e.symbol, i]));
  const corrections = new Map(
    data.corrections.map((c) => [`${c.symbol}:${c.key}`, c])
  );

  return {
    ...data,
    props,
    corrections,
    element: (symbol) => data.elements[index.get(symbol)],
    value: (key, symbol) => {
      const column = data.values[key];
      return column ? column[index.get(symbol)] : null;
    },
    column: (key) => data.values[key] || [],
  };
}

export const isNumeric = (prop) => prop.scale !== "category";

// Metal / metalloid / nonmetal for all 118 elements, from mendeleev's series.
export const CLASSES = ["metal", "metalloid", "nonmetal"];

export function elementClass(el) {
  if (["Nonmetals", "Noble gases", "Halogens"].includes(el.series)) return "nonmetal";
  if (el.series === "Metalloids") return "metalloid";
  return "metal";
}

// Research entries from data/research.js (a classic script) that contain an
// element, each with its paper from data/papers.js when published.
export function researchFor(symbol) {
  if (typeof RESEARCH === "undefined") return [];
  const papers = typeof PAPERS === "undefined" ? [] : PAPERS;
  return RESEARCH.filter((r) => r.elements.includes(symbol)).map((r) => ({
    ...r,
    paper: r.paper ? papers.find((p) => p.id === r.paper) || null : null,
  }));
}

// Chemical formula for display: digits become subscripts (Gd10RuCd3 -> Gd₁₀RuCd₃).
export const subscript = (formula) =>
  formula.replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[d]);
