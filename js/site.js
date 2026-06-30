// Shared sidebar + top navigation, rendered on every page.
const PROFILE = {
  name: "Danila Shiryaev",
  photo: "images/photos/photo.jpg",
  role: "M2 Student",
  affiliation: "Institut Polytechnique de Paris",
};

const SOCIAL_LINKS = [
  { href: "https://github.com/dshirya", label: "GitHub", icon: "images/icons/github.png" },
  { href: "https://www.linkedin.com/in/danila-shiryaev-66ab94227/", label: "LinkedIn", icon: "images/icons/linkedin.png" },
  { href: "mailto:dshirya@gmail.com", label: "Email", icon: "images/icons/email.png" },
  { href: "https://scholar.google.com/citations?user=dIWlvCsAAAAJ&hl=en", label: "Google Scholar", icon: "images/icons/scholar.png" },
];

const NAV_LINKS = [
  { href: "index.html", label: "home" },
  { href: "papers.html", label: "papers" },
];

function currentPage() {
  const path = window.location.pathname.split("/").pop();
  return path === "" ? "index.html" : path;
}

const SUN_SVG = `
  <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <g stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
      <line x1="4.9" y1="4.9" x2="6.7" y2="6.7" />
      <line x1="17.3" y1="17.3" x2="19.1" y2="19.1" />
      <line x1="4.9" y1="19.1" x2="6.7" y2="17.3" />
      <line x1="17.3" y1="6.7" x2="19.1" y2="4.9" />
    </g>
  </svg>`;

const MOON_SVG = `
  <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" fill="currentColor" />
  </svg>`;

function renderTopbar() {
  if (document.querySelector(".topbar")) return;

  const active = currentPage();
  const nav = NAV_LINKS.map(
    (n) =>
      `<a href="${n.href}"${n.href === active ? ' class="active" aria-current="page"' : ""}>${n.label}</a>`
  ).join("");

  const header = document.createElement("header");
  header.className = "topbar";
  header.innerHTML = `
    <nav class="site-nav" aria-label="Primary">${nav}</nav>
    <button type="button" class="theme-toggle" aria-label="Toggle dark mode">
      ${SUN_SVG}${MOON_SVG}
    </button>
  `;

  document.body.insertBefore(header, document.body.firstChild);

  const toggle = header.querySelector(".theme-toggle");
  toggle.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
  });
  syncToggleLabel();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {
    /* localStorage unavailable */
  }
  syncToggleLabel();
  document.dispatchEvent(
    new CustomEvent("themechange", { detail: { theme } })
  );
}

function syncToggleLabel() {
  const toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;
  const isDark = document.documentElement.dataset.theme === "dark";
  toggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
  toggle.setAttribute("aria-pressed", String(isDark));
}

function renderSidebar() {
  const mount = document.getElementById("sidebar");
  if (!mount) return;

  const isExternal = (href) => /^(https?:|mailto:)/.test(href);

  const social = SOCIAL_LINKS.map(
    (s) =>
      `<a href="${s.href}"${isExternal(s.href) ? ' target="_blank" rel="noopener"' : ""}>
        <img src="${s.icon}" alt="${s.label}" />
      </a>`
  ).join("");

  mount.innerHTML = `
    <img class="profile" src="${PROFILE.photo}" alt="${PROFILE.name}" />
    <h1>${PROFILE.name}</h1>
    <p class="subtitle">${PROFILE.role}<br />${PROFILE.affiliation}</p>
    <div class="social-links">${social}</div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderTopbar();
  renderSidebar();
});
