// Renders paper cards from the PAPERS data array into #papers-list.
function escapeText(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function renderPapers() {
  const mount = document.getElementById("papers-list");
  if (!mount || typeof PAPERS === "undefined") return;

  mount.innerHTML = PAPERS.map((p) => {
    const title = p.titleHtml ? p.titleHtml : escapeText(p.title);
    const alt = escapeText(p.title || p.titleHtml.replace(/<[^>]+>/g, ""));
    return `
      <article class="paper">
        <img class="thumb" src="${p.thumb}" alt="${alt}" loading="lazy" />
        <div class="paper-content">
          <a href="${p.href}" target="_blank" rel="noopener">${title}</a>
          <p class="venue">${escapeText(p.venue)}</p>
        </div>
      </article>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", renderPapers);
