/* =====================================================================
 * Duel Operasi — bank soal pilihan ganda operasi bilangan bulat
 * ===================================================================== */
'use strict';

function ri(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function pickA(a) { return a[Math.floor(Math.random() * a.length)]; }
function shuffleA(a) {
  var x = a.slice();
  for (var i = x.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = x[i]; x[i] = x[j]; x[j] = t;
  }
  return x;
}
function prettyPlain(n) {
  var s = String(n);
  return s.charAt(0) === '-' ? '\u2212' + s.slice(1) : s;
}
function prettyOp(op) {
  return { '+': '+', '-': '\u2212', '*': '\u00D7', '/': '\u00F7' }[op] || op;
}
function prettyNum(n) {
  var s = String(n);
  return s.charAt(0) === '-' ? '(\u2212' + s.slice(1) + ')' : s;
}

function numDistractors(v) {
  var pool = [v + 1, v - 1, v + 2, v - 2, v + 3, v - 3, v + 5, v - 5,
              v + 10, v - 10, v * 2, -v, v + 7, v - 7];
  var out = [], seen = {};
  seen[v] = true;
  var sp = shuffleA(pool);
  for (var i = 0; i < sp.length && out.length < 6; i++) {
    var c = sp[i];
    if (Number.isInteger(c) && !seen[c]) { seen[c] = true; out.push(c); }
  }
  return out;
}

function makeQ(a, op, b, ans, explain) {
  var correct = prettyPlain(ans);
  var seen = {};
  seen[correct] = true;
  var ds = [];
  var pool = shuffleA(numDistractors(ans).map(prettyPlain));
  for (var i = 0; i < pool.length && ds.length < 3; i++) {
    if (!seen[pool[i]]) { seen[pool[i]] = true; ds.push(pool[i]); }
  }
  var choices = shuffleA([correct].concat(ds));
  return {
    prompt: '<b>' + prettyNum(a) + '</b> ' + prettyOp(op) + ' <b>' + prettyNum(b) + '</b> = …',
    choices: choices,
    answer: choices.indexOf(correct),
    explain: explain,
    meta: { a: a, op: op, b: b, ans: ans }
  };
}

function qAddSub(lo, hi) {
  var a = ri(lo, hi), b = ri(lo, hi);
  var op = pickA(['+', '-']);
  var ans = op === '+' ? a + b : a - b;
  return makeQ(a, op, b, ans,
    prettyNum(a) + ' ' + prettyOp(op) + ' ' + prettyNum(b) + ' = <b>' + prettyPlain(ans) + '</b>.');
}

function qMul() {
  var a = ri(-9, 9), b = ri(-9, 9);
  if (a === 0) a = 3;
  if (b === 0) b = -4;
  var ans = a * b;
  return makeQ(a, '*', b, ans,
    prettyNum(a) + ' \u00D7 ' + prettyNum(b) + ' = <b>' + prettyPlain(ans) + '</b>.' +
    (a < 0 && b < 0 ? ' (negatif × negatif = positif!)' :
     (a < 0 || b < 0) ? ' (positif × negatif = negatif!)' : ''));
}

function qDiv() {
  var b = ri(-9, 9), q = ri(-9, 9);
  if (b === 0) b = 3;
  if (q === 0) q = 4;
  var a = b * q;
  return makeQ(a, '/', b, q,
    prettyNum(a) + ' \u00F7 ' + prettyNum(b) + ' = <b>' + prettyPlain(q) + '</b>.');
}

/* Ronde 1: + − ringan | Ronde 2: × ÷ | Ronde 3: campuran sulit */
function genQuestion(round) {
  if (round === 1) return qAddSub(-20, 20);
  if (round === 2) return pickA([qMul, qDiv])();
  var r = Math.random();
  if (r < 0.35) return qAddSub(-50, 50);
  if (r < 0.7) return qMul();
  return qDiv();
}

function genRound(round) {
  var out = [], seen = {}, guard = 0;
  while (out.length < 8 && guard++ < 400) {
    var q = genQuestion(round);
    var k = q.meta.a + q.meta.op + q.meta.b;
    if (!seen[k]) { seen[k] = true; out.push(q); }
  }
  return out;
}

function verifyQuestion(q) {
  var m = q.meta;
  var exp = m.op === '+' ? m.a + m.b : m.op === '-' ? m.a - m.b :
            m.op === '*' ? m.a * m.b : m.a / m.b;
  return Number.isInteger(exp) && exp === m.ans &&
         q.choices.length === 4 &&
         new Set(q.choices).size === 4 &&
         q.choices[q.answer] === prettyPlain(m.ans);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    genQuestion: genQuestion, genRound: genRound, verifyQuestion: verifyQuestion,
    prettyPlain: prettyPlain
  };
}
