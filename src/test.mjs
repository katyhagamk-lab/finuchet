// Проверка расчётов: node test.mjs
import fs from "fs"; import vm from "vm"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, "exam.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(here, "generators.js"), "utf8"), ctx);
const { EXAM: E, GEN: G } = ctx.window; let fail = 0, pass = 0;
const eq = (a, b, m) => { if (a === b) pass++; else { fail++; console.log(`ОШИБКА ${m}: ${a} ≠ ${b}`); } };
const ans = (n, i) => E.tasks[n - 1].quiz.fields[i].answer;
// Сквозная задача: контрольная против независимого расчёта
const s = G.solveCase(G.CASE_BASE);
eq(s.balanced, true, "баланс сходится");
[[18, 0, s.end.total], [18, 1, s.start.vna], [18, 2, s.end.oa], [19, 0, s.start.total], [19, 1, s.end.sk], [19, 2, s.start.ko], [19, 3, s.end.total], [19, 4, s.start.sk], [19, 5, s.end.ko], [20, 0, s.gross], [20, 1, s.ebt], [20, 2, s.net], [21, 0, s.td], [21, 1, s.id], [21, 2, s.fd], [22, 0, 35000], [22, 1, s.flow], [22, 2, s.dsEnd]].forEach(([n, i, v]) => eq(ans(n, i), v, `задание ${n}, поле ${i}`));
eq(s.nrp, 48000, "НРП на начало как в ОСВ");
eq(s.start.total + 54000, 310000, "итог ОСВ");
// Расчётные задания
eq(ans(10, 0), 9500 - 150 - 420 - 2900, "№10 ТО"); eq(ans(10, 1), -1200 + 1750 - 2300, "№10 ИО"); eq(ans(10, 2), -1100 + 800, "№10 ФО");
const alt10 = E.tasks[9].quiz.alt.values; eq(alt10[0], 6030, "№10 вторая трактовка ТО"); eq(alt10[1], -1200 + 1750, "№10 вторая трактовка ИО"); eq(alt10[2], -1100 + 800 - 2300, "№10 вторая трактовка ФО"); eq(alt10[0] + alt10[1] + alt10[2], ans(10, 0) + ans(10, 1) + ans(10, 2), "№10 итог одинаков");
eq(ans(11, 0), 360000 / 1.2 + 64800 / 1.2, "№11");
eq(ans(12, 0), 180 * 45 + 20 * 45 + 100 * 48, "№12");
eq(ans(13, 0), Math.round(500000 - 150000 - 500000 / 8 + 800000 - 800000 * 0.4 * 10 / 12), "№13");
eq(ans(14, 0), 2000 * 122, "№14 акции"); eq(ans(14, 1), 395000, "№14 облигации");
eq(ans(15, 0), 24000000 + 12000000, "№15 КО"); eq(ans(15, 1), 0, "№15 ОФР"); eq(120000000 * 0.12 * 10 / 12, 12000000, "№15 проверка процентов");
eq(ans(16, 0), 8000000 + 2100000 + 1900000 - 800000, "№16");
eq(ans(17, 0), 68900 - 42300, "№17 ВП"); eq(ans(17, 1), 68900 - 42300 - 5600 - 3200 - 1400 + 850 - 1200 - 2950, "№17 ЧП");
eq(E.tasks[6].quiz.options[E.tasks[6].quiz.answer].includes("280 000"), true, "№7"); eq(E.tasks[7].quiz.options[E.tasks[7].quiz.answer].includes("440 000"), true, "№8");
eq(E.tasks.length, 22, "22 задания");
// Формы отчётов согласованы с решением
const F = G.forms(s);
const sum = (rows, from, to, c) => rows.slice(from, to).reduce((a, r) => a + (r.v ? r.v[c] : 0), 0);
eq(F.bs.rows.find((r) => r.l === "Баланс (актив)").v[0], F.bs.rows.find((r) => r.l === "Баланс (пассив)").v[0], "форма ББ конец");
eq(F.bs.rows.find((r) => r.l === "Баланс (актив)").v[1], F.bs.rows.find((r) => r.l === "Баланс (пассив)").v[1], "форма ББ начало");
// Генераторы: 2000 запусков
let runs = 0;
for (const g of G.LIST) for (let i = 1; i <= 2000 / G.LIST.length; i++) {
  const t = G.run(g.id, i * 7919 + 13); runs++;
  if (t.quiz.fields) for (const f of t.quiz.fields) if (!Number.isFinite(f.answer)) { fail++; console.log("нечисловой ответ", g.id, i, f.label); }
  const txt = JSON.stringify([t.cond, t.sol, t.quiz]); if (/NaN|undefined|Infinity/.test(txt)) { fail++; console.log("мусор в тексте", g.id, i, txt.match(/.{40}(NaN|undefined|Infinity).{20}/)?.[0]); }
  if (g.id === "case") { const c = t.solved; if (!c.balanced) { fail++; console.log("дисбаланс", i); } if (c.nrp + c.net !== c.end.nrp) { fail++; console.log("НРП", i); } if (c.dsEnd !== c.p.ds + c.td + c.id + c.fd) { fail++; console.log("ДС", i); } if (c.dsEnd <= 0) { fail++; console.log("Отрицательные деньги", i); } }
  else pass++;
}
// Банк расчётных заданий и сквозные задачи
const load = (f) => vm.runInContext(fs.readFileSync(path.join(here, f), "utf8"), ctx);
const tests = {}; const bdir = path.join(here, "content/bank");
if (fs.existsSync(bdir)) for (const f of fs.readdirSync(bdir).filter((x) => /^t\d+\.json$/.test(x))) tests[+f.slice(1, 3)] = JSON.parse(fs.readFileSync(path.join(bdir, f), "utf8"));
ctx.window.BANKTESTS = tests; load("bankcalc.js"); load("bank.js");
const BC = ctx.window.BANKCALC, BK = ctx.window.BANK, money = (x) => Number.isFinite(x);
for (const k of Object.keys(BC.TASKS)) BC.TASKS[k].forEach((t, i) => {
  const w = `банк №${k} #${i}`;
  if (/NaN|undefined|Infinity/.test(JSON.stringify(t))) { fail++; console.log("мусор", w); }
  if (t.quiz.type === "choice") { eq(new Set(t.quiz.options).size, t.quiz.options.length, w + " варианты различны"); eq(t.quiz.answer >= 0 && t.quiz.answer < t.quiz.options.length, true, w + " индекс"); }
  else t.quiz.fields.forEach((f) => { eq(money(f.answer), true, w + " ответ"); if (!(f.tol) && !Number.isInteger(f.answer)) { fail++; console.log("нецелый ответ", w, f.label, f.answer); } });
});
BC.CASES.forEach((c) => {
  const s = c.s, w = "кейс " + c.company;
  eq(s.balanced, true, w + " баланс");
  eq(s.end.nrp, s.nrp + s.net - s.divPaid, w + " НРП");
  eq(s.dsEnd, s.p.ds + s.td + s.id + s.fd, w + " деньги");
  eq(s.end.os, s.start.os - s.p.amort + s.capex, w + " ОС");
  eq(s.end.zs, s.p.kr + s.loanNew - s.loanRepay + s.p.loanEnd, w + " заёмные");
  eq(s.dsEnd > 0, true, w + " деньги положительны");
  eq(s.end.total, s.end.vna + s.end.oa, w + " валюта");
});
BK.variants.forEach((v) => { const need = Object.keys(tests).length ? 22 : 15; eq(v.tasks.length, need, v.title + " число заданий"); if (need === 22) eq(v.tasks.map((t) => t.n).join(), Array.from({ length: 22 }, (_, i) => i + 1).join(), v.title + " порядок"); });
// Методичка: баллы, ссылки чек-листа, план по дням
vm.runInContext(fs.readFileSync(path.join(here, "mu.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(here, "analysis.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(here, "dayplan.js"), "utf8"), ctx);
const MU = ctx.window.MU, AN = ctx.window.ANALYSIS, DPL = ctx.window.DAYPLAN;
const lessonIds = new Set(); for (const m of fs.readdirSync(path.join(here, "content")).filter((x) => /^m\d+$/.test(x))) for (const f of fs.readdirSync(path.join(here, "content", m)).filter((x) => /^l\d+\.json$/.test(x))) lessonIds.add(JSON.parse(fs.readFileSync(path.join(here, "content", m, f), "utf8")).id);
eq(Object.values(MU.points).reduce((x, y) => x + y, 0), 100, "сумма баллов 22 заданий");
eq(Object.keys(MU.points).length, 22, "баллы у всех 22 заданий");
const trIds = new Set([...G.LIST.map((g) => g.id), "analysis"]);
MU.topics.forEach((tp) => [...tp.know, ...(tp.can || [])].forEach((it) => { (it.ls || []).forEach((id) => eq(lessonIds.has(id), true, `методичка ${tp.id}: урок ${id}`)); (it.ex || []).forEach((n) => eq(n >= 1 && n <= 22, true, `методичка ${tp.id}: задание ${n}`)); if (it.tr) eq(trIds.has(it.tr), true, `методичка ${tp.id}: тренажёр ${it.tr}`); }));
DPL.days.forEach((d) => d.items.forEach((it) => { if (it.t === "lesson") eq(lessonIds.has(it.id), true, `план ${d.date}: урок ${it.id}`); if (it.t === "train") eq(trIds.has(it.id), true, `план ${d.date}: тренажёр ${it.id}`); }));
// Развёрнутый ответ: 4 темы × 500 задач, мост «прибыль → сальдо текущих» сходится, ответы числовые
for (let i = 1; i <= 500; i++) for (const th of AN.THEMES) {
  const t = AN.make(th.id, i * 104729 + 7), txt = JSON.stringify([t.model, t.fields, t.q, t.rules]);
  if (/NaN|undefined|Infinity/.test(txt)) { fail++; console.log("мусор в развёрнутом ответе", th.id, i); } else pass++;
  t.fields.forEach((f) => { if (!Number.isFinite(f.answer)) { fail++; console.log("нечисловой ответ", th.id, i, f.label); } });
  if (th.id === "cash") eq(t.s.net + AN.bridge(t.s).reduce((x, b) => x + b.v, 0), t.s.td, `мост прибыль → деньги ${i}`);
}
const tcx = AN.textCheck("Вывод: дебиторская задолженность выросла на 15 500, деньги на счёте уменьшились до 16 800. Рекомендация: сократить отсрочку.", [{ l: "дебиторка", s: ["дебитор"] }]);
eq(tcx.hits[0].ok && tcx.concl && tcx.reco && tcx.nums >= 2 && tcx.lex.length === 1, true, "проверка письменного ответа");
// Т-счета в уроках: сальдо на схемах совпадает с ответами в тексте, разноска сквозного примера сходится с ОСВ
vm.runInContext(fs.readFileSync(path.join(here, "tacc.js"), "utf8"), ctx);
const TA = ctx.window.TACC, num = (x) => (x === "" || x === undefined ? 0 : +String(x).replace(/[*\s\u00a0]/g, ""));
for (const m of fs.readdirSync(path.join(here, "content")).filter((x) => /^m\d+$/.test(x))) for (const f of fs.readdirSync(path.join(here, "content", m)).filter((x) => /^l\d+\.json$/.test(x))) {
  const L = JSON.parse(fs.readFileSync(path.join(here, "content", m, f), "utf8"));
  L.sections.forEach((sec, si) => sec.blocks.forEach((b) => {
    const w = `${L.id} раздел ${si + 1}: ${b.title || b.id}`;
    if (b.t === "tacc") {
      b.accs.forEach((a) => { eq(!!TA.KIND[a.kind], true, `${w}: тип счёта ${a.kind}`); const c = TA.calc(a); if (c.numeric) { eq(c.close, a.close, `${w}: сальдо «${a.name}»`); eq(c.close >= 0, true, `${w}: сальдо неотрицательное`); } });
      const h = TA.block(b); eq(/undefined|NaN|\[object/.test(h), false, `${w}: схема без мусора`);
    }
    if (b.t === "tdouble") b.ops.forEach((o) => { eq(!!(TA.KIND[o.dt[1]] && TA.KIND[o.kt[1]]), true, `${w}: типы счетов ${o.label}`); eq(o.sum === undefined || Number.isFinite(o.sum), true, `${w}: сумма ${o.label}`); eq(/undefined|NaN/.test(TA.double({ ops: [o] })), false, `${w}: ${o.label} без мусора`); });
    if (b.t === "viz") eq(b.id === "t-post", true, `${w}: интерактивная схема есть`);
  }));
  if (L.id === "m3-l07") {
    const osv = L.sections[3].blocks.find((b) => b.t === "table" && /ОСВ/.test(b.caption)), st = TA.postState(TA.POST.ops.length);
    TA.POST.accs.forEach((a, i) => { const r = osv.rows.find((x) => x[0] === a.osv), c = TA.calc(st[i]);
      eq(!!r, true, `ОСВ: строка ${a.osv}`); if (!r) return;
      eq(c.od, num(r[4]), `ОСВ ${a.osv}: оборот Дт`); eq(c.ok, num(r[5]), `ОСВ ${a.osv}: оборот Кт`); eq(a.open, num(r[2]) + num(r[3]), `ОСВ ${a.osv}: сальдо на начало`); eq(c.close, num(c.side === "dt" ? r[6] : r[7]), `ОСВ ${a.osv}: сальдо на конец`); });
    const tot = osv.rows.find((x) => /Итого/.test(x[0])), cs = st.map(TA.calc);
    eq(cs.reduce((x, c) => x + c.od, 0), num(tot[4]), "ОСВ: итого оборотов Дт"); eq(cs.reduce((x, c) => x + c.ok, 0), num(tot[5]), "ОСВ: итого оборотов Кт");
  }
}
// Сквозная задача на Т-счетах: сальдо счетов дают баланс задачи на начало и конец, обороты Дт = Кт, 90 и 91 закрыты
const caseT = (cs, w) => {
  const M = TA.caseModel(cs), B = TA.caseBalance(M), calcs = M.order.map((id) => TA.calc(M.A[id]));
  for (const k of ["os", "zap", "dz", "fv", "ds", "uk", "nrp", "zs", "kz", "total"]) { eq(B.start[k], cs.start[k], `${w}: Т-счета, ${k} на начало`); eq(B.end[k], cs.end[k], `${w}: Т-счета, ${k} на конец`); }
  eq(B.end.pas, B.end.total, `${w}: Т-счета, пассив = актив на конец`);
  eq(calcs.reduce((x, c) => x + c.od, 0), calcs.reduce((x, c) => x + c.ok, 0), `${w}: обороты Дт = Кт`);
  eq(TA.calc(M.A["90"]).close === 0 && TA.calc(M.A["91"]).close === 0, true, `${w}: 90 и 91 закрыты`);
  eq(/undefined|NaN/.test(TA.caseBlock(cs)), false, `${w}: схема без мусора`);
};
caseT(G.solveCase(G.CASE_BASE), "контрольная");
BC.CASES.forEach((c) => caseT(c.s, `банк «${c.company}»`));
for (let i = 1; i <= 300; i++) caseT(G.solveCase(G.seedCase(i * 7919)), `случайная задача ${i}`);
// Разборы заданий: Т-схемы в контрольной, банке и тренажёре
const solBlocks = [...E.tasks.flatMap((t) => (t.sol || []).map((b) => [b, `задание ${t.n}`])), ...(BC.TASKS[7] || []).flatMap((t, i) => (t.sol || []).map((b) => [b, `банк 7.${i + 1}`]))];
for (let i = 0; i < 60; i++) { const g = G.run("equation", i * 31 + 5); (g.sol || []).forEach((b) => solBlocks.push([b, `тренажёр 7, запуск ${i}`])); }
let tbalN = 0;
solBlocks.forEach(([b, w]) => {
  if (b.t === "tbal") { tbalN++; const L = b.left.reduce((x, r) => x + r[1], 0), R = b.right.reduce((x, r) => x + r[1], 0); eq(L, R, `${w}: актив = пассив на схеме`); eq(b.right[b.ask] !== undefined, true, `${w}: искомое на схеме`); eq(/undefined|NaN/.test(TA.bal(b)), false, `${w}: схема баланса без мусора`); }
  if (b.t === "tdouble") eq(/undefined|NaN/.test(TA.double(b)), false, `${w}: схема операции без мусора`);
});
eq(tbalN >= 70, true, "схема баланса есть в разборах задания 7");
eq(E.tasks[6].sol.some((b) => b.t === "tbal") && E.tasks[8].sol.some((b) => b.t === "tdouble"), true, "Т-схемы в разборе заданий 7 и 9");
console.log(`Банк: ${BK.total}. Варианты: ${BK.variants.length}.`);
console.log(`Запусков генераторов: ${runs}. Проверок пройдено: ${pass}. Ошибок: ${fail}.`); process.exit(fail ? 1 : 0);
