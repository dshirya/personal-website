// d3 is loaded once by periodic-table.html as a single pinned file (dist/d3.min.js):
// sturdier and faster than the per-package ESM build, which needs ~30 requests.
export default window.d3;
