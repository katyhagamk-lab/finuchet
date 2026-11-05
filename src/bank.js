/* Сборка банка заданий и вариантов контрольной. Всё детерминировано: «Вариант 3» всегда один и тот же. */
window.BANK = (function () {
  const TESTS = window.BANKTESTS || {}, C = window.BANKCALC, G = window.GEN, EX = window.EXAM.tasks, VARIANTS = 6, LET = ["а", "б", "в", "г"];
  const P = (text) => ({ t: "p", text });
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function shuffled(arr, key) { let x = hash(key) || 1; const r = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; const a = arr.map((v, i) => ({ v, i })); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function prepTest(q) {
    const order = shuffled(q.options, q.q);
    return { cond: [P(q.q)], src: q.src, quiz: { type: "choice", keep: true, q: "Выбери один ответ", options: order.map((o, i) => `${LET[i]}) ${o.v}`), answer: order.findIndex((o) => o.i === q.answer), why: q.why }, sol: [P(q.why), { t: "note", kind: "law", text: `Источник: ${q.src}` }] };
  }
  const topic = (n) => EX[n - 1].topic, kind = (n) => EX[n - 1].kind;
  const testTypes = [1, 2, 3, 4, 5, 6, 9], calcTypes = [7, 8, 10, 11, 12, 13, 14, 15, 16, 17];
  const preparedTests = {}; testTypes.forEach((n) => { preparedTests[n] = (TESTS[n] || []).map(prepTest); });

  /* Банк: первые шесть заданий каждого типа заняты вариантами, в банке остальные */
  const bank = {};
  testTypes.forEach((n) => { bank[n] = preparedTests[n].slice(VARIANTS); });
  calcTypes.forEach((n) => { bank[n] = C.TASKS[n].slice(VARIANTS); });
  const caseField = (c) => { const out = []; [18, 19, 20, 21, 22].forEach((k) => { c.fields[k].forEach((f, i) => out.push(i === 0 ? { group: k === 18 || k === 19 ? `Задание ${k}: баланс` : k === 20 ? "Задание 20: ОФР" : `Задание ${k}: ОДДС`, ...f } : f)); }); return out; };
  bank[18] = C.CASES.slice(VARIANTS).map((c) => ({ cond: c.cond, company: c.company, quiz: { type: "fields", q: "Заполни ответы, тыс. руб. (убыток и отток со знаком минус)", fields: caseField(c), why: `Сверка: актив и пассив на конец сходятся на ${G.fmt(c.s.end.total)}.` }, sol: c.sol }));

  /* Варианты */
  const variants = Array.from({ length: VARIANTS }, (_, vi) => {
    const c = C.CASES[vi], tasks = [];
    for (let n = 1; n <= 22; n++) {
      const base = { n, topic: topic(n), kind: kind(n), short: EX[n - 1].short };
      if (testTypes.includes(n)) { const t = preparedTests[n][vi]; if (t) tasks.push({ ...base, cond: t.cond, quiz: t.quiz, sol: t.sol, src: t.src }); }
      else if (calcTypes.includes(n)) { const t = C.TASKS[n][vi]; tasks.push({ ...base, cond: t.cond, quiz: t.quiz, sol: t.sol }); }
      else {
        const f = c.fields[n];
        const fields = n === 19 && vi % 2 === 1 ? [{ label: "Валюта баланса на конец года", answer: c.s.end.total }, { label: "Собственный капитал на начало года", answer: c.s.start.sk }, { label: "Краткосрочные обязательства на конец года", answer: c.s.end.ko }] : f;
        tasks.push({ ...base, isCase: true, cond: n === 18 ? c.cond : [], quiz: { type: "fields", q: "Ответ, тыс. руб. (убыток и отток со знаком минус)", fields, why: "Сверь с полным решением сквозной задачи." }, sol: n === 18 ? c.sol : [] });
      }
    }
    return { id: vi + 1, title: `Вариант ${vi + 1}`, company: c.company, tasks };
  });

  const types = [...testTypes, ...calcTypes, 18].sort((a, b) => a - b).map((n) => ({ n, title: n === 18 ? "Сквозная задача: баланс, ОФР, ОДДС" : topic(n), label: n === 18 ? "Задания 18–22" : `Задание ${n}`, kind: n === 18 ? "отчёт" : kind(n), count: bank[n].length }));
  const total = types.reduce((a, t) => a + t.count, 0);
  return { bank, variants, types, total, VARIANTS };
})();
