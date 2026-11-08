/* Т-счета: схемы в уроках. Обороты и сальдо считает код, текст «Как читать» собирается из тех же чисел.
   Блоки уроков: tacc (один или несколько счетов), tdouble (одна операция на двух счетах).
   Интерактивная схема t-post: шесть операций сквозного примера разносятся по счетам и сходятся с ОСВ. */
window.TACC = (function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const isNum = (v) => typeof v === "number";
  const fmt = (v) => (isNum(v) ? (v < 0 ? "−" : "") + String(Math.abs(Math.round(v))).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") : esc(v));
  const txt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const low = (s) => (/^[А-ЯЁ][а-яё]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const MK = "123456";
  const bv = (v) => `<b${isNum(v) ? "" : ' class="s"'}>${fmt(v)}</b>`;
  const mk = (n) => (n ? `<i class="tt-m" aria-hidden="true">${MK[n - 1]}</i>` : "");

  /* Тип счёта: где сальдо и где рост */
  const KIND = {
    "А": { name: "активный", open: "dt", up: "dt" },
    "П": { name: "пассивный", open: "kt", up: "kt" },
    "КА": { name: "контрактивный", open: "kt", up: "kt" },
    "ФР": { name: "финансового результата", open: "kt", up: "kt" },
    "С": { name: "сопоставительный", open: null, up: null },
    "?": { name: "", open: "dt", up: null },
  };
  const SIDE = { dt: "по дебету, слева", kt: "по кредиту, справа" };
  const other = (s) => (s === "dt" ? "kt" : "dt");

  function calc(a) {
    const dv = (a.dt && a.dt.v) || [], kv = (a.kt && a.kt.v) || [];
    const all = [a.open, a.turnD, a.turnK, ...dv, ...kv].filter((v) => v !== undefined && v !== null);
    if (!all.every(isNum)) return { numeric: false };
    const open = a.open || 0, od = a.turnD !== undefined ? a.turnD : sum(dv), ok = a.turnK !== undefined ? a.turnK : sum(kv);
    let close, side;
    if (a.kind === "А") { close = open + od - ok; side = "dt"; }
    else if (a.kind === "С") { close = ok - od; side = null; }
    else { close = open + ok - od; side = "kt"; if (a.kind === "ФР" && close < 0) { close = -close; side = "dt"; } }
    return { numeric: true, open, od, ok, close, side };
  }

  /* Один Т-счёт. m — номера-метки {open, dt, kt, turn, close}; hi — подсветить записи с этим номером операции */
  function tHTML(a, m = {}, hi) {
    const K = KIND[a.kind] || KIND["?"], c = calc(a), openSide = a.openSide || K.open;
    const cell = (side, inner, cls = "") => `<div class="tt-c ${side}${cls ? " " + cls : ""}">${inner}</div>`;
    const row = (l, r, cls) => cell("dt", l, cls) + cell("kt", r, cls);
    const sign = (side) => (K.up ? (side === K.up ? '+ <span class="w">увеличение</span>' : '− <span class="w">уменьшение</span>') : "");
    const sh = K.up ? row(`<small>${sign("dt")}</small>`, `<small>${sign("kt")}</small>`, "sub") : "";
    const hasOpen = a.open !== undefined && a.open !== null && openSide;
    const openCell = hasOpen ? `${mk(m.open)}<span class="lab">Сн</span>${bv(a.open)}` : "";
    const ent = (side) => {
      const e = a[side]; if (!e) return "";
      const vals = (e.v || []).map((v, i) => {
        const op = e.ops ? e.ops[i] : null, tag = op ? `<i class="tt-op">${esc(op)}</i>` : "", lab = e.vl ? `<span class="lab">${esc(e.vl[i])}</span>` : "";
        return `<div class="tt-e${e.hi || (op && hi && String(op) === String(hi)) ? " hi" : ""}">${tag}${lab}${bv(v)}</div>`;
      }).join("");
      return `${e.l ? `<div class="tt-cap">${mk(m[side])}${txt(e.l)}</div>` : mk(m[side])}${vals}`;
    };
    const turnOf = (side) => (side === "dt" ? (a.turnD !== undefined ? a.turnD : c.numeric ? c.od : null) : a.turnK !== undefined ? a.turnK : c.numeric ? c.ok : null);
    const turn = (side) => { const v = turnOf(side); return v === null ? "" : `${side === "dt" ? mk(m.turn) : ""}<span class="lab">Об</span>${bv(v)}`; };
    const closeSide = a.closeSide !== undefined ? a.closeSide : c.numeric ? c.side : openSide;
    const closeVal = c.numeric ? c.close : a.close;
    const closeCell = (side) => (closeSide === side && closeVal !== undefined ? `${mk(m.close)}<span class="ck"><span class="lab">Ск</span>${bv(closeVal)}</span>` : "");
    const showTurn = a.noTurn || (!turn("dt") && !turn("kt")) ? "" : row(turn("dt"), turn("kt"), "turn");
    const showClose = a.noClose ? "" : closeSide ? row(closeCell("dt"), closeCell("kt"), "close") : `<div class="tt-c none">${mk(m.close)}${esc(a.close || "Сальдо нет")}</div>`;
    return `<div class="tt${a.wide ? " wide" : ""}"><div class="tt-h"><span data-s="Дт">Дебет</span><b>${txt(a.name)}${["А", "П", "КА", "ФР"].includes(a.kind) ? ` <i class="tt-kind" title="${esc(K.name ? "Счёт " + K.name : "")}">${esc(a.kind)}</i>` : ""}</b><span data-s="Кт">Кредит</span></div>
      <div class="tt-b">${sh}${hasOpen ? row(openSide === "dt" ? openCell : "", openSide === "kt" ? openCell : "", "open") : ""}${a.dt || a.kt ? row(ent("dt"), ent("kt"), "ent") : ""}${showTurn}${showClose}</div></div>`;
  }

  /* Текст «Как читать схему» из тех же чисел, что на схеме */
  function readAuto(a) {
    const c = calc(a), K = KIND[a.kind];
    if (!c.numeric || !K || !K.up) return [];
    const up = K.up, dn = other(up), side = (s) => (s === "dt" ? "слева, на дебете" : "справа, на кредите");
    const part = (s) => { const e = a[s] || {}, v = e.v || [], t = s === "dt" ? c.od : c.ok, word = s === "dt" ? "дебету" : "кредиту";
      return `${s === "dt" ? "Слева, по дебету" : "Справа, по кредиту"}: ${low(e.l || (s === up ? "увеличение" : "уменьшение"))}. ${v.length > 1 ? `Сумма записей: ${v.map(fmt).join(" + ")} = ${fmt(t)}` : `Запись ${fmt(t)}`}. Это оборот по ${word}.`; };
    const r = [];
    if (a.kind === "ФР") r.push(`Сальдо начальное ${fmt(c.open)}.`);
    else r.push(c.open ? `Сальдо начальное ${fmt(c.open)} стоит ${side(K.open)}: счёт ${K.name}.` : `Сальдо начальное 0: на начало периода остатка нет. У ${{ "активный": "активного", "пассивный": "пассивного", "контрактивный": "контрактивного" }[K.name]} счёта оно стояло бы ${side(K.open)}.`);
    r.push(part(up), part(dn));
    const f = `${fmt(c.open)} + ${fmt(up === "dt" ? c.od : c.ok)} − ${fmt(up === "dt" ? c.ok : c.od)} = ${fmt(a.kind === "ФР" && c.side === "dt" ? -c.close : c.close)}`;
    if (a.kind === "ФР") r.push(`Сальдо конечное: ${f}. ${c.side === "kt" ? "Оно справа, на кредите, значит, это прибыль. Если бы расходы были больше доходов, сальдо стояло бы слева: убыток." : "Оно слева, на дебете, значит, это убыток."}`);
    else r.push(`Сальдо конечное: ${f}. Оно ${side(c.side)}, на той же стороне, что и начальное.`);
    return r;
  }
  const readMini = (a) => { const c = calc(a); if (!c.numeric) return ""; const up = KIND[a.kind].up; return `**${a.name}**: ${fmt(c.open)} + ${fmt(up === "dt" ? c.od : c.ok)} − ${fmt(up === "dt" ? c.ok : c.od)} = ${fmt(c.close)}`; };

  /* Блок урока: один счёт с метками и текстом рядом или несколько счетов в сетке */
  function block(b) {
    const accs = b.accs || [], single = accs.length === 1 && !b.mini;
    const auto = single ? readAuto(accs[0]) : [], read = b.read || auto;
    const K = single ? KIND[accs[0].kind] || KIND["?"] : null;
    const marks = single && read.length >= 4 ? b.mk || (K.up ? { open: 1, [K.up]: 2, [other(K.up)]: 3, close: 4 } : { open: 1, dt: 2, kt: 2, turn: 3, close: 4 }) : {};
    const items = single ? read.map((t, i) => `<li><i class="tt-m" aria-hidden="true">${MK[i] || ""}</i><span>${txt(t)}</span></li>`).join("") : read.map((t) => `<li><span>${txt(t)}</span></li>`).join("");
    const mini = !single && !b.read ? accs.map(readMini).filter(Boolean) : [];
    const list = items || mini.map((t) => `<li><span>${txt(t)}</span></li>`).join("");
    return `<figure class="tacc${single ? " one" : " many"}${["", "", " two", " three", " two"][accs.length] || " three"}"><figcaption><span class="tag">Схема</span><b>${txt(b.title || "Как это выглядит на схеме")}</b></figcaption>
      <div class="tacc-in"><div class="tacc-ts">${accs.map((a) => tHTML(a, single ? marks : {})).join("")}</div>
      ${list || b.lead ? `<div class="tacc-read"><span class="tacc-rh">Как читать схему</span>${b.lead ? `<p>${txt(b.lead)}</p>` : ""}${list ? `<ol class="${single ? "mk" : ""}">${list}</ol>` : ""}${b.note ? `<p class="tacc-note">${txt(b.note)}</p>` : ""}</div>` : ""}</div></figure>`;
  }

  /* Одна операция на двух счетах: дебет одного, кредит другого, одна сумма */
  const sideText = (side, acc, sumv) => {
    const [name, kind, why] = acc, K = KIND[kind] || KIND["?"], up = K.up === side;
    return `<b>${side === "dt" ? "Дт" : "Кт"}</b> ${txt(name)}: <span class="${up ? "up" : "dn"}">${up ? "+" : "−"}\u00a0${fmt(sumv)}</span> ${side === "dt" ? "слева" : "справа"}. Счёт ${K.name}, ${up ? "рост" : "уменьшение"} у него ${side === "dt" ? "по дебету" : "по кредиту"}${why ? `: ${txt(why)}` : ""}.`;
  };
  function pairHTML(o, i) {
    const mkAcc = (side) => { const [name, kind] = o[side], K = KIND[kind] || KIND["?"]; return tHTML({ name, kind, [side]: { v: [`${K.up === side ? "+" : "−"}\u00a0${o.sum === undefined ? "Х" : isNum(o.sum) ? fmt(o.sum) : o.sum}`], ops: o.n === "" ? null : [o.n || String(i + 1)], hi: true }, noTurn: true, noClose: true, openSide: null }, {}, o.n || String(i + 1)); };
    const s = o.sum === undefined ? "Х" : o.sum;
    return `<div class="td-op"><div class="td-h">${o.n === "" ? "" : `<i class="tt-op">${esc(o.n || i + 1)}</i>`}<b>${txt(o.label)}</b>${o.type ? `<span class="tag">${esc(o.type)}</span>` : ""}${o.cur ? `<span class="tag ${/раст/.test(o.cur) ? "lime" : ""}">${esc(o.cur)}</span>` : ""}</div>
      <div class="td-pair">${mkAcc("dt")}${mkAcc("kt")}</div>
      <p class="td-entry">Запись: Дт ${txt(o.dt[0])}, Кт ${txt(o.kt[0])}, ${fmt(s)}</p>
      <ul class="td-read"><li>${sideText("dt", o.dt, s)}</li><li>${sideText("kt", o.kt, s)}</li></ul></div>`;
  }
  function double(b) {
    return `<figure class="tacc tdouble"><figcaption><span class="tag">Схема</span><b>${txt(b.title || "Операция на счетах")}</b></figcaption>${b.lead ? `<p class="td-lead">${txt(b.lead)}</p>` : ""}<div class="td-list">${b.ops.map(pairHTML).join("")}</div>${b.note ? `<p class="tacc-note">${txt(b.note)}</p>` : ""}</figure>`;
  }

  /* Сквозной пример лекции 3.1 (слайды 21–30): шесть операций разносятся по счетам */
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
  /* Счета после первых k операций */
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
      const ts = accs.map((a) => tHTML(a, {}, cur && (cur.dt === a.id || cur.kt === a.id) ? cur.n : null)).join("");
      return `<div class="tp-chips">${chips}</div><div class="vz-verdict on tp-say">${say}</div>
        <div class="tp-grid">${ts}</div>
        <div class="tp-sum${end ? " end" : ""}"><div><small>Обороты по дебету</small><b>${fmt(sD)}</b></div><span>${sD === sK ? "=" : "≠"}</span><div><small>Обороты по кредиту</small><b>${fmt(sK)}</b></div><div class="sep"></div><div><small>Сальдо конечное, дебет</small><b>${fmt(cD)}</b></div><span>${cD === cK ? "=" : "≠"}</span><div><small>Сальдо конечное, кредит</small><b>${fmt(cK)}</b></div></div>
        ${end ? `<p class="small muted">Это те же числа, что в ОСВ ниже: обороты 260 000 и сальдо 162 500. Равенство держится после каждой операции, потому что каждая сумма записана дважды.</p>` : ""}
        <div class="vz-btns">${end ? `<span class="tag lime">Все операции разнесены</span>` : `<button class="pill ink" data-vact="next">Следующая операция</button><button class="pill" data-vact="all">Показать всё</button>`}<button class="pill ghost" data-vact="reset">Сначала</button></div>`;
    },
  };
  if (window.VIZ) window.VIZ.push(postViz);

  return { calc, block, double, tHTML, readAuto, POST, postState, KIND };
})();
