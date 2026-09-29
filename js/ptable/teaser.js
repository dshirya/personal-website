// Phones: a small self-playing bubble table and a note to come back on a computer.
import { createStage } from "./engine.js";
import { computeFrame } from "./views.js";
import { h } from "./panels.js";

const CYCLE = [
  ["density", "density"],
  ["melting_point", "melting point"],
  ["neutron_cross_section", "neutron absorption"],
  ["pauling_en", "electronegativity"],
];

export function mountTeaser(root, data) {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wrap = h("div", { class: "pt-teaser", "aria-hidden": "true" });
  root.append(wrap);
  const stage = createStage(wrap, data.elements, { hover() {}, select() {} });
  stage.svg.selectAll("g.el").attr("tabindex", null).attr("role", null);

  let i = 0;
  const show = (animate) => {
    const [prop, label] = CYCLE[i];
    const state = { view: "bubbles", prop, color: "class" };
    stage.render(computeFrame(state, data, null), animate ? 900 : 0);
    stage.card.replaceChildren(h("p", { class: "pt-teaser-caption" }, "size = ", h("strong", {}, label)));
  };
  show(false);
  const timer = reduceMotion
    ? null
    : setInterval(() => {
        i = (i + 1) % CYCLE.length;
        show(true);
      }, 3200);

  root.append(
    h("div", { class: "pt-teaser-note" },
      h("strong", {}, "Best on a bigger screen"),
      h("p", {},
        "This periodic table has 100+ properties, bubbles that resize with each one, scatter plots, a PCA map of the elements and stories from my research. ",
        "It's built for a computer: open danilashiryaev.me/periodic-table.html there to explore it."))
  );

  const onTheme = () => show(false);
  document.addEventListener("themechange", onTheme);
  return () => {
    clearInterval(timer);
    document.removeEventListener("themechange", onTheme);
  };
}
