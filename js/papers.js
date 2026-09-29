// Renders paper cards from the PAPERS data array into #papers-list, with tag
// filters (labels from CONCEPT_NODES), BibTeX copy, and a full-size figure dialog.
function escapeText(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

const escapeAttr = (value) => escapeText(value).replace(/"/g, "&quot;");
const stripTags = (html) => html.replace(/<[^>]+>/g, "");

function selfName() {
  return typeof PROFILE !== "undefined" ? PROFILE.name : "Danila Shiryaev";
}

function conceptLabel(id) {
  const node =
    typeof CONCEPT_NODES !== "undefined" && CONCEPT_NODES.find((n) => n.id === id);
  return node ? node.label : id;
}

function authorsHtml(authors) {
  const self = selfName();
  return authors
    .map((a) =>
      a.replace(/[†*]/g, "") === self
        ? `<strong>${escapeText(a)}</strong>`
        : escapeText(a)
    )
    .join(", ");
}

// ACS style: Journal 2025, 147 (40), 36589–36603
function venueHtml(p) {
  let cite = `<strong>${p.year}</strong>`;
  if (p.volume) cite += `, <em>${escapeText(p.volume)}</em>`;
  if (p.issue) cite += ` (${escapeText(p.issue)})`;
  if (p.pages) cite += `, ${escapeText(p.pages)}`;
  return `<em>${escapeText(p.journal)}</em> <span class="nowrap">${cite}</span>`;
}

function linkBadges(p) {
  const labels = {
    free: "Free full text",
    preprint: "Preprint",
    code: "Code",
    data: "Data",
    notebook: "Notebook",
  };
  const badges = [];
  if (p.openAccess) {
    const title = p.license ? ` title="${escapeAttr(p.license)}"` : "";
    badges.push(`<span class="badge badge--oa"${title}>Open access</span>`);
  }
  Object.entries(labels).forEach(([key, label]) => {
    const href = p.links && p.links[key];
    if (href) {
      badges.push(
        `<a class="badge" href="${escapeAttr(href)}" target="_blank" rel="noopener">${label}</a>`
      );
    }
  });
  badges.push(
    `<button type="button" class="badge" data-bibtex="${escapeAttr(p.id)}">Copy BibTeX</button>`
  );
  return badges.join("");
}

function bibtex(p) {
  const authors = p.authors.map((a) => {
    const parts = a.replace(/[†*]/g, "").trim().split(" ");
    const family = parts.pop();
    return `${family}, ${parts.join(" ")}`;
  });
  const title = p.title
    .replace(/<sub>(.*?)<\/sub>/g, "$$_{$1}$$")
    .replace(/<sup>(.*?)<\/sup>/g, "$$^{$1}$$")
    .replace(/<[^>]+>/g, "");
  const stop = new Set(["a", "an", "the", "of", "for", "on", "in", "and", "with", "to"]);
  const keyWord = stripTags(p.title)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .find((w) => w && !stop.has(w));
  const key = `${authors[0].split(",")[0].toLowerCase()}${p.year}${keyWord || ""}`;

  const fields = [
    ["title", `{${title}}`],
    ["author", authors.join(" and ")],
    ["journal", p.journal],
    ["year", String(p.year)],
    ["volume", p.volume],
    ["number", p.issue],
    ["pages", p.pages && p.pages.replace("–", "--")],
    ["doi", p.doi],
  ].filter(([, v]) => v);
  const width = Math.max(...fields.map(([k]) => k.length));
  const body = fields
    .map(([k, v]) => `  ${k.padEnd(width)} = {${v}}`)
    .join(",\n");
  return `@article{${key},\n${body}\n}`;
}

function paperCard(p) {
  const fig = p.figure;
  const figure = fig
    ? `<button type="button" class="paper-figure" data-paper="${escapeAttr(p.id)}"
        aria-label="Enlarge figure: ${escapeAttr(fig.alt)}">
        <img src="images/papers/${escapeAttr(fig.file)}-800.webp" alt="${escapeAttr(fig.alt)}"
          loading="lazy" decoding="async" />
      </button>`
    : "";
  const credit =
    fig && fig.credit
      ? `<p class="paper-credit">Figure: ${escapeText(fig.credit)}</p>`
      : "";

  return `
    <article class="paper${fig ? "" : " paper--text"}" data-tags="${escapeAttr((p.tags || []).join(" "))}">
      ${figure}
      <div class="paper-body">
        <h3 class="paper-title">
          <a href="https://doi.org/${escapeAttr(p.doi)}" target="_blank" rel="noopener">${p.title}</a>
        </h3>
        <p class="paper-authors">${authorsHtml(p.authors)}</p>
        <p class="paper-venue">${venueHtml(p)}</p>
        <p class="paper-summary">${p.summary || ""}</p>
        <div class="paper-meta">${linkBadges(p)}</div>
        ${credit}
      </div>
    </article>
  `;
}

function renderFilters(mount, onChange) {
  // Most-used tags first.
  const counts = new Map();
  PAPERS.forEach((p) =>
    (p.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1))
  );
  const tags = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));

  mount.innerHTML = [
    `<button type="button" class="chip is-active" data-filter="" aria-pressed="true">all</button>`,
    ...tags.map(
      (t) =>
        `<button type="button" class="chip" data-filter="${escapeAttr(t)}" aria-pressed="false">${escapeText(conceptLabel(t))}</button>`
    ),
  ].join("");

  mount.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-filter]");
    if (!chip) return;
    const current = mount.querySelector(".chip.is-active");
    // Clicking the active tag again goes back to "all".
    const tag = chip === current ? "" : chip.dataset.filter;
    mount.querySelectorAll(".chip").forEach((c) => {
      const active = c.dataset.filter === tag;
      c.classList.toggle("is-active", active);
      c.setAttribute("aria-pressed", String(active));
    });
    onChange(tag);
  });
}

function figureDialog() {
  const dialog = document.createElement("dialog");
  dialog.className = "figure-dialog";
  dialog.innerHTML = `
    <form method="dialog">
      <button class="figure-dialog-close" aria-label="Close">&times;</button>
    </form>
    <img alt="" />
    <p class="figure-dialog-caption"></p>
  `;
  // Click on the backdrop (outside the content box) closes the dialog.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.body.appendChild(dialog);
  return dialog;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "absolute";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function renderPapers() {
  const mount = document.getElementById("papers-list");
  if (!mount || typeof PAPERS === "undefined") return;

  mount.innerHTML = PAPERS.map(paperCard).join("");

  const filters = document.getElementById("papers-filters");
  if (filters) {
    renderFilters(filters, (tag) => {
      mount.querySelectorAll(".paper").forEach((card) => {
        card.hidden = Boolean(tag) && !card.dataset.tags.split(" ").includes(tag);
      });
    });
  }

  let dialog = null;
  mount.addEventListener("click", (event) => {
    const figButton = event.target.closest(".paper-figure");
    if (figButton) {
      const p = PAPERS.find((x) => x.id === figButton.dataset.paper);
      dialog = dialog || figureDialog();
      const img = dialog.querySelector("img");
      img.src = `images/papers/${p.figure.file}-1600.webp`;
      img.alt = p.figure.alt;
      dialog.querySelector(".figure-dialog-caption").textContent = [
        p.figure.caption,
        p.figure.credit,
      ]
        .filter(Boolean)
        .join(" ");
      dialog.showModal();
      return;
    }

    const bibButton = event.target.closest("[data-bibtex]");
    if (bibButton) {
      const p = PAPERS.find((x) => x.id === bibButton.dataset.bibtex);
      copyText(bibtex(p)).then(() => {
        bibButton.textContent = "Copied!";
        setTimeout(() => (bibButton.textContent = "Copy BibTeX"), 1500);
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", renderPapers);
