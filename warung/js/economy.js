/* =====================================================================
 * Warung Pintar — logika ekonomi (fungsi murni, mudah diuji)
 * Semua uang dalam rupiah (bilangan bulat).
 * ===================================================================== */
'use strict';

var ITEMS = [
  { id: 'roti',  name: 'Roti',       icon: '\uD83C\uDF5E', kulak: 2000, wajar: 3000 },
  { id: 'minum', name: 'Minuman',    icon: '\uD83E\uDD64', kulak: 1500, wajar: 2500 },
  { id: 'tulis', name: 'Alat Tulis', icon: '\u270F\uFE0F', kulak: 3000, wajar: 5000 }
];

var MODAL_AWAL = 150000;
var HARI_TOTAL = 5;
var BUNGA = 0.02;

function newGame() {
  var stock = {}, price = {};
  ITEMS.forEach(function (it) { stock[it.id] = 0; price[it.id] = it.wajar; });
  return {
    day: 1, cash: MODAL_AWAL, savings: 0, debt: 0, piutang: 0,
    stock: stock, price: price,
    history: [] /* laporan per hari */
  };
}

function itemById(id) {
  for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
  return null;
}

/* ---------- belanja ---------- */
function buyCost(id, qty) { return itemById(id).kulak * qty; }

function applyBuy(st, id, qty) {
  qty = Math.max(0, Math.floor(qty));
  var cost = buyCost(id, qty);
  if (qty === 0 || cost > st.cash) return { ok: false };
  st.cash -= cost;
  st.stock[id] += qty;
  return { ok: true, cost: cost };
}

/* ---------- harga ---------- */
function clampPrice(id, price) {
  var it = itemById(id);
  var p = Math.round(price / 500) * 500;
  if (p < it.kulak) p = it.kulak;
  if (p > it.wajar * 2) p = it.wajar * 2;
  return p;
}

/* Peluang pelanggan membeli barang pada harga tertentu. */
function demandFor(id, price) {
  var it = itemById(id);
  var ratio = price / it.wajar;
  if (ratio <= 1) return 0.9;
  var p = 0.9 - (ratio - 1) * 1.2;
  return Math.max(0.05, Math.min(0.9, p));
}

/* ---------- simulasi jualan satu hari ----------
 * rand: fungsi acak () -> [0,1); default Math.random (bisa di-inject untuk uji). */
function simulateDay(st, rand) {
  rand = rand || Math.random;
  var report = {
    day: st.day, revenue: 0, modalTerjual: 0, units: 0,
    perItem: {}, events: []
  };
  ITEMS.forEach(function (it) { report.perItem[it.id] = 0; });

  var customers = 8 + Math.floor(rand() * 9); /* 8–16 pelanggan */
  report.customers = customers;
  for (var c = 0; c < customers; c++) {
    var it = ITEMS[Math.floor(rand() * ITEMS.length)];
    if (st.stock[it.id] <= 0) continue;
    if (rand() < demandFor(it.id, st.price[it.id])) {
      st.stock[it.id]--;
      st.cash += st.price[it.id];
      report.revenue += st.price[it.id];
      report.modalTerjual += it.kulak;
      report.units++;
      report.perItem[it.id]++;
    }
  }

  /* kejadian acak */
  var roll = rand();
  if (roll < 0.22) {
    /* barang kedaluwarsa */
    var candidates = ITEMS.filter(function (it) { return st.stock[it.id] > 0; });
    if (candidates.length > 0) {
      var it2 = candidates[Math.floor(rand() * candidates.length)];
      var lost = Math.min(st.stock[it2.id], 2 + Math.floor(rand() * 3));
      st.stock[it2.id] -= lost;
      var lossVal = lost * it2.kulak;
      report.events.push({
        text: '\u26A0\uFE0F ' + lost + ' ' + it2.name + ' kedaluwarsa & dibuang (rugi ' + rp(lossVal) + ')',
        loss: lossVal
      });
      report.rugiBasi = lossVal;
    }
  } else if (roll < 0.38) {
    /* teman meminjam uang -> piutang */
    var amt = 20000;
    if (st.cash >= amt) {
      st.cash -= amt;
      st.piutang += amt;
      report.events.push({ text: '\uD83D\uDE4B Teman meminjam ' + rp(amt) + ' (dicatat sebagai piutang)', loss: 0 });
    }
  } else if (roll < 0.5 && st.piutang > 0) {
    /* piutang kembali */
    st.cash += st.piutang;
    report.events.push({ text: '\uD83D\uDCB0 Teman mengembalikan pinjaman ' + rp(st.piutang), loss: 0, gain: st.piutang });
    st.piutang = 0;
  } else if (roll < 0.62) {
    /* kulakan berutang ke supplier */
    var it3 = ITEMS[Math.floor(rand() * ITEMS.length)];
    var q = 5;
    st.stock[it3.id] += q;
    st.debt += it3.kulak * q;
    report.events.push({
      text: '\uD83D\uDCDD Kulakan ' + q + ' ' + it3.name + ' secara berutang (+utang ' + rp(it3.kulak * q) + ')',
      loss: 0
    });
  }

  /* bunga tabungan */
  if (st.savings > 0) {
    var bunga = Math.round(st.savings * BUNGA);
    st.savings += bunga;
    report.bunga = bunga;
  }

  report.untung = report.revenue - report.modalTerjual - (report.rugiBasi || 0);
  report.cashAfter = st.cash;
  report.savingsAfter = st.savings;
  report.debtAfter = st.debt;
  st.history.push(report);
  return report;
}

/* ---------- bank ---------- */
function applySave(st, amt) {
  amt = Math.max(0, Math.floor(amt));
  amt = Math.min(amt, st.cash);
  st.cash -= amt;
  st.savings += amt;
  return amt;
}
function applyWithdraw(st, amt) {
  amt = Math.max(0, Math.floor(amt));
  amt = Math.min(amt, st.savings);
  st.savings -= amt;
  st.cash += amt;
  return amt;
}
function applyPayDebt(st, amt) {
  amt = Math.max(0, Math.floor(amt));
  amt = Math.min(amt, Math.min(st.cash, st.debt));
  st.cash -= amt;
  st.debt -= amt;
  return amt;
}

/* ---------- hasil akhir ---------- */
function stockValue(st) {
  var v = 0;
  ITEMS.forEach(function (it) { v += st.stock[it.id] * it.kulak; });
  return v;
}
function totalAssets(st) {
  return st.cash + st.savings + stockValue(st) + st.piutang - st.debt;
}
function predicate(assets) {
  if (assets >= 250000) return { stars: 3, title: 'Juragan Kantin \uD83C\uDFC6', desc: 'Luar biasa! Modal bertumbuh pesat.' };
  if (assets >= 180000) return { stars: 2, title: 'Pedagang Cermat \uD83D\uDE42', desc: 'Untung rapi dan terkendali.' };
  if (assets >= 120000) return { stars: 1, title: 'Pemula Berani \uD83C\uDF31', desc: 'Sudah berani ambil keputusan!' };
  return { stars: 0, title: 'Butuh Strategi Baru \uD83D\uDCCA', desc: 'Pelajari lagi laporan harianmu, lalu coba lagi!' };
}

function rp(n) {
  var neg = n < 0;
  var s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−Rp' : 'Rp') + s;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ITEMS: ITEMS, MODAL_AWAL: MODAL_AWAL, HARI_TOTAL: HARI_TOTAL, BUNGA: BUNGA,
    newGame: newGame, itemById: itemById, buyCost: buyCost, applyBuy: applyBuy,
    clampPrice: clampPrice, demandFor: demandFor, simulateDay: simulateDay,
    applySave: applySave, applyWithdraw: applyWithdraw, applyPayDebt: applyPayDebt,
    stockValue: stockValue, totalAssets: totalAssets, predicate: predicate, rp: rp
  };
}
