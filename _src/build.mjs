// Assembles _src/pages/*.html into the site root.
//   node _src/build.mjs
// A page starts with  <!--meta {"title": "...", "desc": "...", "nav": "home"} -->
// and pulls partials in with  {{> name}}  (from _src/partials/name.html|svg).
// {{key}} is replaced with the page's meta value.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SRC, "..");
const partial = (name) => {
  for (const ext of [".html", ".svg"]) {
    const p = join(SRC, "partials", name + ext);
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  throw new Error(`missing partial ${name}`);
};

for (const file of readdirSync(join(SRC, "pages")).filter((f) => f.endsWith(".html"))) {
  let html = readFileSync(join(SRC, "pages", file), "utf8");
  const m = html.match(/^<!--meta (\{[\s\S]*?\}) -->\s*/);
  if (!m) throw new Error(`${file}: no meta block`);
  const meta = { file, ...JSON.parse(m[1]) };
  html = html.slice(m[0].length);
  // partials may include partials, so expand until stable
  for (let i = 0; i < 5 && html.includes("{{>"); i++) {
    html = html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => partial(n));
  }
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => meta[k] ?? "");
  html = html.replace(/data-nav="(\w+)"/g, (s, k) => (k === meta.nav ? `${s} aria-current="page"` : s));
  writeFileSync(join(ROOT, file), html);
  console.log("built", file);
}
