// Compounds I've made, by project. Feeds the periodic table page: the
// "Elements in my research" story, the element card and the element details.
//
// `formula`: plain text; digits are shown as subscripts. For a series, give the
//   general formula once and list every element it covers in `elements`.
// `paper`: id from data/papers.js, if the work is published.
// `short`: optional tile label when the formula is too long for a tile.
// `group`: one of RESEARCH_GROUPS (at most three: the chart palette's limit).
const RESEARCH_GROUPS = [
  { id: "synthesis", label: "intermetallics & phosphides (papers)" },
  { id: "phosphors", label: "Eu-doped LaPO4, current project" },
  { id: "radiochem", label: "radiochemistry, Moscow State" },
];

const RESEARCH = [
  { formula: "Gd10RuCd3", elements: ["Gd", "Ru", "Cd"], group: "synthesis", paper: "jacs-2025-gd10rucd3" },
  { formula: "TbIr3", elements: ["Tb", "Ir"], group: "synthesis", paper: "jacs-2025-tbir3" },
  {
    formula: "RE4IrInGe4",
    note: "RE = Y, Ce–Nd, Sm, Gd, Ho–Er",
    elements: ["Y", "Ce", "Pr", "Nd", "Sm", "Gd", "Ho", "Er", "Ir", "In", "Ge"],
    group: "synthesis",
  },
  {
    formula: "RE7M4InGe12",
    note: "RE = Y, Gd–Er; M = Rh, Os",
    elements: ["Y", "Gd", "Tb", "Dy", "Ho", "Er", "Rh", "Os", "In", "Ge"],
    group: "synthesis",
  },
  { formula: "Ta3P", elements: ["Ta", "P"], group: "synthesis" },
  {
    formula: "LaPO4:Eu",
    note: "nanoparticles; laser-driven rhabdophane-to-monazite transition",
    elements: ["La", "P", "O", "Eu"],
    group: "phosphors",
  },
  { formula: "ferrates", note: "high-valent iron for water treatment", elements: ["Fe"], group: "radiochem" },
  { formula: "tritium-labeled molecules", short: "tritium", note: "probing liquid–liquid interfaces", elements: ["H"], group: "radiochem" },
];
