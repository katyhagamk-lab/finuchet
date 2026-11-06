/* Проверка открытого ответа по ключевым идеям. Работает и в браузере, и в node (тесты).
   Ключевая идея: { l: "подпись для студента", s: ["основа", "синоним", "=ОНА"] }.
   Основа совпадает с началом слова или фразы ("завыш" ловит «завышать», «не завышаем»),
   основа с «=» совпадает только с целым словом (аббревиатуры: =ндс, =оно),
   фраза с «не » требует отрицания рядом, «=» внутри фразы требует целого слова («ооо =10»). Длинные основы прощают одну опечатку. */
(function (root) {
  const signs = (t) => String(t || "").replace(/≥|>=/g, " не меньше ").replace(/≤|<=/g, " не больше ").replace(/>/g, " больше ").replace(/</g, " меньше ").replace(/≠/g, " не равно ");
  const norm = (t) => " " + signs(t).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9%]+/g, " ").replace(/\s+/g, " ").trim() + " ";
  const words = (t) => norm(t).trim().split(" ").filter(Boolean);
  function lev1(a, b) { // расстояние Левенштейна не больше 1
    if (a === b) return true; const la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return false;
    let i = 0, j = 0, d = 0;
    while (i < la && j < lb) { if (a[i] === b[j]) { i++; j++; continue; } if (++d > 1) return false; if (la > lb) i++; else if (lb > la) j++; else { i++; j++; } }
    return d + (la - i) + (lb - j) <= 1;
  }
  function hasStem(text, ws, stem, raw) {
    const orig = String(stem).trim();
    if (orig[0] === "=" && /[A-ZА-ЯЁ]/.test(orig.slice(1))) { // аббревиатура заглавными: только целое слово с тем же регистром
      const t = orig.slice(1).replace(/ё/g, "е"); return String(raw || "").replace(/ё/g, "е").split(/[^A-Za-zА-Яа-яЁё0-9]+/).includes(t);
    }
    let s = orig.toLowerCase().replace(/ё/g, "е");
    if (!s) return false;
    if (s[0] === "=") { s = s.slice(1); return ws.includes(s); }
    const parts = s.split(" ").filter(Boolean);
    if (parts.length > 1) { // фраза: каждое слово по началу, подряд
      for (let i = 0; i + parts.length <= ws.length; i++) if (parts.every((p, k) => (p[0] === "=" ? ws[i + k] === p.slice(1) : ws[i + k].startsWith(p)) || (p.length >= 6 && lev1(ws[i + k].slice(0, p.length), p)))) return true;
      return false;
    }
    if (ws.some((w) => w.startsWith(s))) return true;
    if (s.length >= 6) return ws.some((w) => w.length >= s.length - 1 && (lev1(w.slice(0, s.length), s) || lev1(w.slice(0, s.length - 1), s) || lev1(w.slice(0, s.length + 1), s)));
    return false;
  }
  function grade(answer, kw, need) {
    const ws = words(answer), text = norm(answer);
    const hits = (kw || []).map((k) => ({ l: k.l, ok: (k.s || []).some((st) => hasStem(text, ws, st, answer)) }));
    const found = hits.filter((h) => h.ok).length, total = hits.length;
    const req = need || Math.max(1, Math.ceil(total * 0.6));
    return { hits, found, total, need: req, ok: found >= req && (ws.length >= 2 || total === 1) };
  }
  const api = { grade, norm, words, hasStem };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.GRADE = api;
})(typeof window !== "undefined" ? window : globalThis);
