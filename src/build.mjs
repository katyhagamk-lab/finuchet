// Сборка одного файла index.html: node build.mjs [папка с контентом]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const contentDir = process.argv[2] || path.join(here, "content");
const read = (f) => fs.readFileSync(path.join(here, f), "utf8");
const b64 = (f) => fs.readFileSync(path.join(here, f)).toString("base64");
const modules = [];
if (fs.existsSync(contentDir)) {
  for (const id of fs.readdirSync(contentDir).filter((d) => /^m\d+$/.test(d)).sort()) {
    const d = path.join(contentDir, id); const f = fs.readdirSync(d);
    if (!f.some((x) => /^l\d+\.json$/.test(x))) continue;
    const m = f.includes("_module.json") ? JSON.parse(fs.readFileSync(path.join(d, "_module.json"), "utf8")) : { id, title: id, subtitle: "" }; delete m.issues;
    m.lessons = f.filter((x) => /^l\d+\.json$/.test(x)).sort().map((x) => JSON.parse(fs.readFileSync(path.join(d, x), "utf8")));
    m.practice = f.includes("practice.json") ? JSON.parse(fs.readFileSync(path.join(d, "practice.json"), "utf8")) : [];
    const c = f.includes("cards.json") ? JSON.parse(fs.readFileSync(path.join(d, "cards.json"), "utf8")) : {};
    m.flashcards = c.flashcards || []; m.cheatsheet = c.cheatsheet || [];
    modules.push(m);
  }
}
const bankDir = path.join(contentDir, "bank"), bankTests = {};
if (fs.existsSync(bankDir)) for (const f of fs.readdirSync(bankDir).filter((x) => /^t\d+\.json$/.test(x))) bankTests[+f.slice(1, 3)] = JSON.parse(fs.readFileSync(path.join(bankDir, f), "utf8"));
const schemeDir = path.join(here, "schemes"), schemeImg = {};
if (fs.existsSync(schemeDir)) for (const f of fs.readdirSync(schemeDir).filter((x) => x.endsWith(".webp"))) schemeImg[f.replace(".webp", "")] = "data:image/webp;base64," + fs.readFileSync(path.join(schemeDir, f)).toString("base64");
const fonts = `@font-face{font-family:"Inter Tight";font-weight:300 700;font-display:swap;src:url(data:font/woff2;base64,${b64("fonts/inter-cyrillic.woff2")}) format("woff2");unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"Inter Tight";font-weight:300 700;font-display:swap;src:url(data:font/woff2;base64,${b64("fonts/inter-latin.woff2")}) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Doto";font-weight:300 900;font-display:swap;src:url(data:font/woff2;base64,${b64("fonts/doto-digits.woff2")}) format("woff2");unicode-range:U+25,U+2B-2E,U+30-3A,U+2212}`;
// В JSON внутри <script> нельзя допускать закрывающий тег
const json = JSON.stringify({ modules }).replace(/<\/(script)/gi, "<\\/$1");
const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#E2E2E1"><meta name="robots" content="noindex, nofollow"><title>Финучёт: подготовка к контрольной</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%23F0558C'/%3E%3Ccircle cx='16' cy='16' r='9' fill='%23F9C2D3'/%3E%3Ccircle cx='16' cy='16' r='4' fill='%23DDF11B'/%3E%3C/svg%3E">
<style>${fonts}\n${read("styles.css")}</style></head><body><div id="app"></div>
<noscript>Для работы платформы нужен JavaScript.</noscript>
<script>window.CONTENT=${json};</script>
<script>${read("config.js")}</script>
<script>${read("exam.js")}</script>
<script>${read("generators.js")}</script>
<script>${read("notes.js")}</script>
<script>window.BANKTESTS=${JSON.stringify(bankTests).replace(/<\/(script)/gi, "<\\/$1")};window.SCHEME_IMG=${JSON.stringify(schemeImg)};</script>
<script>${read("schemes.js")}</script>
<script>${read("viz.js")}</script>
<script>${read("bankcalc.js")}</script>
<script>${read("bank.js")}</script>
<script>${read("app.js")}</script>
</body></html>`;
const out = path.join(here, "..", "index.html");
fs.writeFileSync(out, html);
const stat = modules.map((m) => `${m.id}: ${m.lessons.length} ур., ${m.lessons.flatMap((l) => l.sections).flatMap((s) => s.quiz).length} зад., ${m.practice.length} разб., ${m.flashcards.length} карт.`);
console.log(stat.join("\n") || "контента пока нет"); console.log("тестов банка:", Object.values(bankTests).reduce((a, x) => a + x.length, 0), "схем:", Object.keys(schemeImg).length); console.log("index.html:", (html.length / 1024 / 1024).toFixed(2), "МБ");
