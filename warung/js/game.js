/* =====================================================================
 * Warung Pintar — UI simulasi kantin 5 hari
 * ===================================================================== */
'use strict';

(function () {
  function $(id) { return document.getElementById(id); }

  var SCREENS = ['screen-start', 'screen-game', 'screen-end'];
  function show(id) {
    SCREENS.forEach(function (s) { $(s).classList.toggle('active', s === id); });
    window.scrollTo(0, 0);
  }

  var muted = false;
  try { muted = JSON.parse(localStorage.getItem('warungPintar') || '{}').muted || false; } catch (e) {}
  Sfx.setMuted(muted);

  var G = null; /* { st, phase, buy:{}, bankAmt:{save,wd,pay}, lastReport } */

  var PHASE_TITLES = {
    belanja: '🛒 Belanja Stok',
    harga: '🏷️ Tentukan Harga Jual',
    jualan: '🏪 Buka Warung!',
    bank: '🏦 Bank & Utang',
    laporan: '📊 Laporan Harian'
  };

  function startGame() {
    var buy = {};
    ITEMS.forEach(function (it) { buy[it.id] = 0; });
    G = {
      st: newGame(),
      phase: 'belanja',
      buy: buy,
      bankAmt: { save: 0, wd: 0, pay: 0 },
      lastReport: null
    };
    show('screen-game');
    renderPhase();
  }

  function refreshMoney() {
    var st = G.st;
    $('day-num').textContent = st.day;
    $('m-cash').textContent = rp(st.cash);
    $('m-save').textContent = rp(st.savings);
    var dw = $('m-debt-wrap');
    if (st.debt > 0 || st.piutang > 0) {
      dw.classList.remove('hidden');
      $('m-debt').textContent = rp(st.debt) + (st.piutang > 0 ? ' (piutang ' + rp(st.piutang) + ')' : '');
    } else {
      dw.classList.add('hidden');
    }
  }

  function renderPhase() {
    refreshMoney();
    $('phase-title').textContent = PHASE_TITLES[G.phase] || '';
    var body = $('phase-body');
    body.innerHTML = '';
    ({ belanja: renderBelanja, harga: renderHarga, jualan: renderJualan,
       bank: renderBank, laporan: renderLaporan })[G.phase](body);
    window.scrollTo(0, 0);
  }

  /* ---------- komponen stepper ---------- */
  function stepper(get, set, min, max, step, fmtFn) {
    var wrap = document.createElement('div');
    wrap.className = 'stepper';
    var bMin = document.createElement('button');
    bMin.className = 'step-btn';
    bMin.textContent = '−';
    var val = document.createElement('span');
    val.className = 'step-val';
    var bPlus = document.createElement('button');
    bPlus.className = 'step-btn';
    bPlus.textContent = '+';
    function draw() { val.textContent = fmtFn ? fmtFn(get()) : get(); }
    bMin.addEventListener('click', function () { set(Math.max(min, get() - step)); draw(); Sfx.click(); });
    bPlus.addEventListener('click', function () { set(Math.min(max, get() + step)); draw(); Sfx.click(); });
    wrap.appendChild(bMin); wrap.appendChild(val); wrap.appendChild(bPlus);
    draw();
    return wrap;
  }

  function primaryBtn(label, fn, disabled) {
    var b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.textContent = label;
    b.disabled = !!disabled;
    b.addEventListener('click', function () { Sfx.click(); fn(); });
    return b;
  }

  /* ---------- fase: belanja ---------- */
  function renderBelanja(body) {
    var st = G.st;
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<p class="hint">Pilih jumlah stok yang dibeli. Uang kas: <b>' + rp(st.cash) + '</b></p>';
    var totalEl = document.createElement('p');
    totalEl.className = 'total-line';

    function totalCost() {
      var t = 0;
      ITEMS.forEach(function (it) { t += buyCost(it.id, G.buy[it.id]); });
      return t;
    }
    function drawTotal() {
      var t = totalCost();
      totalEl.innerHTML = 'Total belanja: <b>' + rp(t) + '</b> &nbsp;•&nbsp; Sisa kas: <b>' +
        rp(st.cash - t) + '</b>';
      totalEl.classList.toggle('over', t > st.cash);
    }

    ITEMS.forEach(function (it) {
      var row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = '<div class="item-info"><span class="item-icon">' + it.icon + '</span>' +
        '<div><b>' + it.name + '</b><br><span class="muted">Kulak: ' + rp(it.kulak) +
        ' • Stok: ' + st.stock[it.id] + '</span></div></div>';
      var maxQ = 99;
      var sp = stepper(
        function () { return G.buy[it.id]; },
        function (v) {
          /* cegah total melebihi kas */
          var cur = buyCost(it.id, G.buy[it.id]);
          var rest = totalCost() - cur;
          var allowed = Math.floor((st.cash - rest) / it.kulak);
          G.buy[it.id] = Math.max(0, Math.min(v, allowed, maxQ));
          drawTotal();
        },
        0, maxQ, 1,
        function (v) { return v + ' (' + rp(buyCost(it.id, v)) + ')'; }
      );
      row.appendChild(sp);
      card.appendChild(row);
    });
    card.appendChild(totalEl);
    drawTotal();
    body.appendChild(card);
    body.appendChild(primaryBtn('Selesai Belanja →', function () {
      ITEMS.forEach(function (it) { applyBuy(st, it.id, G.buy[it.id]); G.buy[it.id] = 0; });
      G.phase = 'harga';
      renderPhase();
    }));
  }

  /* ---------- fase: harga ---------- */
  function renderHarga(body) {
    var st = G.st;
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<p class="hint">Harga wajar jadi acuan pembeli. Terlalu mahal → sepi!</p>';
    ITEMS.forEach(function (it) {
      var row = document.createElement('div');
      row.className = 'item-row';
      var info = document.createElement('div');
      info.className = 'item-info';
      info.innerHTML = '<span class="item-icon">' + it.icon + '</span>' +
        '<div><b>' + it.name + '</b><br><span class="muted">Harga wajar: ' + rp(it.wajar) +
        ' • Stok: ' + st.stock[it.id] + '</span><br><span class="demand"></span></div>';
      var demEl = info.querySelector('.demand');
      function drawDem() {
        var p = Math.round(demandFor(it.id, st.price[it.id]) * 100);
        demEl.innerHTML = 'Peluang laku: <b>' + p + '%</b>';
        demEl.className = 'demand ' + (p >= 70 ? 'good' : p >= 40 ? 'mid' : 'bad');
      }
      var sp = stepper(
        function () { return st.price[it.id]; },
        function (v) { st.price[it.id] = clampPrice(it.id, v); drawDem(); },
        it.kulak, it.wajar * 2, 500, rp
      );
      row.appendChild(info);
      row.appendChild(sp);
      card.appendChild(row);
      drawDem();
    });
    body.appendChild(card);
    body.appendChild(primaryBtn('Buka Warung! 🏪', function () {
      G.phase = 'jualan';
      renderPhase();
    }));
  }

  /* ---------- fase: jualan ---------- */
  function renderJualan(body) {
    var st = G.st;
    var card = document.createElement('div');
    card.className = 'card';
    var totalStock = 0;
    ITEMS.forEach(function (it) { totalStock += st.stock[it.id]; });
    card.innerHTML = '<p class="hint">Stok siap jual: <b>' + totalStock + '</b> barang. Semoga laris!</p>';
    body.appendChild(card);
    body.appendChild(primaryBtn('▶ Mulai Jualan Hari ' + st.day, function () {
      G.lastReport = simulateDay(st);
      Sfx.win();
      renderHasilJualan(body);
    }));
  }

  function renderHasilJualan(body) {
    var r = G.lastReport;
    var card = document.createElement('div');
    card.className = 'card';
    var html = '<h3>🧾 Hasil Jualan Hari ' + r.day + '</h3>';
    html += '<div class="stat-row"><span>Pelanggan datang</span><b>' + r.customers + ' orang</b></div>';
    html += '<div class="stat-row"><span>Barang terjual</span><b>' + r.units + ' pcs</b></div>';
    ITEMS.forEach(function (it) {
      if (r.perItem[it.id] > 0) {
        html += '<div class="stat-row"><span>' + it.icon + ' ' + it.name + '</span><b>' +
          r.perItem[it.id] + ' pcs → ' + rp(r.perItem[it.id] * G.st.price[it.id]) + '</b></div>';
      }
    });
    html += '<div class="stat-row total"><span>Pemasukan</span><b>' + rp(r.revenue) + '</b></div>';
    if (r.events.length > 0) {
      html += '<h3>📣 Kejadian</h3>';
      r.events.forEach(function (e) { html += '<p class="event">' + e.text + '</p>'; });
    }
    card.innerHTML = html;
    body.innerHTML = '';
    body.appendChild(card);
    body.appendChild(primaryBtn('Ke Bank →', function () {
      G.phase = 'bank';
      G.bankAmt = { save: 0, wd: 0, pay: 0 };
      renderPhase();
    }));
    refreshMoney();
  }

  /* ---------- fase: bank ---------- */
  function renderBank(body) {
    var st = G.st;
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<p class="hint">Tabungan berbunga <b>2%/hari</b>. Utang mengurangi aset akhirmu!</p>';

    function bankRow(title, desc, key, maxFn, applyFn, btnLabel) {
      var row = document.createElement('div');
      row.className = 'item-row bank-row';
      var info = document.createElement('div');
      info.className = 'item-info';
      info.innerHTML = '<div><b>' + title + '</b><br><span class="muted">' + desc + '</span></div>';
      var sp = stepper(
        function () { return G.bankAmt[key]; },
        function (v) { G.bankAmt[key] = v; },
        0, 99999999, 5000, rp
      );
      var go = document.createElement('button');
      go.className = 'btn btn-small-apply';
      go.textContent = btnLabel;
      go.addEventListener('click', function () {
        var done = applyFn(st, G.bankAmt[key]);
        G.bankAmt[key] = 0;
        Sfx.click();
        renderPhase();
      });
      row.appendChild(info);
      row.appendChild(sp);
      row.appendChild(go);
      return row;
    }

    card.appendChild(bankRow('💰 Menabung', 'Kas: ' + rp(st.cash), 'save',
      function () { return st.cash; }, applySave, 'Tabung'));
    if (st.savings > 0) {
      card.appendChild(bankRow('🏦 Tarik Tabungan', 'Tabungan: ' + rp(st.savings), 'wd',
        function () { return st.savings; }, applyWithdraw, 'Tarik'));
    }
    if (st.debt > 0) {
      card.appendChild(bankRow('📝 Bayar Utang', 'Sisa utang: ' + rp(st.debt), 'pay',
        function () { return Math.min(st.cash, st.debt); }, applyPayDebt, 'Bayar'));
    } else {
      var noDebt = document.createElement('p');
      noDebt.className = 'hint';
      noDebt.innerHTML = '✅ Tidak ada utang. Piutang: <b>' + rp(st.piutang) + '</b>';
      card.appendChild(noDebt);
    }
    body.appendChild(card);
    body.appendChild(primaryBtn('Lihat Laporan →', function () {
      G.phase = 'laporan';
      renderPhase();
    }));
  }

  /* ---------- fase: laporan ---------- */
  function renderLaporan(body) {
    var st = G.st;
    var r = G.lastReport;
    var card = document.createElement('div');
    card.className = 'card';
    var html = '<h3>📊 Laporan Hari ' + r.day + '</h3>';
    html += statRow('Pemasukan', rp(r.revenue));
    html += statRow('Modal barang terjual', '−' + rp(r.modalTerjual));
    if (r.rugiBasi) html += statRow('Rugi barang basi', '−' + rp(r.rugiBasi));
    html += statRow('Untung bersih hari ini',
      '<b class="' + (r.untung >= 0 ? 'pos' : 'neg') + '">' + rp(r.untung) + '</b>');
    if (r.bunga) html += statRow('Bunga tabungan', '+' + rp(r.bunga));
    html += statRow('Kas', rp(st.cash));
    html += statRow('Tabungan', rp(st.savings));
    if (st.debt > 0) html += statRow('Utang', '<b class="neg">−' + rp(st.debt) + '</b>');
    if (st.piutang > 0) html += statRow('Piutang', rp(st.piutang));
    var stokTxt = ITEMS.map(function (it) { return it.icon + ' ' + st.stock[it.id]; }).join(' • ');
    html += statRow('Sisa stok', stokTxt);
    card.innerHTML = html;
    body.appendChild(card);
    if (st.day < HARI_TOTAL) {
      body.appendChild(primaryBtn('Hari ' + (st.day + 1) + ' →', function () {
        st.day++;
        G.phase = 'belanja';
        ITEMS.forEach(function (it) { G.buy[it.id] = 0; });
        renderPhase();
      }));
    } else {
      body.appendChild(primaryBtn('🏁 Hasil Akhir', function () { endGame(); }));
    }
  }

  function statRow(label, value) {
    return '<div class="stat-row"><span>' + label + '</span><b>' + value + '</b></div>';
  }

  /* ---------- akhir ---------- */
  function endGame() {
    var st = G.st;
    var assets = totalAssets(st);
    var p = predicate(assets);
    try { localStorage.setItem('arena-bilangan:warung', String(p.stars)); } catch (e) {}
    if (p.stars > 0) Sfx.win(); else Sfx.wrong();

    $('end-emoji').textContent = p.stars >= 3 ? '🏆' : p.stars === 2 ? '🙂' : p.stars === 1 ? '🌱' : '📊';
    $('end-title').textContent = p.title;
    $('end-sub').textContent = p.desc;
    $('end-stats').innerHTML =
      statRow('Kas', rp(st.cash)) +
      statRow('Tabungan', rp(st.savings)) +
      statRow('Nilai stok', rp(stockValue(st))) +
      (st.piutang > 0 ? statRow('Piutang', '+' + rp(st.piutang)) : '') +
      (st.debt > 0 ? statRow('Utang', '<b class="neg">−' + rp(st.debt) + '</b>') : '') +
      statRow('<b>Total aset</b>', '<b class="big">' + rp(assets) + '</b>') +
      statRow('Modal awal', rp(MODAL_AWAL)) +
      statRow('Bintang', '⭐'.repeat(p.stars) + '☆'.repeat(3 - p.stars)) +
      '<p class="stat-note">Aset = kas + tabungan + nilai stok + piutang − utang.<br>' +
      'Perhatikan: utang <b>mengurangi</b> asetmu — seperti bilangan negatif!</p>';
    show('screen-end');
  }

  /* ---------- wiring ---------- */
  $('btn-start').addEventListener('click', function () { Sfx.click(); startGame(); });
  $('btn-quit').addEventListener('click', function () { Sfx.click(); show('screen-start'); });
  $('btn-again').addEventListener('click', function () { Sfx.click(); startGame(); });
  $('btn-end-arena').addEventListener('click', function () { window.location.href = '../'; });

  function refreshMuteBtn() {
    $('btn-mute').textContent = Sfx.isMuted() ? '🔇 Suara: Mati' : '🔊 Suara: Nyala';
  }
  $('btn-mute').addEventListener('click', function () {
    var m = !Sfx.isMuted();
    Sfx.setMuted(m);
    try { localStorage.setItem('warungPintar', JSON.stringify({ muted: m })); } catch (e) {}
    refreshMuteBtn();
    if (!m) Sfx.click();
  });
  refreshMuteBtn();
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
})();
