/* Т-счета: схемы в уроках и разборах. Обороты и сальдо считает код, текст «Как читать» собирается из тех же чисел.
   Блоки: tacc (один или несколько счетов), tdouble (операция на двух счетах), tbal (баланс как Т: актив и пассив),
   tcase (вся сквозная задача 18–22 на Т-счетах, для любых чисел задачи).
   Интерактивная схема t-post: шесть операций сквозного примера лекции 3.1 сходятся с ОСВ. */
window.TACC = (function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const isNum = (v) => typeof v === "number";
  const fmt = (v) => (isNum(v) ? (v < 0 ? "−" : "") + String(Math.abs(Math.round(v))).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : esc(v));
  const txt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const low = (s) => (/^[А-ЯЁ][а-яё]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const MK = "123456";
  const val = (v) => (isNum(v) ? `<b>${fmt(v)}</b>` : `<span class="tx">${txt(v)}</span>`);
  const mk = (n) => (n ? `<i class="tt-m" aria-hidden="true">${MK[n - 1]}</i>` : "");

  /* Тип счёта: где сальдо и где рост. signed: сторона сальдо зависит от знака (84, 99, расчёты 76) */
  const KIND = {
    "А": { name: "активный", open: "dt", up: "dt" },
    "П": { name: "пассивный", open: "kt", up: "kt" },
    "КА": { name: "контрактивный", open: "kt", up: "kt" },
    "АП": { name: "активно-пассивный", open: "kt", up: "kt", signed: true },
    "ФР": { name: "финансового результата", open: "kt", up: "kt", signed: true },
    "С": { name: "сопоставительный", open: null, up: null },
    "?": { name: "", open: "dt", up: null },
  };
  const CHIP = ["А", "П", "КА", "АП", "ФР"];
  const other = (s) => (s === "dt" ? "kt" : "dt");

  function calc(a) {
    const K = KIND[a.kind] || KIND["?"], dv = (a.dt && a.dt.v) || [], kv = (a.kt && a.kt.v) || [];
    const all = [a.open, a.turnD, a.turnK, ...dv, ...kv].filter((v) => v !== undefined && v !== null);
    if (!all.every(isNum)) return { numeric: false };
    const open = a.open || 0, od = a.turnD !== undefined ? a.turnD : sum(dv), ok = a.turnK !== undefined ? a.turnK : sum(kv);
    let close, side;
    if (a.kind === "А" || a.kind === "?") { close = open + od - ok; side = "dt"; }
    else if (a.kind === "С") { close = ok - od; side = null; }
    else { close = open + ok - od; side = "kt"; if (K.signed && close < 0) { close = -close; side = "dt"; } }
    /* credit: сальдо со знаком «плюс — кредит», для строк пассива; debit: «плюс — дебет», для строк актива */
    const credit = side === "kt" ? close : side === "dt" ? -close : 0;
    return { numeric: true, open, od, ok, close, side, credit, debit: -credit };
  }

  /* Один Т-счёт. o.m — номера-метки {open, dt, kt, turn, close}; o.hi — подсветить записи этой операции */
  function tHTML(a, o = {}) {
    const K = KIND[a.kind] || KIND["?"], c = calc(a), m = o.m || {};
    const openNeg = K.signed && isNum(a.open) && a.open < 0, openSide = a.openSide !== undefined ? a.openSide : openNeg ? "dt" : K.open;
    const rows = [], row = (cls, l, r) => rows.push({ cls, l, r });
    if (K.up && !o.noSub && !a.noSub) row("sub", `<small>${K.up === "dt" ? '+ <span class="w">увеличение</span>' : '− <span class="w">уменьшение</span>'}</small>`, `<small>${K.up === "kt" ? '+ <span class="w">увеличение</span>' : '− <span class="w">уменьшение</span>'}</small>`);
    const hasOpen = a.open !== undefined && a.open !== null && openSide;
    if (hasOpen) { const cell = `${mk(m.open)}<span class="lab">${esc(a.openLab || "Сн")}</span>${val(isNum(a.open) ? Math.abs(a.open) : a.open)}`; row("open", openSide === "dt" ? cell : "", openSide === "kt" ? cell : ""); }
    const ent = (side) => {
      const e = a[side]; if (!e) return mk(m[side]);
      const vals = (e.v || []).map((v, i) => {
        const op = e.ops ? e.ops[i] : null, isHi = e.hi || (op && o.hi && String(op) === String(o.hi));
        return `<div class="tt-e${isHi ? " hi" : ""}"${op ? ` data-op="${esc(op)}"` : ""}>${op ? `<i class="tt-op">${esc(op)}</i>` : ""}${e.vl ? `<span class="lab">${txt(e.vl[i])}</span>` : ""}${val(v)}</div>`;
      }).join("");
      return `${e.l ? `<div class="tt-cap">${mk(m[side])}<span>${txt(e.l)}</span></div>` : mk(m[side])}${vals}`;
    };
    const l = ent("dt"), r = ent("kt");
    row("ent" + (l || r ? "" : " nil"), l, r);
    const turnOf = (side) => (side === "dt" ? (a.turnD !== undefined ? a.turnD : c.numeric ? c.od : null) : a.turnK !== undefined ? a.turnK : c.numeric ? c.ok : null);
    const turn = (side) => { const v = turnOf(side); return v === null ? "" : `${side === "dt" ? mk(m.turn) : ""}<span class="lab">${esc(a.turnLab || "Об")}</span>${val(v)}`; };
    if (!a.noTurn && (turn("dt") || turn("kt"))) row("turn", turn("dt"), turn("kt"));
    const closeSide = a.closeSide !== undefined ? a.closeSide : c.numeric ? c.side : openSide;
    const closeVal = c.numeric ? c.close : a.close;
    const ck = (side) => (closeSide === side && closeVal !== undefined ? `${mk(m.close)}<span class="ck"><span class="lab">Ск</span>${val(closeVal)}</span>` : "");
    if (!a.noClose) { if (closeSide) row("close", ck("dt"), ck("kt")); else rows.push({ full: `${mk(m.close)}<span>${txt(a.close || "Сальдо нет")}</span>` }); }
    const tpl = rows.map((x) => (x.cls && x.cls.startsWith("ent") ? "1fr" : "auto")).join(" ");
    const body = rows.map((x) => (x.full !== undefined ? `<div class="tt-c none">${x.full}</div>` : `<div class="tt-c dt ${x.cls}">${x.l}</div><div class="tt-c kt ${x.cls}">${x.r}</div>`)).join("");
    const chip = CHIP.includes(a.kind) ? ` <i class="tt-kind" title="Счёт ${esc(K.name)}">${esc(a.kind)}</i>` : "";
    const hl = a.hl || "Дебет", hr = a.hr || "Кредит";
    return `<div class="tt"><div class="tt-h"><b>${a.num ? `<span class="tt-num">${esc(a.num)}</span> ` : ""}${txt(a.name)}${chip}</b><span class="tt-dk"><span data-s="${esc(a.hl || "Дт")}">${esc(hl)}</span><span data-s="${esc(a.hr || "Кт")}">${esc(hr)}</span></span></div><div class="tt-b" style="grid-template-rows:${tpl}">${body}</div></div>`;
  }

  /* Текст «Как читать схему» из тех же чисел, что на схеме */
  function readAuto(a) {
    const c = calc(a), K = KIND[a.kind];
    if (!c.numeric || !K || !K.up) return [];
    const up = K.up, dn = other(up), side = (s) => (s === "dt" ? "слева, на дебете" : "справа, на кредите");
    const part = (s) => { const e = a[s] || {}, v = e.v || [], t = s === "dt" ? c.od : c.ok, word = s === "dt" ? "дебету" : "кредиту";
      return `${s === "dt" ? "Слева, по дебету" : "Справа, по кредиту"}: ${low(e.l || (s === up ? "увеличение" : "уменьшение"))}. ${v.length > 1 ? `Сумма записей: ${v.map(fmt).join(" + ")} = ${fmt(t)}` : `Запись ${fmt(t)}`}. Это оборот по ${word}.`; };
    const gen = { "активный": "активного", "пассивный": "пассивного", "контрактивный": "контрактивного" }[K.name] || "этого";
    const r = [];
    if (a.kind === "ФР") r.push(`Сальдо начальное ${fmt(c.open)}.`);
    else r.push(c.open ? `Сальдо начальное ${fmt(c.open)} стоит ${side(K.open)}: счёт ${K.name}.` : `Сальдо начальное 0: на начало периода остатка нет. У ${gen} счёта оно стояло бы ${side(K.open)}.`);
    r.push(part(up), part(dn));
    const f = `${fmt(c.open)} + ${fmt(up === "dt" ? c.od : c.ok)} − ${fmt(up === "dt" ? c.ok : c.od)} = ${fmt(a.kind === "ФР" && c.side === "dt" ? -c.close : c.close)}`;
    if (a.kind === "ФР") r.push(`Сальдо конечное: ${f}. ${c.side === "kt" ? "Оно справа, на кредите, значит, это прибыль. Если бы расходы были больше доходов, сальдо стояло бы слева: убыток." : "Оно слева, на дебете, значит, это убыток."}`);
    else r.push(`Сальдо конечное: ${f}. Оно ${side(c.side)}, на той же стороне, что и начальное.`);
    return r;
  }
  const readMini = (a) => { const c = calc(a); if (!c.numeric) return ""; const up = (KIND[a.kind] || {}).up; return `**${a.name}**: ${fmt(c.open)} + ${fmt(up === "dt" ? c.od : c.ok)} − ${fmt(up === "dt" ? c.ok : c.od)} = ${fmt(c.close)}`; };

  const figure = (cls, title, inner) => `<figure class="tacc ${cls}"><figcaption><span class="tag">Схема</span><b>${txt(title)}</b></figcaption>${inner}</figure>`;
  const readHTML = (read, marks, lead, note) => (read.length || lead
    ? `<div class="tacc-read"><span class="tacc-rh">Как читать схему</span>${lead ? `<p>${txt(lead)}</p>` : ""}${read.length ? `<ol class="${marks ? "mk" : ""}">${read.map((t, i) => `<li>${marks ? `<i class="tt-m" aria-hidden="true">${MK[i] || ""}</i>` : ""}<span>${txt(t)}</span></li>`).join("")}</ol>` : ""}${note ? `<p class="tacc-note">${txt(note)}</p>` : ""}</div>`
    : "");

  /* Блок урока: один счёт с метками и текстом рядом или несколько счетов в сетке */
  function block(b) {
    const accs = b.accs || [], single = accs.length === 1 && !b.mini;
    const read = b.read || (single ? readAuto(accs[0]) : accs.map(readMini).filter(Boolean));
    const K = single ? KIND[accs[0].kind] || KIND["?"] : null;
    const marks = single && read.length >= 4 ? b.mk || (K.up ? { open: 1, [K.up]: 2, [other(K.up)]: 3, close: 4 } : { open: 1, dt: 2, kt: 2, turn: 3, close: 4 }) : null;
    const T = (a) => tHTML(a, { m: marks || {} });
    const ts = b.flow
      ? `<div class="tacc-row">${accs.slice(0, b.flow.after).map(T).join("")}</div><div class="tacc-flow"><span aria-hidden="true">↓</span>${txt(b.flow.text)}<span aria-hidden="true">↓</span></div><div class="tacc-row last">${accs.slice(b.flow.after).map(T).join("")}</div>`
      : `<div class="tacc-ts">${accs.map(T).join("")}</div>`;
    return figure(single ? "one" : "many", b.title || "Как это выглядит на схеме", `<div class="tacc-in">${ts}${readHTML(read, !!marks, b.lead, b.note)}</div>`);
  }

  /* Одна операция на двух счетах: дебет одного, кредит другого, одна сумма */
  const sideText = (side, acc, s) => {
    const [name, kind, why] = acc, K = KIND[kind] || KIND["?"], up = K.up === side;
    return `<b>${side === "dt" ? "Дт" : "Кт"}</b> ${txt(name)}: <span class="${up ? "up" : "dn"}">${up ? "+" : "−"} ${fmt(s)}</span> ${side === "dt" ? "слева" : "справа"}. Счёт ${K.name}, ${up ? "рост" : "уменьшение"} у него ${side === "dt" ? "по дебету" : "по кредиту"}${why ? `: ${txt(why)}` : ""}.`;
  };
  function pairHTML(o, i) {
    const n = o.n === "" ? null : o.n || String(i + 1), s = o.sum === undefined ? "Х" : o.sum;
    const T = (side) => { const [name, kind] = o[side], K = KIND[kind] || KIND["?"]; return tHTML({ name, kind, [side]: { v: [`${K.up === side ? "+" : "−"} ${isNum(s) ? fmt(s) : s}`], ops: n ? [n] : null, hi: true }, noTurn: true, noClose: true, openSide: null }); };
    return `<div class="td-op"><div class="td-h">${n ? `<i class="tt-op">${esc(n)}</i>` : ""}<b>${txt(o.label)}</b>${o.type ? `<span class="tag">${esc(o.type)}</span>` : ""}${o.cur ? `<span class="tag ${/раст/.test(o.cur) ? "lime" : ""}">${esc(o.cur)}</span>` : ""}</div>
      <div class="td-pair">${T("dt")}${T("kt")}</div>
      <p class="td-entry">Запись: Дт ${txt(o.dt[0])}, Кт ${txt(o.kt[0])}, ${fmt(s)}</p>
      <ul class="td-read"><li>${sideText("dt", o.dt, s)}</li><li>${sideText("kt", o.kt, s)}</li></ul></div>`;
  }
  const double = (b) => figure("tdouble", b.title || "Операция на счетах", `${b.lead ? `<p class="td-lead">${txt(b.lead)}</p>` : ""}<div class="td-list">${b.ops.map(pairHTML).join("")}</div>${b.note ? `<p class="tacc-note">${txt(b.note)}</p>` : ""}`);

  /* Баланс как Т: слева актив, справа пассив. ask — подсветить искомую строку пассива */
  function bal(b) {
    const L = b.left, R = b.right, sL = sum(L.map((x) => x[1])), sR = sum(R.map((x) => x[1]));
    const acc = { name: b.name || "Баланс на отчётную дату", kind: "?", hl: "Актив", hr: "Пассив", dt: { v: L.map((x) => x[1]), vl: L.map((x) => x[0]) }, kt: { v: R.map((x) => x[1]), vl: R.map((x) => x[0]) }, turnLab: "Итого", turnD: sL, turnK: sR, noClose: true };
    let html = tHTML(acc);
    if (b.ask !== undefined) { let k = -1; html = html.replace(/<div class="tt-e"/g, (m0) => { k++; return k === L.length + b.ask ? '<div class="tt-e hi"' : m0; }); }
    const read = [`Баланс устроен как Т-счёт: слева актив, справа пассив, то есть капитал и обязательства.`, `Итоги сторон равны: ${L.map((x) => fmt(x[1])).join(" + ")} = ${R.map((x) => fmt(x[1])).join(" + ")} = ${fmt(sR)}.`, ...(b.ask !== undefined ? [`Искомое подсвечено: ${low(R[b.ask][0])} ${fmt(R[b.ask][1])}.`] : []), ...(b.read || [])];
    return figure("one", b.title || "Баланс на схеме: актив и пассив", `<div class="tacc-in"><div class="tacc-ts">${html}</div>${readHTML(read, false)}</div>`);
  }

  /* ---------- Сквозная задача 18–22 на Т-счетах: проводки строятся из чисел задачи ---------- */
  function caseModel(s) {
    const p = s.p, A = {}, ops = [], order = [];
    const acc = (id, num, name, kind, open, g) => { A[id] = { id, num: "", name, kind, open, g, dt: { v: [], ops: [] }, kt: { v: [], ops: [] } }; order.push(id); };
    acc("01", "01", "Основные средства", "А", p.os, 0);
    acc("02", "02", "Амортизация ОС", "КА", p.am, 0);
    acc("41", "41", "Товары", "А", p.zap, 0);
    acc("62", "62.01", "Расчёты с покупателями", "А", p.dz, 0);
    acc("76b", "76", "Проценты по облигациям к получению", "АП", 0, 0);
    acc("76r", "76", "Расчёты с арендодателем", "АП", 0, 0);
    acc("58", "58", "Финансовые вложения", "А", p.fv, 0);
    acc("51", "51", "Расчётные счета", "А", p.ds, 0);
    acc("80", "80", "Уставный капитал", "П", p.uk, 1);
    acc("84", "84", "Нераспределённая прибыль", "АП", s.nrp, 1);
    acc("66", "66.01", "Краткосрочный кредит", "П", p.kr, 1);
    acc("60", "60.01", "Расчёты с поставщиками", "П", p.kz, 1);
    acc("60t", "60", "Транспортная компания", "П", 0, 1);
    acc("70", "70", "Расчёты с персоналом по оплате труда", "П", 0, 1);
    acc("68n", "68", "НДФЛ", "П", 0, 1);
    acc("69", "69", "Страховые взносы", "П", p.sv, 1);
    acc("68p", "68.04", "Налог на прибыль", "П", p.np, 1);
    if (s.divPaid) acc("75", "75", "Расчёты с участниками", "П", 0, 1);
    acc("90", "90", "Продажи", "С", undefined, 2);
    acc("91", "91", "Прочие доходы и расходы", "С", undefined, 2);
    acc("99", "99", "Прибыли и убытки", "ФР", undefined, 2);
    const op = (dt, kt, v, t) => { if (!v) return; const n = ops.length + 1; ops.push({ n, dt, kt, v, t }); A[dt].dt.v.push(v); A[dt].dt.ops.push(n); A[kt].kt.v.push(v); A[kt].kt.ops.push(n); };
    op("41", "60", p.purch, "Закуплены товары");
    op("62", "90", s.rev, `Продажа с наценкой ${p.markup} %: выручка`);
    op("90", "41", s.cost, "Себестоимость проданных товаров");
    op("51", "62", s.buyers, "Поступило от покупателей");
    op("60", "51", s.sup, "Оплачено поставщикам товаров");
    op("90", "60t", p.deliv, "Доставка покупателям: коммерческий расход");
    op("60t", "51", p.deliv, "Доставка оплачена, долга нет");
    op("90", "70", p.fot, "Начислена зарплата");
    op("70", "68n", s.ndfl, "Удержан НДФЛ 13 %");
    op("70", "51", s.wages, "Выплачена зарплата");
    op("68n", "51", s.ndflPaid, "Уплачен НДФЛ");
    op("90", "69", s.sv, "Начислены страховые взносы 30 %");
    op("69", "51", s.svPaid, "Уплачены страховые взносы");
    op("76r", "51", p.rentPaid, "Уплачено арендодателю");
    op("90", "76r", s.rent, "Аренда этого года в расходы");
    op("90", "02", p.amort, "Начислена амортизация");
    op("76b", "91", p.bondAcc, "Начислены проценты по облигациям");
    op("51", "76b", p.bondRec, "Получены проценты по облигациям");
    op("91", "66", p.loanAcc, "Начислены проценты по кредиту");
    op("66", "51", s.loanPaid, "Уплачены проценты по кредиту");
    op("01", "51", s.capex, "Куплено и оплачено оборудование");
    op("51", "66", s.loanNew, "Получен новый кредит");
    op("66", "51", s.loanRepay, "Погашена часть кредита");
    op("84", "75", s.divPaid, "Объявлены дивиденды за прошлый год");
    op("75", "51", s.divPaid, "Выплачены дивиденды");
    op("99", "68p", p.tax, "Начислен налог на прибыль");
    op("68p", "51", s.taxPaid, "Уплачен налог на прибыль");
    if (s.salesP >= 0) op("90", "99", s.salesP, "Прибыль от продаж закрыта на прибыль года"); else op("99", "90", -s.salesP, "Убыток от продаж закрыт на прибыль года");
    const oth = p.bondAcc - p.loanAcc;
    if (oth >= 0) op("91", "99", oth, "Сальдо прочих доходов закрыто на прибыль года"); else op("99", "91", -oth, "Сальдо прочих расходов закрыто на прибыль года");
    return { A, ops, order };
  }
  /* Строки баланса из сальдо счетов: на начало (Сн) и на конец (Ск) */
  function caseBalance(M) {
    const A = M.A, ac = (id) => A[id], has = (id) => !!A[id];
    const deb = (id, end) => (!has(id) ? 0 : end ? calc(ac(id)).debit : ac(id).kind === "А" ? ac(id).open || 0 : -(ac(id).open || 0));
    const cre = (id, end) => (!has(id) ? 0 : end ? calc(ac(id)).credit : ac(id).open || 0);
    const dA = (id, end) => (end ? calc(ac(id)).close : ac(id).open || 0);
    const line = (end) => {
      const os = dA("01", end) - cre("02", end), zap = dA("41", end), dz = dA("62", end) + deb("76b", end) + deb("76r", end), fv = dA("58", end), ds = dA("51", end);
      const uk = cre("80", end), nrp = cre("84", end) + cre("99", end), zs = cre("66", end), kz = ["60", "60t", "70", "68n", "69", "68p", "75"].reduce((x, id) => x + cre(id, end), 0);
      return { os, zap, dz, fv, ds, oa: zap + dz + fv + ds, total: os + zap + dz + fv + ds, uk, nrp, sk: uk + nrp, zs, kz, ko: zs + kz, pas: uk + nrp + zs + kz };
    };
    return { start: line(false), end: line(true) };
  }
  function caseBlock(s, opt = {}) {
    const M = caseModel(s), B = caseBalance(M), A = M.A, num = (id) => A[id].name;
    const T = (id) => { const a = A[id]; return tHTML({ ...a, open: a.open ? a.open : undefined, close: a.kind === "С" ? "Сальдо нет: закрыт на прибыль года" : undefined, noSub: true }); };
    const grp = (g, title) => `<h4 class="tc-g">${title}</h4><div class="tp-grid tc-grid">${M.order.filter((id) => A[id].g === g).map(T).join("")}</div>`;
    const cs = M.order.map((id) => calc(A[id])), sD = sum(cs.map((c) => c.od)), sK = sum(cs.map((c) => c.ok));
    const R = (l, from, k, b) => `<tr${b ? ' class="tc-tot"' : ""}><td>${b ? `<b>${l}</b>` : l}</td><td>${from}</td><td class="r">${b ? `<b>${fmt(B.start[k])}</b>` : fmt(B.start[k])}</td><td class="r">${b ? `<b>${fmt(B.end[k])}</b>` : fmt(B.end[k])}</td></tr>`;
    const kzFrom = ["поставщики", "зарплата", "НДФЛ", "взносы", "налог на прибыль", ...(A["75"] ? ["участники"] : [])].join(" + ");
    const check = `<h4 class="tc-g">Сверка: из сальдо счетов в баланс</h4><div class="tbl-wrap"><table class="tc-tbl"><thead><tr><th>Строка баланса</th><th>Сальдо каких счетов</th><th class="r">На начало</th><th class="r">На конец</th></tr></thead><tbody>
      ${R("Основные средства", "основные средства − амортизация", "os")}${R("Запасы", "товары", "zap")}${R("Дебиторская задолженность", "покупатели + проценты к получению + аренда", "dz")}${R("Финансовые вложения", "финансовые вложения", "fv")}${R("Денежные средства", "расчётные счета", "ds")}${R("Баланс (актив)", "", "total", 1)}
      ${R("Уставный капитал", "уставный капитал", "uk")}${R("Нераспределённая прибыль", "прошлых лет + прибыль года", "nrp")}${R("Заёмные средства", "кредит", "zs")}${R("Кредиторская задолженность", kzFrom, "kz")}${R("Баланс (пассив)", "", "pas", 1)}</tbody></table></div>
      <p class="tc-sum">Обороты по дебету всех счетов ${fmt(sD)} ${sD === sK ? "=" : "≠"} обороты по кредиту ${fmt(sK)}: каждая сумма записана дважды. Продажи и прочие доходы и расходы закрываются на прибыль года, а она показывается в балансе вместе с нераспределённой прибылью.</p>`;
    const list = M.ops.map((o) => `<li><button type="button" class="tc-op" data-tcop="${o.n}" aria-pressed="false"><i class="tt-op">${o.n}</i><span class="tc-t">${esc(o.t)}</span><span class="tc-e">Дт ${esc(num(o.dt))}, Кт ${esc(num(o.kt))}</span><b>${fmt(o.v)}</b></button></li>`).join("");
    return `<figure class="tacc tcase"><figcaption><span class="tag">Схема</span><b>${txt(opt.title || "Вся задача на Т-счетах")}</b></figcaption>
      <p class="td-lead">Сальдо на начало взяты из ОСВ. Каждая операция года записана дважды, по дебету одного счёта и по кредиту другого. Номер у суммы на счёте совпадает с номером в списке. Сальдо на конец сразу дают баланс на конец года.</p>
      <details class="tc-ops"${opt.closedOps ? "" : " open"}><summary>Операции за год: ${M.ops.length}. Нажми на операцию, и она подсветится на счетах</summary><ol class="tc-list">${list}</ol></details>
      <div class="tc-say" aria-live="polite" hidden></div>
      ${grp(0, "Активы")}${grp(1, "Капитал и обязательства")}${grp(2, "Счета результата")}${check}</figure>`;
  }
  /* Подсветка операции в сквозной задаче */
  if (typeof document !== "undefined") document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-tcop]"); if (!b) return;
    const box = b.closest(".tcase"); if (!box) return;
    const k = b.dataset.tcop, on = box.dataset.on === k ? "" : k; box.dataset.on = on;
    box.querySelectorAll("[data-tcop]").forEach((x) => { const a = x.dataset.tcop === on; x.classList.toggle("on", a); x.setAttribute("aria-pressed", String(a)); });
    box.querySelectorAll(".tt-e[data-op]").forEach((x) => x.classList.toggle("hi", x.dataset.op === on));
    const say = box.querySelector(".tc-say");
    if (say) { say.hidden = !on; if (on) say.innerHTML = `<i class="tt-op">${esc(on)}</i>${b.querySelector(".tc-t").innerHTML}: ${b.querySelector(".tc-e").innerHTML}, ${b.querySelector("b").innerHTML}. Подсвечено на двух счетах ниже.`; }
  });

  /* ---------- Сквозной пример лекции 3.1 (слайды 21–30): шесть операций разносятся по счетам ---------- */
  const POST = {
    accs: [
      { id: "zap", name: "Запасы (товары)", osv: "Запасы", kind: "А", open: 0 },
      { id: "uch", name: "Расчёты с учредителями по вкладам в УК", osv: "Расчёты с учредителями по вкладам в уставный капитал", kind: "А", open: 10000 },
      { id: "pok", name: "Расчёты с покупателями", osv: "Расчёты с покупателями", kind: "А", open: 0 },
      { id: "av", name: "Авансы выданные поставщикам", osv: "Авансы выданные поставщикам", kind: "А", open: 0 },
      { id: "ds", name: "Денежные средства (расчётные счета)", osv: "Денежные средства", kind: "А", open: 0 },
      { id: "uk", name: "Уставный капитал", osv: "Уставный капитал", kind: "П", open: 10000 },
      { id: "pr", name: "Продажи", osv: "Продажи", kind: "П", open: 0 },
      { id: "kr", name: "Расчёты по кредитам", osv: "Расчёты по кредитам", kind: "П", open: 0 },
      { id: "post", name: "Расчёты с поставщиками", osv: "Расчёты с поставщиками", kind: "П", open: 0 },
    ],
    ops: [
      { n: "1", label: "Кредит банка", dt: "ds", kt: "kr", sum: 100000, dw: "деньги поступили от банка", kw: "появился долг банку" },
      { n: "2", label: "Аванс поставщику", dt: "av", kt: "ds", sum: 12500, dw: "поставщик теперь должен компании товар", kw: "деньги ушли поставщику" },
      { n: "3.1", label: "Поступил товар", dt: "zap", kt: "post", sum: 50000, dw: "товар принят в полной сумме", kw: "появился долг поставщику" },
      { n: "3.2", label: "Зачёт аванса", dt: "post", kt: "av", sum: 12500, dw: "долг поставщику уменьшился на сумму аванса", kw: "аванс закрыт" },
      { n: "4.1", label: "Продажа: выручка", dt: "pok", kt: "pr", sum: 40000, dw: "покупатель должен компании", kw: "выручка увеличивает капитал" },
      { n: "4.2", label: "Продажа: товар ушёл", dt: "pr", kt: "zap", sum: 25000, dw: "себестоимость уменьшает капитал", kw: "половина товара ушла покупателю" },
      { n: "5", label: "Оплата от покупателя", dt: "ds", kt: "pok", sum: 20000, dw: "деньги поступили", kw: "долг покупателя уменьшился" },
    ],
  };
  function postState(k) {
    return POST.accs.map((a) => {
      const done = POST.ops.slice(0, k), dt = done.filter((o) => o.dt === a.id), kt = done.filter((o) => o.kt === a.id);
      return { ...a, open: a.open || undefined, dt: { v: dt.map((o) => o.sum), ops: dt.map((o) => o.n) }, kt: { v: kt.map((o) => o.sum), ops: kt.map((o) => o.n) } };
    });
  }
  const accName = (id) => POST.accs.find((a) => a.id === id).name;
  const postViz = {
    id: "t-post", title: "Шесть операций на Т-счетах", note: "Сквозной пример лекции 3.1 (слайды 21–30). Нажимай «Следующая операция»: каждая сумма встаёт на два счёта, по дебету одного и по кредиту другого. В конце обороты и сальдо сходятся с ОСВ.", lessons: [], tasks: [],
    init: () => ({ k: 0 }),
    on(s, a, v) { if (a === "next") return { k: Math.min(s.k + 1, POST.ops.length) }; if (a === "all") return { k: POST.ops.length }; if (a === "reset") return { k: 0 }; if (a === "go") return { k: +v }; return s; },
    render(s) {
      const N = POST.ops.length, accs = postState(s.k), cur = s.k ? POST.ops[s.k - 1] : null, end = s.k === N;
      const chips = POST.ops.map((o, i) => `<button class="tp-chip${i < s.k - 1 ? " done" : i === s.k - 1 ? " on" : ""}" data-vact="go" data-v="${i + 1}" aria-pressed="${i === s.k - 1}"><i>${esc(o.n)}</i>${esc(o.label)}</button>`).join("");
      const say = cur ? `<b>ФХЖ ${esc(cur.n)}. ${esc(cur.label)}, ${fmt(cur.sum)}.</b> Дт ${esc(accName(cur.dt))}: ${esc(cur.dw)}. Кт ${esc(accName(cur.kt))}: ${esc(cur.kw)}. Одна сумма, две записи.` : "<b>Начало периода.</b> На счетах только сальдо после ФХЖ 0: участники должны внести 10 000 в уставный капитал. Слева, на дебете, сальдо активного счёта; справа, на кредите, сальдо пассивного.";
      const cs = accs.map(calc), sD = sum(cs.map((c) => c.od)), sK = sum(cs.map((c) => c.ok));
      const cD = sum(cs.map((c) => (c.side === "dt" ? c.close : 0))), cK = sum(cs.map((c) => (c.side === "kt" ? c.close : 0)));
      const ts = accs.map((a) => tHTML(a, { hi: cur && (cur.dt === a.id || cur.kt === a.id) ? cur.n : null, noSub: true })).join("");
      return `<div class="tp-chips">${chips}</div><div class="vz-verdict on tp-say">${say}</div>
        <div class="tp-grid">${ts}</div>
        <div class="tp-sum${end ? " end" : ""}"><div><small>Обороты по дебету</small><b>${fmt(sD)}</b></div><span>${sD === sK ? "=" : "≠"}</span><div><small>Обороты по кредиту</small><b>${fmt(sK)}</b></div><div class="sep"></div><div><small>Сальдо конечное, дебет</small><b>${fmt(cD)}</b></div><span>${cD === cK ? "=" : "≠"}</span><div><small>Сальдо конечное, кредит</small><b>${fmt(cK)}</b></div></div>
        ${end ? `<p class="small muted">Это те же числа, что в ОСВ ниже: обороты 260 000 и сальдо 162 500. Равенство держится после каждой операции, потому что каждая сумма записана дважды.</p>` : ""}
        <div class="vz-btns">${end ? `<span class="tag lime">Все операции разнесены</span>` : `<button class="pill ink" data-vact="next">Следующая операция</button><button class="pill" data-vact="all">Показать всё</button>`}<button class="pill ghost" data-vact="reset">Сначала</button></div>`;
    },
  };
  if (window.VIZ) window.VIZ.push(postViz);

  return { calc, block, double, bal, tHTML, readAuto, POST, postState, KIND, caseModel, caseBalance, caseBlock };
})();
