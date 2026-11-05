/* Интерактивная графика. Все числа считаются кодом из условий заданий, ничего не вписано руками. */
window.VIZ = (function () {
  const G = window.GEN, E = window.EXAM.tasks, n = G.fmt, sg = G.sg;
  const dec = (x, d = 2) => x.toFixed(d).replace(".", ",");
  const Case = G.solveCase(G.CASE_BASE);
  const btn = (act, label, cls = "", extra = "") => `<button class="pill ${cls}" data-vact="${act}" ${extra}>${label}</button>`;
  const bar = (k, w, cls, text = "") => `<div class="vz-seg ${cls}" data-k="${k}" data-w="${w}%"><span>${text}</span></div>`;
  const rowBar = (k, left, width, cls) => `<div class="vz-track"><div class="vz-float ${cls}" data-k="${k}" data-l="${left}%" data-w="${Math.max(width, 0.4)}%"></div></div>`;

  /* Весы баланса */
  const OPS = [
    { label: "Взяли кредит 200", a: { d: 200 }, o: 200, type: 1, rec: "+А = +О" },
    { label: "Участник внёс вклад 100", a: { d: 100 }, k: 100, type: 1, rec: "+А = +К" },
    { label: "Купили товар в долг 150", a: { t: 150 }, o: 150, type: 1, rec: "+А = +О" },
    { label: "Купили товар за деньги 100", a: { d: -100, t: 100 }, type: 3, rec: "+А = −А" },
    { label: "Оплатили поставщику 100", a: { d: -100 }, o: -100, type: 2, rec: "−А = −О" },
    { label: "Начислили амортизацию 30", a: { f: -30 }, k: -30, type: 2, rec: "−А = Р" },
    { label: "Начислили зарплату 50", o: 50, k: -50, type: 4, rec: "+О = Р" },
  ];
  const TV = { 1: "Тип 1: валюта баланса растёт", 2: "Тип 2: валюта баланса падает", 3: "Тип 3: меняется состав активов, валюта не меняется", 4: "Тип 4: меняется состав пассива, валюта не меняется" };

  /* Очередь партий по заданию 12 */
  const FF = { open: [200, 45], ops: [["in", 150, 48, "05.12"], ["out", 180, 0, "10.12"], ["in", 100, 50, "15.12"], ["out", 120, 0, "20.12"], ["in", 80, 52, "25.12"]] };
  function fifoState(step) {
    const q = [{ q: FF.open[0], p: FF.open[1], id: 0 }]; let cost = 0, text = "Начало месяца: остаток 200 кг по 45 руб.", last = 0;
    FF.ops.slice(0, step).forEach((o, i) => {
      if (o[0] === "in") { q.push({ q: o[1], p: o[2], id: i + 1 }); text = `${o[3]}: закупка ${o[1]} кг по ${o[2]} руб. Партия встаёт в конец очереди.`; }
      else { let need = o[1], c = 0; const parts = []; while (need > 0) { const l = q[0], t = Math.min(need, l.q); c += t * l.p; parts.push(`${t} × ${l.p}`); l.q -= t; need -= t; if (!l.q) q.shift(); } cost += c; last = c; text = `${o[3]}: отпуск ${o[1]} кг. Снимаем с начала очереди: ${parts.join(" + ")} = ${n(c)} руб.`; }
    });
    return { q, cost, text };
  }
  const FF_ALL = [FF.open, ...FF.ops.filter((o) => o[0] === "in").map((o) => [o[1], o[2]])];
  const FF_Q = FF_ALL.reduce((a, l) => a + l[0], 0), FF_S = FF_ALL.reduce((a, l) => a + l[0] * l[1], 0);

  /* Амортизация */
  function depTable(y, k, cost) {
    const rate = k / y, rows = []; let bl = cost, br = cost;
    for (let i = 1; i <= y; i++) { const al = cost / y, ar = i === y ? br : br * rate; bl -= al; br -= ar; rows.push({ i, al, bl: Math.max(bl, 0), ar, br: Math.max(br, 0) }); }
    return { rate, rows };
  }

  const LIST = [
    {
      id: "balance-scale", title: "Весы баланса", note: "Нажимай на операции и смотри, что происходит с обеими сторонами. Весы не перекашиваются никогда.", lessons: ["m2-l06", "m1-l06", "m3-l06"], tasks: [9, 7],
      init: () => ({ d: 400, t: 300, f: 300, k: 700, o: 300, last: null }),
      on(s, a, v) { if (a === "reset") return this.init(); const op = OPS[+v], x = op.a || {}; if (s.d + (x.d || 0) < 0 || s.f + (x.f || 0) < 0 || s.o + (op.o || 0) < 0 || s.k + (op.k || 0) < 0) return s; return { d: s.d + (x.d || 0), t: s.t + (x.t || 0), f: s.f + (x.f || 0), k: s.k + (op.k || 0), o: s.o + (op.o || 0), last: +v }; },
      render(s) {
        const A = s.d + s.t + s.f, P = s.k + s.o, scale = 100 / 1700, h = (x) => (x * scale).toFixed(2), op = s.last == null ? null : OPS[s.last];
        const stack = (items) => items.map(([k, v, cls, t]) => `<div class="vz-block ${cls}" data-k="${k}" data-h="${h(v)}%"><span>${t} ${n(v)}</span></div>`).join("");
        return `<div class="vz-scale"><div class="vz-col"><div class="vz-colhead">Активы</div><div class="vz-stack">${stack([["f", s.f, "c-green", "ОС"], ["t", s.t, "c-orange", "Товары"], ["d", s.d, "c-blue", "Деньги"]])}</div></div><div class="vz-eq">=</div><div class="vz-col"><div class="vz-colhead">Капитал + Обязательства</div><div class="vz-stack">${stack([["o", s.o, "c-pink", "Обязательства"], ["k", s.k, "c-violet", "Капитал"]])}</div></div></div>
        <p class="vz-formula">${n(A)} = ${n(s.k)} + ${n(s.o)}</p>
        <div class="vz-verdict ${op ? "on" : ""}">${op ? `<b>${op.label}.</b> ${op.rec}. ${TV[op.type]}.` : "Выбери операцию ниже."}</div>
        <div class="vz-btns">${OPS.map((o, i) => `<button class="vz-op ${s.last === i ? "on" : ""}" data-vact="op" data-v="${i}">${o.label}</button>`).join("")}<button class="vz-op ghost" data-vact="reset">Сначала</button></div>`;
      },
    },
    {
      id: "pl-waterfall", title: "Лестница прибыли на числах задания 17", note: "Нажимай «Дальше»: каждая строка отчёта откусывает или добавляет часть. Заём и погашение кредита сюда не входят.", lessons: ["m2-l09", "m7-l01"], tasks: [17],
      init: () => ({ i: 1 }),
      on(s, a) { if (a === "reset") return { i: 1 }; return { i: Math.min(s.i + 1, 9) }; },
      render(s) {
        const R = [["Выручка", 68900, 1], ["Себестоимость продаж", -42300], ["Валовая прибыль", null, 1], ["Коммерческие: 5 600 + 3 200 + 1 400", -10200], ["Прибыль от продаж", null, 1], ["Прочие доходы: штрафы", 850], ["Прочие расходы: резерв", -1200], ["Налог на прибыль", -2950], ["Чистая прибыль", null, 1]];
        let cur = 0; const max = 68900;
        const rows = R.slice(0, s.i).map(([l, v, tot], i) => { let from, to; if (v == null) { from = 0; to = cur; } else if (tot) { from = 0; to = v; cur = v; } else { from = cur; to = cur + v; cur = to; } const left = (Math.min(from, to) / max) * 100, w = (Math.abs(to - from) / max) * 100; return `<div class="vz-wf ${tot ? "tot" : ""}"><span class="vz-wf-l">${l}</span>${rowBar("r" + i, left, w, tot ? "c-green" : v < 0 ? "c-pink" : "c-blue")}<span class="vz-wf-v">${tot ? n(to) : sg(v)}</span></div>`; }).join("");
        return `<div class="vz-wfall">${rows}</div><div class="vz-btns">${s.i < 9 ? btn("next", "Дальше", "ink") : `<span class="tag lime">Чистая прибыль 13 100 тыс. руб.</span>`}<button class="pill ghost" data-vact="reset">Сначала</button></div>`;
      },
    },
    {
      id: "fifo-queue", title: "Очередь партий: задание 12", note: "При FIFO партии выстраиваются в очередь. Каждый отпуск снимает с начала.", lessons: ["m4-l13"], tasks: [12],
      init: () => ({ step: 0 }),
      on(s, a) { if (a === "reset") return { step: 0 }; return { step: Math.min(s.step + 1, FF.ops.length) }; },
      render(s) {
        const st = fifoState(s.step), cols = ["c-blue", "c-green", "c-orange", "c-pink"], total = 530, rest = st.q.reduce((a, l) => a + l.q, 0);
        const color = (l) => cols[[0, 1, 3, 5].indexOf(l.id)] || "c-violet";
        const blocks = st.q.map((l) => `<div class="vz-seg ${color(l)}" data-k="l${l.id}" data-w="${(l.q / total) * 100}%"></div>`).join("");
        const chips = st.q.map((l, i) => `<span class="vz-lot ${color(l)}">${i === 0 ? "первая: " : ""}${l.q} кг по ${l.p}</span>`).join("");
        const done = s.step >= FF.ops.length;
        return `<div class="vz-queue"><div class="vz-bar">${blocks}</div><div class="vz-lots">${chips}</div></div>
        <div class="vz-verdict on">${st.text}</div>
        <div class="vz-kpis"><div><span class="dots">${n(st.cost)}</span><small>списано, руб.</small></div><div><span class="dots">${n(rest)}</span><small>осталось, кг</small></div></div>
        ${done ? `<p class="vz-formula small">Если бы компания применяла среднюю себестоимость: ${n(FF_S)} / ${FF_Q} = ${dec(FF_S / FF_Q)} руб./кг; 300 кг = ${n(Math.round((FF_S / FF_Q) * 300))} руб. Партии те же, ответ другой.</p>` : ""}
        <div class="vz-btns">${!done ? btn("next", "Следующая операция", "ink") : `<span class="tag lime">Себестоимость отпуска 13 800 руб.</span>`}<button class="pill ghost" data-vact="reset">Сначала</button></div>`;
      },
    },
    {
      id: "dep-chart", title: "Балансовая стоимость: два способа", note: "Двигай срок и коэффициент. Уменьшаемый остаток быстрее снижает стоимость в начале срока, а в последний год списывается весь остаток.", lessons: ["m5-l06", "m5-l08"], tasks: [],
      init: () => ({ y: 5, k: 2 }),
      on(s, a, v) { if (a === "y") return { ...s, y: +v }; if (a === "k") return { ...s, k: +v }; return s; },
      render(s) {
        const cost = 1000000, t = depTable(s.y, s.k, cost), W = 560, H = 200, px = (i) => 36 + (i / s.y) * (W - 50), py = (v) => 12 + (1 - v / cost) * (H - 34);
        const line = (key) => `0,${cost}|` + t.rows.map((r) => `${r.i},${r[key]}`).join("|");
        const poly = (key) => line(key).split("|").map((p) => { const [i, v] = p.split(","); return `${px(+i).toFixed(1)},${py(+v).toFixed(1)}`; }).join(" ");
        const ticks = Array.from({ length: s.y + 1 }, (_, i) => `<text x="${px(i)}" y="${H - 6}" text-anchor="middle" class="vz-tick">${i}</text>`).join("");
        return `<div class="vz-controls"><label>Срок, лет: <b>${s.y}</b><input type="range" min="3" max="10" step="1" value="${s.y}" data-vinp="y"></label><div class="vz-seg-toggle">${[1.5, 2].map((k) => `<button class="${s.k === k ? "on" : ""}" data-vact="k" data-v="${k}">Коэффициент ${String(k).replace(".", ",")}</button>`).join("")}</div></div>
        <svg viewBox="0 0 ${W} ${H}" class="vz-svg" role="img" aria-label="График балансовой стоимости по годам"><line x1="36" y1="${py(0)}" x2="${W - 14}" y2="${py(0)}" class="vz-axis"/><polyline points="${poly("bl")}" class="vz-l1"/><polyline points="${poly("br")}" class="vz-l2"/>${ticks}<text x="36" y="10" class="vz-tick">1 000 000</text></svg>
        <div class="vz-legend"><span><i class="c-green"></i>Линейный: ${n(cost / s.y)} в год</span><span><i class="c-pink"></i>Уменьшаемый остаток: норма ${dec(t.rate, 3)}</span></div>
        <div class="tbl-wrap"><table><thead><tr><th>Год</th><th class="r">Линейный</th><th class="r">Балансовая</th><th class="r">Уменьшаемый</th><th class="r">Балансовая</th></tr></thead><tbody>${t.rows.map((r) => `<tr><td>${r.i}</td><td class="r">${n(r.al)}</td><td class="r">${n(r.bl)}</td><td class="r">${n(r.ar)}</td><td class="r">${n(r.br)}</td></tr>`).join("")}</tbody></table></div>`;
      },
    },
    {
      id: "months-bar", title: "Сколько месяцев считать", note: "Выбери месяц принятия и правило из условия. Числа как у объекта ОС 2 из задания 13: 800 000 руб., норма 0,4.", lessons: ["m5-l04", "m5-l07"], tasks: [13],
      init: () => ({ m: 3, next: false }),
      on(s, a, v) { if (a === "m") return { ...s, m: +v }; if (a === "rule") return { ...s, next: v === "next" }; return s; },
      render(s) {
        const M = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"], cnt = s.next ? 12 - s.m : 13 - s.m, am = (800000 * 0.4 * cnt) / 12;
        return `<div class="vz-seg-toggle"><button class="${!s.next ? "on" : ""}" data-vact="rule" data-v="this">С месяца принятия</button><button class="${s.next ? "on" : ""}" data-vact="rule" data-v="next">Со следующего месяца</button></div>
        <div class="vz-months">${M.map((x, i) => { const on = i + 1 >= (s.next ? s.m + 1 : s.m); return `<button class="${on ? "on" : ""} ${i + 1 === s.m ? "cur" : ""}" data-vact="m" data-v="${i + 1}" aria-label="Принят к учёту: ${x}">${x}</button>`; }).join("")}</div>
        <p class="small muted">Рамка показывает месяц принятия. Нажми на другой месяц.</p>
        <div class="vz-kpis"><div><span class="dots">${cnt}</span><small>месяцев</small></div><div><span class="dots">${n(am)}</span><small>амортизация за год</small></div><div><span class="dots">${n(800000 - am)}</span><small>балансовая на конец</small></div></div>
        <p class="vz-formula small">800 000 × 0,4 × ${cnt} / 12 = ${n(am)}</p>`;
      },
    },
    {
      id: "t-account", title: "Т-счета: откуда берётся оплата", note: "Числа из сквозной задачи 18–22. Сальдо на начало и конец известны, начисление тоже. Оплата находится как недостающая сторона.", lessons: ["m4-l16", "m4-l06", "m3-l02"], tasks: [21],
      init: () => ({ a: 0, show: false }),
      on(s, a, v) { if (a === "acc") return { a: +v, show: false }; if (a === "show") return { ...s, show: true }; return s; },
      render(s) {
        const p = Case.p, A = [
          { t: "Поставщики", side: "К", open: p.kz, add: [["Закупки", p.purch]], sub: [], end: p.kzEnd, pay: Case.sup, payL: "Оплачено поставщикам" },
          { t: "Покупатели", side: "Д", open: p.dz, add: [["Выручка", Case.rev]], sub: [], end: p.dzEnd, pay: Case.buyers, payL: "Поступило от покупателей" },
          { t: "Налог на прибыль", side: "К", open: p.np, add: [["Начислено", p.tax]], sub: [], end: p.taxEnd, pay: Case.taxPaid, payL: "Уплачено в бюджет" },
          { t: "Зарплата", side: "К", open: 0, add: [["Начислено", p.fot]], sub: [["Удержан НДФЛ", Case.ndfl]], end: p.wageEnd, pay: Case.wages, payL: "Выплачено работникам" },
        ], x = A[s.a], inc = (rows) => rows.map(([l, v]) => `<div><span>${l}</span><b>${n(v)}</b></div>`).join(""), paid = s.show ? `<div class="pay"><span>${x.payL}</span><b>${n(x.pay)}</b></div>` : `<div class="pay q"><span>${x.payL}</span><b>?</b></div>`;
        const openRow = `<div class="sal"><span>Сальдо на начало</span><b>${n(x.open)}</b></div>`, endRow = `<div class="sal"><span>Сальдо на конец</span><b>${n(x.end)}</b></div>`;
        const inSide = `${openRow}${inc(x.add)}${endRow.replace("sal", "sal end")}`, outSide = `${inc(x.sub)}${paid}`;
        const left = x.side === "Д" ? inSide : outSide, right = x.side === "Д" ? outSide : inSide;
        const f = `${n(x.open)} + ${n(x.add[0][1])}${x.sub.length ? ` − ${n(x.sub[0][1])}` : ""} − ${n(x.end)} = ${n(x.pay)}`;
        return `<div class="chips">${A.map((a, i) => `<button class="chip ${i === s.a ? "on" : ""}" data-vact="acc" data-v="${i}">${a.t}</button>`).join("")}</div>
        <div class="vz-t"><div class="vz-t-h"><span>Дебет</span><b>${x.t}</b><span>Кредит</span></div><div class="vz-t-b"><div>${left}</div><div>${right}</div></div></div>
        ${s.show ? `<p class="vz-formula">${f}</p>` : btn("show", "Найти оплату", "ink")}`;
      },
    },
    {
      id: "cash-bridge", title: "Мост денег: от начала к концу", note: "Числа из задачи 18–22. Сначала сальдо по трём видам операций, потом остаток денег.", lessons: ["m2-l13"], tasks: [22, 21],
      init: () => ({ i: 1 }),
      on(s, a) { if (a === "reset") return { i: 1 }; return { i: Math.min(s.i + 1, 5) }; },
      render(s) {
        const R = [["Деньги на начало", Case.p.ds, 1], ["Текущие операции", Case.td], ["Инвестиционные операции", Case.id], ["Финансовые операции", Case.fd], ["Деньги на конец", Case.dsEnd, 1]], max = 40000; let cur = 0;
        const rows = R.slice(0, s.i).map(([l, v, tot], i) => { let from = 0, to = v; if (!tot) { from = cur; to = cur + v; } cur = to; const left = (Math.min(from, to) / max) * 100, w = (Math.abs(to - from) / max) * 100; return `<div class="vz-wf ${tot ? "tot" : ""}"><span class="vz-wf-l">${l}</span>${rowBar("c" + i, left, w, tot ? "c-green" : v < 0 ? "c-pink" : "c-blue")}<span class="vz-wf-v">${tot ? n(v) : v === 0 ? "0" : sg(v)}</span></div>`; }).join("");
        return `<div class="vz-wfall">${rows}</div><div class="vz-btns">${s.i < 5 ? btn("next", "Дальше", "ink") : `<span class="tag lime">Сальдо за период ${n(Case.flow)}</span>`}<button class="pill ghost" data-vact="reset">Сначала</button></div>`;
      },
    },
    {
      id: "balance-stack", title: "Баланс задачи 18–22 на двух датах", note: "Левый столбец каждой даты показывает актив, правый пассив. Высоты совпадают: это и есть проверка баланса.", lessons: ["m3-l09", "m1-l08"], tasks: [18, 19],
      init: () => ({}), on: (s) => s,
      render() {
        const S = Case.start, E = Case.end, max = 256000, col = (items) => `<div class="vz-stack2">${items.map(([v, c, t]) => `<div class="vz-block ${c}" style="height:${((v / max) * 100).toFixed(2)}%"><span>${t}<br>${n(v)}</span></div>`).join("")}</div>`;
        const date = (t, d) => `<div class="vz-date"><div class="vz-date-cols">${col([[d.vna, "c-green", "ВНА"], [d.oa, "c-orange", "ОА"]])}${col([[d.sk, "c-violet", "Капитал"], [d.ko, "c-pink", "КО"]])}</div><b>${t}</b><span>Валюта ${n(d.total)}</span></div>`;
        return `<div class="vz-dates">${date("Начало года", S)}${date("Конец года", E)}</div>`;
      },
    },
    {
      id: "equity-flow", title: "Капитал по шагам: задание 16", note: "Смотри на итог справа: перенос прибыли в уставный капитал двигает границу внутри, но не меняет сумму.", lessons: ["m6-l14"], tasks: [16],
      init: () => ({ i: 0 }),
      on(s, a) { if (a === "reset") return { i: 0 }; return { i: Math.min(s.i + 1, 3) }; },
      render(s) {
        const steps = [{ t: "1 января", uk: 8000000, nr: 2100000, d: "" }, { t: "Чистая прибыль +1 900 000", uk: 8000000, nr: 4000000, d: "Итог вырос." }, { t: "Перенос в уставный капитал 1 500 000", uk: 9500000, nr: 2500000, d: "Итог не изменился: сумма переехала внутри капитала." }, { t: "Дивиденды −800 000", uk: 9500000, nr: 1700000, d: "Итог уменьшился." }], x = steps[s.i], max = 12500000;
        return `<div class="vz-verdict on"><b>${x.t}.</b> ${x.d}</div><div class="vz-bar tall">${bar("uk", (x.uk / max) * 100, "c-violet", `УК ${n(x.uk)}`)}${bar("nr", (x.nr / max) * 100, "c-green", `НРП ${n(x.nr)}`)}</div><div class="vz-kpis"><div><span class="dots">${n(x.uk + x.nr)}</span><small>собственный капитал, руб.</small></div></div>
        <div class="vz-btns">${s.i < 3 ? btn("next", "Следующая операция", "ink") : `<span class="tag lime">На 31 декабря 11 200 000 руб.</span>`}<button class="pill ghost" data-vact="reset">Сначала</button></div>`;
      },
    },
    {
      id: "loan-timeline", title: "Кредит в балансе и ОФР: задание 15", note: "Двигай, сколько месяцев в году объект строился. Пока строится, проценты идут в стоимость объекта, после ввода в ОФР. В задании 15 это все 10 месяцев.", lessons: ["m6-l09", "m6-l07"], tasks: [15],
      init: () => ({ m: 10 }), on(s, a, v) { return a === "m" ? { m: +v } : s; },
      render(s) {
        const amt = 120000000, rep = 24000000, mi = (amt * 0.12) / 12, intr = mi * 10, cap = mi * s.m, pl = intr - cap, max = amt + intr;
        return `<div class="vz-bar tall">${bar("v", (rep / max) * 100, "c-orange", `V: долг ${n(rep / 1e6)} млн`)}${bar("iv", ((amt - rep) / max) * 100, "c-blue", `IV: долг ${n((amt - rep) / 1e6)} млн`)}${bar("int", (intr / max) * 100, "c-pink", `V: % ${n(intr / 1e6)} млн`)}</div>
        <p class="vz-formula small">Раздел V: ${n(rep)} + ${n(intr)} = ${n(rep + intr)} руб.</p>
        <label class="vz-range">Объект строился в этом году, месяцев: <b>${s.m}</b><input type="range" min="0" max="10" step="1" value="${s.m}" data-vinp="m"></label>
        <div class="vz-kpis"><div><span class="dots">${n(cap / 1e6)}</span><small>млн в стоимость объекта</small></div><div><span class="dots">${n(pl / 1e6)}</span><small>млн в ОФР, проценты к уплате</small></div></div>`;
      },
    },
    {
      id: "fv-slider", title: "Рыночная цена и балансовая стоимость", note: "Двигай цену на отчётную дату. Числа из задания 14: всего 2 000 акций, куплены на 242 500 руб. Облигации без котировок не двигаются.", lessons: ["m6-l02", "m6-l03"], tasks: [14],
      init: () => ({ p: 122 }), on(s, a, v) { return a === "p" ? { p: +v } : s; },
      render(s) {
        const q = 2000, cost = 242500, val = q * s.p, d = val - cost, max = 420000;
        return `<label class="vz-range">Цена на отчётную дату, руб./шт.: <b>${s.p}</b><input type="range" min="100" max="145" step="1" value="${s.p}" data-vinp="p"></label>
        <div class="vz-wfall"><div class="vz-wf"><span class="vz-wf-l">До оценки</span>${rowBar("a", 0, (cost / max) * 100, "c-blue")}<span class="vz-wf-v">${n(cost)}</span></div><div class="vz-wf tot"><span class="vz-wf-l">Акции в балансе</span>${rowBar("b", 0, (val / max) * 100, "c-green")}<span class="vz-wf-v">${n(val)}</span></div><div class="vz-wf"><span class="vz-wf-l">Облигации в балансе</span>${rowBar("c", 0, (395000 / max) * 100, "c-violet")}<span class="vz-wf-v">395 000</span></div></div>
        <div class="vz-verdict on">${d === 0 ? "Цена не изменила оценку." : d > 0 ? `Дооценка ${n(d)} руб. идёт в прочие доходы.` : `Уценка ${n(-d)} руб. идёт в прочие расходы.`}</div>`;
      },
    },
    {
      id: "purchase-builder", title: "Собери себестоимость: задание 11", note: "Отмечай строки, которые входят в себестоимость. Сумма считается сразу.", lessons: ["m4-l10"], tasks: [11],
      init: () => ({ on: {}, check: false }),
      on(s, a, v) { if (a === "row") { const on = { ...s.on }; on[v] = !on[v]; return { on, check: false }; } if (a === "check") return { ...s, check: true }; if (a === "reset") return this.init(); return s; },
      render(s) {
        const R = [["Партия товара 360 000 (в т.ч. НДС 20 %)", 300000, true, "НДС не входит: 360 000 / 1,2 = 300 000."], ["Доставка 64 800 (в т.ч. НДС 20 %)", 54000, true, "Без доставки товара нет на месте: 64 800 / 1,2 = 54 000."], ["Аванс поставщику 120 000", 120000, false, "Это расчёты, а не затрата."], ["Оплата перевозчику 60 000", 60000, false, "Расчёты за уже учтённую доставку."], ["Долг поставщику 240 000", 240000, false, "Остаток расчётов."], ["Хранение на складе 55 000", 55000, false, "Расход периода."], ["Реклама 48 000", 48000, false, "Расход на продажу."]];
        const sum = R.reduce((a, r, i) => a + (s.on[i] ? r[1] : 0), 0), right = R.every((r, i) => !!s.on[i] === r[2]);
        return `<div class="vz-rows">${R.map((r, i) => `<button class="vz-row ${s.on[i] ? "on" : ""} ${s.check ? (!!s.on[i] === r[2] ? "ok" : "bad") : ""}" data-vact="row" data-v="${i}"><i></i><span>${r[0]}${s.check ? `<small>${r[3]}</small>` : ""}</span><b>${s.on[i] ? n(r[1]) : ""}</b></button>`).join("")}</div>
        <div class="vz-kpis"><div><span class="dots">${n(sum)}</span><small>себестоимость, руб.</small></div></div>
        ${s.check ? `<div class="vz-verdict on">${right ? "Верно: себестоимость партии 354 000 руб." : "Есть неверные строки, они отмечены розовым."}</div>` : ""}
        <div class="vz-btns">${btn("check", "Проверить", "ink")}<button class="pill ghost" data-vact="reset">Сначала</button></div>`;
      },
    },
    {
      id: "cycle-gantt", title: "Цикл на числах «Астры»", note: "Сколько дней деньги заморожены в запасах и у покупателей и сколько дней компанию финансируют поставщики. Данные за 20х1 (лекция АФО, слайд 39).", lessons: ["m8-l08"], tasks: [],
      init: () => ({}), on: (s) => s,
      render() {
        const dio = 23.68, dso = 40.75, dpo = 61.47, oc = dio + dso, max = 70, row = (l, a, b, c, v) => `<div class="vz-wf"><span class="vz-wf-l">${l}</span><div class="vz-track"><div class="vz-float ${c}" style="margin-left:${(a / max) * 100}%;width:${((b - a) / max) * 100}%"></div></div><span class="vz-wf-v">${v}</span></div>`;
        return `<div class="vz-wfall">${row("Запасы, DIO", 0, dio, "c-green", dec(dio))}${row("Дебиторка, DSO", dio, oc, "c-orange", dec(dso))}${row("Кредиторка, DPO", 0, dpo, "c-pink", dec(dpo))}</div><p class="vz-formula small">Операционный цикл ${dec(dio)} + ${dec(dso)} = ${dec(oc)} дня. Финансовый цикл ${dec(oc)} − ${dec(dpo)} = ${dec(oc - dpo)} дня.</p>`;
      },
    },
  ];
  return LIST;
})();
