(function () {
  "use strict";
  const MODS = (window.CONTENT && window.CONTENT.modules) || [], EX = window.EXAM, G = window.GEN, TASKS = EX.tasks;
  const COLORS = { m1: "#3FB568", m2: "#6E9BE8", m3: "#F4902F", m4: "#F0558C", m5: "#B23FA3", m6: "#EC7558", m7: "#8EBB2C", m8: "#6FA7B8" };
  const SHORT = { m1: "Основы", m2: "Объекты и отчёты", m3: "Техника учёта", m4: "Операционка", m5: "ОС и НМА", m6: "Вложения и займы", m7: "Результат", m8: "Анализ" };
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $("#app");
  const ICON = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 19.5c1.2-3.3 3.9-5 7-5s5.8 1.7 7 5"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    print: '<svg viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-3M7 14h10v7H7z"/></svg>',
  };

  /* ---------- Хранилище ---------- */
  const KEY = "finuchet-platform-v1";
  const DEF = () => ({ v: 1, quiz: {}, manual: {}, practice: {}, notes: {}, cards: {}, train: {}, forms: {}, formsDone: {}, examDate: "", mock: { active: null, history: [] }, days: {}, seen: {} });
  let S = DEF(), memoryOnly = false;
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(DEF(), JSON.parse(raw)); } catch (e) { memoryOnly = true; }
  if (!S.examDate && window.DAYPLAN) S.examDate = window.DAYPLAN.exam;
  const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { memoryOnly = true; } };
  const save = () => { saveLocal(); queuePush(); };
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  /* ---------- Облако: код аккаунта ---------- */
  const CLOUD = window.FU_CLOUD || {}, CODE_KEY = "finuchet-account-code";
  const cloudOn = () => !!(CLOUD.url && CLOUD.key);
  let accCode = null; try { accCode = localStorage.getItem(CODE_KEY); } catch (e) {}
  const sync = { state: "idle", at: null, err: "" };
  const ALPH = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  function newCode() { const b = new Uint8Array(16); crypto.getRandomValues(b); let s = ""; for (let i = 0; i < 16; i++) { s += ALPH[b[i] % 32]; if (i % 4 === 3 && i < 15) s += "-"; } return "FU-" + s; }
  function normCode(v) {
    const cyr = { А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "0", Р: "P", С: "C", Т: "T", Х: "X", У: "Y" };
    let x = String(v || "").toUpperCase().replace(/[А-ЯЁ]/g, (c) => cyr[c] || c).replace(/[^0-9A-Z]/g, "");
    if (x.startsWith("FU")) x = x.slice(2);
    x = x.replace(/O/g, "0").replace(/I/g, "1");
    if (x.length !== 16 || [...x].some((c) => !ALPH.includes(c))) return null;
    return "FU-" + x.match(/.{4}/g).join("-");
  }
  const cloudHeaders = () => { const h = { "Content-Type": "application/json", apikey: CLOUD.key }; if (/^eyJ/.test(CLOUD.key)) h.Authorization = "Bearer " + CLOUD.key; return h; };
  async function rpc(fn, body, keepalive) {
    const r = await fetch(`${String(CLOUD.url).replace(/\/$/, "")}/rest/v1/rpc/${fn}`, { method: "POST", headers: cloudHeaders(), body: JSON.stringify(body), keepalive: !!keepalive });
    const t = await r.text(); if (!r.ok) throw new Error(`${r.status}: ${t}`.slice(0, 220)); return t ? JSON.parse(t) : null;
  }
  function mergeState(a, b) {
    if (!b || typeof b !== "object") return a;
    const o = Object.assign(DEF(), JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a)));
    o.quiz = {}; new Set([...Object.keys(a.quiz || {}), ...Object.keys(b.quiz || {})]).forEach((k) => { const x = (a.quiz || {})[k], y = (b.quiz || {})[k]; o.quiz[k] = !x ? y : !y ? x : (y.t || 0) > (x.t || 0) ? y : x; });
    ["manual", "practice", "formsDone"].forEach((f) => { o[f] = Object.assign({}, b[f] || {}, a[f] || {}); Object.keys(b[f] || {}).forEach((k) => { if (b[f][k]) o[f][k] = true; }); });
    o.notes = Object.assign({}, b.notes || {}); Object.entries(a.notes || {}).forEach(([k, v]) => { if (v) o.notes[k] = v; });
    o.cards = Object.assign({}, b.cards || {}); Object.entries(a.cards || {}).forEach(([k, v]) => { o.cards[k] = Math.max(v || 1, o.cards[k] || 1); });
    o.train = Object.assign({}, b.train || {}); Object.entries(a.train || {}).forEach(([k, v]) => { if (!o.train[k] || (v.total || 0) >= (o.train[k].total || 0)) o.train[k] = v; });
    o.forms = Object.assign({}, b.forms || {}); Object.entries(a.forms || {}).forEach(([k, v]) => { o.forms[k] = typeof v === "object" && v ? Object.assign({}, o.forms[k] || {}, v) : v; });
    o.days = Object.assign({}, b.days || {}); Object.entries(a.days || {}).forEach(([k, v]) => { o.days[k] = Math.max(v, o.days[k] || 0); });
    const hist = [...((b.mock || {}).history || []), ...((a.mock || {}).history || [])], seen = new Set();
    o.mock = { active: (a.mock || {}).active || (b.mock || {}).active || null, history: hist.filter((r) => { const k = r.ts + ":" + r.mode + ":" + (r.v || ""); if (seen.has(k)) return false; seen.add(k); return true; }).sort((x, y) => x.ts - y.ts) };
    o.examDate = a.examDate || b.examDate || ""; o.planMode = a.planMode || b.planMode;
    return o;
  }
  let pushTimer = null, dirty = false;
  function queuePush() { if (!cloudOn() || !accCode) return; dirty = true; clearTimeout(pushTimer); pushTimer = setTimeout(() => push(false), 1500); }
  async function push(keep) {
    if (!cloudOn() || !accCode || !dirty) return; dirty = false; sync.state = "saving"; paintSync();
    try { await rpc("fu_save", { p_code: accCode, p_data: S }, keep); sync.state = "ok"; sync.at = Date.now(); sync.err = ""; }
    catch (e) { dirty = true; sync.state = "error"; sync.err = String(e.message || e); }
    paintSync();
  }
  async function pull(rerender) {
    if (!cloudOn() || !accCode) return false;
    sync.state = "saving"; paintSync();
    try {
      const r = await rpc("fu_get", { p_code: accCode }), before = JSON.stringify(S);
      if (r && r.data) S = mergeState(S, r.data);
      const changed = JSON.stringify(S) !== before; saveLocal();
      sync.state = "ok"; sync.at = Date.now(); sync.err = "";
      if (!r || !r.data || changed || dirty) { dirty = true; await push(false); }
      if (changed && rerender) softRerender();
      paintSync(); return { found: !!(r && r.data), changed };
    } catch (e) { sync.state = "error"; sync.err = String(e.message || e); paintSync(); throw e; }
  }
  function softRerender() { const a = document.activeElement; if (a && a.matches && a.matches("input,textarea,select")) return; const y = window.scrollY; route(); window.scrollTo(0, y); }
  function paintSync() {
    const dot = $("#acc-dot"); if (dot) dot.className = "acc-dot " + (accCode && cloudOn() ? sync.state : "off");
    const st = $("#sync-status"); if (st) st.innerHTML = syncText();
  }
  function syncText() {
    if (!cloudOn()) return "Облако ещё не подключено: прогресс сохраняется только в этом браузере.";
    if (!accCode) return "Код не введён: прогресс сохраняется только в этом браузере.";
    if (sync.state === "saving") return "Сохраняю в облако…";
    if (sync.state === "error") return `Нет связи с облаком. Прогресс сохранён в браузере и уйдёт в облако, когда связь появится.`;
    if (sync.at) return `Сохранено в облаке в ${new Date(sync.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
    return "Облако подключено.";
  }
  const today = () => new Date().toISOString().slice(0, 10);
  const bump = () => { const d = today(); S.days[d] = (S.days[d] || 0) + 1; };

  /* ---------- Индексы ---------- */
  const LESSONS = [], LMAP = {}, QREG = {}, PMAP = {}, LINKS = {};
  MODS.forEach((m) => {
    (m.lessons || []).forEach((l, li) => {
      l.mod = m; l.idx = LESSONS.length; l.li = li; LESSONS.push(l); LMAP[l.id] = l;
      (l.examTasks || []).forEach((n) => (LINKS[n] = LINKS[n] || []).push(l));
      (l.sections || []).forEach((s, si) => (s.quiz || []).forEach((q, qi) => { QREG[`${l.id}.s${si}.q${qi}`] = { item: q, lesson: l, sec: si }; }));
    });
    (m.practice || []).forEach((p) => { p.mod = m; PMAP[p.id] = p; });
  });
  TASKS.forEach((t) => { QREG[`exam.${t.n}`] = { item: t.quiz, task: t }; });
  const OPENQ = [], openItem = (o, q) => ({ type: "open", q: q || o.q, kw: o.kw, need: o.need, model: o.model, why: o.model });
  MODS.forEach((m) => (m.open || []).forEach((o) => { if (!o.kw) return; o.mod = m; OPENQ.push(o); QREG[`open.${o.id}`] = { item: openItem(o), lesson: LMAP[o.lesson], open: o }; }));
  MODS.forEach((m) => (m.practice || []).forEach((p) => { if (p.open && p.open.kw) QREG[`pr.${p.id}`] = { item: openItem(p.open), bankRef: { label: `Практикум: ${p.title}`, link: `p/${p.id}`, cond: [] } }; }));
  const openFor = (lid) => OPENQ.filter((o) => o.lesson === lid);
  const BK = window.BANK, SCH = window.SCHEMES || [], SIMG = window.SCHEME_IMG || {};
  const SCHEMES = SCH.filter((x) => SIMG[x.id]);
  Object.keys(BK.bank).forEach((n) => BK.bank[n].forEach((t, i) => { QREG[`bank.${n}.${i}`] = { item: t.quiz, bankRef: { label: n === "18" ? `Банк, сквозная задача «${t.company}»` : `Банк, задание ${n}`, link: `bank/${n}`, cond: t.cond } }; }));
  BK.variants.forEach((v) => v.tasks.forEach((t) => { QREG[`var.${v.id}.${t.n}`] = { item: t.quiz, bankRef: { label: `${v.title}, задание ${t.n}`, link: `v/${v.id}/study`, cond: t.cond } }; }));
  const LESSON_EXAM = { "m1-l11": [1], "m1-l02": [2], "m2-l05": [3], "m4-l03": [4], "m4-l05": [5], "m7-l06": [6], "m1-l06": [7], "m7-l07": [8], "m2-l06": [9], "m2-l11": [10], "m4-l10": [11], "m4-l13": [12], "m5-l09": [13], "m6-l05": [14], "m6-l09": [15], "m6-l14": [16], "m7-l02": [17], "m3-l09": [18, 19], "m7-l01": [20], "m2-l13": [21, 22] };
  const VZ = window.VIZ || [];
  const vizFor = (kind, key) => VZ.filter((v) => (kind === "lesson" ? (v.lessons || []).includes(key) : (v.tasks || []).includes(key)));
  const vizBlock = (v) => `<section class="viz" data-viz="${v.id}"><header><span class="tag lime">Наглядно</span><h3>${esc(v.title)}</h3><p>${esc(v.note)}</p></header><div class="viz-body">${v.render(v.init())}</div></section>`;
  const schemesFor = (kind, key) => SCHEMES.filter((x) => (kind === "lesson" ? (x.lessons || []).includes(key) : (x.tasks || []).includes(key)));
  const lessonQids = (l) => (l.sections || []).flatMap((s, si) => (s.quiz || []).map((_, qi) => `${l.id}.s${si}.q${qi}`));
  const secQids = (l, si) => (l.sections[si].quiz || []).map((_, qi) => `${l.id}.s${si}.q${qi}`);
  const isOk = (q) => !!(S.quiz[q] && S.quiz[q].ok === true);
  const isTried = (q) => !!S.quiz[q];
  const secState = (l, si) => { if (S.manual[l.id]) return "done"; const ids = secQids(l, si); if (ids.length && ids.every(isOk)) return "done"; return ids.some(isTried) ? "part" : "new"; };
  const lessonState = (l) => { if (S.manual[l.id]) return "done"; const ids = lessonQids(l); if (ids.length && ids.every(isOk)) return "done"; return ids.some(isTried) ? "part" : "new"; };
  const modProgress = (m) => { const ls = m.lessons || []; if (!ls.length) return 0; const done = ls.reduce((a, l) => { if (S.manual[l.id]) return a + 1; const ids = lessonQids(l); return a + (ids.length ? ids.filter(isOk).length / ids.length : 0); }, 0); return Math.round((done / ls.length) * 100); };
  const taskMastery = (n) => { const s = isOk(`exam.${n}`) ? 1 : 0, ls = LINKS[n] || []; if (!ls.length) return s; const ids = ls.flatMap(lessonQids), q = ids.length ? ids.filter(isOk).length / ids.length : 0; return 0.6 * s + 0.4 * q; };
  const readiness = () => Math.round((TASKS.reduce((a, t) => a + taskMastery(t.n), 0) / TASKS.length) * 100);
  const mistakes = () => Object.keys(S.quiz).filter((q) => S.quiz[q].ok === false && QREG[q]);
  const daysLeft = () => { if (!S.examDate) return null; const d = new Date(S.examDate + "T00:00:00"), t = new Date(today() + "T00:00:00"); return Math.round((d - t) / 86400000); };

  /* ---------- Текст ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const md = (s) => esc(s).replace(/(\d) (?=\d{3}(?:\D|$))/g, "$1\u00A0").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; if (m > 10 && m < 20) return c; if (k > 1 && k < 5) return b; if (k === 1) return a; return c; };
  const hash32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const seeded = (arr, seedStr) => { let x = hash32(seedStr) || 1; const r = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; const a = arr.map((v, i) => ({ v, i })); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const parseNum = (v) => { let s = String(v == null ? "" : v).replace(/[\s ]/g, "").replace(",", ".").replace(/[−–—]/g, "-"); let neg = false; const m = s.match(/^\((.*)\)$/); if (m) { s = m[1]; neg = true; } if (s === "" || isNaN(+s)) return NaN; return neg ? -Math.abs(+s) : +s; };
  const fmt = (x) => G.fmt(x);

  /* ---------- Блоки контента ---------- */
  function renderTable(b) {
    const al = b.align || [];
    const cls = (i) => (al[i] === "r" ? ' class="r"' : "");
    return `${b.caption ? `<div class="tbl-cap">${md(b.caption)}</div>` : ""}<div class="tbl-wrap"><table><thead><tr>${b.head.map((h, i) => `<th${cls(i)}>${md(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r, ri) => `<tr${b.totalLast && ri === b.rows.length - 1 ? ' class="tot"' : ""}>${r.map((c, i) => `<td${cls(i)}>${md(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  const NOTE = { tip: "Подсказка", trap: "Ловушка", exam: "На контрольной", law: "Норма" };
  function renderBlock(b) {
    switch (b.t) {
      case "p": return `<p>${md(b.text)}</p>`;
      case "def": return `<div class="b-def"><b>${md(b.term)}</b>${md(b.text)}${b.src ? `<small>${md(b.src)}</small>` : ""}</div>`;
      case "list": { const tag = b.ordered ? "ol" : "ul"; return `<${tag} class="b-list">${b.items.map((i) => `<li>${md(i)}</li>`).join("")}</${tag}>`; }
      case "table": return `<div>${renderTable(b)}</div>`;
      case "formula": return `<div class="b-formula">${md(b.text)}${b.note ? `<small>${md(b.note)}</small>` : ""}</div>`;
      case "example": return `<div class="b-ex"><h4>${md(b.title)}</h4>${b.given ? `<p class="given">${md(b.given)}</p>` : ""}<ol>${b.steps.map((s) => `<li><span>${md(s)}</span></li>`).join("")}</ol>${b.result ? `<span class="res">${md(b.result)}</span>` : ""}</div>`;
      case "entries": return `<div>${b.caption ? `<div class="tbl-cap">${md(b.caption)}</div>` : ""}<div class="tbl-wrap"><table><thead><tr><th>Операция</th><th>Дебет</th><th>Кредит</th><th class="r">Сумма</th></tr></thead><tbody>${b.rows.map((r) => `<tr><td>${md(r.op)}</td><td>${md(r.dt)}</td><td>${md(r.kt)}</td><td class="r">${md(r.sum)}</td></tr>`).join("")}</tbody></table></div></div>`;
      case "eq": return `<div>${b.caption ? `<div class="tbl-cap">${md(b.caption)}</div>` : ""}<div class="tbl-wrap"><table><thead><tr><th>Операция</th><th>Активы</th><th>Капитал</th><th>Обязательства</th></tr></thead><tbody>${b.rows.map((r) => `<tr><td>${md(r.op)}</td><td class="eq-a">${md(r.a)}</td><td class="eq-k">${md(r.k)}</td><td class="eq-o">${md(r.o)}</td></tr>`).join("")}</tbody></table></div></div>`;
      case "note": { const sp = b.kind === "exam" ? spoilerTasks(b.text) : []; if (sp.length) return `<details class="b-note exam spoiler"><summary><b>${sp.length > 1 ? `Подсказка к заданиям ${sp.join(" и ")}` : `Подсказка к заданию ${sp[0]}`} контрольной</b><span class="tiny">Внутри подсказка к ответу. Сначала попробуй решить ${sp.map((n) => `<a href="#/exam/${n}">задание ${n}</a>`).join(" и ")} сама.</span></summary><span>${md(b.text)}</span></details>`; return `<div class="b-note ${b.kind}"><b>${NOTE[b.kind] || ""}</b><span>${md(b.text)}</span></div>`; }
      case "case": return renderCase(b.part);
      case "scheme": { const x = SCHEMES.find((y) => y.id === b.id); return x ? schemeFigure(x) : ""; }
      default: return "";
    }
  }
  const renderBlocks = (list) => (list || []).map(renderBlock).join("");
  /* Врезки «к заданию N» с ответом на тестовое задание прячем, пока задание не решали */
  const CHOICE_TASKS = new Set(TASKS.filter((t) => t.quiz.type === "choice").map((t) => t.n));
  function spoilerTasks(text) {
    const out = new Set();
    String(text).replace(/задани\S*\s+([\d\s,и–-]+)/gi, (m, g) => { (g.match(/\d+(?:\s*[–-]\s*\d+)?/g) || []).forEach((x) => { const [a, b] = x.split(/\s*[–-]\s*/).map(Number); for (let i = a; i <= (b || a); i++) out.add(i); }); return m; });
    return [...out].filter((n) => CHOICE_TASKS.has(n) && !isTried(`exam.${n}`)).sort((a, b) => a - b);
  }
  function schemeFigure(x, opt = {}) {
    return `<figure class="scheme" id="sch-${x.id}"><button class="scheme-img" data-act="zoom" data-id="${x.id}" aria-label="Открыть схему «${esc(x.title)}» на весь экран"><img loading="lazy" decoding="async" src="${SIMG[x.id]}" alt="${esc(x.title)}: ${esc(x.text.join(". "))}"></button><figcaption>${opt.noTitle ? "" : `<b>${esc(x.title)}</b>`}<span>${md(x.note || "")}</span><details><summary>Текст схемы</summary><ul>${x.text.map((t) => `<li>${md(t)}</li>`).join("")}</ul></details></figcaption></figure>`;
  }
  const schemeStrip = (list) => (list.length ? `<div class="scheme-strip">${list.map((x) => schemeFigure(x)).join("")}</div>` : "");
  function renderCase(open) {
    const c = EX.caseSteps;
    const parts = [["open", "Шаг 1. Из ОСВ в баланс на начало года", c.open], ["ops", "Шаг 2. Разбор всех операций", c.ops], ["pl", "Шаг 3. Отчёт о финансовых результатах", c.pl], ["cf", "Шаг 4. Отчёт о движении денежных средств", c.cf], ["bs", "Шаг 5. Баланс на конец года и сверка", c.bs]];
    return `<div class="case-steps">${parts.map(([k, title, body]) => `<details class="case-step"${k === open ? " open" : ""}><summary>${title}</summary><div class="blocks">${renderBlocks(body)}</div></details>`).join("")}</div>`;
  }

  /* ---------- Движок заданий ---------- */
  const EPH = {}; // временные задания тренажёра и пробной
  const getQ = (qid) => (EPH[qid] ? EPH[qid] : QREG[qid] ? QREG[qid].item : null);
  function quizHTML(qid, item, o = {}) {
    const mock = !!o.mock, st = mock ? null : S.quiz[qid], solved = st && st.ok, was = st && st.ok === false;
    const badge = was && !o.noBadge ? `<span class="tag bad" style="margin-bottom:8px">Было неверно, реши ещё раз</span>` : "";
    let body = "";
    if (item.type === "choice" || item.type === "multi") {
      const order = item.keep ? item.options.map((v, i) => ({ v, i })) : seeded(item.options, qid);
      const multi = item.type === "multi";
      const ans = mock ? S.mock.active && S.mock.active.answers[qid] : null;
      body = `<div class="opts">${order.map(({ v, i }) => { let cl = multi ? "opt square" : "opt"; if (solved && (multi ? item.answer.includes(i) : item.answer === i)) cl += " right"; if (mock && ans === i) cl += " sel"; return `<button class="${cl}" data-act="opt" data-i="${i}"${solved ? " disabled" : ""}><i></i><span>${md(v)}</span></button>`; }).join("")}</div>`;
      if (multi && !solved && !mock) body += `<div class="qz-actions"><button class="pill ink" data-act="check">Проверить</button></div>`;
    } else if (item.type === "tf") {
      body = `<div class="opts" style="flex-direction:row;gap:8px">${[["Верно", true], ["Неверно", false]].map(([t, v]) => `<button class="opt${solved && item.answer === v ? " right" : ""}" style="flex:1" data-act="tf" data-v="${v}"${solved ? " disabled" : ""}><i></i><span>${t}</span></button>`).join("")}</div>`;
    } else if (item.type === "number") {
      const v = solved ? fmt(item.answer) : "";
      body = `<div class="num-row"><input class="num${solved ? " right" : ""}" inputmode="decimal" autocomplete="off" aria-label="Ответ" value="${v}"${solved ? " disabled" : ""} data-enter="check">${item.unit ? `<span class="muted small">${esc(item.unit)}</span>` : ""}</div><div class="qz-actions">${solved ? "" : `<button class="pill ink" data-act="check">Проверить</button>`}${item.hint && !solved ? `<button class="pill ghost" data-act="hint">Подсказка</button>` : ""}</div>`;
    } else if (item.type === "fields") {
      const ans = mock ? (S.mock.active && S.mock.active.answers[qid]) || {} : {};
      body = `<div class="fields">${item.fields.map((f, i) => `${f.group ? `<div class="field-group">${esc(f.group)}</div>` : ""}<label class="field"><span>${md(f.label)}</span><input class="num${solved ? " right" : ""}" inputmode="text" autocomplete="off" data-f="${i}" value="${solved ? fmt(f.answer) : mock && ans[i] != null ? esc(ans[i]) : ""}"${solved ? " disabled" : ""} data-enter="check"><span class="expect"></span></label>`).join("")}</div>${mock ? "" : `<div class="qz-actions">${solved ? "" : `<button class="pill ink" data-act="check">Проверить</button><button class="pill ghost" data-act="show">Показать ответ</button>`}</div>`}`;
    } else if (item.type === "open") {
      const prev = ((S.openAns || {})[qid]) || "";
      body = `<textarea class="open-in" rows="3" placeholder="Напиши ответ своими словами" aria-label="Твой ответ"${solved ? " disabled" : ""}>${esc(prev)}</textarea><div class="qz-actions">${solved ? "" : `<button class="pill ink" data-act="check">Проверить</button><button class="pill ghost" data-act="show">Показать ответ</button>`}</div>`;
    } else if (item.type === "sort") {
      const order = seeded(item.items, qid);
      body = `<div class="sort-list">${order.map(({ v, i }) => `<div class="sort-item${solved ? " right" : ""}" data-i="${i}"><span>${md(v.text)}</span><div class="sort-b">${item.buckets.map((b, bi) => `<button data-act="pick" data-b="${bi}" class="${solved && v.b === bi ? "on" : ""}"${solved ? " disabled" : ""}>${esc(b)}</button>`).join("")}</div></div>`).join("")}</div><div class="qz-actions">${solved ? "" : `<button class="pill ink" data-act="check">Проверить</button>`}</div>`;
    }
    const fb = solved && !o.hideWhy ? `<div class="fb ok"><b>${item.type === "open" ? "Засчитано" : "Верно"}</b>${item.type === "open" ? `<div class="model"><b>Образцовый ответ</b>${md(item.model)}</div>` : md(item.why)}</div><div class="qz-actions"><button class="pill ghost" data-act="redo">Решить заново</button></div>` : "";
    return `<div class="qz" data-q="${esc(qid)}"${mock ? ' data-mock="1"' : ""}>${badge}${o.noQ ? "" : `<p class="q">${md(item.q)}</p>`}${body}<div class="fb-slot">${fb}</div></div>`;
  }
  function record(qid, ok) {
    if (EPH[qid]) { const id = EPH[qid].trainId; if (id) { const t = (S.train[id] = S.train[id] || { ok: 0, total: 0 }); if (!EPH[qid].counted) { t.total++; if (ok) t.ok++; EPH[qid].counted = true; } save(); paintTrainStat(id); } return; }
    const prev = S.quiz[qid];
    S.quiz[qid] = { ok, first: prev ? prev.first : ok, tries: (prev ? prev.tries : 0) + 1, t: Date.now() };
    bump(); save(); paintProgress(qid);
    const bs = $("#bank-stat"); if (bs && qid.startsWith("bank.")) { const n = qid.split(".")[1]; bs.textContent = `Решено ${bankDone(n)} из ${BK.bank[n].length}`; }
  }
  function feedback(el, ok, item, extra) {
    const slot = $(".fb-slot", el);
    const redo = ok ? `<div class="qz-actions"><button class="pill ghost" data-act="redo">Решить заново</button></div>` : `<div class="qz-actions"><button class="pill ghost" data-act="retry">Попробовать ещё раз</button></div>`;
    slot.innerHTML = `<div class="fb ${ok ? "ok" : "bad"}"><b>${ok ? "Верно" : "Не совпало"}</b>${extra ? `${md(extra)}<br>` : ""}${md(item.why)}</div>${redo}`;
    revealExam(el);
  }
  const revealExam = (el) => { const box = el.closest(".exam-inline"); if (box) { $$(".exam-inline-sol", box).forEach((x) => (x.hidden = false)); return; } const qid = el.dataset.q; if (qid && qid.startsWith("exam.")) { const s = $("#sol"); if (s) s.hidden = false; const e = $("#sol-btn"); if (e) e.hidden = true; unlockPhoto(); } };
  const unlockPhoto = () => { const a = $("#photo-note"), b = $("#photo-lock"); if (a) a.hidden = false; if (b) b.remove(); };
  function openFeedback(item, r) {
    const chips = r.hits.map((h) => `<span class="kw ${h.ok ? "ok" : "miss"}">${h.ok ? "✓" : "✗"} ${esc(h.l)}</span>`).join("");
    return `<div class="fb ${r.ok ? "ok" : "bad"}"><b>${r.ok ? "Засчитано" : "Пока не засчитано"}</b>Названо ключевых идей: ${r.found} из ${r.total}, для зачёта нужно ${r.need}.<div class="kw-list">${chips}</div><div class="model"><b>Образцовый ответ</b>${md(item.model)}</div></div><div class="qz-actions"><button class="pill ghost" data-act="${r.ok ? "redo" : "retry"}">${r.ok ? "Решить заново" : "Дополнить ответ"}</button></div>`;
  }
  function checkField(f, input) { const v = parseNum(input.value); const tol = f.tol || 0; return !isNaN(v) && Math.abs(v - f.answer) <= tol + 1e-9; }
  function doCheck(el) {
    const qid = el.dataset.q, item = getQ(qid); if (!item) return;
    if (item.type === "number") {
      const inp = $(".num", el), v = parseNum(inp.value);
      if (isNaN(v)) { inp.focus(); $(".fb-slot", el).innerHTML = `<div class="fb hint">Введи число. Можно с пробелами и запятой.</div>`; return; }
      const ok = Math.abs(v - item.answer) <= (item.tol || 0) + 1e-9;
      inp.classList.toggle("right", ok); inp.classList.toggle("wrong", !ok);
      record(qid, ok);
      if (ok) { inp.disabled = true; $$(".qz-actions .pill", el).forEach((b) => b.remove()); }
      feedback(el, ok, item, ok ? "" : `Верный ответ: ${fmt(item.answer)}${item.unit ? " " + item.unit : ""}.`);
    } else if (item.type === "fields") {
      const ins = $$(".field .num", el); let all = true, empty = false;
      ins.forEach((inp, i) => { const f = item.fields[+inp.dataset.f]; if (inp.value.trim() === "") empty = true; const ok = checkField(f, inp); all = all && ok; inp.classList.toggle("right", ok); inp.classList.toggle("wrong", !ok); inp.closest(".field").querySelector(".expect").textContent = ""; });
      if (empty && !all && ins.every((i) => i.value.trim() === "")) { $(".fb-slot", el).innerHTML = `<div class="fb hint">Заполни поля. Отток и убыток со знаком минус.</div>`; return; }
      const altHit = !all && item.alt && ins.every((inp) => parseNum(inp.value) === item.alt.values[+inp.dataset.f]);
      if (altHit) { ins.forEach((inp) => { inp.classList.add("right"); inp.classList.remove("wrong"); }); all = true; }
      record(qid, all);
      if (all) { ins.forEach((i) => (i.disabled = true)); $$(".qz-actions .pill", el).forEach((b) => b.remove()); feedback(el, true, item, altHit ? item.alt.note : ""); }
      else { $(".fb-slot", el).innerHTML = `<div class="fb bad"><b>Есть ошибка</b>Красные поля не совпали. Исправь и проверь ещё раз или открой ответ.</div>`; revealExam(el); }
    } else if (item.type === "open") {
      const ta = $(".open-in", el), v = ta.value.trim(), slot = $(".fb-slot", el);
      if (v.length < 2) { slot.innerHTML = `<div class="fb hint">Напиши ответ хотя бы парой слов.</div>`; ta.focus(); return; }
      const r = window.GRADE.grade(v, item.kw, item.need);
      S.openAns = S.openAns || {}; S.openAns[qid] = v;
      record(qid, r.ok);
      slot.innerHTML = openFeedback(item, r);
      if (r.ok) { ta.disabled = true; $$(".qz-actions .pill", el).forEach((b) => { if (b.dataset.act === "check" || b.dataset.act === "show") b.remove(); }); }
      if (qid.startsWith("card.")) $$(".leitner .pill").forEach((b) => (b.disabled = false));
    } else if (item.type === "multi") {
      const sel = $$(".opt.sel", el).map((b) => +b.dataset.i);
      if (!sel.length) return;
      const ok = sel.length === item.answer.length && sel.every((i) => item.answer.includes(i));
      $$(".opt", el).forEach((b) => { const i = +b.dataset.i; b.disabled = true; b.classList.remove("sel"); if (item.answer.includes(i)) b.classList.add("right"); else if (sel.includes(i)) b.classList.add("wrong"); });
      $$(".qz-actions .pill", el).forEach((b) => b.remove());
      record(qid, ok); feedback(el, ok, item);
    } else if (item.type === "sort") {
      const rows = $$(".sort-item", el); const unset = rows.some((r) => !$(".on", r));
      if (unset) { $(".fb-slot", el).innerHTML = `<div class="fb hint">Распредели все строки.</div>`; return; }
      let ok = true;
      rows.forEach((r) => { const it = item.items[+r.dataset.i], picked = +$(".on", r).dataset.b, good = picked === it.b; ok = ok && good; r.classList.add(good ? "right" : "wrong"); $$(".sort-b button", r).forEach((b) => { b.disabled = true; if (!good && +b.dataset.b === it.b) b.classList.add("truth"); }); });
      $$(".qz-actions .pill", el).forEach((b) => b.remove());
      record(qid, ok); feedback(el, ok, item);
    }
    if (location.hash.startsWith("#/exam")) paintExamMap();
  }

  /* ---------- Каркас ---------- */
  const NAV = [["", "Главная", "Главная"], ["theory", "Теория", "Теория"], ["exam", "Контрольная", "Контрольная"], ["bank", "Банк заданий", "Банк"], ["schemes", "Схемы", "Схемы"]];
  const navKey = (r) => ({ m: "theory", l: "theory", p: "theory", theory: "theory", exam: "exam", mock: "exam", reports: "exam", variants: "exam", v: "exam", notes: "exam", bank: "bank", train: "bank", cards: "bank", mistakes: "bank", plan: "", cheat: "schemes", schemes: "schemes" }[r] ?? "");
  function shell(route, html) {
    const key = navKey(route);
    app.innerHTML = `<div class="shell"><header class="top"><a class="brand" href="#/"><i></i>Финучёт</a><nav class="seg" aria-label="Разделы">${NAV.map(([k, t]) => `<a href="#/${k}" class="${k === key ? "on" : ""}">${t}</a>`).join("")}</nav><button class="round" data-act="search" aria-label="Поиск">${ICON.search}</button><a class="round acc-btn ${route === "account" ? "on" : ""}" href="#/account" aria-label="Аккаунт">${ICON.user}<i id="acc-dot" class="acc-dot ${accCode && cloudOn() ? sync.state : "off"}"></i></a><button class="round" data-act="settings" aria-label="Настройки">${ICON.gear}</button></header><main id="view">${html}</main></div><nav class="bottombar" aria-label="Разделы">${NAV.map(([k, , t]) => `<a href="#/${k}" class="${k === key ? "on" : ""}">${t}</a>`).join("")}</nav>`;
  }
  const crumbs = (items) => `<nav class="crumbs">${items.map(([h, t], i) => (h ? `<a href="#/${h}">${esc(t)}</a>` : `<b style="font-weight:450;color:var(--ink)">${esc(t)}</b>`) + (i < items.length - 1 ? "<span>/</span>" : "")).join("")}</nav>`;

  /* ---------- План ---------- */
  const GROUPS = [{ t: "Сквозная задача 18–22", ns: [18, 19, 20, 21, 22], m: 45, link: "exam/18" }, { t: "ОДДС и ОФР, задания 10 и 17", ns: [10, 17], m: 16, link: "exam/10" }, { t: "Уравнение и капитал, задания 7, 8, 16", ns: [7, 8, 16], m: 14, link: "exam/7" }, { t: "Запасы, задания 11 и 12", ns: [11, 12], m: 12, link: "exam/11" }, { t: "Основные средства, задание 13", ns: [13], m: 8, link: "exam/13" }, { t: "Вложения и кредит, задания 14 и 15", ns: [14, 15], m: 12, link: "exam/14" }, { t: "Тестовая часть, задания 1–6 и 9", ns: [1, 2, 3, 4, 5, 6, 9], m: 14, link: "exam/1" }];
  function planItems() {
    const out = [], used = new Set(), fast = S.planMode === "fast";
    GROUPS.forEach((g) => {
      const ls = []; g.ns.forEach((n) => (LINKS[n] || []).forEach((l) => { if (!used.has(l.id)) { used.add(l.id); ls.push(l); } }));
      if (!fast) ls.sort((a, b) => a.idx - b.idx).forEach((l) => out.push({ kind: "lesson", l, title: l.title, min: l.minutes || 12, link: `l/${l.id}`, state: lessonState(l) }));
      const solved = g.ns.filter((n) => isOk(`exam.${n}`)).length;
      out.push({ kind: "exam", title: g.t, min: g.m, link: g.link, state: solved === g.ns.length ? "done" : solved ? "part" : "new" });
    });
    const hist = S.mock.history.length;
    out.push({ kind: "tool", title: "Собрать отчёты по задаче контрольной своими руками", min: 40, link: "reports", state: S.formsDone.base ? "done" : "new" });
    out.push({ kind: "mock", title: "Первая пробная контрольная", min: 90, link: "mock", state: hist >= 1 ? "done" : "new" });
    out.push({ kind: "tool", title: "Работа над ошибками", min: 30, link: "mistakes", state: hist >= 1 && !mistakes().length ? "done" : "new" });
    const vh = (k) => S.mock.history.some((r) => r.mode === "var" && r.v === k);
    out.push({ kind: "mock", title: "Вариант 1 на время", min: 90, link: "v/1", state: vh(1) ? "done" : "new" });
    out.push({ kind: "tool", title: "Работа над ошибками варианта", min: 20, link: "mistakes", state: vh(1) && !mistakes().length ? "done" : "new" });
    out.push({ kind: "mock", title: "Вариант 2 на время", min: 90, link: "v/2", state: vh(2) ? "done" : "new" });
    if (!fast) LESSONS.filter((l) => !used.has(l.id)).forEach((l) => out.push({ kind: "lesson", l, optional: true, title: l.title, min: l.minutes || 12, link: `l/${l.id}`, state: lessonState(l) }));
    return out;
  }
  const nextStep = () => planItems().find((i) => i.state !== "done") || null;

  /* ---------- План по дням до контрольной (src/dayplan.js) ---------- */
  const DP = window.DAYPLAN || null;
  const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const dpActive = () => !!(DP && localDay() <= DP.exam);
  const dpDate = (s, o) => new Date(s + "T12:00:00").toLocaleDateString("ru-RU", o);
  const DP_KIND = { lesson: "Урок", exam: "Контрольная", bank: "Банк", train: "Тренажёр", case: "Тренажёр", variant: "Вариант", mistakes: "Ошибки", open: "Своими словами", notes: "Спорные места", cheat: "Шпаргалка", cards: "Карточки", reports: "Бланки", schemes: "Схемы" };
  const varDone = (v) => S.mock.history.some((r) => r.mode === "var" && r.v === v);
  function dpItem(d, it, i) {
    let title = it.title || "", min = it.min || 10, link = "", auto = null, hint = "", key = `dp.${d.date}.${i}`;
    const cnt = (s, need) => { hint = `${Math.min(s, need)} из ${need}`; return s >= need ? "done" : s ? "part" : "new"; };
    if (it.t === "lesson") { const l = LMAP[it.id]; title = l ? l.title : it.id; min = (l && l.minutes) || 12; link = `l/${it.id}`; auto = l ? lessonState(l) : "new"; key = it.id; }
    else if (it.t === "exam") { link = `exam/${it.ns[0]}`; auto = cnt(it.ns.filter((n) => isOk(`exam.${n}`)).length, it.ns.length); }
    else if (it.t === "bank") { link = `bank/${it.n}`; auto = cnt(bankDone(it.n), it.count); }
    else if (it.t === "train" || it.t === "case") { const id = it.id || "case"; link = `train/${id}`; auto = cnt((S.train[id] || {}).ok || 0, it.count || 1); }
    else if (it.t === "variant") { link = `v/${it.v}`; auto = varDone(it.v) ? "done" : "new"; }
    else if (it.t === "open") { link = "bank/open"; auto = cnt(OPENQ.filter((o) => isOk(`open.${o.id}`)).length, it.count || 10); }
    else if (it.t === "reports") { link = "reports"; auto = S.formsDone.base ? "done" : "new"; }
    else if (it.t === "mistakes") { link = "mistakes"; const v = d.items.find((x) => x.t === "variant"); if (v && varDone(v.v) && !mistakes().length) auto = "done"; }
    else link = { notes: "notes", cheat: "cheat", cards: "cards", schemes: "schemes" }[it.t] || "";
    const man = !!S.manual[key], state = man || auto === "done" ? "done" : auto === "part" ? "part" : "new";
    return { key, title, min, link, state, man, auto, hint, kind: DP_KIND[it.t] || "", date: d.date, l: it.t === "lesson" ? LMAP[it.id] : null, schemes: it.t === "schemes" ? (it.ids || []).map((id) => SCHEMES.find((x) => x.id === id)).filter(Boolean) : null };
  }
  const dpItems = (d) => d.items.map((it, i) => dpItem(d, it, i));
  const dpLeftMin = (list) => list.filter((x) => x.state !== "done").reduce((a, x) => a + x.min, 0);
  const hrs = (m) => `${String(Math.round(m / 6) / 10).replace(".", ",")} ч`;
  function dpToday() { const t = localDay(); return DP.days.find((d) => d.date === t) || DP.days.find((d) => d.date > t) || DP.days[DP.days.length - 1]; }
  const dpBehind = (upTo) => DP.days.filter((d) => d.date < upTo).flatMap((d) => dpItems(d).filter((x) => x.state !== "done"));
  function dpNext() { if (!dpActive()) return null; const d = dpToday(), list = [...dpBehind(d.date), ...dpItems(d)]; return list.find((x) => x.state !== "done") || null; }
  const planTabs = (cur) => (DP ? `<div class="chips no-print" style="margin-bottom:16px"><a class="chip ${cur === "days" ? "on" : ""}" href="#/plan">По дням до ${esc(dpDate(DP.exam, { day: "numeric", month: "long" }))}</a><a class="chip ${cur === "auto" ? "on" : ""}" href="#/plan/auto">Свой маршрут по дате</a></div>` : "");
  const dpRow = (x, behind) => `<div class="dp-item ${x.state}"><button class="dp-check" data-act="dp-tick" data-key="${esc(x.key)}" aria-pressed="${x.state === "done"}" ${x.auto === "done" && !x.man ? `disabled title="Отмечено само: задания решены"` : ""} aria-label="${x.state === "done" ? "Снять отметку" : "Отметить сделанным"}: ${esc(x.title)}">${ICON.check}</button><a class="dp-main" href="#/${x.link}"><span class="dp-title">${esc(x.title)}</span><span class="dp-meta"><span class="tag">${esc(x.kind)}</span>${behind ? `<span class="tag bad">с ${esc(dpDate(x.date, { day: "numeric", month: "long" }))}</span>` : ""}${x.hint ? `<span class="tiny muted">${esc(x.hint)}</span>` : ""}</span></a><small class="tiny faint">${x.min} мин</small>${x.schemes && x.schemes.length ? `<div class="dp-thumbs">${x.schemes.map((s) => `<button class="dp-thumb" data-act="zoom" data-id="${s.id}" aria-label="Открыть схему «${esc(s.title)}»"><img loading="lazy" decoding="async" src="${SIMG[s.id]}" alt=""><span>${esc(s.title)}</span></button>`).join("")}</div>` : ""}</div>`;
  function viewDays(sel) {
    const t = localDay(), cur = DP.days.find((d) => d.date === sel) || dpToday(), left = daysLeft();
    const tiles = DP.days.map((d) => {
      const list = dpItems(d), done = list.filter((x) => x.state === "done").length, isExam = d.date === DP.exam, past = d.date < t;
      return `<a class="dp-day ${d.date === cur.date ? "on" : ""} ${d.date === t ? "today" : ""} ${isExam ? "exam" : ""} ${done === list.length ? "full" : ""}" href="#/plan/${d.date}" aria-current="${d.date === cur.date ? "date" : "false"}"><span class="dp-wd">${d.date === t ? "Сегодня" : esc(dpDate(d.date, { weekday: "short" }))}</span><span class="dots dp-num">${+d.date.slice(8)}</span>${d.short ? `<span class="dp-ttl">${esc(d.short)}</span>` : ""}<span class="dp-mini" aria-label="Сделано ${done} из ${list.length}">${list.map((x) => `<i class="${x.state}"></i>`).join("")}</span><span class="dp-cap">${isExam ? "Контрольная" : past && done < list.length ? `${list.length - done} не сделано` : hrs(dpLeftMin(list)) === "0 ч" ? "Готово" : hrs(dpLeftMin(list))}</span></a>`;
    }).join("");
    const list = dpItems(cur), done = list.filter((x) => x.state === "done").length, total = list.reduce((a, x) => a + x.min, 0);
    const behind = cur.date >= t ? dpBehind(cur.date > t ? t : cur.date) : [];
    const allDone = DP.days.every((d) => dpItems(d).every((x) => x.state === "done"));
    return `${crumbs([["", "Главная"], ["", "План"]])}<div class="pagehead"><div><h1 class="h-xl">План до контрольной</h1><p class="muted" style="margin-top:10px;max-width:62ch">${left != null && left > 0 ? `${plural(left, "Остался", "Осталось", "Осталось")} ${left} ${plural(left, "день", "дня", "дней")}. ` : left === 0 ? "Контрольная сегодня. " : ""}Сначала сквозная задача 18–22, она даёт 5 заданий из 22, потом расчёты, тестовая часть и два варианта на время. Уроки и задания отмечаются сами, когда решишь их; остальное отмечай кружком слева.</p></div></div>
    ${planTabs("days")}
    <div class="dp-strip" role="list">${tiles}</div>
    <section class="dp-card ${cur.date === DP.exam ? "mesh mesh-pink" : "white"}">
      <div class="dp-head"><div><p class="small ${cur.date === DP.exam ? "" : "muted"}">${esc(dpDate(cur.date, { weekday: "long", day: "numeric", month: "long" }))}</p><h2 class="h-lg" style="margin-top:4px">${esc(cur.title)}</h2></div><div class="dp-score"><span class="dots">${done}</span><span class="tiny">из ${list.length}<br>сделано</span></div></div>
      <p class="dp-note">${esc(cur.note)}</p>
      <div class="dp-bar" aria-hidden="true"><b style="width:${list.length ? Math.round((done / list.length) * 100) : 0}%"></b></div>
      <p class="tiny ${cur.date === DP.exam ? "" : "muted"}" style="margin:8px 0 6px">Всего примерно ${hrs(total)}, осталось ${hrs(dpLeftMin(list))}</p>
      ${behind.length ? `<div class="dp-behind"><h3 class="h-sm">Не успела раньше</h3><p class="tiny muted" style="margin:2px 0 4px">Начни с этого, если остаётся время. Сквозную задачу и варианты не пропускай.</p>${behind.map((x) => dpRow(x, true)).join("")}</div>` : ""}
      <div class="dp-list">${list.map((x) => dpRow(x)).join("")}</div>
    </section>
    ${allDone ? `<div class="b-note exam" style="margin-top:14px"><b>План пройден</b><span>Если есть время, реши ещё один вариант на время или сквозную задачу с новыми числами.</span></div>` : ""}`;
  }

  /* ---------- Главная ---------- */
  function viewHome() {
    const ready = readiness(), doneL = LESSONS.filter((l) => lessonState(l) === "done").length, solved = TASKS.filter((t) => isOk(`exam.${t.n}`)).length, errs = mistakes().length, left = daysLeft(), dn = dpNext(), next = dn || nextStep();
    const nextL = next && next.l ? next.l : LESSONS.find((l) => lessonState(l) !== "done");
    const pillPos = LESSONS.length && nextL ? ((nextL.idx + 0.5) / LESSONS.length) * 100 : 50;
    const bars = TASKS.map((t) => { const m = taskMastery(t.n), lv = m >= 0.67 ? "l3" : m >= 0.34 ? "l2" : m > 0 ? "l1" : ""; return `<a href="#/exam/${t.n}" class="${lv}" title="Задание ${t.n}: ${esc(t.topic)}" aria-label="Задание ${t.n}">${"<i></i>".repeat(8)}</a>`; }).join("");
    const headline = left == null ? "Контрольная по финучёту" : left > 0 ? `До контрольной ${left} ${plural(left, "день", "дня", "дней")}` : left === 0 ? "Контрольная сегодня" : "Контрольная позади";
    const ticks = 41, nowTick = left == null ? -1 : Math.max(0, Math.min(ticks - 1, ticks - 1 - Math.min(left, ticks - 1)));
    const ruler = Array.from({ length: ticks }, (_, i) => `<i class="${i === nowTick ? "now" : ""}"></i>`).join("");
    const labels = MODS.map((m) => `<span style="flex:${(m.lessons || []).length || 0.01} 1 0">${esc(SHORT[m.id] || m.title)}</span>`).join("");
    const trackCols = LESSONS.map((l) => { const st = lessonState(l), secs = (l.sections || []).length, dots = Math.max(2, Math.min(9, secs * 2)); return `<a class="track-col ${st === "done" ? "done" : st === "part" ? "part" : ""}${(l.examTasks || []).length ? " ex" : ""}" href="#/l/${l.id}" title="${esc(l.title)}" aria-label="${esc(l.title)}">${"<i></i>".repeat(dots)}</a>`; }).join("");
    const hist = S.mock.history[S.mock.history.length - 1];
    return `
    <section class="hero">
      <div class="hero-title">
        <h1 class="h-xl">${esc(headline)}</h1>
        <div class="hero-stats">
          <div class="stat"><span class="dots">${doneL}</span><span class="tag">${plural(doneL, "урок пройден", "урока пройдено", "уроков пройдено")} из ${LESSONS.length}</span></div>
          <div class="stat"><span class="dots">${solved}</span><span class="tag">${plural(solved, "задание решено", "задания решено", "заданий решено")} из 22</span></div>
          <div class="stat"><span class="dots">${errs}</span><span class="tag">${plural(errs, "ошибка к разбору", "ошибки к разбору", "ошибок к разбору")}</span></div>
        </div>
      </div>
      <a href="#/mistakes" class="white side-card"><h3>Работа над ошибками</h3><span class="round sm" style="background:var(--card)">${ICON.plus}</span><span class="dots" style="font-size:46px">${errs}</span><span class="tiny muted">${errs ? "Реши заново всё, что не вышло" : "Сюда попадут неверные ответы"}</span></a>
      <a href="#/mock" class="mesh mesh-pink side-card" style="border-radius:var(--r-lg);padding:18px"><h3>Пробная контрольная</h3><span class="round sm" style="color:var(--ink)">${ICON.plus}</span><div class="target"></div><span class="tiny" style="text-align:center;opacity:.95">${hist ? `Прошлый результат ${hist.score} из ${hist.total}` : "22 задания на время"}</span></a>
    </section>
    <section class="track" aria-label="Дорожка уроков">
      ${next ? `<a class="track-pill" href="#/${next.link}" style="left:${Math.max(16, Math.min(84, pillPos))}%"><span class="ring" style="width:18px;height:18px"></span><span>${esc(next.title.length > 42 ? next.title.slice(0, 40) + "…" : next.title)}<small>Следующий шаг</small></span></a>` : ""}
      <div class="track-row">${trackCols || '<span class="small muted">Уроки появятся здесь</span>'}</div>
      <div class="track-labels">${labels}</div>
    </section>
    <section class="main-grid">
      <div class="mesh mesh-green bigcard"><div class="ttl">Готовность к контрольной</div><div class="bignum dots">${ready}</div><div class="sub">${ready >= 80 ? "Можно идти писать" : ready >= 50 ? "Хороший темп" : ready > 0 ? "Подготовка идёт" : "Реши первое задание"}</div><div class="bars" aria-label="Готовность по 22 заданиям">${bars}</div></div>
      <div class="mesh mesh-orange bigcard"><div class="ttl">Дата контрольной</div><div class="bignum dots">${left == null ? "–" : Math.max(0, left)}</div><div class="sub">${left == null ? "Укажи дату, чтобы разбить план по дням" : plural(Math.max(0, left), "день остался", "дня осталось", "дней осталось")}</div><input type="date" class="date-input" data-inp="examDate" aria-label="Дата контрольной" value="${esc(S.examDate)}"><div class="ruler" aria-hidden="true">${ruler}</div></div>
      <div class="pending"><h3>${dn ? "Что делать сегодня" : next ? "Что делать дальше" : "Всё по плану пройдено"}</h3><a class="round sm" href="#/plan" style="position:absolute;right:16px;top:16px" aria-label="Весь план">${ICON.next}</a>
        ${next ? `<div style="display:grid;grid-template-columns:1fr auto;gap:14px;margin-top:14px;flex:1"><div style="display:flex;flex-direction:column"><span class="h-sm">${esc(next.title)}</span><span class="small muted" style="margin-top:4px">примерно ${next.min} минут${next.optional ? ", по желанию" : ""}</span><div class="slider" aria-hidden="true"><b style="width:${ready}%"></b><i style="left:${Math.max(2, ready)}%"></i></div><span class="tiny muted">${dn ? (() => { const d = dpToday(), l = dpItems(d); return dn.date < d.date ? `Хвост с ${dpDate(dn.date, { day: "numeric", month: "long" })}` : `${d.date === localDay() ? "Сегодня" : dpDate(d.date, { day: "numeric", month: "long" })}: сделано ${l.filter((x) => x.state === "done").length} из ${l.length}`; })() : `Шаг ${planItems().filter((i) => i.state === "done").length + 1} из ${planItems().length}`}</span></div><div style="background:rgba(255,255,255,.72);border-radius:26px;width:88px;display:grid;place-items:center"><div class="blob" style="--c:${next.l ? COLORS[next.l.mod.id] : "#F4802B"}"></div></div></div><a class="pill ink" href="#/${next.link}" style="margin-top:16px">Продолжить</a>` : `<p class="muted" style="margin:14px 0">Прогони ещё одну пробную с новыми числами, чтобы закрепить результат.</p><a class="pill ink" href="#/mock">Новая пробная</a>`}
      </div>
    </section>
    <div class="sechead"><div><h2 class="h-lg">Карта контрольной</h2><p class="muted small" style="margin-top:4px">22 задания с разбором. Зелёным отмечены решённые, розовым те, где была ошибка.</p></div><a class="pill" href="#/exam">Все разборы</a></div>
    <div class="exam-map">${examTiles()}</div>
    <div class="sechead"><div><h2 class="h-lg">Теория</h2><p class="muted small" style="margin-top:4px">Теория, примеры и мини-задания после каждой порции.</p></div><a class="pill" href="#/theory">Все модули</a></div>
    <div class="mod-grid">${MODS.map(modCard).join("")}</div>
    <div class="sechead"><h2 class="h-lg">Инструменты</h2></div>
    <div class="tr-grid">
      ${toolCard("plan", "План подготовки", dpActive() ? `Что делать каждый день до ${dpDate(DP.exam, { day: "numeric", month: "long" })}: уроки, задания контрольной и два варианта на время.` : "Расписание по дням от даты контрольной: сначала то, что даёт больше всего заданий.", "#6E9BE8", dpActive() ? "По дням" : "")}
      ${toolCard("reports", "Собери отчёты сам", "Те же бланки баланса и ОФР, что на контрольной, с проверкой каждой строки.", "#F4802B", "Задания 18–22")}
      ${toolCard("variants", "Варианты контрольной", `${BK.VARIANTS} готовых вариантов на 22 задания: на время, с проверкой или на бумаге.`, "#F0558C", "Как настоящая")}
      ${toolCard("bank", "Банк заданий", `${BK.total} похожих заданий по каждому типу из контрольной с разбором.`, "#3FB568", "")}
      ${toolCard("schemes", "Схемы", `${SCHEMES.length} схем, чтобы проще запомнить связи и правила.`, "#B23FA3", "")}
      ${toolCard("train", "Тренажёры", "Те же типы заданий с новыми числами при каждом запуске.", "#8EBB2C", "")}
      ${toolCard("cards", "Карточки", "Термины и правила на повторение: что не помнишь, вернётся снова.", "#6FA7B8", "")}
      ${toolCard("notes", "Спорные места и опечатки", "Что уточнить у преподавателя и где в материалах ошибки в числах.", "#F0558C", "")}
    </div>`;
  }
  const toolCard = (route, title, desc, color, tag) => `<a class="tr" href="#/${route}"><div style="display:flex;justify-content:space-between;align-items:flex-start">${tag ? `<span class="tag lime">${esc(tag)}</span>` : "<span></span>"}<div class="blob sm" style="--c:${color}"></div></div><h3 style="margin-top:6px">${esc(title)}</h3><p>${esc(desc)}</p></a>`;
  function examTiles(current) { return TASKS.map((t) => { const st = S.quiz[`exam.${t.n}`]; return `<a class="tile ${st ? (st.ok ? "ok" : "bad") : ""}" href="#/exam/${t.n}" title="${esc(t.topic)}" data-tile="${t.n}"${current === t.n ? ' style="box-shadow:0 0 0 2px var(--ink)"' : ""}>${t.n}</a>`; }).join(""); }
  function modCard(m) {
    const pct = modProgress(m), ls = m.lessons || [], ex = ls.some((l) => (l.examTasks || []).length);
    return `<a class="mod" href="#/m/${m.id}"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><h3>${esc(m.title)}</h3><div class="blob sm" style="--c:${COLORS[m.id]}"></div></div>${ex ? "" : `<span class="tag" style="align-self:flex-start">На контрольной не встретилось</span>`}<div class="mini-bars">${ls.map((l) => { const st = lessonState(l); return `<i class="${st === "done" ? "done" : st === "part" ? "part" : ""}" title="${esc(l.title)}"></i>`; }).join("")}</div><div class="row"><span class="dots">${pct}<small>%</small></span><span class="small muted">${ls.length} ${plural(ls.length, "урок", "урока", "уроков")}</span></div></a>`;
  }

  /* ---------- Теория ---------- */
  function viewTheory() {
    return `${crumbs([["", "Главная"], ["", "Теория"]])}<div class="pagehead"><div><h1 class="h-xl">Теория</h1><p class="muted" style="margin-top:10px;max-width:60ch">Каждый урок идёт по схеме: порция теории с примерами, затем сразу мини-задания. Правильные ответы двигают прогресс, неверные попадают в работу над ошибками.</p></div></div><div class="mod-grid">${MODS.map(modCard).join("") || '<div class="empty">Модули ещё готовятся.</div>'}</div>`;
  }
  function viewModule(id) {
    const m = MODS.find((x) => x.id === id); if (!m) return notFound();
    const ls = m.lessons || [], ps = m.practice || [], cards = (m.flashcards || []).length;
    return `${crumbs([["", "Главная"], ["theory", "Теория"], ["", m.title]])}
    <div class="pagehead"><div><h1 class="h-lg" style="font-size:clamp(32px,4vw,50px)">${esc(m.title)}</h1><p class="muted" style="margin-top:8px;max-width:64ch">${esc(m.subtitle || "")}</p>${(m.sources || []).length ? `<p class="tiny faint" style="margin-top:10px;max-width:64ch">По материалам: ${m.sources.map((s) => esc(s.label || s.file)).join(", ")}</p>` : ""}</div><div class="blob" style="--c:${COLORS[m.id]};width:88px;height:88px"></div></div>
    <div class="sechead" style="margin-top:0"><h2 class="h-md">Уроки</h2><span class="dots" style="font-size:30px">${modProgress(m)}<span style="font-family:var(--sans);font-size:15px;font-weight:400;margin-left:3px">%</span></span></div>
    <div class="lesson-list">${ls.map((l, i) => lessonRow(l, i)).join("")}</div>
    ${ps.length ? `<div class="sechead"><div><h2 class="h-md">Разбор практикумов и семинаров</h2><p class="muted small" style="margin-top:3px">Условие, решение и объяснение каждого задания с занятий.</p></div></div><div class="lesson-list">${ps.map(practiceRow).join("")}</div>` : ""}
    ${cards ? `<div class="sechead"><h2 class="h-md">Повторить</h2></div><div class="tr-grid"><a class="tr" href="#/cards/${m.id}"><h3>Карточки модуля</h3><p>${cards} ${plural(cards, "карточка", "карточки", "карточек")} с терминами и правилами.</p></a><a class="tr" href="#/cheat/${m.id}"><h3>Шпаргалка модуля</h3><p>Формулы и правила на одном экране.</p></a></div>` : ""}`;
  }
  function lessonRow(l, i) {
    const st = lessonState(l), ids = lessonQids(l), ok = ids.filter(isOk).length;
    return `<a class="lrow" href="#/l/${l.id}"><span class="st ${st === "done" ? "done" : st === "part" ? "part" : ""}">${st === "done" ? ICON.check : i + 1}</span><div><h4>${esc(l.title)}</h4><p>${esc(l.summary || "")}</p></div><div class="meta">${(l.examTasks || []).length ? `<span class="tag lime">Задани${l.examTasks.length > 1 ? "я" : "е"} ${l.examTasks.join(", ")}</span>` : ""}<span class="tag">${l.minutes || 10} мин</span>${ids.length ? `<span class="tag">${ok}/${ids.length}</span>` : ""}</div></a>`;
  }
  function practiceRow(p) {
    const done = S.practice[p.id];
    return `<a class="lrow" href="#/p/${p.id}"><span class="st ${done ? "done" : ""}">${done ? ICON.check : "•"}</span><div><h4>${esc(p.title)}</h4><p>${esc(p.src || "")}</p></div><div class="meta">${(p.examTasks || []).length ? `<span class="tag lime">Задани${p.examTasks.length > 1 ? "я" : "е"} ${p.examTasks.join(", ")}</span>` : ""}</div></a>`;
  }
  function viewLesson(id) {
    const l = LMAP[id]; if (!l) return notFound();
    const m = l.mod, prev = LESSONS[l.idx - 1], nxt = LESSONS[l.idx + 1];
    const secs = l.sections.map((s, si) => `<section class="section" id="sec-${si}"><h2>${esc(s.title)}</h2><div class="blocks">${renderBlocks(s.blocks)}</div>${si === 0 && vizFor("lesson", l.id).length ? `<div style="margin-top:18px;display:flex;flex-direction:column;gap:14px">${vizFor("lesson", l.id).map(vizBlock).join("")}</div>` : ""}<div class="check"><div class="check-head"><span class="ring"></span><h3>Проверь себя</h3><span class="small muted" data-secstat="${si}"></span></div>${(s.quiz || []).map((q, qi) => quizHTML(`${l.id}.s${si}.q${qi}`, q)).join("")}</div></section>`).join("");
    const examLinks = (l.examTasks || []).map((n) => `<a class="tag lime" href="#/exam/${n}">Задание ${n}</a>`).join(" ");
    return `${crumbs([["", "Главная"], ["theory", "Теория"], [`m/${m.id}`, SHORT[m.id] || m.title], ["", l.title]])}
    <div class="reader" data-lesson="${l.id}"><article><header style="margin-bottom:30px"><h1 class="h-lg" style="font-size:clamp(31px,3.8vw,46px)">${esc(l.title)}</h1><p class="muted" style="margin-top:10px;max-width:62ch">${esc(l.summary || "")}</p><div class="chips" style="margin-top:12px;align-items:center"><span class="tag">${l.minutes || 10} мин</span>${examLinks}</div><p class="src-line">Источник: ${esc(l.src || "")}</p></header>${schemesFor("lesson", l.id).length ? `<div style="margin-bottom:36px">${schemeStrip(schemesFor("lesson", l.id))}</div>` : ""}${secs}${openFor(l.id).length ? `<div class="section" id="sec-open"><h2>Ответь своими словами</h2><p class="muted" style="margin:-8px 0 14px;max-width:62ch">Напиши ответ, как на устном опросе. Проверка ищет в нём ключевые идеи и показывает, что ты упустила.</p><div class="check" style="margin-top:0">${openFor(l.id).map((o) => quizHTML(`open.${o.id}`, QREG[`open.${o.id}`].item)).join("")}</div></div>` : ""}${(LESSON_EXAM[l.id] || []).length ? `<div class="section" id="sec-exam"><h2>Как это было на контрольной</h2><p class="muted" style="margin:-8px 0 14px;max-width:62ch">Задание с настоящей контрольной на только что пройденную тему. Решённое здесь засчитывается и на странице контрольной.</p><div style="display:flex;flex-direction:column;gap:14px">${LESSON_EXAM[l.id].map(examInline).join("")}</div></div>` : ""}
      <div class="glass" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;border-radius:28px"><button class="pill ghost" data-act="manual" data-id="${l.id}">${S.manual[l.id] ? "Снять отметку «изучено»" : "Отметить как изученный"}</button><div style="display:flex;gap:8px;flex-wrap:wrap">${prev ? `<a class="pill" href="#/l/${prev.id}">Назад</a>` : ""}${nxt ? `<a class="pill ink" href="#/l/${nxt.id}">Следующий урок</a>` : `<a class="pill ink" href="#/exam">К контрольной</a>`}</div></div></article>
    <aside class="toc"><h4>В этом уроке</h4>${l.sections.map((s, si) => `<a href="#/l/${l.id}" data-scroll="sec-${si}" data-toc="${si}" class="${secState(l, si)}"><i></i><span>${esc(s.title)}</span></a>`).join("")}${openFor(l.id).length ? `<a href="#/l/${l.id}" data-scroll="sec-open" class="${openFor(l.id).every((o) => isOk(`open.${o.id}`)) ? "done" : ""}"><i></i><span>Ответь своими словами</span></a>` : ""}${(LESSON_EXAM[l.id] || []).length ? `<a href="#/l/${l.id}" data-scroll="sec-exam" class="${LESSON_EXAM[l.id].every((n) => isOk(`exam.${n}`)) ? "done" : ""}"><i></i><span>Задание с контрольной</span></a>` : ""}<div class="toc-progress" id="toc-progress">${tocProgress(l)}</div></aside></div>`;
  }
  function examInline(n) {
    const t = TASKS[n - 1], st = S.quiz[`exam.${n}`];
    return `<section class="exam-inline" id="exam-after-${n}"><div class="exam-inline-head"><span class="ring"></span><h3>Задание ${n} с контрольной</h3><span class="tag">${esc(t.topic)}</span></div>
      ${t.isCase ? `<details><summary class="small muted" style="cursor:pointer;margin-bottom:10px">Показать данные сквозной задачи</summary><div class="blocks">${renderBlocks(t.cond.slice(0, -1))}</div></details><div class="blocks">${renderBlocks(t.cond.slice(-1))}</div>` : `<div class="blocks">${renderBlocks(t.cond)}</div>`}
      <div style="margin-top:12px">${quizHTML(`exam.${n}`, t.quiz, { noBadge: false })}</div>
      ${t.photo.verdict === "bad" || t.photo.verdict === "warn" ? `<div class="exam-inline-sol"${st ? "" : " hidden"}><div class="b-note trap" style="margin-top:12px"><b>Пометки на фото</b><span>${md(t.photo.text)}</span></div></div>` : ""}
      <div class="exam-inline-sol"${st ? "" : " hidden"}><div class="blocks" style="margin-top:14px">${renderBlocks(t.sol)}</div></div>
      <div class="qz-actions"><button class="pill ghost" data-act="inline-sol">Показать разбор</button><a class="pill ghost" href="#/exam/${n}">Открыть на странице контрольной</a></div></section>`;
  }
  const tocProgress = (l) => { const ids = lessonQids(l), ok = ids.filter(isOk).length; return `Верно ${ok} из ${ids.length} мини-заданий`; };
  function paintProgress(qid) {
    const reg = QREG[qid]; if (!reg || !reg.lesson) return; const l = reg.lesson, root = $(`[data-lesson="${l.id}"]`); if (!root) return;
    l.sections.forEach((s, si) => { const a = $(`[data-toc="${si}"]`, root); if (a) a.className = secState(l, si); });
    const tp = $("#toc-progress", root); if (tp) tp.textContent = tocProgress(l);
  }
  function viewPractice(id) {
    const p = PMAP[id]; if (!p) return notFound(); const m = p.mod, list = m.practice, i = list.indexOf(p), nx = list[i + 1];
    return `${crumbs([["", "Главная"], ["theory", "Теория"], [`m/${m.id}`, SHORT[m.id] || m.title], ["", "Практикум"]])}
    <div style="max-width:820px"><h1 class="h-lg" style="margin-bottom:8px">${esc(p.title)}</h1><div class="chips" style="margin-bottom:22px"><span class="tag wrap">${esc(p.src || "")}</span>${(p.examTasks || []).map((n) => `<a class="tag lime" href="#/exam/${n}">Задание ${n}</a>`).join("")}</div>
    <div class="paper"><h2 class="h-sm" style="margin-bottom:12px">Условие</h2><div class="blocks">${renderBlocks(p.condition)}</div></div>
    ${p.open && p.open.kw ? `<div class="check"><div class="check-head"><span class="ring"></span><h3>Твой ответ</h3></div>${quizHTML(`pr.${p.id}`, QREG[`pr.${p.id}`].item)}</div>` : ""}
    <div id="p-sol" ${S.practice[p.id] ? "" : "hidden"} style="margin-top:22px"><h2 class="h-md" style="margin-bottom:14px">Решение</h2><div class="blocks">${renderBlocks(p.solution)}</div><div class="b-note exam" style="margin-top:14px"><b>Итог</b><span>${md(p.answer)}</span></div></div>
    <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">${S.practice[p.id] ? "" : `<button class="pill ink" data-act="psol" data-id="${p.id}">Показать решение</button>`}${nx ? `<a class="pill" href="#/p/${nx.id}">Следующее задание</a>` : `<a class="pill" href="#/m/${m.id}">К модулю</a>`}</div></div>`;
  }

  /* ---------- Контрольная: колесо ---------- */
  const STEP = () => (window.innerWidth < 640 ? 62 : 104);
  function wheelInner(n) {
    return TASKS.map((t) => `<button class="wheel-item" data-act="wheel" data-n="${t.n}" aria-label="Задание ${t.n}: ${esc(t.topic)}"><span>${esc(t.short)}</span><b>${t.n}</b></button>`).join("");
  }
  function layoutWheel(n) {
    const w = $("#wheel"); if (!w) return; const W = w.clientWidth, st = STEP(), k = W < 640 ? 2.1 : 1.9;
    $$(".wheel-item", w).forEach((el) => { const i = +el.dataset.n, d = i - n, far = Math.abs(d) * st > W / 2 + 30, y = 12 + k * d * d; el.style.transform = `translate(${d * st}px,${y}px) rotate(${d * 1.3}deg)`; el.style.opacity = far ? 0 : 1 - Math.abs(d) * 0.05; el.style.pointerEvents = far ? "none" : "auto"; el.tabIndex = far ? -1 : 0; el.classList.toggle("on", d === 0); el.classList.toggle("ok", isOk(`exam.${i}`)); const lab = $("span", el); lab.style.opacity = window.innerWidth < 640 && d !== 0 ? 0 : ""; });
    const y0 = (a) => { const edge = W / 2 / st; return a + k * edge * edge; };
    const arc = (a, op) => `<path d="M0 ${y0(a)} Q ${W / 2} ${2 * a - y0(a)} ${W} ${y0(a)}" fill="none" stroke="rgba(255,255,255,${op})" stroke-width="1.2"/>`;
    const svg = $("svg.arc", w); svg.setAttribute("viewBox", `0 0 ${W} 150`); svg.innerHTML = arc(38, 0.42) + arc(112, 0.55);
  }
  function examShell(n) {
    const t = TASKS[n - 1];
    return `<section class="mesh mesh-magenta wheel-card"><div class="wheel-top"><div class="seg"><a href="#/exam/${n}" class="on">Разбор заданий</a><a href="#/variants">Варианты</a><a href="#/mock">Пробная</a><a href="#/reports">Отчёты</a></div><a class="round" href="#/exam/${n}" data-act="exam-list" aria-label="Все задания">${ICON.grid}</a></div>
      <div class="wheel-title"><span>Задание</span><span id="wheel-n">${n}</span></div><p class="wheel-topic" id="wheel-topic">${esc(t.topic)}</p>
      <div class="wheel" id="wheel" tabindex="0" aria-label="Выбор задания: стрелки влево и вправо"><svg class="arc" aria-hidden="true"></svg>${wheelInner(n)}</div>
      <div class="wheel-bottom"><label class="wheel-note">${ICON.pen}<input id="wheel-note" data-inp="note" data-n="${n}" placeholder="Заметка к заданию" value="${esc(S.notes[n] || "")}" aria-label="Заметка к заданию"></label><button class="pill" data-act="scroll-sol">${ICON.plus}Перейти к решению</button></div></section><div id="exam-body">${examBody(n)}</div>`;
  }
  function examBody(n) {
    const t = TASKS[n - 1], st = S.quiz[`exam.${n}`], ls = LINKS[n] || [], shown = st != null;
    const photoCl = { ok: "ok", bad: "bad", warn: "warn" }[t.photo.verdict] || "", pen = { ok: "✓", bad: "!", warn: "?" }[t.photo.verdict] || "–";
    return `<div class="exam-layout"><div id="exam-main">
      <div class="paper"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px"><h2 class="h-sm">Условие</h2><span class="tag">${esc(t.kind)}</span></div>${t.isCase && n !== 18 ? `<details><summary class="small muted" style="cursor:pointer;margin-bottom:10px">Показать данные задачи (общие для заданий 18–22)</summary><div class="blocks">${renderBlocks(t.cond.slice(0, -1))}</div></details><div class="blocks" style="margin-top:10px">${renderBlocks(t.cond.slice(-1))}</div>` : `<div class="blocks">${renderBlocks(t.cond)}</div>`}${t.recog ? `<p class="tiny faint" style="margin-top:12px">${esc(t.recog)}</p>` : ""}</div>
      <div class="check" id="exam-try"><div class="check-head"><span class="ring"></span><h3>Реши сам</h3></div>${quizHTML(`exam.${n}`, t.quiz, { noBadge: false })}</div>
      ${shown ? "" : `<button class="pill ghost" id="sol-btn" data-act="show-sol" style="margin-top:12px">Показать разбор сразу</button>`}
      <section id="sol"${shown ? "" : " hidden"} style="margin-top:26px"><h2 class="h-md" style="margin-bottom:14px">Разбор</h2><div class="steps blocks">${renderBlocks(t.sol)}</div>${vizFor("task", n).length ? `<div style="margin-top:22px;display:flex;flex-direction:column;gap:14px">${vizFor("task", n).slice(0, 2).map(vizBlock).join("")}</div>` : ""}${schemesFor("task", n).length ? `<h3 class="h-sm" style="margin:22px 0 12px">Схема, чтобы запомнить</h3>${schemeStrip(schemesFor("task", n).slice(0, 2))}` : ""}</section>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:26px">${n > 1 ? `<a class="pill" href="#/exam/${n - 1}">Задание ${n - 1}</a>` : "<span></span>"}${n < 22 ? `<a class="pill ink" href="#/exam/${n + 1}">Задание ${n + 1}</a>` : `<a class="pill ink" href="#/mock">Пробная контрольная</a>`}</div>
    </div><aside class="exam-side">
      <div class="photo-note ${photoCl}" id="photo-note"${shown ? "" : " hidden"}><span class="pen">${pen}</span><div><b style="font-weight:550;display:block;margin-bottom:2px">Пометки на фото</b>${md(t.photo.text)}</div></div>${shown ? "" : `<div class="photo-note" id="photo-lock"><span class="pen">?</span><div><b style="font-weight:550;display:block;margin-bottom:2px">Пометки на фото</b>Откроются после твоего ответа или разбора: в них видно, что обвели на контрольной.</div></div>`}
      ${ls.length ? `<div class="glass" style="padding:16px 18px;border-radius:20px"><h3 class="h-sm" style="font-size:15.5px;margin-bottom:6px">Теория к заданию</h3>${[...ls].sort((a, b) => a.examTasks.length - b.examTasks.length).slice(0, 5).map((l) => `<a href="#/l/${l.id}" class="small" style="display:block;padding:5px 0;line-height:1.3">${esc(l.title)}</a>`).join("")}</div>` : ""}
      ${(() => { const key = t.isCase ? 18 : n, cnt = (BK.bank[key] || []).length; return cnt ? `<a class="pill" href="#/bank/${key}">Похожие задания в банке: ${cnt}</a>` : ""; })()}
      ${t.gen ? `<a class="pill" href="#/train/${t.gen}">Тренировать на новых числах</a>` : ""}
      ${window.NOTES.ask.some((a) => a.task === n) ? `<a class="pill lime" href="#/notes">Есть что уточнить у преподавателя</a>` : ""}
      <div class="glass" style="padding:14px;border-radius:20px"><h3 class="h-sm" style="font-size:15.5px;margin-bottom:10px">Все задания</h3><div class="exam-map side-map" id="side-map">${examTiles(n)}</div></div>
    </aside></div>`;
  }
  function paintExamMap() { const m = $("#side-map"); if (m) { const n = +(location.hash.split("/")[2] || 1); m.innerHTML = examTiles(n); } const n = +(location.hash.split("/")[2] || 1); if ($("#wheel")) layoutWheel(n); }

  /* ---------- Пробная контрольная ---------- */
  let mockTimer = null;
  function mockTasks(a) {
    if (a.mode === "var") return BK.variants[a.v - 1].tasks.map((t) => ({ n: t.n, cond: t.cond, caseCond: !!t.isCase, isCase: !!t.isCase, quiz: t.quiz, kind: t.kind, topic: t.topic, genSol: t.sol && t.sol.length ? t.sol : null }));
    if (a.mode === "orig") return TASKS.map((t) => ({ n: t.n, cond: t.cond, quiz: t.quiz, isCase: !!t.isCase, kind: t.kind, topic: t.topic }));
    const repl = { 7: "equation", 8: "capital-change", 10: "cf-sort", 11: "purchase", 12: "fifo", 13: "dep", 14: "fv", 15: "loan", 16: "equity", 17: "pl" };
    const p = G.seedCase(a.seed + 99), s = G.solveCase(p), cf = G.caseFields(s), cc = G.caseCond(p, s);
    return TASKS.map((t) => { if (repl[t.n]) { const g = G.run(repl[t.n], a.seed + t.n * 31); return { n: t.n, cond: g.cond, quiz: g.quiz, kind: t.kind, topic: t.topic, genSol: g.sol }; } if (t.isCase) return { n: t.n, cond: t.n === 18 ? cc : [], caseCond: true, isCase: true, quiz: { type: "fields", q: `Ответ, тыс. руб.`, fields: cf[t.n], why: "Сверь с решением." }, kind: t.kind, topic: t.topic, genSol: t.n === 18 ? G.caseSolution(s) : null }; return { n: t.n, cond: t.cond, quiz: t.quiz, kind: t.kind, topic: t.topic }; });
  }
  function viewMock() {
    const a = S.mock.active;
    if (a) return mockRun(a);
    const h = S.mock.history;
    return `${crumbs([["", "Главная"], ["exam", "Контрольная"], ["", "Пробная"]])}
    <section class="mesh mesh-pink" style="padding:34px;margin-bottom:18px"><h1 class="h-xl">Пробная контрольная</h1><p style="margin-top:10px;max-width:56ch;font-size:18px">22 задания без подсказок. Решение и проверка откроются только после сдачи. Калькулятор и черновик держи рядом, как на настоящей.</p></section>
    <div class="mock-modes">
      <div class="white" style="display:flex;flex-direction:column;gap:12px"><h2 class="h-md">Как на фото</h2><p class="muted small">Те же условия и числа, что на листах контрольной.</p><label class="small muted">Время <select id="mock-min-a" class="sel-time"><option value="60">60 минут</option><option value="90" selected>90 минут</option><option value="120">120 минут</option></select></label><button class="pill ink" data-act="mock-start" data-mode="orig" style="margin-top:auto">Начать</button></div>
      <div class="white" style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;gap:8px;align-items:center"><h2 class="h-md">С новыми числами</h2><span class="tag lime">Честнее</span></div><p class="muted small">Логика та же, числа другие. Так видно, понимаешь ли ты метод, а не помнишь ответы.</p><label class="small muted">Время <select id="mock-min-b" class="sel-time"><option value="60">60 минут</option><option value="90" selected>90 минут</option><option value="120">120 минут</option></select></label><button class="pill ink" data-act="mock-start" data-mode="new" style="margin-top:auto">Начать</button></div>
    </div>
    ${h.length ? `<div class="sechead"><h2 class="h-md">История</h2></div><div class="white">${[...h].reverse().map((r) => `<div class="history-row"><span>${new Date(r.ts).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}, ${r.mode === "orig" ? "как на фото" : r.mode === "var" ? `вариант ${r.v}` : "новые числа"}</span><b style="font-weight:550">${r.score} из ${r.total}</b></div>`).join("")}</div>` : ""}`;
  }
  function mockRun(a) {
    const list = mockTasks(a);
    list.forEach((t) => { EPH[`mock.${t.n}`] = t.quiz; });
    return `<div class="sticky-mock"><span class="h-sm">Пробная контрольная</span><span class="dots" id="mock-time" style="font-size:26px">--:--</span><button class="pill ink" data-act="mock-submit">Сдать работу</button></div>
    ${list.map((t) => `<section style="margin-bottom:18px" id="mq-${t.n}">${t.n === 18 ? `<div class="paper" style="margin-bottom:14px"><h2 class="h-sm" style="margin-bottom:10px">Задания 18–22: общие данные</h2><div class="blocks">${renderBlocks(t.caseCond ? t.cond : EX.tasks[17].cond.slice(0, -1))}</div></div>` : ""}<div class="white" style="border-radius:24px"><h3 class="h-sm" style="margin-bottom:10px">Задание ${t.n}</h3>${t.isCase ? "" : `<div class="blocks" style="margin-bottom:12px">${renderBlocks(t.cond)}</div>`}${quizHTML(`mock.${t.n}`, t.quiz, { mock: true })}</div></section>`).join("")}
    <div style="display:flex;justify-content:center;margin:26px 0"><button class="pill ink" data-act="mock-submit">Сдать работу</button></div>`;
  }
  function startMockClock() {
    clearInterval(mockTimer); const a = S.mock.active; if (!a) return;
    const tick = () => { const el = $("#mock-time"); if (!el || !S.mock.active) { clearInterval(mockTimer); return; } const left = a.start + a.minutes * 60000 - Date.now(); if (left <= 0) { clearInterval(mockTimer); submitMock(true); return; } const s = Math.floor(left / 1000), m = Math.floor(s / 60); el.textContent = `${m}:${String(s % 60).padStart(2, "0")}`; };
    tick(); mockTimer = setInterval(tick, 1000);
  }
  function evalMockAnswer(item, ans) {
    if (item.type === "choice") return ans === item.answer;
    if (item.type === "fields") return item.fields.every((f, i) => { const v = parseNum(ans && ans[i]); return !isNaN(v) && Math.abs(v - f.answer) <= (f.tol || 0) + 1e-9; }) || !!(item.alt && item.alt.values.every((x, i) => parseNum(ans && ans[i]) === x));
    return false;
  }
  function submitMock(auto) {
    const a = S.mock.active; if (!a) return; clearInterval(mockTimer);
    const list = mockTasks(a), res = list.map((t) => ({ n: t.n, ok: evalMockAnswer(t.quiz, a.answers[`mock.${t.n}`]) }));
    const score = res.filter((r) => r.ok).length;
    const rec = { ts: Date.now(), mode: a.mode, v: a.v, seed: a.seed, score, total: list.length, res, answers: a.answers, used: Math.round((Date.now() - a.start) / 60000) };
    S.mock.history.push(rec); S.mock.active = null;
    if (a.mode === "orig") res.forEach((r) => { const q = `exam.${r.n}`, p = S.quiz[q]; if (r.ok || !p || !p.ok) S.quiz[q] = { ok: r.ok, first: p ? p.first : r.ok, tries: (p ? p.tries : 0) + 1, t: Date.now() }; });
    bump(); save();
    S.mock.last = rec; location.hash = "#/mock/result";
    if (auto) toast("Время вышло, работа сдана");
  }
  function viewMockResult() {
    const r = S.mock.last || S.mock.history[S.mock.history.length - 1]; if (!r) return viewMock();
    const list = mockTasks(r), pct = Math.round((r.score / r.total) * 100);
    const typeOf = (t) => { const k = r.res.find((x) => x.n === t.n); return k && k.ok; };
    return `${crumbs([["", "Главная"], ["exam", "Контрольная"], ["mock", "Пробная"], ["", "Результат"]])}
    <section class="mesh ${pct >= 70 ? "mesh-green" : pct >= 40 ? "mesh-orange" : "mesh-pink"}" style="padding:34px;margin-bottom:18px;text-align:center"><div style="font-size:17px">Результат</div><div class="dots" style="font-size:96px;margin:18px 0 8px">${r.score}</div><div style="font-size:18px">из ${r.total} заданий, потрачено ${r.used} мин</div></section>
    <div class="result-grid" style="margin-bottom:22px">${list.map((t) => `<a class="tile ${typeOf(t) ? "ok" : "bad"}" href="${r.mode === "orig" ? `#/exam/${t.n}` : `#/mock/result`}" data-scroll="${r.mode === "orig" ? "" : `rq-${t.n}`}">${t.n}</a>`).join("")}</div>
    ${list.filter((t) => !typeOf(t)).map((t) => { const ans = r.answers[`mock.${t.n}`]; return `<details class="case-step" id="rq-${t.n}"><summary>Задание ${t.n}. ${esc(t.topic)}</summary><div class="blocks"><div class="fields">${t.quiz.type === "fields" ? t.quiz.fields.map((f, i) => { const v = parseNum(ans && ans[i]), ok = !isNaN(v) && Math.abs(v - f.answer) <= (f.tol || 0) + 1e-9; return `<div class="field" style="grid-template-columns:1fr auto auto"><span>${md(f.label)}</span><span class="${ok ? "" : "faint"}">${ans && ans[i] ? esc(ans[i]) : "нет ответа"}</span><b style="font-weight:550;color:var(--ok)">${fmt(f.answer)}</b></div>`; }).join("") : `<p>Твой ответ: ${ans != null ? md(t.quiz.options[ans]) : "нет ответа"}</p><p><b>Верно:</b> ${md(t.quiz.options[t.quiz.answer])}</p>`}</div>${r.mode === "orig" ? `<a class="pill" href="#/exam/${t.n}">Открыть разбор задания</a>` : t.isCase ? "" : t.genSol ? renderBlocks(t.genSol) : ""}</div></details>`; }).join("")}
    ${r.mode !== "orig" && list.some((t) => t.n === 18 && t.genSol) ? `<details class="case-step" style="margin-top:12px"><summary>Полное решение сквозной задачи</summary><div class="blocks">${renderBlocks(list.find((t) => t.n === 18).genSol)}</div></details>` : ""}
    <div style="display:flex;gap:8px;margin-top:20px;flex-wrap:wrap"><a class="pill ink" href="#/variants">К вариантам</a><a class="pill" href="#/mock">Пробная</a><a class="pill" href="#/mistakes">Работа над ошибками</a></div>`;
  }

  /* ---------- Отчёты ---------- */
  function viewReports() {
    const seed = S.forms.seed || 0, isBase = !seed, p = isBase ? G.CASE_BASE : G.seedCase(seed), s = G.solveCase(p), F = G.forms(s), key = isBase ? "base" : "s" + seed, saved = S.forms[key] || {};
    const cond = isBase ? EX.tasks[17].cond.slice(0, -1) : G.caseCond(p, s);
    const form = (fk, f) => `<div style="margin-bottom:20px" data-form="${fk}"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:9px;flex-wrap:wrap"><h2 class="h-md">${esc(f.title)}</h2><div style="display:flex;gap:6px"><button class="pill" data-act="form-check" data-form="${fk}">Проверить</button><button class="pill ghost" data-act="form-show" data-form="${fk}">Показать ответы</button></div></div><div class="statement"><table><thead><tr><th>Показатель</th>${f.cols.map((c) => `<th class="r">${esc(c)}</th>`).join("")}</tr></thead><tbody>${f.rows.map((r, ri) => (r.sec ? `<tr class="sec"><td colspan="${f.cols.length + 1}">${esc(r.sec)}</td></tr>` : `<tr class="${r.sum ? "sum" : ""}"><td>${esc(r.l)}</td>${r.v.map((v, ci) => `<td class="r"><input aria-label="${esc(r.l)}" inputmode="text" autocomplete="off" data-cell="${fk}.${ri}.${ci}" value="${esc(saved[`${fk}.${ri}.${ci}`] || "")}"><span class="exp" hidden></span></td>`).join("")}</tr>`)).join("")}</tbody></table></div><div class="fb-slot"></div></div>`;
    window.__forms = F; window.__formsKey = key;
    return `${crumbs([["", "Главная"], ["exam", "Контрольная"], ["", "Отчёты"]])}
    <div class="pagehead"><div><h1 class="h-xl">Собери отчёты сам</h1><p class="muted" style="margin-top:10px;max-width:60ch">Те же бланки, что на контрольной. Заполняй по порядку: ОФР, ОДДС, потом баланс. Расходы и платежи можно писать без минуса, итоговое сальдо и убыток со знаком.</p></div></div>
    <div class="chips" style="margin-bottom:16px"><button class="chip ${isBase ? "on" : ""}" data-act="form-base">Задача с контрольной</button><button class="chip ${isBase ? "" : "on"}" data-act="form-new">${isBase ? "Новые числа" : "Другие числа"}</button></div>
    <details class="case-step" open><summary>Условие задачи</summary><div class="blocks">${renderBlocks(cond)}</div></details>
    <div style="margin-top:22px">${form("pl", F.pl)}${form("cf", F.cf)}${form("bs", F.bs)}</div>`;
  }
  function cellOk(rowDef, ci, str) { const v = parseNum(str); if (isNaN(v)) return false; const a = rowDef.v[ci]; return rowDef.abs ? Math.abs(Math.abs(v) - Math.abs(a)) < 1e-9 : Math.abs(v - a) < 1e-9; }
  function formCheck(fk, reveal) {
    const f = window.__forms[fk], root = $(`[data-form="${fk}"]`); let total = 0, ok = 0;
    $$("input[data-cell]", root).forEach((inp) => { const [, ri, ci] = inp.dataset.cell.split("."), r = f.rows[+ri], good = cellOk(r, +ci, inp.value), exp = inp.parentElement.querySelector(".exp"); total++; if (good) ok++; inp.classList.toggle("right", good); inp.classList.toggle("wrong", !good && inp.value.trim() !== ""); if (reveal && !good) { exp.hidden = false; exp.textContent = G.br(r.v[+ci]); } else exp.hidden = true; });
    const slot = root.querySelector(".fb-slot");
    slot.innerHTML = reveal ? "" : `<div class="fb ${ok === total ? "ok" : "bad"}"><b>${ok === total ? "Всё сошлось" : `Верно ${ok} из ${total}`}</b>${ok === total ? (fk === "bs" ? "Актив равен пассиву, отчёт собран верно." : "Переходи к следующему отчёту.") : "Красным отмечены неверные строки, пустые пока не считаются."}</div>`;
    if (ok === total && !reveal) { S.formsDone[window.__formsKey + fk] = true; if (window.__formsKey === "base" && ["pl", "cf", "bs"].every((k) => S.formsDone["base" + k])) S.formsDone.base = true; save(); }
  }

  /* ---------- Тренажёры ---------- */
  function viewTrain() {
    const cards = MODS.reduce((a, m) => a + (m.flashcards || []).length, 0);
    const big = G.LIST[0], bigStat = S.train[big.id];
    return `${crumbs([["", "Главная"], ["bank", "Банк заданий"], ["", "Тренажёры"]])}${trainTabs("train")}<div class="pagehead"><div><h1 class="h-xl">Тренажёры</h1><p class="muted" style="margin-top:10px;max-width:58ch">Варианты контрольной отличаются, поэтому здесь те же типы заданий с новыми числами при каждом запуске.</p></div></div>
    <div class="main-grid" style="margin-bottom:16px;grid-template-columns:1.3fr 1fr 1fr">
      <a class="mesh mesh-magenta hero-mini" href="#/train/${big.id}"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><h2 class="h-md">${big.title}</h2><span class="tag lime">Задания 18–22</span></div><span class="dots" style="font-size:52px">${bigStat ? bigStat.ok : 0}</span><span class="small">${big.desc}</span></a>
      <a class="mesh mesh-orange hero-mini" href="#/cards"><h2 class="h-md">Карточки</h2><span class="dots" style="font-size:52px">${cards}</span><span class="small">Термины и правила на повторение</span></a>
      <a class="mesh mesh-blue hero-mini" href="#/reports"><h2 class="h-md">Бланки отчётов</h2><span class="dots" style="font-size:52px">3</span><span class="small">Баланс, ОФР и ОДДС с проверкой строк</span></a>
    </div>
    <div class="tr-grid">${G.LIST.slice(1).map((g) => { const t = S.train[g.id]; return `<a class="tr" href="#/train/${g.id}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="tag lime">Задание ${g.tasks}</span>${t ? `<span class="small muted">${t.ok} из ${t.total}</span>` : ""}</div><h3>${g.title}</h3><p>${g.desc}</p></a>`; }).join("")}<a class="tr" href="#/mistakes"><span class="tag" style="align-self:flex-start">Твои ошибки</span><h3>Работа над ошибками</h3><p>Всё, что решено неверно, пока не исправишь.</p></a></div>`;
  }
  function viewTrainer(id) {
    const g = G.LIST.find((x) => x.id === id); if (!g) return notFound();
    const seed = trainSeeds[id] || (trainSeeds[id] = Math.floor(Math.random() * 1e9) + 1), task = G.run(id, seed), qid = `gen.${id}.${seed}`, t = S.train[id];
    EPH[qid] = Object.assign(task.quiz, { trainId: id });
    return `${crumbs([["", "Главная"], ["train", "Тренажёры"], ["", g.title]])}<div class="pagehead"><div><h1 class="h-lg" style="font-size:clamp(30px,4vw,46px)">${g.title}</h1><p class="muted" style="margin-top:8px">${g.desc}</p></div><div style="text-align:right;flex:none"><span class="dots" style="font-size:36px" id="tr-stat">${t ? t.ok : 0}</span><div class="tiny muted" id="tr-sub">${t ? `верно из ${t.total}` : "верных решений"}</div></div></div>
    <div style="max-width:860px"><div class="paper"><div class="blocks">${renderBlocks(task.cond)}</div></div><div class="check">${quizHTML(qid, task.quiz, {})}</div><div class="gen-actions"><button class="pill ink" data-act="gen-next" data-id="${id}">Новое задание</button><button class="pill ghost" data-act="gen-sol">Показать решение</button></div><section id="gen-sol" hidden style="margin-top:10px"><h2 class="h-md" style="margin-bottom:14px">Решение</h2><div class="blocks">${renderBlocks(task.sol)}</div></section></div>`;
  }
  const trainSeeds = {};
  function paintTrainStat(id) { const t = S.train[id], a = $("#tr-stat"), b = $("#tr-sub"); if (a && t) { a.textContent = t.ok; b.textContent = `верно из ${t.total}`; } const s = $("#gen-sol"); if (s) s.hidden = false; }

  /* ---------- Карточки ---------- */
  let cardSess = null;
  function cardPool(mid) { return MODS.filter((m) => !mid || m.id === mid).flatMap((m) => (m.flashcards || []).map((c, i) => ({ ...c, key: `${m.id}.${i}`, m }))); }
  function viewCards(mid) {
    const pool = cardPool(mid), box = (c) => S.cards[c.key] || 1;
    if (!cardSess || cardSess.mid !== mid) { const sorted = seeded(pool, "s" + Math.floor(Date.now() / 86400000)).map((x) => x.v).sort((a, b) => box(a) - box(b)); cardSess = { mid, queue: sorted, flipped: false }; }
    const c = cardSess.queue[0], counts = [1, 2, 3].map((b) => pool.filter((x) => box(x) === b).length), write = !!S.cardWrite && c && c.kw;
    const modeChips = `<div class="chips" style="margin-bottom:14px;justify-content:center"><button class="chip ${S.cardWrite ? "" : "on"}" data-act="card-mode" data-v="0">Переворачивать</button><button class="chip ${S.cardWrite ? "on" : ""}" data-act="card-mode" data-v="1">Писать ответ</button></div>`;
    if (write) { const qid = `card.${c.key}.${cardSess.n || 0}`; EPH[qid] = { type: "open", q: c.q, kw: c.kw, need: c.need, model: c.a, why: c.a }; }
    return `${crumbs([["", "Главная"], ["bank", "Банк заданий"], ["", "Карточки"]])}${trainTabs("cards")}<div class="pagehead" style="margin-bottom:16px"><div><h1 class="h-xl">Карточки</h1></div></div>
    <div class="chips" style="margin-bottom:18px"><a class="chip ${!mid ? "on" : ""}" href="#/cards">Все</a>${MODS.filter((m) => (m.flashcards || []).length).map((m) => `<a class="chip ${mid === m.id ? "on" : ""}" href="#/cards/${m.id}">${esc(SHORT[m.id] || m.title)}</a>`).join("")}</div>
    <div class="flash-wrap">${modeChips}${write ? `<div class="flash-write"><span class="tiny muted">${esc(SHORT[c.m.id] || "")}</span><h2 class="big">${md(c.q)}</h2>${quizHTML(`card.${c.key}.${cardSess.n || 0}`, EPH[`card.${c.key}.${cardSess.n || 0}`], { noQ: true })}</div><div class="leitner"><button class="pill" data-act="card-no" disabled>Повторить ещё</button><button class="pill ink" data-act="card-yes" disabled>Помню</button></div>` : c ? `<button class="flash ${cardSess.flipped ? "flipped" : ""}" data-act="flip" aria-label="Перевернуть карточку"><div class="flash-in"><div class="flash-f mesh" style="--c:${COLORS[c.m.id]};background:radial-gradient(70% 70% at 50% 60%,color-mix(in srgb,var(--c) 92%,#000 4%) 0%,color-mix(in srgb,var(--c) 58%,#fff) 60%,color-mix(in srgb,var(--c) 22%,#E8E8E8) 100%)"><span class="tiny" style="opacity:.92">${esc(SHORT[c.m.id] || "")}</span><span class="big">${md(c.q)}</span><span class="tiny" style="opacity:.85">Нажми, чтобы увидеть ответ</span></div><div class="flash-f back"><span class="tiny muted">Ответ</span><span class="txt">${md(c.a)}</span></div></div></button>
    <div class="leitner"><button class="pill" data-act="card-no" ${cardSess.flipped ? "" : "disabled"}>Повторить ещё</button><button class="pill ink" data-act="card-yes" ${cardSess.flipped ? "" : "disabled"}>Помню</button></div>` : `<div class="empty"><p class="h-sm">Круг пройден</p><p>Все карточки просмотрены. Начни заново, чтобы повторить слабые.</p><button class="pill ink" data-act="card-reset" style="margin-top:14px">Начать заново</button></div>`}
    <div class="tr-grid" style="margin-top:22px;grid-template-columns:repeat(3,1fr);gap:8px">${["Учу", "Повторяю", "Помню"].map((t, i) => `<div class="glass" style="padding:14px;text-align:center;border-radius:20px"><span class="dots" style="font-size:32px">${counts[i]}</span><div class="tiny muted">${t}</div></div>`).join("")}</div></div>`;
  }

  /* ---------- Шпаргалка ---------- */
  const EXAM_CHEAT = [
    { title: "Связи и уравнения", items: ["Активы = Капитал + Обязательства", "ΔКапитал = Доходы − Расходы − Дивиденды + Взносы", "Капитал кон = Капитал нач + Чистая прибыль − Дивиденды + Взносы", "Перенос внутри капитала итог не меняет", "Деньги кон = Деньги нач + Сальдо ТО + Сальдо ИО + Сальдо ФО"] },
    { title: "Как найти оплату из обязательства", items: ["Оплата = Сальдо нач + Начислено − Сальдо кон", "Поступление от покупателей = ДЗ нач + Выручка − ДЗ кон", "Выплата зарплаты = Начислено − НДФЛ − Долг на конец", "Уплата налога на прибыль = Долг нач + Начислено − Долг кон"] },
    { title: "Отчёт о финансовых результатах", items: ["Выручка − Себестоимость = Валовая прибыль", "− Коммерческие − Управленческие = Прибыль от продаж", "+ Проценты к получению − Проценты к уплате + Прочие доходы − Прочие расходы = До налогообложения", "− Налог на прибыль = Чистая прибыль", "Займы, погашение кредитов, дивиденды в ОФР не идут", "Штрафы полученные и резерв по сомнительным долгам идут в прочие"] },
    { title: "Виды денежных потоков", items: ["Текущие: покупатели, поставщики, зарплата, налоги, уплаченные проценты", "Инвестиционные: покупка и продажа ОС и ценных бумаг, полученные проценты и дивиденды", "Финансовые: кредиты и займы, вклады, дивиденды выплаченные", "Начисления, амортизация, переоценка, резервы в ОДДС не попадают"] },
    { title: "Запасы", items: ["Себестоимость закупки = цена без НДС + доставка без НДС", "НДС «в том числе»: сумма / 1,2 (при ставке 20 %)", "Хранение и реклама не входят", "Себестоимость продаж = Запасы нач + Закупки − Запасы кон", "FIFO: первым списываем то, что пришло первым"] },
    { title: "Основные средства", items: ["Балансовая = Первоначальная − Накопленная амортизация", "Линейный: стоимость / СПИ", "Уменьшаемый остаток: остаток × норма; неполный год × месяцы / 12", "Месяцы считай по правилу из условия: с месяца принятия или со следующего"] },
    { title: "Вложения, кредит, резервы", items: ["Есть рыночная цена: количество × цена на отчётную дату", "Нет котировок: остаётся прежняя балансовая стоимость", "Краткосрочные заёмные = долг на 12 месяцев + начисленные проценты", "Капитализированные проценты в ОФР не попадают", "Резервный капитал: покрытие убытков и погашение облигаций"] },
    { title: "Определения для тестовой части", items: ["Осмотрительность: возможные расходы признаём, возможные доходы нет", "Денежные эквиваленты: краткосрочные, быстро конвертируются в известную сумму, нет риска изменения стоимости", "Рост рыночной цены своих акций в учёте компании не отражается", "Аренда офиса, коммуналка, зарплата администрации: управленческие расходы периода"] },
  ];
  function viewCheat(mid) {
    const list = mid ? MODS.filter((m) => m.id === mid) : MODS;
    return `${crumbs([["", "Главная"], ["schemes", "Схемы"], ["", "Шпаргалка"]])}<div class="pagehead"><div><h1 class="h-xl">Шпаргалка</h1><p class="muted" style="margin-top:10px">Всё, что нужно повторить за час до контрольной.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="pill" href="#/schemes">Схемы</a><button class="pill" data-act="print">${ICON.print}Распечатать</button></div></div>
    <div class="chips no-print" style="margin-bottom:18px"><a class="chip ${!mid ? "on" : ""}" href="#/cheat">Главное к контрольной</a>${MODS.filter((m) => (m.cheatsheet || []).length).map((m) => `<a class="chip ${mid === m.id ? "on" : ""}" href="#/cheat/${m.id}">${esc(SHORT[m.id] || m.title)}</a>`).join("")}</div>
    <div class="cheat-grid">${(mid ? list.flatMap((m) => m.cheatsheet || []) : EXAM_CHEAT).map((c) => `<div class="cheat"><h3>${md(c.title)}</h3><ul>${c.items.map((i) => `<li>${md(i)}</li>`).join("")}</ul></div>`).join("")}</div>`;
  }

  /* ---------- Ошибки ---------- */
  function viewMistakes() {
    const list = mistakes().sort((a, b) => (S.quiz[b].t || 0) - (S.quiz[a].t || 0));
    return `${crumbs([["", "Главная"], ["bank", "Банк заданий"], ["", "Ошибки"]])}${trainTabs("mistakes")}<div class="pagehead"><div><h1 class="h-xl">Работа над ошибками</h1><p class="muted" style="margin-top:10px;max-width:58ch">Здесь все задания, где ответ был неверным. Решишь правильно, и задание исчезнет из списка.</p></div></div>
    ${list.length ? `<div style="max-width:780px;display:flex;flex-direction:column;gap:12px">${list.map((q) => { const r = QREG[q]; return `<div><div class="tiny muted" style="margin:0 0 6px 6px">${r.task ? `<a href="#/exam/${r.task.n}">Контрольная, задание ${r.task.n}</a>` : r.bankRef ? `<a href="#/${r.bankRef.link}">${esc(r.bankRef.label)}</a>` : `<a href="#/l/${r.lesson.id}">${esc(r.lesson.title)}</a>`}</div>${r.task ? `<div class="paper" style="margin-bottom:8px;padding:16px 18px"><div class="blocks">${renderBlocks(r.task.isCase ? r.task.cond.slice(-1) : r.task.cond)}</div></div>` : r.bankRef && r.bankRef.cond && r.bankRef.cond.length ? `<div class="paper" style="margin-bottom:8px;padding:16px 18px"><div class="blocks">${renderBlocks(r.bankRef.cond)}</div></div>` : ""}${quizHTML(q, r.item, { noBadge: true })}</div>`; }).join("")}</div>` : `<div class="empty"><p class="h-sm">Ошибок нет</p><p>Решай задания в уроках и контрольной: всё, что не получится с первого раза, появится здесь.</p><a class="pill ink" href="#/exam" style="margin-top:14px">Решать контрольную</a></div>`}`;
  }

  /* ---------- План ---------- */
  function viewPlan() {
    const left = daysLeft(), items = planItems(), core = items.filter((i) => !i.optional), done = core.filter((i) => i.state === "done").length, totalMin = core.filter((i) => i.state !== "done").reduce((a, i) => a + i.min, 0);
    const days = left != null && left > 0 ? left : 0;
    let body = "";
    if (days) {
      const queue = items.filter((i) => i.state !== "done" && (!i.optional || days >= 5)), cap = Math.max(60, Math.ceil(queue.reduce((a, i) => a + i.min, 0) / days)), out = []; let cur = [], m = 0;
      queue.forEach((i) => { if (m + i.min > cap && cur.length && out.length < days - 1) { out.push(cur); cur = []; m = 0; } cur.push(i); m += i.min; }); if (cur.length) out.push(cur);
      const base = new Date(today() + "T00:00:00");
      body = !out.length ? `<div class="empty"><p class="h-sm">Этот маршрут пройден</p><p>Прогони ещё одну пробную с новыми числами, чтобы закрепить результат.</p><a class="pill ink" href="#/mock" style="margin-top:14px">Новая пробная</a></div>` : out.map((list, di) => { const d = new Date(base.getTime() + di * 86400000); return `<div class="plan-day ${di === 0 ? "today" : ""}"><h3>${di === 0 ? "Сегодня" : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" })}<span class="tag">примерно ${Math.round(list.reduce((a, i) => a + i.min, 0) / 6) / 10} ч</span></h3>${list.map(planRow).join("")}</div>`; }).join("");
    } else if (!items.some((i) => i.state !== "done")) {
      body = `<div class="empty"><p class="h-sm">Этот маршрут пройден</p><p>Прогони ещё одну пробную с новыми числами, чтобы закрепить результат.</p><a class="pill ink" href="#/mock" style="margin-top:14px">Новая пробная</a></div>`;
    } else {
      body = `<div class="plan-day today"><h3>Порядок подготовки<span class="tag">примерно ${Math.round(totalMin / 6) / 10} ч</span></h3>${items.filter((i) => i.state !== "done").map(planRow).join("")}</div>`;
    }
    const fast = S.planMode === "fast", perDay = days ? totalMin / days / 60 : 0;
    return `${crumbs([["", "Главная"], ["", "План"]])}<div class="pagehead"><div><h1 class="h-xl">${dpActive() ? "Свой маршрут" : "План подготовки"}</h1><p class="muted" style="margin-top:10px;max-width:60ch">Порядок идёт от веса заданий: сначала сквозная задача 18–22, потом расчёты, в конце тестовая часть и пробные.</p></div></div>
    ${dpActive() ? planTabs("auto") : ""}<div class="chips" style="margin-bottom:12px;align-items:center"><button class="chip ${fast ? "" : "on"}" data-act="plan-mode" data-mode="full">Полный маршрут: все уроки</button><button class="chip ${fast ? "on" : ""}" data-act="plan-mode" data-mode="fast">Короткий: только контрольная и пробные</button></div>
    ${!fast && perDay > 5 ? `<div class="b-note exam" style="margin-bottom:14px"><b>Времени мало</b><span>При этой дате полный маршрут требует примерно ${Math.round(perDay)} ч в день. Переключись на короткий: разборы всех 22 заданий, бланки отчётов и две пробные.</span></div>` : ""}
    <div class="glass" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:16px;border-radius:24px"><label style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="small">Дата контрольной</span><input type="date" class="num" style="width:auto;padding:7px 12px" data-inp="examDate" value="${esc(S.examDate)}"></label><span class="small muted">Сделано ${done} из ${core.length} шагов</span></div>
    ${left != null && left <= 0 ? `<p class="small muted" style="margin-bottom:12px">Эта дата уже наступила: выбери новую, чтобы разбить план по дням.</p>` : !S.examDate ? `<p class="small muted" style="margin-bottom:12px">Укажи дату, и план разобьётся по дням.</p>` : ""}${body}`;
  }
  function viewNotes() {
    const N = window.NOTES;
    return `${crumbs([["", "Главная"], ["exam", "Контрольная"], ["", "Спорные места"]])}<div class="pagehead"><div><h1 class="h-xl">Спорные места и опечатки</h1><p class="muted" style="margin-top:10px;max-width:62ch">При разборе материалов нашлись места, где ответ зависит от трактовки, и ошибки в числах. Здесь указано, какой вариант принят на платформе и что изменится при другом.</p></div></div>
    <h2 class="h-md" style="margin-bottom:12px">Что спросить у преподавателя</h2>
    <div style="display:flex;flex-direction:column;gap:10px;max-width:860px">${N.ask.map((a) => `<div class="white" style="border-radius:22px;padding:18px 20px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><h3 class="h-sm">${md(a.q)}</h3>${a.task ? `<a class="tag lime" href="#/exam/${a.task}">Задание ${a.task}</a>` : ""}</div><p style="margin-top:8px;font-size:15.5px"><b style="font-weight:550">На платформе:</b> ${md(a.now)}</p><p style="margin-top:5px;font-size:15.5px"><b style="font-weight:550">Если иначе:</b> ${md(a.other)}</p><p class="small muted" style="margin-top:7px">${md(a.why)}</p></div>`).join("")}</div>
    <div class="sechead"><div><h2 class="h-md">Опечатки в материалах</h2><p class="muted small" style="margin-top:3px">Если на слайде видишь другое число, причина здесь. В уроках уже исправлено.</p></div></div>
    <div class="cheat-grid">${N.typos.map((c) => `<div class="cheat"><h3>${esc(c.src)}</h3><ul>${c.items.map((i) => `<li>${md(i)}</li>`).join("")}</ul></div>`).join("")}</div>`;
  }
  const planRow = (i) => `<a class="plan-item ${i.state}" href="#/${i.link}"><i></i><span>${esc(i.title)}${i.optional ? " (по желанию)" : ""}</span><small class="tiny faint">${i.min} мин</small></a>`;

  const notFound = () => `<div class="empty"><p class="h-sm">Такой страницы нет</p><p>Возможно, ссылка устарела.</p><a class="pill ink" href="#/" style="margin-top:14px">На главную</a></div>`;

  /* ---------- Поиск и настройки ---------- */
  let searchIndex = null;
  const blockText = (b) => { switch (b.t) { case "def": return `${b.term} ${b.text}`; case "list": return b.items.join(" "); case "table": return [...b.head, ...b.rows.flat()].join(" "); case "example": return [b.title, b.given, ...b.steps, b.result].join(" "); case "formula": return `${b.text} ${b.note || ""}`; case "entries": return b.rows.map((r) => r.op).join(" "); case "eq": return b.rows.map((r) => r.op).join(" "); default: return b.text || ""; } };
  function buildIndex() {
    searchIndex = [];
    LESSONS.forEach((l) => (l.sections || []).forEach((s, si) => searchIndex.push({ title: l.title, sub: s.title, text: (s.blocks || []).map(blockText).join(" ").replace(/\*\*/g, ""), link: `l/${l.id}`, scroll: `sec-${si}` })));
    TASKS.forEach((t) => searchIndex.push({ title: `Контрольная, задание ${t.n}`, sub: t.topic, text: t.cond.map(blockText).join(" "), link: `exam/${t.n}` }));
    MODS.forEach((m) => (m.practice || []).forEach((p) => searchIndex.push({ title: p.title, sub: "Практикум", text: (p.condition || []).map(blockText).join(" "), link: `p/${p.id}` })));
    OPENQ.forEach((o) => searchIndex.push({ title: o.q, sub: "Вопрос на теорию", text: o.model, link: "bank/open" }));
    SCHEMES.forEach((x) => searchIndex.push({ title: x.title, sub: "Схема", text: `${x.note} ${x.text.join(" ")}`, link: "schemes", scroll: `sch-${x.id}` }));
    Object.keys(BK.bank).forEach((n) => BK.bank[n].forEach((t, i) => searchIndex.push({ title: n === "18" ? `Банк, сквозная задача «${t.company}»` : `Банк, задание ${n}`, sub: `Задание ${i + 1}`, text: t.cond.map(blockText).join(" "), link: `bank/${n}`, scroll: `bank.${n}.${i}` })));
  }
  function openSearch() {
    if (!searchIndex) buildIndex();
    const ov = document.createElement("div"); ov.className = "overlay"; ov.id = "ov";
    ov.innerHTML = `<div class="modal" role="dialog" aria-label="Поиск"><input class="search" id="search-in" placeholder="Что найти: FIFO, резерв, амортизация" autocomplete="off"><div class="results" id="search-res"><p class="small muted" style="padding:14px 18px">Ищет по урокам, практикумам и заданиям контрольной.</p></div></div>`;
    document.body.appendChild(ov); $("#search-in").focus();
  }
  function runSearch(q) {
    const res = $("#search-res"); q = q.trim().toLowerCase();
    if (q.length < 2) { res.innerHTML = `<p class="small muted" style="padding:14px 18px">Введи хотя бы две буквы.</p>`; return; }
    const hits = searchIndex.map((e) => { const inT = (e.title + " " + e.sub).toLowerCase().includes(q), i = e.text.toLowerCase().indexOf(q); return inT || i >= 0 ? { e, i, score: inT ? 0 : 1 } : null; }).filter(Boolean).sort((a, b) => a.score - b.score).slice(0, 30);
    if (!hits.length) { res.innerHTML = `<p class="small muted" style="padding:14px 18px">Ничего не найдено. Попробуй другое слово или основу слова.</p>`; return; }
    res.innerHTML = hits.map(({ e, i }, k) => { const sn = i >= 0 ? e.text.slice(Math.max(0, i - 50), i + 90) : e.text.slice(0, 120), mark = esc(sn).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), (m) => `<mark>${m}</mark>`); return `<a class="res${k === 0 ? " on" : ""}" href="#/${e.link}" ${e.scroll ? `data-go-scroll="${e.scroll}"` : ""} data-act="close-ov"><b>${esc(e.title)}</b><span>${esc(e.sub)}</span><span>${mark}</span></a>`; }).join("");
  }
  function openSettings() {
    const ov = document.createElement("div"); ov.className = "overlay"; ov.id = "ov";
    ov.innerHTML = `<div class="modal" role="dialog" aria-label="Настройки"><div class="modal-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><h2 class="h-md">Настройки</h2><button class="round sm" style="background:var(--card)" data-act="close-ov" aria-label="Закрыть">${ICON.x}</button></div>
    <div class="settings-row"><span>Дата контрольной</span><input type="date" class="num" style="width:auto" data-inp="examDate" value="${esc(S.examDate)}"></div>
    <div class="settings-row"><div><div>Аккаунт и облако</div><div class="small muted">Личный код, чтобы прогресс был на всех устройствах.</div></div><a class="pill" href="#/account" data-act="close-ov">Открыть</a></div>
    <div class="settings-row"><div><div>Сохранить прогресс в файл</div><div class="small muted">Пригодится при переносе на другой компьютер.</div></div><button class="pill" data-act="export">Скачать файл</button></div>
    <div class="settings-row"><div><div>Загрузить прогресс из файла</div><div class="small muted">Текущий прогресс заменится.</div></div><label class="pill" style="cursor:pointer">Выбрать файл<input type="file" accept=".json" id="import-file" hidden></label></div>
    <div class="settings-row"><div><div>Сбросить весь прогресс</div><div class="small muted">Удалит ответы, заметки и историю пробных.</div></div><button class="pill" data-act="reset">Сбросить</button></div>
    ${memoryOnly ? `<p class="small" style="color:var(--bad);margin-top:12px">Браузер не даёт сохранять данные: прогресс пропадёт при закрытии страницы. Используй «Скачать файл».</p>` : ""}</div></div>`;
    document.body.appendChild(ov);
  }
  const closeOv = () => { const o = $("#ov"); if (o) o.remove(); };
  function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

  /* ---------- Банк заданий ---------- */
  const trainTabs = (cur) => `<div class="chips" style="margin-bottom:20px">${[["bank", "Банк"], ["train", "Тренажёры"], ["cards", "Карточки"], ["mistakes", "Ошибки"]].map(([k, t]) => `<a class="chip ${cur === k ? "on" : ""}" href="#/${k}">${t}</a>`).join("")}</div>`;
  const bankDone = (n) => (BK.bank[n] || []).filter((_, i) => isOk(`bank.${n}.${i}`)).length;
  function viewBank() {
    const done = BK.types.reduce((a, t) => a + bankDone(t.n), 0);
    const card = (t) => { const d = bankDone(t.n); return `<a class="tr" href="#/bank/${t.n}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="tag lime">${esc(t.label)}</span><span class="small muted">${d} из ${t.count}</span></div><h3>${esc(t.title)}</h3><div class="mini-bars" style="margin-top:auto">${Array.from({ length: t.count }, (_, i) => `<i class="${isOk(`bank.${t.n}.${i}`) ? "done" : isTried(`bank.${t.n}.${i}`) ? "part" : ""}"></i>`).join("")}</div></a>`; };
    const group = (title, f) => { const l = BK.types.filter(f); return l.length ? `<div class="sechead" style="margin-top:28px"><h2 class="h-md">${title}</h2></div><div class="tr-grid">${l.map(card).join("")}</div>` : ""; };
    return `${crumbs([["", "Главная"], ["", "Банк заданий"]])}${trainTabs("bank")}
    <section class="mesh mesh-green" style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:6px"><div><h1 class="h-xl">Банк заданий</h1><p style="margin-top:8px;max-width:54ch;font-size:17px">Похожие задания на каждый тип из контрольной: другая ситуация и другие числа, тот же принцип. В варианты контрольной они не входят.</p></div><div style="text-align:right"><span class="dots" style="font-size:64px">${done}</span><div class="small">из ${BK.total} решено</div></div></section>
    ${OPENQ.length ? `<div class="sechead" style="margin-top:28px"><h2 class="h-md">Открытые вопросы</h2></div><div class="tr-grid"><a class="tr" href="#/bank/open"><div style="display:flex;justify-content:space-between;align-items:center"><span class="tag lime">Своими словами</span><span class="small muted">${OPENQ.filter((o) => isOk(`open.${o.id}`)).length} из ${OPENQ.length}</span></div><h3>Вопросы на теорию</h3><p>Пишешь ответ, платформа проверяет ключевые идеи.</p></a></div>` : ""}
    ${group("Тестовая часть", (t) => t.kind === "тест")}${group("Расчёты", (t) => t.kind === "расчёт")}${group("Отчётность", (t) => t.kind === "отчёт")}`;
  }
  function viewBankType(n) {
    const t = BK.types.find((x) => x.n === n), list = BK.bank[n]; if (!t || !list) return notFound();
    const sch = schemesFor("task", n), exLink = n === 18 ? "exam/18" : `exam/${n}`;
    return `${crumbs([["", "Главная"], ["bank", "Банк заданий"], ["", t.label]])}
    <div class="pagehead"><div><h1 class="h-lg" style="font-size:clamp(30px,4vw,46px)">${esc(t.title)}</h1><p class="muted" style="margin-top:8px"><span id="bank-stat">Решено ${bankDone(n)} из ${list.length}</span></p><div class="chips" style="margin-top:12px"><a class="chip" href="#/${exLink}">Разбор ${n === 18 ? "заданий 18–22" : `задания ${n}`} из контрольной</a>${(EX.tasks[n - 1].gen ? `<a class="chip" href="#/train/${EX.tasks[n - 1].gen}">Тренажёр с новыми числами</a>` : "")}${(LINKS[n] || []).length ? `<a class="chip" href="#/l/${[...LINKS[n]].sort((a, b) => a.examTasks.length - b.examTasks.length)[0].id}">Теория</a>` : ""}</div></div></div>
    ${sch.length ? `<div style="max-width:860px;margin-bottom:24px">${schemeStrip(sch.slice(0, 2))}</div>` : ""}
    <div style="max-width:860px;display:flex;flex-direction:column;gap:18px">${list.map((x, i) => bankCard(`bank.${n}.${i}`, x, n === 18 ? `Компания «${x.company}»` : `Задание ${i + 1}`)).join("")}</div>`;
  }
  function viewOpenBank() {
    const byMod = MODS.filter((m) => OPENQ.some((o) => o.mod === m));
    return `${crumbs([["", "Главная"], ["bank", "Банк заданий"], ["", "Вопросы на теорию"]])}<div class="pagehead"><div><h1 class="h-lg" style="font-size:clamp(30px,4vw,46px)">Вопросы на теорию</h1><p class="muted" style="margin-top:8px;max-width:60ch">Ответь своими словами. Проверка ищет ключевые идеи, допускает разные формулировки и мелкие опечатки. Решено ${OPENQ.filter((o) => isOk(`open.${o.id}`)).length} из ${OPENQ.length}.</p></div></div>
    <div class="chips" style="margin-bottom:18px">${byMod.map((m) => `<a class="chip" href="#/bank/open" data-scroll="om-${m.id}">${esc(SHORT[m.id] || m.title)}</a>`).join("")}</div>
    <div style="max-width:860px;display:flex;flex-direction:column;gap:12px">${byMod.map((m) => `<h2 class="h-md" id="om-${m.id}" style="margin-top:14px;scroll-margin-top:14px">${esc(m.title)}</h2>${OPENQ.filter((o) => o.mod === m).map((o) => `<div><div class="tiny muted" style="margin:0 0 6px 6px"><a href="#/l/${o.lesson}">${esc(LMAP[o.lesson] ? LMAP[o.lesson].title : "")}</a></div>${quizHTML(`open.${o.id}`, QREG[`open.${o.id}`].item, { noBadge: true })}</div>`).join("")}`).join("")}</div>`;
  }
  const bankCard = (qid, x, title) => `<article class="paper bank-card" id="${esc(qid)}"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><h2 class="h-sm">${esc(title)}</h2>${isOk(qid) ? `<span class="tag lime">Решено</span>` : isTried(qid) ? `<span class="tag bad">Была ошибка</span>` : ""}</div><div class="blocks">${renderBlocks(x.cond)}</div><div style="margin-top:12px">${quizHTML(qid, x.quiz, { noBadge: true })}</div>${x.sol && x.sol.length ? `<details class="case-step" style="margin:12px 0 0"><summary>Показать разбор</summary><div class="blocks">${renderBlocks(x.sol)}</div></details>` : ""}</article>`;

  /* ---------- Варианты контрольной ---------- */
  const varBest = (id) => { const h = S.mock.history.filter((r) => r.mode === "var" && r.v === id); return h.length ? Math.max(...h.map((r) => r.score)) : null; };
  const varSolved = (id) => BK.variants[id - 1].tasks.filter((t) => isOk(`var.${id}.${t.n}`)).length;
  function viewVariants() {
    const mesh = ["mesh-magenta", "mesh-orange", "mesh-green", "mesh-blue", "mesh-pink", "mesh-magenta"];
    return `${crumbs([["", "Главная"], ["exam", "Контрольная"], ["", "Варианты"]])}<div class="pagehead"><div><h1 class="h-xl">Варианты контрольной</h1><p class="muted" style="margin-top:10px;max-width:62ch">Каждый вариант повторяет структуру настоящей контрольной: 22 задания в том же порядке, задания 18–22 это одна сквозная задача. Ситуации и числа свои.</p></div></div>
    <div class="var-grid">${BK.variants.map((v, i) => { const best = varBest(v.id), sv = varSolved(v.id); return `<a class="mesh ${mesh[i]} var-card" href="#/v/${v.id}"><div style="display:flex;justify-content:space-between;gap:10px"><span class="h-md">${esc(v.title)}</span>${best != null ? `<span class="tag lime">Лучший ${best} из 22</span>` : ""}</div><span class="dots" style="font-size:72px">${v.id}</span><span class="small">Сквозная задача: ООО «${esc(v.company)}»${sv ? `. С проверкой решено ${sv} из 22` : ""}</span></a>`; }).join("")}</div>
    <div class="sechead"><h2 class="h-md">Ещё</h2></div><div class="tr-grid"><a class="tr" href="#/mock"><h3>Пробная по фото или со случайными числами</h3><p>Условия как на листах контрольной или новый набор чисел при каждом запуске.</p></a><a class="tr" href="#/bank"><h3>Банк заданий</h3><p>Если какой-то тип заданий не идёт, потренируй его отдельно.</p></a></div>`;
  }
  function viewVariant(id) {
    const v = BK.variants[id - 1]; if (!v) return notFound(); const h = S.mock.history.filter((r) => r.mode === "var" && r.v === id);
    return `${crumbs([["", "Главная"], ["exam", "Контрольная"], ["variants", "Варианты"], ["", v.title]])}
    <div class="pagehead"><div><h1 class="h-xl">${esc(v.title)}</h1><p class="muted" style="margin-top:10px">22 задания. Сквозная задача: ООО «${esc(v.company)}».</p></div></div>
    <div class="mock-modes" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      <div class="white" style="display:flex;flex-direction:column;gap:10px"><h2 class="h-md">На время</h2><p class="muted small">Как на настоящей: без подсказок, проверка после сдачи.</p><label class="small muted">Время <select id="var-min" class="sel-time"><option value="60">60 минут</option><option value="90" selected>90 минут</option><option value="120">120 минут</option></select></label><button class="pill ink" data-act="var-start" data-v="${id}" style="margin-top:auto">Начать</button></div>
      <div class="white" style="display:flex;flex-direction:column;gap:10px"><h2 class="h-md">С проверкой</h2><p class="muted small">Проверяешь каждое задание сразу и смотришь разбор. Ошибки попадут в работу над ошибками.</p><a class="pill ink" href="#/v/${id}/study" style="margin-top:auto">Решать</a></div>
      <div class="white" style="display:flex;flex-direction:column;gap:10px"><h2 class="h-md">На бумаге</h2><p class="muted small">Распечатай вариант и реши от руки, как на контрольной. Ключ можно напечатать отдельно.</p><a class="pill ink" href="#/v/${id}/print" style="margin-top:auto">К печати</a></div>
    </div>
    ${h.length ? `<div class="sechead"><h2 class="h-md">Твои попытки</h2></div><div class="white">${[...h].reverse().map((r) => `<div class="history-row"><span>${new Date(r.ts).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}, ${r.used} мин</span><b style="font-weight:550">${r.score} из ${r.total}</b></div>`).join("")}</div>` : ""}`;
  }
  function viewVariantStudy(id) {
    const v = BK.variants[id - 1]; if (!v) return notFound(); const c = v.tasks.find((t) => t.n === 18);
    const task = (t) => { const qid = `var.${id}.${t.n}`; return `<article class="${t.isCase ? "white" : "paper"} bank-card" id="vt-${t.n}" style="scroll-margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><h2 class="h-sm">Задание ${t.n}</h2><span class="tag">${esc(t.kind)}</span></div>${t.isCase ? "" : `<div class="blocks">${renderBlocks(t.cond)}</div>`}<div style="margin-top:10px">${quizHTML(qid, t.quiz, { noBadge: true })}</div>${!t.isCase && t.sol && t.sol.length ? `<details class="case-step" style="margin:12px 0 0"><summary>Показать разбор</summary><div class="blocks">${renderBlocks(t.sol)}</div></details>` : ""}</article>`; };
    return `${crumbs([["", "Главная"], ["variants", "Варианты"], [`v/${id}`, v.title], ["", "С проверкой"]])}<h1 class="h-lg" style="margin-bottom:14px">${esc(v.title)}, с проверкой</h1>
    <div class="result-grid no-print" style="margin-bottom:20px;grid-template-columns:repeat(11,minmax(0,1fr))">${v.tasks.map((t) => { const st = S.quiz[`var.${id}.${t.n}`]; return `<a class="tile ${st ? (st.ok ? "ok" : "bad") : ""}" style="height:44px;border-radius:14px;font-size:15px" href="#/v/${id}/study" data-scroll="vt-${t.n}">${t.n}</a>`; }).join("")}</div>
    <div style="max-width:860px;display:flex;flex-direction:column;gap:16px">${v.tasks.filter((t) => !t.isCase).map(task).join("")}
      <div class="paper" id="vt-case"><h2 class="h-sm" style="margin-bottom:10px">Задания 18–22: общие данные</h2><div class="blocks">${renderBlocks(c.cond)}</div></div>
      ${v.tasks.filter((t) => t.isCase).map(task).join("")}
      <details class="case-step"><summary>Полное решение сквозной задачи</summary><div class="blocks">${renderBlocks(c.sol)}</div></details>
    </div><div style="display:flex;justify-content:space-between;margin-top:20px;gap:8px">${id > 1 ? `<a class="pill" href="#/v/${id - 1}">Вариант ${id - 1}</a>` : "<span></span>"}${id < BK.VARIANTS ? `<a class="pill ink" href="#/v/${id + 1}">Вариант ${id + 1}</a>` : `<a class="pill ink" href="#/variants">Все варианты</a>`}</div>`;
  }
  function viewVariantPrint(id) {
    const v = BK.variants[id - 1]; if (!v) return notFound();
    const body = (t) => t.quiz.type === "choice" ? `<ul class="print-opts">${t.quiz.options.map((o) => `<li>${md(o)}</li>`).join("")}</ul>` : `<div class="print-fields">${t.quiz.fields.map((f) => `<div>${f.group ? `<small>${esc(f.group)}</small>` : ""}${md(f.label)}: ______________</div>`).join("")}</div>`;
    const key = (t) => t.quiz.type === "choice" ? t.quiz.options[t.quiz.answer] : t.quiz.fields.map((f) => `${f.label}: ${fmt(f.answer)}`).join("; ");
    return `${crumbs([["", "Главная"], ["variants", "Варианты"], [`v/${id}`, v.title], ["", "Печать"]])}
    <div class="no-print chips" style="margin-bottom:18px"><button class="pill ink" data-act="print-var" data-key="0">Распечатать без ответов</button><button class="pill" data-act="print-var" data-key="1">Распечатать с ключом</button></div>
    <div class="print-sheet"><h1 class="h-lg">Контрольная работа по финансовому учёту. ${esc(v.title)}</h1>${v.tasks.map((t) => `<section class="print-task"><h2>Задание ${t.n}</h2><div class="blocks">${renderBlocks(t.cond)}</div>${body(t)}</section>`).join("")}<section class="print-keytable"><h2>Ключ. ${esc(v.title)}</h2><table><tbody>${v.tasks.map((t) => `<tr><td>${t.n}</td><td>${md(key(t))}</td></tr>`).join("")}</tbody></table></section></div>`;
  }

  /* ---------- Схемы ---------- */
  function viewSchemes(group) {
    const groups = [...new Set(SCHEMES.map((x) => x.group))], list = group ? SCHEMES.filter((x) => x.group === group) : SCHEMES;
    return `${crumbs([["", "Главная"], ["", "Схемы"]])}<div class="pagehead"><div><h1 class="h-xl">Схемы</h1><p class="muted" style="margin-top:10px;max-width:60ch">Опорные схемы к темам курса. Нажми на схему, чтобы открыть её крупно. Каждая надпись проверена по лекциям.</p></div><a class="pill" href="#/cheat">Шпаргалка</a></div>
    <div class="chips" style="margin-bottom:20px"><a class="chip ${!group ? "on" : ""}" href="#/schemes">Все</a>${groups.map((g, i) => `<a class="chip ${group === g ? "on" : ""}" href="#/schemes/${i}">${esc(g)}</a>`).join("")}</div>
    ${list.length ? `<div class="scheme-grid">${list.map((x) => schemeFigure(x)).join("")}</div>` : `<div class="empty"><p class="h-sm">Схем пока нет</p></div>`}
    ${group ? "" : `<div class="sechead"><div><h2 class="h-lg">Интерактивные схемы</h2><p class="muted small" style="margin-top:4px">Нажимай, двигай и смотри, как меняются числа. Эти же элементы встроены в уроки и разборы.</p></div></div><div class="viz-grid">${VZ.map(vizBlock).join("")}</div>`}`;
  }
  function openZoom(id) {
    const x = SCHEMES.find((y) => y.id === id); if (!x) return;
    const ov = document.createElement("div"); ov.className = "overlay zoom"; ov.id = "ov";
    ov.innerHTML = `<div class="zoom-box" role="dialog" aria-label="${esc(x.title)}"><button class="round sm zoom-x" data-act="close-ov" aria-label="Закрыть">${ICON.x}</button><div class="zoom-scroll"><img src="${SIMG[id]}" alt="${esc(x.title)}"></div></div>`;
    document.body.appendChild(ov);
  }

  /* ---------- Аккаунт ---------- */
  function viewAccount() {
    const doneL = LESSONS.filter((l) => lessonState(l) === "done").length, solved = TASKS.filter((t) => isOk(`exam.${t.n}`)).length, answered = Object.keys(S.quiz).length;
    const stats = `<div class="acc-stats"><div><span class="dots">${doneL}</span><small>уроков пройдено</small></div><div><span class="dots">${solved}</span><small>заданий контрольной</small></div><div><span class="dots">${answered}</span><small>ответов сохранено</small></div><div><span class="dots">${S.mock.history.length}</span><small>пробных и вариантов</small></div></div>`;
    const head = `${crumbs([["", "Главная"], ["", "Аккаунт"]])}<div class="pagehead"><div><h1 class="h-xl">Аккаунт</h1><p class="muted" style="margin-top:10px;max-width:60ch">Личный код хранит твой прогресс в облаке. Введи его на телефоне или другом компьютере, и всё, что ты решила, окажется там же.</p></div></div>`;
    if (!cloudOn()) return `${head}<section class="mesh mesh-blue acc-hero"><h2 class="h-md">Облако ещё не подключено</h2><p>Прогресс уже сохраняется в этом браузере и не пропадает при обновлении страницы. Личный код заработает, как только будет подключено облачное хранилище.</p></section>${stats}`;
    if (accCode) return `${head}
      <section class="mesh mesh-blue acc-hero"><span class="small">Твой код аккаунта</span><div class="acc-code" id="acc-code">${esc(accCode)}</div><div class="acc-actions"><button class="pill" data-act="acc-copy">${ICON.copy}Скопировать код</button><button class="pill ghost" data-act="acc-sync">Синхронизировать сейчас</button></div><p class="small" id="sync-status">${syncText()}</p></section>
      ${stats}
      <div class="tr-grid" style="margin-top:16px"><div class="white"><h3 class="h-sm">Как войти на другом устройстве</h3><ol class="b-list" style="margin-top:8px;font-size:15px"><li>Открой сайт по той же ссылке.</li><li>Нажми на значок человека в правом верхнем углу.</li><li>Выбери «У меня есть код» и введи этот код.</li></ol></div><div class="white"><h3 class="h-sm">Береги код</h3><p class="small muted" style="margin-top:8px">Код и есть ключ к прогрессу: пароля нет. Не публикуй его. Если код потеряется, прогресс останется в этом браузере, но с нового устройства войти будет нельзя.</p></div></div>
      <div style="margin-top:18px"><button class="pill ghost" data-act="acc-logout">Выйти на этом устройстве</button><p class="tiny faint" style="margin-top:6px">Прогресс в облаке сохранится, а в этом браузере останется копия.</p></div>`;
    return `${head}<p class="small muted" id="sync-status" style="margin-bottom:14px">${syncText()}</p>
      <div class="mock-modes"><div class="white" style="display:flex;flex-direction:column;gap:10px"><h2 class="h-md">У меня ещё нет кода</h2><p class="muted small">Создам личный код и сохраню в облако всё, что уже решено в этом браузере.</p><button class="pill ink" data-act="acc-create" style="margin-top:auto">Создать мой код</button></div>
      <div class="white" style="display:flex;flex-direction:column;gap:10px"><h2 class="h-md">У меня есть код</h2><p class="muted small">Введи код с другого устройства. Прогресс из облака объединится с тем, что решено здесь.</p><input class="num acc-input" id="acc-in" placeholder="FU-XXXX-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Код аккаунта"><button class="pill ink" data-act="acc-login">Войти</button><div id="acc-msg" class="small"></div></div></div>${stats}`;
  }

  /* ---------- Роутер ---------- */
  let prevRoute = "";
  function route() {
    const parts = location.hash.replace(/^#\//, "").split("/"), r = parts[0] || "", a = parts[1];
    closeOv(); clearInterval(mockTimer);
    if (r === "exam" && $("#wheel") && prevRoute === "exam") {
      const n = clampN(a); updateExam(n); prevRoute = r; return;
    }
    let html = "";
    if (r === "") html = viewHome();
    else if (r === "theory") html = viewTheory();
    else if (r === "m") html = viewModule(a);
    else if (r === "l") html = viewLesson(a);
    else if (r === "p") html = viewPractice(a);
    else if (r === "exam") html = examShell(clampN(a));
    else if (r === "mock") html = a === "result" ? viewMockResult() : viewMock();
    else if (r === "reports") html = viewReports();
    else if (r === "train") html = a ? viewTrainer(a) : viewTrain();
    else if (r === "cards") html = viewCards(a || "");
    else if (r === "cheat") html = viewCheat(a || "");
    else if (r === "mistakes") html = viewMistakes();
    else if (r === "plan") html = a === "auto" || !dpActive() ? viewPlan() : viewDays(a);
    else if (r === "notes") html = viewNotes();
    else if (r === "account") html = viewAccount();
    else if (r === "bank") html = a === "open" ? viewOpenBank() : a ? viewBankType(+a) : viewBank();
    else if (r === "variants") html = viewVariants();
    else if (r === "v") html = parts[2] === "study" ? viewVariantStudy(+a) : parts[2] === "print" ? viewVariantPrint(+a) : viewVariant(+a);
    else if (r === "schemes") { const gs = [...new Set(SCHEMES.map((x) => x.group))]; html = viewSchemes(a != null && a !== "" ? gs[+a] : null); }
    else html = notFound();
    shell(r, html);
    vizInitAll();
    window.scrollTo(0, pendingScroll ? window.scrollY : 0);
    if (r === "exam") { layoutWheel(clampN(a)); }
    if (r === "mock" && S.mock.active && a !== "result") startMockClock();
    if (pendingScroll) { const el = document.getElementById(pendingScroll); pendingScroll = null; if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 30); }
    prevRoute = r;
    if (aiOn) aiSync();
  }
  let pendingScroll = null;
  const clampN = (a) => { const n = parseInt(a, 10); return n >= 1 && n <= 22 ? n : 1; };
  function updateExam(n) {
    const t = TASKS[n - 1]; layoutWheel(n);
    $("#wheel-n").textContent = n; $("#wheel-topic").textContent = t.topic;
    const note = $("#wheel-note"); note.value = S.notes[n] || ""; note.dataset.n = n;
    $("#exam-body").innerHTML = examBody(n);
    vizInitAll();
    const seg = $(".wheel-top .seg a"); if (seg) seg.href = `#/exam/${n}`;
  }

  /* ---------- События ---------- */
  function vizUpdate(el, action, value) {
    const v = VZ.find((x) => x.id === el.dataset.viz); if (!v) return;
    const st = el.__st || (el.__st = v.init()), next = v.on.call(v, st, action, value); el.__st = next;
    const body = $(".viz-body", el), prev = {};
    $$("[data-k]", body).forEach((x) => { prev[x.dataset.k] = { h: x.style.height, w: x.style.width, l: x.style.marginLeft }; });
    const focusInp = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.vinp : null;
    body.innerHTML = v.render(next);
    vizAnimate(body, prev);
    if (focusInp) { const f = $(`[data-vinp="${focusInp}"]`, body); if (f) f.focus(); }
  }
  function vizAnimate(root, prev = {}) {
    const items = $$("[data-k]", root);
    items.forEach((x) => { const p = prev[x.dataset.k]; if (x.dataset.h) x.style.height = p && p.h ? p.h : "0%"; if (x.dataset.w) x.style.width = p && p.w ? p.w : "0%"; if (x.dataset.l) x.style.marginLeft = p && p.l ? p.l : x.dataset.l; });
    void root.offsetWidth;
    requestAnimationFrame(() => items.forEach((x) => { if (x.dataset.h) x.style.height = x.dataset.h; if (x.dataset.w) x.style.width = x.dataset.w; if (x.dataset.l) x.style.marginLeft = x.dataset.l; }));
  }
  const vizInitAll = () => $$(".viz-body").forEach((b) => vizAnimate(b));
  document.addEventListener("input", (e) => { const t = e.target; if (t.dataset && t.dataset.vinp) { const el = t.closest(".viz"); if (el) vizUpdate(el, t.dataset.vinp, t.value); } });
  document.addEventListener("click", (e) => {
    const vb = e.target.closest("[data-vact]");
    if (vb) { const el = vb.closest(".viz"); if (el) vizUpdate(el, vb.dataset.vact, vb.dataset.v); return; }
    const ac = e.target.closest("[data-act]");
    const sc = e.target.closest("[data-scroll]");
    if (sc && sc.dataset.scroll) { e.preventDefault(); const el = document.getElementById(sc.dataset.scroll); if (el) { if (el.tagName === "DETAILS") el.open = true; el.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
    if (e.target.id === "ov") { closeOv(); return; }
    const goS = e.target.closest("[data-go-scroll]"); if (goS) pendingScroll = goS.dataset.goScroll;
    if (!ac) return;
    const act = ac.dataset.act, qz = ac.closest(".qz");
    const isMock = qz && qz.dataset.mock;
    if (act === "opt") {
      const item = getQ(qz.dataset.q), i = +ac.dataset.i;
      if (isMock) { const a = S.mock.active; a.answers[qz.dataset.q] = i; save(); $$(".opt", qz).forEach((b) => b.classList.toggle("sel", b === ac)); return; }
      if (item.type === "multi") { ac.classList.toggle("sel"); return; }
      const ok = i === item.answer;
      $$(".opt", qz).forEach((b) => { const j = +b.dataset.i; b.disabled = true; if (j === item.answer) b.classList.add("right"); else if (j === i) b.classList.add("wrong"); });
      record(qz.dataset.q, ok); feedback(qz, ok, item); if (location.hash.startsWith("#/exam")) paintExamMap();
    } else if (act === "tf") {
      const item = getQ(qz.dataset.q), v = ac.dataset.v === "true", ok = v === item.answer;
      $$(".opt", qz).forEach((b) => { const bv = b.dataset.v === "true"; b.disabled = true; if (bv === item.answer) b.classList.add("right"); else if (bv === v) b.classList.add("wrong"); });
      record(qz.dataset.q, ok); feedback(qz, ok, item);
    } else if (act === "pick") {
      const row = ac.closest(".sort-item"); $$(".sort-b button", row).forEach((b) => b.classList.toggle("on", b === ac));
    } else if (act === "check") { doCheck(qz); }
    else if (act === "hint") { const item = getQ(qz.dataset.q); $(".fb-slot", qz).innerHTML = `<div class="fb hint">${md(item.hint)}</div>`; }
    else if (act === "show" && getQ(qz.dataset.q) && getQ(qz.dataset.q).type === "open") {
      const item = getQ(qz.dataset.q), qid = qz.dataset.q;
      $(".fb-slot", qz).innerHTML = `<div class="fb hint"><div class="model" style="margin:0;border:0;padding:0"><b>Образцовый ответ</b>${md(item.model)}</div><div class="kw-list">${item.kw.map((k) => `<span class="kw">${esc(k.l)}</span>`).join("")}</div></div>`;
      if (!EPH[qid] && !isOk(qid)) record(qid, false);
      if (qid.startsWith("card.")) $$(".leitner .pill").forEach((b) => (b.disabled = false));
    }
    else if (act === "show") {
      const item = getQ(qz.dataset.q);
      $$(".field .num", qz).forEach((inp) => { const f = item.fields[+inp.dataset.f]; if (!checkField(f, inp)) inp.closest(".field").querySelector(".expect").textContent = fmt(f.answer); });
      $(".fb-slot", qz).innerHTML = `<div class="fb hint">${md(item.why)}</div>`;
      if (!isOk(qz.dataset.q) && !EPH[qz.dataset.q]) record(qz.dataset.q, false); else if (EPH[qz.dataset.q]) record(qz.dataset.q, false);
      revealExam(qz); if (location.hash.startsWith("#/exam")) paintExamMap();
    }
    else if (act === "retry" || act === "redo") {
      const qid = qz.dataset.q, item = getQ(qid);
      if (act === "redo") { delete S.quiz[qid]; save(); paintProgress(qid); }
      else if (S.quiz[qid]) { /* оставляем отметку об ошибке, пока не решит верно */ }
      if (EPH[qid]) EPH[qid].counted = EPH[qid].counted;
      const prevOk = S.quiz[qid]; if (prevOk && prevOk.ok) prevOk.ok = false;
      const tmp = document.createElement("div"); tmp.innerHTML = quizHTML(qid, item, {}); qz.replaceWith(tmp.firstElementChild);
    }
    else if (act === "search") openSearch();
    else if (act === "settings") openSettings();
    else if (act === "close-ov") closeOv();
    else if (act === "manual") { const id = ac.dataset.id; S.manual[id] = !S.manual[id]; if (!S.manual[id]) delete S.manual[id]; save(); route(); }
    else if (act === "psol") { S.practice[ac.dataset.id] = true; save(); $("#p-sol").hidden = false; ac.remove(); }
    else if (act === "wheel") { const n = +ac.dataset.n; location.hash = `#/exam/${n}`; }
    else if (act === "exam-list") { e.preventDefault(); const m = $("#side-map"); if (m) m.scrollIntoView({ behavior: "smooth", block: "center" }); }
    else if (act === "scroll-sol") { const s = $("#sol"); if (s && !s.hidden) s.scrollIntoView({ behavior: "smooth" }); else { const t = $("#exam-try"); if (t) t.scrollIntoView({ behavior: "smooth", block: "center" }); } }
    else if (act === "show-sol") { $("#sol").hidden = false; unlockPhoto(); ac.remove(); $("#sol").scrollIntoView({ behavior: "smooth" }); }
    else if (act === "mock-start") { const mode = ac.dataset.mode, min = +($(mode === "orig" ? "#mock-min-a" : "#mock-min-b").value); S.mock.active = { start: Date.now(), minutes: min, mode, seed: Math.floor(Math.random() * 1e9) + 1, answers: {} }; save(); route(); }
    else if (act === "mock-submit") { submitMock(false); }
    else if (act === "form-check") formCheck(ac.dataset.form, false);
    else if (act === "form-show") formCheck(ac.dataset.form, true);
    else if (act === "var-start") { const v = +ac.dataset.v, min = +($("#var-min").value); S.mock.active = { start: Date.now(), minutes: min, mode: "var", v, seed: v, answers: {} }; save(); location.hash = "#/mock"; }
    else if (act === "zoom") { openZoom(ac.dataset.id); }
    else if (act === "acc-create") {
      ac.disabled = true; accCode = newCode(); try { localStorage.setItem(CODE_KEY, accCode); } catch (err) {}
      dirty = true; push(false).then(() => { route(); toast(sync.state === "ok" ? "Код создан, прогресс в облаке" : "Код создан. Отправлю в облако, когда появится связь"); });
    }
    else if (act === "acc-login") {
      const code = normCode($("#acc-in").value), msg = $("#acc-msg");
      if (!code) { msg.innerHTML = `<span style="color:var(--bad)">Код не похож на настоящий. Он выглядит так: FU-XXXX-XXXX-XXXX-XXXX.</span>`; return; }
      ac.disabled = true; msg.textContent = "Проверяю код…"; const prev = accCode; accCode = code;
      rpc("fu_get", { p_code: code }).then((r) => {
        if (!r || !r.data) { accCode = prev; ac.disabled = false; msg.innerHTML = `<span style="color:var(--bad)">Такого кода в облаке нет. Проверь буквы или создай новый код.</span>`; return; }
        try { localStorage.setItem(CODE_KEY, code); } catch (err) {}
        S = mergeState(S, r.data); saveLocal(); dirty = true; push(false); route(); toast("Вход выполнен, прогресс объединён");
      }).catch(() => { accCode = prev; ac.disabled = false; msg.innerHTML = `<span style="color:var(--bad)">Нет связи с облаком. Попробуй ещё раз чуть позже.</span>`; });
    }
    else if (act === "acc-copy") { const t = accCode; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Код скопирован")).catch(() => { const r = document.createRange(); r.selectNodeContents($("#acc-code")); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("Выдели и скопируй код"); }); }
    else if (act === "acc-sync") { pull(true).then(() => toast("Синхронизировано")).catch(() => toast("Нет связи с облаком")); }
    else if (act === "acc-logout") { if (ac.dataset.sure) { push(true); accCode = null; try { localStorage.removeItem(CODE_KEY); } catch (err) {} route(); toast("Вы вышли на этом устройстве"); } else { ac.dataset.sure = "1"; ac.textContent = "Точно выйти"; } }
    else if (act === "inline-sol") { const box = ac.closest(".exam-inline"); $$(".exam-inline-sol", box).forEach((x) => (x.hidden = false)); ac.remove(); }
    else if (act === "print-var") { document.body.classList.toggle("print-key", ac.dataset.key === "1"); window.print(); }
    else if (act === "dp-tick") { const k = ac.dataset.key; S.manual[k] = !S.manual[k]; if (!S.manual[k]) delete S.manual[k]; bump(); save(); softRerender(); }
    else if (act === "plan-mode") { S.planMode = ac.dataset.mode; save(); route(); }
    else if (act === "form-base") { S.forms.seed = 0; save(); route(); }
    else if (act === "form-new") { S.forms.seed = Math.floor(Math.random() * 1e9) + 1; save(); route(); }
    else if (act === "gen-next") { const id = ac.dataset.id; trainSeeds[id] = Math.floor(Math.random() * 1e9) + 1; route(); }
    else if (act === "gen-sol") { $("#gen-sol").hidden = false; ac.remove(); $("#gen-sol").scrollIntoView({ behavior: "smooth" }); }
    else if (act === "flip") { cardSess.flipped = !cardSess.flipped; ac.classList.toggle("flipped", cardSess.flipped); $$(".leitner .pill").forEach((b) => (b.disabled = !cardSess.flipped)); }
    else if (act === "card-mode") { S.cardWrite = ac.dataset.v === "1"; save(); route(); }
    else if (act === "card-yes" || act === "card-no") { cardSess.n = (cardSess.n || 0) + 1; }
    if (act === "card-yes" || act === "card-no") { const c = cardSess.queue.shift(), b = S.cards[c.key] || 1; if (act === "card-yes") S.cards[c.key] = Math.min(3, b + 1); else { S.cards[c.key] = 1; cardSess.queue.splice(Math.min(3, cardSess.queue.length), 0, c); } cardSess.flipped = false; bump(); save(); route(); }
    else if (act === "card-reset") { cardSess = null; route(); }
    else if (act === "print") window.print();
    else if (act === "export") { const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `finuchet-progress-${today()}.json`; a.click(); URL.revokeObjectURL(a.href); toast("Файл с прогрессом скачан"); }
    else if (act === "reset") { if (ac.dataset.sure) { S = DEF(); save(); closeOv(); route(); toast("Прогресс сброшен"); } else { ac.dataset.sure = "1"; ac.textContent = "Точно сбросить"; ac.classList.add("ink"); } }
  });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "search-in") { runSearch(t.value); return; }
    if (t.dataset.inp === "note") { S.notes[t.dataset.n] = t.value; save(); return; }
    if (t.dataset.cell) { const k = window.__formsKey; S.forms[k] = S.forms[k] || {}; S.forms[k][t.dataset.cell] = t.value; save(); return; }
    const qz = t.closest && t.closest(".qz"); if (qz && qz.dataset.mock && t.dataset.f != null) { const a = S.mock.active, q = qz.dataset.q; a.answers[q] = a.answers[q] || {}; a.answers[q][t.dataset.f] = t.value; save(); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.inp === "examDate") { S.examDate = t.value; save(); if (!$("#ov")) route(); else { const v = $("#view"); route(); } }
    if (t.id === "import-file" && t.files[0]) { const fr = new FileReader(); fr.onload = () => { try { const d = JSON.parse(fr.result); if (!d || d.v !== 1) throw 0; S = Object.assign(DEF(), d); save(); closeOv(); route(); toast("Прогресс загружен"); } catch (err) { toast("Это не файл прогресса платформы"); } }; fr.readAsText(t.files[0]); }
  });
  document.addEventListener("keydown", (e) => {
    const t = e.target, typing = t.matches && t.matches("input,textarea,select");
    if (e.key === "Enter" && t.dataset && t.dataset.enter === "check") { const q = t.closest(".qz"); if (q && !q.dataset.mock) { e.preventDefault(); doCheck(q); } return; }
    if (e.key === "Escape") { closeOv(); return; }
    if (e.key === "Enter" && t.id === "acc-in") { const b = $('[data-act="acc-login"]'); if (b) b.click(); return; }
    if (e.key === "Enter" && t.id === "search-in") { const a = $("#search-res .res.on"); if (a) a.click(); return; }
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && t.id === "search-in") { e.preventDefault(); const list = $$("#search-res .res"); const i = list.findIndex((x) => x.classList.contains("on")); if (i < 0) return; list[i].classList.remove("on"); const nx = list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]; nx.classList.add("on"); nx.scrollIntoView({ block: "nearest" }); return; }
    if (typing) return;
    if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !$("#ov")) { e.preventDefault(); openSearch(); return; }
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && $("#wheel")) { const n = clampN(location.hash.split("/")[2]), m = e.key === "ArrowLeft" ? n - 1 : n + 1; if (m >= 1 && m <= 22) location.hash = `#/exam/${m}`; }
  });
  /* Прокрутка колеса перетаскиванием */
  let drag = null;
  document.addEventListener("pointerdown", (e) => { const w = e.target.closest && e.target.closest("#wheel"); if (w) drag = { x: e.clientX, n: clampN(location.hash.split("/")[2]), moved: false }; });
  document.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x, st = STEP(), sh = Math.round(-dx / st); if (Math.abs(dx) > 6) drag.moved = true; if (sh) { const n = Math.max(1, Math.min(22, drag.n + sh)), cur = clampN(location.hash.split("/")[2]); if (n !== cur) layoutWheelPreview(n); } });
  document.addEventListener("pointerup", (e) => { if (!drag) return; const dx = e.clientX - drag.x, sh = Math.round(-dx / STEP()), n = Math.max(1, Math.min(22, drag.n + sh)), moved = drag.moved; drag = null; if (moved) { suppressClick = true; setTimeout(() => (suppressClick = false), 60); if (n !== clampN(location.hash.split("/")[2])) location.hash = `#/exam/${n}`; else layoutWheel(n); } });
  let suppressClick = false;
  document.addEventListener("click", (e) => { if (suppressClick && e.target.closest("#wheel")) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  function layoutWheelPreview(n) { layoutWheel(n); const t = TASKS[n - 1]; $("#wheel-n").textContent = n; $("#wheel-topic").textContent = t.topic; }
  window.addEventListener("resize", () => { if ($("#wheel")) layoutWheel(clampN(location.hash.split("/")[2])); });
  window.addEventListener("hashchange", route);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") push(true); else pull(true).catch(() => {}); });
  window.addEventListener("pagehide", () => push(true));
  window.addEventListener("online", () => { if (dirty) push(false); });
  route();
  pull(true).catch(() => {});
  /* ---------- Спросить ИИ: вопрос собирается здесь, ответ в Claude или ChatGPT ---------- */
  var aiOn = false; // route() вызывается и до этого блока
  const AI = { sel: "", sec: "", pend: null, q: "" };
  const AI_URL = { claude: ["https://claude.ai/new", "Claude"], chatgpt: ["https://chatgpt.com/", "ChatGPT"] };
  const AI_QUICK = [["Объясни проще", "Объясни простыми словами, как будто я слышу это впервые."], ["Пример с числами", "Приведи пример с конкретными числами и проводками."], ["Почему так", "Почему именно так? Какое правило за этим стоит?"], ["По шагам", "Разбери по шагам и покажи, где обычно ошибаются."]];
  const AI_MAX = 2000, cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trim() + "…" : t);
  const aiHidden = () => /^#\/mock/.test(location.hash) && !!S.mock.active;
  function aiContext() {
    const parts = location.hash.replace(/^#\//, "").split("/"), r = parts[0] || "", a = parts[1], h1 = $("#view h1");
    if (r === "l" && LMAP[a]) return { label: `Урок «${LMAP[a].title}»`, topic: `модуль «${LMAP[a].mod.title}», урок «${LMAP[a].title}»` };
    if (r === "exam") { const t = TASKS[clampN(a) - 1]; return { label: `Задание ${t.n} контрольной`, topic: `задание ${t.n} контрольной, тема «${t.topic}»`, cond: (t.cond || []).map(blockText).join(" ").replace(/\s+/g, " ").trim() }; }
    const title = h1 ? h1.textContent.trim() : "Финучёт";
    return { label: title, topic: `страница «${title}» на учебной платформе` };
  }
  function aiPrompt() {
    const c = aiContext(), q = AI.q.trim(), L = [];
    L.push("Я готовлюсь к контрольной по финансовому и управленческому учёту (бухучёт по РСБУ; отчёты: баланс, ОФР, ОДДС). Объясни подробно и понятно, на русском, с примером на числах, если это помогает. Если я в чём-то ошибаюсь, поправь.");
    L.push(`Где я сейчас: ${c.topic}${AI.sec ? `, раздел «${AI.sec}»` : ""}.`);
    if (AI.sel) L.push(`Фрагмент из материалов:\n«${cut(AI.sel, 900)}»`);
    L.push(`Мой вопрос: ${q || (AI.sel ? "объясни этот фрагмент подробно." : "объясни эту тему подробно.")}`);
    if (c.cond) { const room = AI_MAX - L.join("\n\n").length - 30; if (room > 200) L.splice(L.length - 1, 0, `Условие задания:\n${cut(c.cond, room)}`); }
    return L.join("\n\n");
  }
  const ICON_AI = '<svg viewBox="0 0 24 24"><path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>';
  function aiPanelHTML() {
    const c = aiContext();
    return `<div class="ai-head"><div><h3 class="h-sm">Спросить ИИ</h3><p class="tiny muted" style="margin-top:3px">Вопрос соберётся вместе с темой страницы. Ответ откроется в новой вкладке, там можно продолжить разговор.</p></div><button class="round sm" data-act="ai-close" aria-label="Закрыть">${ICON.x}</button></div>
      <div class="ai-ctx"><span class="tag wrap">${esc(c.label)}${AI.sec ? `, ${esc(AI.sec)}` : ""}</span></div>
      ${AI.sel ? `<div class="ai-sel"><p>${esc(cut(AI.sel, 400))}</p><button class="tiny" data-act="ai-unsel">Убрать фрагмент</button></div>` : `<p class="tiny muted ai-hint">Выдели текст в уроке или задании, и он попадёт в вопрос.</p>`}
      <textarea id="ai-q" class="open-in" rows="3" placeholder="Что непонятно? Например: почему проценты по кредиту идут в стоимость объекта?" aria-label="Твой вопрос">${esc(AI.q)}</textarea>
      <div class="chips" style="margin:8px 0 12px">${AI_QUICK.map(([t], i) => `<button class="chip" data-act="ai-quick" data-i="${i}">${t}</button>`).join("")}</div>
      <div class="ai-go"><button class="pill ink" data-act="ai-go" data-p="claude">Спросить Claude</button><button class="pill" data-act="ai-go" data-p="chatgpt">Спросить ChatGPT</button></div>
      <div class="ai-foot"><details class="ai-prev"><summary class="tiny muted">Что уйдёт в чат</summary><pre id="ai-prev-t">${esc(aiPrompt())}</pre></details><button class="tiny ai-copy" data-act="ai-copy">${ICON.copy}Скопировать</button></div>`;
  }
  const aiEls = () => { let f = $("#ai-fab"); if (!f) { f = document.createElement("button"); f.id = "ai-fab"; f.className = "ai-fab no-print"; f.dataset.act = "ai-open"; f.setAttribute("aria-label", "Спросить ИИ"); f.innerHTML = `<i>${ICON_AI}</i><span>Спросить ИИ</span>`; document.body.appendChild(f); const p = document.createElement("button"); p.id = "ai-pick"; p.className = "ai-pick no-print"; p.dataset.act = "ai-open-sel"; p.hidden = true; p.innerHTML = `${ICON_AI}Спросить ИИ`; p.addEventListener("mousedown", (e) => e.preventDefault()); document.body.appendChild(p); } return f; };
  function aiOpen() { let p = $("#ai"); if (!p) { p = document.createElement("div"); p.id = "ai"; p.className = "ai-panel no-print"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Спросить ИИ"); document.body.appendChild(p); } p.innerHTML = aiPanelHTML(); $("#ai-fab").classList.add("on"); $("#ai-pick").hidden = true; const t = $("#ai-q"); if (t && matchMedia("(pointer:fine)").matches) t.focus(); }
  const aiClose = () => { const p = $("#ai"); if (p) p.remove(); const f = $("#ai-fab"); if (f) f.classList.remove("on"); };
  const aiPaintPrev = () => { const x = $("#ai-prev-t"); if (x) x.textContent = aiPrompt(); };
  function aiSync() { const f = aiEls(); f.hidden = aiHidden(); if (aiHidden()) { aiClose(); $("#ai-pick").hidden = true; } else if ($("#ai")) { $("#ai").innerHTML = aiPanelHTML(); } }
  function aiCopy(text, msg) { const done = () => toast(msg); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => toast("Не вышло скопировать: выдели текст в «Что уйдёт в чат» вручную")); else toast("Не вышло скопировать: выдели текст в «Что уйдёт в чат» вручную"); }
  function aiPick() {
    const pick = $("#ai-pick"); if (!pick) return;
    const s = window.getSelection(), txt = s && !s.isCollapsed ? String(s).replace(/\s+/g, " ").trim() : "", node = s && s.anchorNode, view = $("#view");
    if (txt.length < 2 || !node || !view || !view.contains(node) || aiHidden()) { pick.hidden = true; AI.pend = null; return; }
    const el = node.nodeType === 3 ? node.parentElement : node, box = el.closest(".section, .case-step, .bank-card, .qz, article"), hd = box && box.querySelector("h2, summary, h3");
    AI.pend = { sel: txt.slice(0, 1500), sec: hd && !hd.contains(el) ? hd.textContent.replace(/\s+/g, " ").trim().slice(0, 90) : "" };
    const r = s.getRangeAt(0).getBoundingClientRect(); pick.hidden = false;
    const w = pick.offsetWidth, h = pick.offsetHeight, below = r.bottom + 10 + h < innerHeight - 90;
    pick.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left + r.width / 2 - w / 2)) + "px";
    pick.style.top = (below ? r.bottom + 10 : Math.max(10, r.top - h - 10)) + "px";
  }
  let aiT = null, aiRaf = 0;
  document.addEventListener("selectionchange", () => { clearTimeout(aiT); aiT = setTimeout(aiPick, 160); });
  window.addEventListener("scroll", () => { const p = $("#ai-pick"); if (p && !p.hidden && !aiRaf) aiRaf = requestAnimationFrame(() => { aiRaf = 0; aiPick(); }); }, { passive: true });
  document.addEventListener("input", (e) => { if (e.target.id === "ai-q") { AI.q = e.target.value; aiPaintPrev(); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#ai")) aiClose(); });
  document.addEventListener("click", (e) => {
    const ac = e.target.closest("[data-act^='ai-']"); if (!ac) return; const act = ac.dataset.act;
    if (act === "ai-open") { if ($("#ai")) aiClose(); else aiOpen(); }
    else if (act === "ai-open-sel") { if (AI.pend) { AI.sel = AI.pend.sel; AI.sec = AI.pend.sec; } aiOpen(); }
    else if (act === "ai-close") aiClose();
    else if (act === "ai-unsel") { AI.sel = ""; AI.sec = ""; aiOpen(); }
    else if (act === "ai-quick") { const add = AI_QUICK[+ac.dataset.i][1], t = $("#ai-q"); AI.q = AI.q.trim() ? `${AI.q.trim()} ${add}` : add; if (t) { t.value = AI.q; t.focus(); } aiPaintPrev(); }
    else if (act === "ai-copy") aiCopy(aiPrompt(), "Вопрос скопирован: вставь его в любой чат с ИИ");
    else if (act === "ai-go") {
      const [base, name] = AI_URL[ac.dataset.p], p = aiPrompt(), url = `${base}?q=${encodeURIComponent(p)}`;
      if (url.length > 15000) { aiCopy(p, `Вопрос длинный: он скопирован, вставь его в ${name}`); window.open(base, "_blank", "noopener"); }
      else window.open(url, "_blank", "noopener");
    }
  });
  aiSync(); aiOn = true;

  window.__fu = { OPENQ, sync, acc: () => accCode, S: () => S, LESSONS, QREG, BK, SCHEMES, VZ, LESSON_EXAM, aiPrompt };
})();
