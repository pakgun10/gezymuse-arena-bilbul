/* =====================================================================
 * Jelajah Garis Bilangan — eksplorasi interaktif bilangan bulat
 * ===================================================================== */
'use strict';

(function () {
  function $(id) { return document.getElementById(id); }
  function fmtInt(n) {
    var s = String(n);
    return s.charAt(0) === '-' ? '\u2212' + s.slice(1) : s;
  }

  /* ---------------- garis bilangan SVG ---------------- */
  var NS = 'http://www.w3.org/2000/svg';
  var LO = -50, HI = 50, UNIT = 46, HH = 100;

  function X(n) { return (n - LO) * UNIT + UNIT / 2; }

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  /* Membangun garis; onPick(n) dipanggil saat bilangan diketuk.
     Mengembalikan { svg, setMarker(n|null, color) }. */
  function buildLine(svgId, wrapId, onPick) {
    var svg = $(svgId);
    var W = (HI - LO + 1) * UNIT;
    svg.setAttribute('width', W);
    svg.setAttribute('height', HH);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + HH);

    var midY = HH / 2;
    el('line', { x1: 10, y1: midY, x2: W - 10, y2: midY, stroke: 'rgba(255,255,255,.5)', 'stroke-width': 2 }, svg);
    el('polygon', { points: (W - 10) + ',' + (midY - 7) + ' ' + (W - 2) + ',' + midY + ' ' + (W - 10) + ',' + (midY + 7), fill: 'rgba(255,255,255,.5)' }, svg);
    el('polygon', { points: '10,' + (midY - 7) + ' 2,' + midY + ' 10,' + (midY + 7), fill: 'rgba(255,255,255,.5)' }, svg);

    for (var n = LO; n <= HI; n++) {
      (function (nn) {
        var x = X(nn);
        var major = (nn % 5 === 0);
        el('line', {
          x1: x, y1: midY - (major ? 16 : 8), x2: x, y2: midY + (major ? 16 : 8),
          stroke: nn === 0 ? '#06d6a0' : (major ? '#ffd166' : 'rgba(255,255,255,.3)'),
          'stroke-width': major || nn === 0 ? 3 : 1.5
        }, svg);
        if (major) {
          var t = el('text', {
            x: x, y: midY + 40, 'text-anchor': 'middle',
            fill: nn === 0 ? '#06d6a0' : '#b9b3d9',
            'font-size': nn === 0 ? 15 : 12, 'font-weight': nn === 0 ? '800' : '400'
          }, svg);
          t.textContent = fmtInt(nn);
        }
        var r = el('rect', { x: x - UNIT / 2, y: 0, width: UNIT, height: HH, fill: 'transparent' }, svg);
        r.style.cursor = 'pointer';
        r.addEventListener('click', function () { onPick(nn); });
      })(n);
    }

    var marker = el('circle', { r: 13, fill: 'none', stroke: '#fff', 'stroke-width': 3, visibility: 'hidden' }, svg);
    var dot = el('circle', { r: 5, fill: '#fff', visibility: 'hidden' }, svg);

    function placeMark(mk, dt, n, color) {
      if (n === null || n === undefined) {
        mk.setAttribute('visibility', 'hidden');
        dt.setAttribute('visibility', 'hidden');
        return;
      }
      var x = X(n);
      mk.setAttribute('cx', x); mk.setAttribute('cy', HH / 2);
      mk.setAttribute('stroke', color); mk.setAttribute('visibility', 'visible');
      dt.setAttribute('cx', x); dt.setAttribute('cy', HH / 2);
      dt.setAttribute('fill', color); dt.setAttribute('visibility', 'visible');
    }

    /* pusatkan ke nol saat pertama dibuka */
    var wrap = $(wrapId);
    setTimeout(function () { wrap.scrollLeft = X(0) - wrap.clientWidth / 2; }, 50);

    return {
      setMarker: function (n, color) { placeMark(marker, dot, n, color || '#fff'); },
      addExtraMarker: function (color) {
        var mk = el('circle', { r: 13, fill: 'none', 'stroke-width': 3, visibility: 'hidden' }, svg);
        var dt = el('circle', { r: 5, visibility: 'hidden' }, svg);
        return function (n) { placeMark(mk, dt, n, color); };
      }
    };
  }

  /* ---------------- tab: jelajah ---------------- */
  var selJelajah = null;
  var lineJ = buildLine('nl-svg', 'nl-wrap-jelajah', function (n) {
    selJelajah = n;
    lineJ.setMarker(n, '#06d6a0');
    renderInfo(n);
  });

  function renderInfo(n) {
    var lawan = -n, mutlak = Math.abs(n);
    var jenis = n > 0 ? 'Positif' : (n < 0 ? 'Negatif' : 'Nol (netral)');
    var arah = n > 0 ? 'kanan' : (n < 0 ? 'kiri' : 'tepat pada');
    var kalimat = n === 0
      ? 'Nol bukan positif maupun negatif. Ia adalah titik acuan: bilangan di kanannya positif, di kirinya negatif.'
      : fmtInt(n) + ' adalah bilangan bulat ' + jenis.toLowerCase() + '. Ia terletak ' +
        mutlak + ' satuan di sebelah ' + arah + ' 0, lawannya adalah ' + fmtInt(lawan) +
        ', dan |' + fmtInt(n) + '| = ' + mutlak + '.';
    $('info-card').innerHTML =
      '<p class="info-num">' + fmtInt(n) + '</p>' +
      '<div class="info-grid">' +
      '<div class="info-item"><div class="k">Lawan bilangan</div><div class="v">' + fmtInt(lawan) + '</div></div>' +
      '<div class="info-item"><div class="k">Nilai mutlak</div><div class="v">' + mutlak + '</div></div>' +
      '<div class="info-item"><div class="k">Jenis</div><div class="v">' + jenis + '</div></div>' +
      '<div class="info-item"><div class="k">Jarak dari 0</div><div class="v">' + mutlak + ' satuan</div></div>' +
      '</div><p class="info-sentence">' + kalimat + '</p>';
  }

  /* ---------------- tab: bandingkan ---------------- */
  var selBanding = null, markA = null, markB = null;
  var lineB = buildLine('nl-svg-banding', 'nl-wrap-banding', function (n) {
    selBanding = n;
    lineB.setMarker(n, '#fff');
    $('btn-set-a').disabled = false;
    $('btn-set-b').disabled = false;
  });
  var showA = lineB.addExtraMarker('#4cc9f0');
  var showB = lineB.addExtraMarker('#ffd166');

  $('btn-set-a').addEventListener('click', function () {
    if (selBanding === null) return;
    markA = selBanding;
    showA(markA);
    renderCompare();
  });
  $('btn-set-b').addEventListener('click', function () {
    if (selBanding === null) return;
    markB = selBanding;
    showB(markB);
    renderCompare();
  });

  function renderCompare() {
    var card = $('compare-card');
    if (markA === null || markB === null) {
      card.innerHTML = '<p class="placeholder">A = ' + (markA === null ? '?' : fmtInt(markA)) +
        ' &nbsp;•&nbsp; B = ' + (markB === null ? '?' : fmtInt(markB)) +
        '<br>Tandai dua bilangan untuk membandingkannya</p>';
      return;
    }
    var sym = markA < markB ? '<' : (markA > markB ? '>' : '=');
    var why;
    if (markA === markB) {
      why = 'Keduanya bilangan yang <b>sama</b>, jadi ' + fmtInt(markA) + ' = ' + fmtInt(markB) + '.';
    } else {
      var kiri = markA < markB ? fmtInt(markA) : fmtInt(markB);
      var kanan = markA < markB ? fmtInt(markB) : fmtInt(markA);
      why = fmtInt(kiri) + ' terletak di <b>kiri</b> ' + fmtInt(kanan) +
            ' pada garis bilangan, jadi <b>' + fmtInt(markA) + ' ' + sym + ' ' + fmtInt(markB) + '</b>.' +
            '<br>Ingat: semakin ke <b>kanan</b>, bilangan semakin <b>besar</b>!';
    }
    card.innerHTML =
      '<div class="compare-big"><span class="ca">' + fmtInt(markA) + '</span> ' +
      '<span>' + sym.replace('<', '&lt;').replace('>', '&gt;') + '</span> ' +
      '<span class="cb">' + fmtInt(markB) + '</span></div>' +
      '<p class="compare-why">' + why + '</p>';
  }

  /* ---------------- tab: latihan ---------------- */
  var ex = { nums: [], placed: [], hand: [], selected: null, done: 0 };
  try { ex.done = parseInt(localStorage.getItem('arena-bilangan:jelajah'), 10) || 0; } catch (e) {}
  ex.done = Math.max(0, Math.min(3, ex.done));
  $('ex-done').textContent = ex.done;

  function saveStars() {
    try { localStorage.setItem('arena-bilangan:jelajah', String(Math.min(3, ex.done))); } catch (e) {}
    $('ex-done').textContent = Math.min(3, ex.done);
  }

  function newExercise() {
    var pool = [];
    for (var n = -20; n <= 20; n++) pool.push(n);
    var nums = [];
    while (nums.length < 5) {
      var c = pool[Math.floor(Math.random() * pool.length)];
      if (nums.indexOf(c) === -1) nums.push(c);
    }
    ex.nums = nums;
    ex.placed = [null, null, null, null, null];
    ex.hand = nums.map(function (v, i) { return { id: 'x' + i + '_' + v, v: v }; });
    /* acak urutan tangan */
    for (var k = ex.hand.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1));
      var t = ex.hand[k]; ex.hand[k] = ex.hand[j]; ex.hand[j] = t;
    }
    ex.selected = null;
    $('ex-feedback').textContent = '';
    $('ex-feedback').className = 'ex-feedback';
    $('btn-ex-new').classList.add('hidden');
    renderEx();
  }

  function renderEx() {
    var sh = $('ex-slots');
    sh.innerHTML = '';
    ex.placed.forEach(function (c, i) {
      (function (idx) {
        var b = document.createElement('button');
        b.className = 'slot' + (c ? ' filled' : '');
        b.textContent = c ? fmtInt(c.v) : '?';
        b.addEventListener('click', function () {
          if (c) {
            ex.hand.push(c);
            ex.placed[idx] = null;
            renderEx();
          } else if (ex.selected) {
            var ci = -1;
            for (var k = 0; k < ex.hand.length; k++) {
              if (ex.hand[k].id === ex.selected) { ci = k; break; }
            }
            if (ci >= 0) {
              ex.placed[idx] = ex.hand[ci];
              ex.hand.splice(ci, 1);
              ex.selected = null;
              renderEx();
            }
          }
        });
        sh.appendChild(b);
      })(i);
    });
    var hh = $('ex-hand');
    hh.innerHTML = '';
    ex.hand.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'chip' + (ex.selected === c.id ? ' selected' : '');
      b.textContent = fmtInt(c.v);
      b.addEventListener('click', function () {
        ex.selected = (ex.selected === c.id) ? null : c.id;
        renderEx();
      });
      hh.appendChild(b);
    });
    var complete = ex.placed.every(function (c) { return !!c; });
    $('btn-ex-check').disabled = !complete;
  }

  $('btn-ex-reset').addEventListener('click', function () {
    for (var i = 0; i < ex.placed.length; i++) {
      if (ex.placed[i]) { ex.hand.push(ex.placed[i]); ex.placed[i] = null; }
    }
    ex.selected = null;
    renderEx();
  });

  $('btn-ex-check').addEventListener('click', function () {
    var vals = ex.placed.map(function (c) { return c.v; });
    var ok = true;
    for (var i = 1; i < vals.length; i++) {
      if (vals[i - 1] >= vals[i]) { ok = false; break; }
    }
    var fb = $('ex-feedback');
    /* tandai slot yang salah */
    var slots = $('ex-slots').children;
    for (var s = 0; s < slots.length; s++) slots[s].classList.remove('wrongmark');
    if (ok) {
      fb.textContent = '✅ Tepat sekali! Urutanmu benar.';
      fb.className = 'ex-feedback ok';
      ex.done++;
      saveStars();
      $('btn-ex-new').classList.remove('hidden');
    } else {
      for (var k = 1; k < vals.length; k++) {
        if (vals[k - 1] >= vals[k]) {
          slots[k - 1].classList.add('wrongmark');
          slots[k].classList.add('wrongmark');
          break;
        }
      }
      fb.textContent = '❌ Belum tepat — perhatikan yang bertanda merah. Ingat: negatif besar = kecil!';
      fb.className = 'ex-feedback bad';
    }
  });

  $('btn-ex-new').addEventListener('click', newExercise);

  /* ---------------- tabs ---------------- */
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      document.querySelectorAll('.tabpanel').forEach(function (p) { p.classList.remove('active'); });
      $('tab-' + t.getAttribute('data-tab')).classList.add('active');
    });
  });

  newExercise();
})();
