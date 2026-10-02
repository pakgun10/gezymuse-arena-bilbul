/* =====================================================================
 * Urutkan Kilat — generator kartu bilangan
 * Kartu: { cid, v (nilai numerik), label }
 * Sebagian kartu berupa hasil operasi (mis. "(−3) × 4") yang harus
 * dihitung dulu nilainya oleh pemain.
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
function pretty(n) {
  var s = String(n);
  return s.charAt(0) === '-' ? '(\u2212' + s.slice(1) + ')' : s;
}
function prettyPlain(n) {
  var s = String(n);
  return s.charAt(0) === '-' ? '\u2212' + s.slice(1) : s;
}

var _cid = 0;
function mkCard(v, label) {
  return { cid: 'u' + (++_cid), v: v, label: label };
}

/* Nyatakan v sebagai ekspresi operasi (selalu tepat sama dengan v). */
function exprLabel(v) {
  var form = pickA(['add', 'sub', 'mul', 'div']);
  var a, b;
  if (form === 'add') {
    a = ri(-15, 15); b = v - a;
    return pretty(a) + ' + ' + pretty(b);
  }
  if (form === 'sub') {
    a = ri(-15, 15); b = a - v;
    return pretty(a) + ' \u2212 ' + pretty(b);
  }
  if (form === 'mul') {
    if (v === 0) return '7 \u00D7 0';
    var divs = [];
    for (var d = 2; d <= 9; d++) {
      if (Math.abs(v) % d === 0) divs.push(v < 0 ? -d : d);
    }
    if (divs.length === 0) { a = ri(-15, 15); b = v - a; return pretty(a) + ' + ' + pretty(b); }
    var dd = pickA(divs);
    return pretty(dd) + ' \u00D7 ' + pretty(v / dd);
  }
  /* div */
  b = pickA([2, 3, 4, 5, 6, 7, 8, 9]);
  if (Math.random() < 0.3) b = -b;
  a = v * b;
  return pretty(a) + ' \u00F7 ' + pretty(b);
}

var FRACS = [
  [1, 2], [-1, 2], [3, 4], [-3, 4], [1, 3], [-1, 3],
  [3, 2], [-3, 2], [5, 2], [-5, 2], [2, 3], [-2, 3]
];

/* Bangkitkan `count` kartu bernilai unik dalam rentang [lo, hi].
 * exprP: peluang kartu berupa ekspresi; fracN: jumlah kartu pecahan (L5). */
function genCards(count, lo, hi, exprP, fracN) {
  fracN = fracN || 0;
  var used = {};
  var cards = [];
  var guard = 0;

  /* kartu pecahan dulu (khusus level 5) */
  var fi = 0;
  var fpool = shuffleA(FRACS);
  while (fi < fracN && fi < fpool.length && guard++ < 200) {
    var fr = fpool[fi++];
    var v = fr[0] / fr[1];
    if (used[v]) continue;
    used[v] = true;
    var lbl = (fr[0] < 0 ? '\u2212' : '') + Math.abs(fr[0]) + '/' + fr[1];
    cards.push(mkCard(v, lbl));
  }

  guard = 0;
  while (cards.length < count && guard++ < 2000) {
    var v = ri(lo, hi);
    if (used[v]) continue;
    used[v] = true;
    var label, kind;
    if (Math.random() < exprP) {
      label = exprLabel(v);
    } else {
      label = prettyPlain(v);
    }
    cards.push(mkCard(v, label));
  }
  return shuffleA(cards);
}

function genPuzzle(levelId) {
  var lv = LEVELS[levelId - 1];
  return {
    cards: genCards(6, lv.lo, lv.hi, lv.exprP, lv.fracN),
    count: 6
  };
}

var LEVELS = [
  { id: 1, name: 'Pemanasan', desc: 'Bilangan −10…10', time: 60, count: 6, pass: 4, mult: 1, icon: '🌱',
    lo: -10, hi: 10, exprP: 0, fracN: 0 },
  { id: 2, name: 'Makin Lebar', desc: 'Bilangan −50…50', time: 60, count: 6, pass: 4, mult: 2, icon: '📏',
    lo: -50, hi: 50, exprP: 0, fracN: 0 },
  { id: 3, name: 'Hitung Dulu!', desc: 'Sebagian kartu berupa operasi', time: 60, count: 6, pass: 4, mult: 3, icon: '🧮',
    lo: -50, hi: 50, exprP: 0.35, fracN: 0 },
  { id: 4, name: 'Ratusan', desc: 'Bilangan −100…100 + operasi', time: 60, count: 6, pass: 4, mult: 4, icon: '💯',
    lo: -100, hi: 100, exprP: 0.35, fracN: 0 },
  { id: 5, name: 'Bos Kilat', desc: 'Campuran + pecahan pengecoh, waktu 45 dtk', time: 45, count: 8, pass: 5, mult: 5, icon: '👑',
    lo: -100, hi: 100, exprP: 0.4, fracN: 2 }
];

function genLevelPuzzles(levelId) {
  var lv = LEVELS[levelId - 1];
  if (!lv) throw new Error('Level tidak dikenal: ' + levelId);
  var out = [];
  for (var i = 0; i < lv.count; i++) out.push(genPuzzle(levelId));
  return out;
}

/* Verifikasi: kartu unik & terurut naik bila di-sort. */
function verifyPuzzle(p) {
  if (p.cards.length !== 6) return false;
  var vs = p.cards.map(function (c) { return c.v; });
  if (new Set(vs).size !== vs.length) return false;
  var sorted = vs.slice().sort(function (a, b) { return a - b; });
  for (var i = 1; i < sorted.length; i++) {
    if (sorted[i - 1] >= sorted[i]) return false;
  }
  return true;
}

/* Pastikan label ekspresi benar-benar bernilai v (uji via evaluasi sederhana). */
function evalLabel(label) {
  /* label bentuk: [(-)a] op [(-)b], op ∈ + − × ÷ ; pecahan "a/b" */
  var s = label.replace(/\u2212/g, '-').replace(/\(/g, '').replace(/\)/g, '');
  if (/^-?\d+\/-?\d+$/.test(s.replace(/\s/g, ''))) {
    var p = s.split('/');
    return parseInt(p[0], 10) / parseInt(p[1], 10);
  }
  var m = s.match(/^(-?\d+)\s*([+\-×÷])\s*(-?\d+)$/);
  if (!m) return NaN;
  var a = parseInt(m[1], 10), b = parseInt(m[3], 10);
  if (m[2] === '+') return a + b;
  if (m[2] === '-') return a - b;
  if (m[2] === '×') return a * b;
  return a / b;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LEVELS: LEVELS, genLevelPuzzles: genLevelPuzzles, verifyPuzzle: verifyPuzzle,
    evalLabel: evalLabel, prettyPlain: prettyPlain
  };
}
