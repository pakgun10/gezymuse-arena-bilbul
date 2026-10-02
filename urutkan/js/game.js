/* =====================================================================
 * Urutkan Kilat — logika permainan
 * ===================================================================== */
'use strict';

function fmt(n) { return Number(n).toLocaleString('id-ID'); }

(function () {
  function $(id) { return document.getElementById(id); }

  var SCREENS = ['screen-start', 'screen-levels', 'screen-game', 'screen-result', 'screen-victory'];
  function show(id) {
    SCREENS.forEach(function (s) { $(s).classList.toggle('active', s === id); });
    window.scrollTo(0, 0);
  }

  var store = {
    load: function () {
      try { return JSON.parse(localStorage.getItem('urutkanKilat')) || { unlocked: 1, best: {}, muted: false }; }
      catch (e) { return { unlocked: 1, best: {}, muted: false }; }
    },
    save: function (d) { try { localStorage.setItem('urutkanKilat', JSON.stringify(d)); } catch (e) {} }
  };
  var progress = store.load();
  Sfx.setMuted(!!progress.muted);

  function saveStars() {
    var cleared = 0;
    for (var i = 1; i <= LEVELS.length; i++) if (progress.best[i] > 0) cleared++;
    var stars = cleared >= 5 ? 3 : cleared >= 3 ? 2 : cleared >= 1 ? 1 : 0;
    try { localStorage.setItem('arena-bilangan:urutkan', String(stars)); } catch (e) {}
  }

  var state = null;  /* { cfg, puzzles, idx, score, lives, combo, correct, answered, timerId, timeLeft } */
  var board = null;  /* { cards, placed:[], hand:[], selected, locked } */

  function renderLevels() {
    var grid = $('level-grid');
    grid.innerHTML = '';
    LEVELS.forEach(function (lv) {
      var locked = lv.id > progress.unlocked;
      var best = progress.best[lv.id];
      var card = document.createElement('button');
      card.className = 'level-card' + (locked ? ' locked' : '');
      card.innerHTML =
        '<div class="lv-icon">' + lv.icon + '</div>' +
        '<div class="lv-name">Level ' + lv.id + ': ' + lv.name + '</div>' +
        '<div class="lv-desc">' + lv.desc + ' &bull; ' + lv.count + ' soal &bull; ' + lv.time + ' detik/soal</div>' +
        (best ? '<div class="lv-best">⭐ Skor terbaik: ' + fmt(best) + '</div>' : '') +
        (locked ? '<div class="lv-lock">🔒 Selesaikan level sebelumnya untuk membuka</div>' : '');
      if (!locked) card.addEventListener('click', function () { Sfx.click(); startLevel(lv.id); });
      grid.appendChild(card);
    });
  }

  function startLevel(id) {
    var cfg = LEVELS[id - 1];
    state = {
      cfg: cfg, puzzles: genLevelPuzzles(id), idx: 0,
      score: 0, lives: 3, combo: 0, correct: 0,
      answered: false, timerId: null, timeLeft: cfg.time
    };
    show('screen-game');
    renderPuzzle();
  }

  function renderPuzzle() {
    var p = state.puzzles[state.idx];
    board = { cards: p.cards, placed: p.cards.map(function () { return null; }),
              hand: p.cards.slice(), selected: null, locked: false };
    state.answered = false;
    $('hud-level').textContent = state.cfg.id;
    updateLives();
    $('hud-combo').textContent = state.combo > 1 ? 'x' + state.combo : '–';
    $('hud-score').textContent = fmt(state.score);
    $('q-progress').textContent = 'Soal ' + (state.idx + 1) + '/' + state.puzzles.length;
    $('feedback').classList.add('hidden');
    renderBoard();
    startTimer();
  }

  function updateLives() {
    $('hud-lives').textContent = '❤️'.repeat(state.lives) + '🖤'.repeat(3 - state.lives);
  }

  function renderBoard() {
    var sh = $('slots');
    sh.innerHTML = '';
    board.placed.forEach(function (c, i) {
      (function (idx) {
        var b = document.createElement('button');
        b.className = 'slot' + (c ? ' filled' : '');
        b.setAttribute('data-slot', idx);
        b.textContent = c ? c.label : '?';
        b.disabled = board.locked;
        b.addEventListener('click', function () { onSlotTap(idx); });
        sh.appendChild(b);
      })(i);
    });
    var hh = $('hand');
    hh.innerHTML = '';
    if (board.hand.length === 0) hh.innerHTML = '<span class="hand-empty">Semua kartu terpasang.</span>';
    board.hand.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'playing-card' + (board.selected === c.cid ? ' selected' : '');
      b.setAttribute('data-cid', c.cid);
      b.textContent = c.label;
      b.disabled = board.locked;
      b.addEventListener('click', function () { onCardTap(c.cid); });
      hh.appendChild(b);
    });
    $('btn-check').disabled = !board.placed.every(function (c) { return !!c; }) || board.locked;
  }

  function findInHand(cid) {
    for (var i = 0; i < board.hand.length; i++) if (board.hand[i].cid === cid) return board.hand[i];
    return null;
  }

  function onCardTap(cid) {
    if (board.locked) return;
    board.selected = (board.selected === cid) ? null : cid;
    Sfx.click();
    renderBoard();
  }

  function onSlotTap(i) {
    if (board.locked) return;
    var cur = board.placed[i];
    if (board.selected) {
      var card = findInHand(board.selected);
      if (!card) { board.selected = null; renderBoard(); return; }
      if (cur) board.hand.push(cur);
      board.placed[i] = card;
      board.hand = board.hand.filter(function (c) { return c.cid !== card.cid; });
      board.selected = null;
      Sfx.click();
    } else if (cur) {
      board.hand.push(cur);
      board.placed[i] = null;
      Sfx.click();
    } else return;
    renderBoard();
  }

  function onReset() {
    if (board.locked) return;
    board.placed.forEach(function (c) { if (c) board.hand.push(c); });
    board.placed = board.placed.map(function () { return null; });
    board.selected = null;
    Sfx.click();
    renderBoard();
  }

  function startTimer() {
    stopTimer();
    var total = state.cfg.time;
    state.timeLeft = total;
    var lastTick = -1;
    var fill = $('timer-fill');
    fill.style.width = '100%';
    fill.classList.remove('danger');
    state.timerId = setInterval(function () {
      state.timeLeft -= 0.1;
      var pct = Math.max(0, state.timeLeft / total * 100);
      fill.style.width = pct + '%';
      if (pct < 35) {
        fill.classList.add('danger');
        var sec = Math.ceil(state.timeLeft);
        if (sec <= 10 && sec !== lastTick && sec > 0) { lastTick = sec; Sfx.tick(); }
      }
      if (state.timeLeft <= 0) { stopTimer(); onTimeout(); }
    }, 100);
  }
  function stopTimer() {
    if (state && state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  }

  function correctOrder() {
    var vals = board.cards.map(function (c) { return c.v; }).sort(function (a, b) { return a - b; });
    return vals;
  }

  function onTimeout() {
    if (state.answered) return;
    state.answered = true;
    board.locked = true;
    renderBoard();
    state.lives--; state.combo = 0;
    Sfx.wrong(); updateLives();
    showFeedback(false, '⏰ Waktu habis!',
      'Urutan yang benar: <b>' + correctOrder().map(fmtVal).join(' &lt; ') + '</b>.');
  }

  function fmtVal(v) {
    return Number.isInteger(v) ? prettyPlain(v) : (v < 0 ? '\u2212' : '') + Math.abs(v);
  }

  function onCheck() {
    if (state.answered || board.locked) return;
    state.answered = true;
    stopTimer();
    board.locked = true;
    var vals = board.placed.map(function (c) { return c.v; });
    var ok = true;
    for (var i = 1; i < vals.length; i++) if (vals[i - 1] >= vals[i]) { ok = false; break; }
    if (ok) {
      state.correct++; state.combo++;
      var bonus = state.combo >= 3 ? 50 * state.cfg.mult : 0;
      var pts = Math.round((100 + state.timeLeft * 2) * state.cfg.mult + bonus);
      state.score += pts;
      Sfx.correct();
      $('hud-combo').textContent = state.combo > 1 ? 'x' + state.combo : '–';
      $('hud-score').textContent = fmt(state.score);
      showFeedback(true, '✅ Tepat! +' + fmt(pts) + (state.combo >= 3 ? '  (kombo x' + state.combo + ' 🔥)' : ''), 'Urutanmu sempurna.');
    } else {
      state.lives--; state.combo = 0;
      Sfx.wrong(); updateLives();
      /* tandai posisi salah pertama */
      var badIdx = -1;
      for (var k = 1; k < vals.length; k++) if (vals[k - 1] >= vals[k]) { badIdx = k; break; }
      var slots = $('slots').children;
      if (badIdx > 0) { slots[badIdx - 1].classList.add('wrongmark'); slots[badIdx].classList.add('wrongmark'); }
      showFeedback(false, '❌ Belum tepat',
        'Urutan yang benar: <b>' + correctOrder().map(fmtVal).join(' &lt; ') + '</b>.<br>Ingat: semakin ke kiri garis bilangan, semakin kecil!');
    }
    renderBoard();
  }

  function showFeedback(ok, title, explainHtml) {
    var t = $('fb-title');
    t.textContent = title;
    t.className = 'fb-title ' + (ok ? 'ok' : 'bad');
    $('fb-explain').innerHTML = '<b>Pembahasan:</b> ' + explainHtml;
    $('feedback').classList.remove('hidden');
  }

  function next() {
    Sfx.click();
    if (state.lives <= 0) { finish(false); return; }
    state.idx++;
    if (state.idx >= state.puzzles.length) finish(state.correct >= state.cfg.pass);
    else renderPuzzle();
  }

  function finish(passed) {
    stopTimer();
    var cfg = state.cfg;
    var isLast = cfg.id === LEVELS.length;
    if (passed) {
      var prevBest = progress.best[cfg.id] || 0;
      var newBest = state.score > prevBest;
      if (newBest) progress.best[cfg.id] = state.score;
      if (!isLast) progress.unlocked = Math.max(progress.unlocked, cfg.id + 1);
      store.save(progress);
      saveStars();
      Sfx.win();
      if (isLast) {
        var totalBest = 0;
        for (var i = 0; i < LEVELS.length; i++) totalBest += progress.best[LEVELS[i].id] || 0;
        $('victory-stats').innerHTML =
          '<div class="stat-big">🏆</div>' +
          statRow('Level terakhir', state.correct + '/' + state.puzzles.length + ' benar') +
          statRow('Skor level ini', fmt(state.score)) +
          statRow('Total skor terbaik', fmt(totalBest)) +
          '<p class="stat-note">Kamu resmi menyandang gelar <b>Master Urutan</b>! 🎓</p>';
        show('screen-victory');
        return;
      }
      $('res-title').textContent = '🎉 Level ' + cfg.id + ' Lolos!';
      $('res-stats').innerHTML =
        '<div class="stat-big">' + cfg.icon + '</div>' +
        statRow('Jawaban benar', state.correct + ' / ' + state.puzzles.length) +
        statRow('Skor', fmt(state.score)) +
        (newBest ? statRow('Rekor', '⭐ Rekor baru!') : statRow('Skor terbaik', fmt(prevBest))) +
        '<p class="stat-note">Level ' + (cfg.id + 1) + ': <b>' + LEVELS[cfg.id].name + '</b> telah terbuka! 🔓</p>';
      $('btn-next-level').style.display = '';
    } else {
      $('res-title').textContent = state.lives <= 0 ? '💔 Nyawa Habis' : '😅 Belum Lolos';
      $('res-stats').innerHTML =
        '<div class="stat-big">' + (state.lives <= 0 ? '💔' : '📚') + '</div>' +
        statRow('Jawaban benar', state.correct + ' / ' + state.puzzles.length) +
        statRow('Syarat lolos', 'minimal ' + cfg.pass + ' benar') +
        statRow('Skor', fmt(state.score)) +
        '<p class="stat-note">Jangan menyerah! 💪</p>';
      $('btn-next-level').style.display = 'none';
    }
    show('screen-result');
  }

  function statRow(label, value) {
    return '<div class="stat-row"><span>' + label + '</span><b>' + value + '</b></div>';
  }

  $('btn-start').addEventListener('click', function () { Sfx.click(); renderLevels(); show('screen-levels'); });
  $('btn-back-start').addEventListener('click', function () { Sfx.click(); show('screen-start'); });
  $('btn-check').addEventListener('click', onCheck);
  $('btn-reset').addEventListener('click', onReset);
  $('btn-next').addEventListener('click', next);
  $('btn-retry').addEventListener('click', function () { Sfx.click(); startLevel(state.cfg.id); });
  $('btn-next-level').addEventListener('click', function () { Sfx.click(); startLevel(state.cfg.id + 1); });
  $('btn-to-levels').addEventListener('click', function () { Sfx.click(); renderLevels(); show('screen-levels'); });
  $('btn-again').addEventListener('click', function () { Sfx.click(); renderLevels(); show('screen-levels'); });
  $('btn-victory-levels').addEventListener('click', function () { Sfx.click(); renderLevels(); show('screen-levels'); });

  function refreshMuteBtn() {
    $('btn-mute').textContent = Sfx.isMuted() ? '🔇 Suara: Mati' : '🔊 Suara: Nyala';
  }
  $('btn-mute').addEventListener('click', function () {
    var m = !Sfx.isMuted();
    Sfx.setMuted(m); progress.muted = m; store.save(progress);
    refreshMuteBtn();
    if (!m) Sfx.click();
  });
  refreshMuteBtn();
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
})();
