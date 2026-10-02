/* =====================================================================
 * Duel Operasi — duel vs Bot Hitung, best-of-3 ronde
 * ===================================================================== */
'use strict';

function fmt(n) { return Number(n).toLocaleString('id-ID'); }

(function () {
  function $(id) { return document.getElementById(id); }

  var SCREENS = ['screen-start', 'screen-duel', 'screen-round', 'screen-end'];
  function show(id) {
    SCREENS.forEach(function (s) { $(s).classList.toggle('active', s === id); });
    window.scrollTo(0, 0);
  }

  var DMG = 15;
  var ROUNDS = [
    { n: 1, name: 'Pemanasan', desc: 'Penjumlahan & pengurangan', time: 20 },
    { n: 2, name: 'Kali Bagi', desc: 'Perkalian & pembagian', time: 20 },
    { n: 3, name: 'Bos Hitung', desc: 'Campuran sulit!', time: 15 }
  ];

  var muted = false;
  try { muted = JSON.parse(localStorage.getItem('duelOperasi') || '{}').muted || false; } catch (e) {}
  Sfx.setMuted(muted);

  var wins = 0;
  try { wins = parseInt(localStorage.getItem('arena-bilangan:duel'), 10) || 0; } catch (e) {}
  wins = Math.max(0, Math.min(3, wins));

  var D = null; /* duel state */

  var TAUNTS_HIT = ['Seranganmu telak! 💥', 'Bot Hitung terhuyung! 🌀', 'Kena! −' + DMG + ' HP! ⚡'];
  var TAUNTS_MISS = ['Bot Hitung menyerang balik! 🤖💢', 'Aduh, kena serangan! 😖', 'Fokus! Bot makin percaya diri 😤'];
  var TAUNTS_TIMEOUT = ['Terlalu lama berpikir! ⏰', 'Bot tidak menunggu! 🤖'];

  function pickA(a) { return a[Math.floor(Math.random() * a.length)]; }

  function startDuel() {
    D = {
      roundIdx: 0, qIdx: 0,
      roundWins: 0, roundLosses: 0,
      playerHP: 100, botHP: 100,
      questions: genRound(1),
      answered: false, timerId: null, timeLeft: 20,
      correctCount: 0, totalAnswered: 0
    };
    show('screen-duel');
    renderQuestion();
  }

  function setHP() {
    var p = Math.max(0, D.playerHP), b = Math.max(0, D.botHP);
    $('hp-player').style.width = p + '%';
    $('hp-bot').style.width = b + '%';
    $('hptext-player').textContent = p;
    $('hptext-bot').textContent = b;
    $('hp-player').classList.toggle('low', p <= 30);
    $('hp-bot').classList.toggle('low', b <= 30);
  }

  function renderQuestion() {
    var q = D.questions[D.qIdx];
    var R = ROUNDS[D.roundIdx];
    $('round-info').textContent = 'Ronde ' + R.n + ' (' + R.name + ') • Soal ' + (D.qIdx + 1) + '/8' +
      ' • 🏅 ' + D.roundWins + '–' + D.roundLosses;
    setHP();
    $('q-prompt').innerHTML = q.prompt;
    var box = $('q-choices');
    box.innerHTML = '';
    q.choices.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = c;
      b.addEventListener('click', function () { answer(i, b); });
      box.appendChild(b);
    });
    $('duel-msg').textContent = '';
    startTimer();
  }

  function startTimer() {
    stopTimer();
    var total = ROUNDS[D.roundIdx].time;
    D.timeLeft = total;
    var fill = $('timer-fill');
    fill.style.width = '100%';
    fill.classList.remove('danger');
    D.timerId = setInterval(function () {
      D.timeLeft -= 0.1;
      var pct = Math.max(0, D.timeLeft / total * 100);
      fill.style.width = pct + '%';
      if (pct < 35) fill.classList.add('danger');
      if (D.timeLeft <= 0) { stopTimer(); answer(-1, null); }
    }, 100);
  }
  function stopTimer() {
    if (D && D.timerId) { clearInterval(D.timerId); D.timerId = null; }
  }

  function hitAnim(who) {
    var f = $(who === 'bot' ? 'fighter-bot' : 'fighter-player');
    f.classList.remove('hit');
    void f.offsetWidth;
    f.classList.add('hit');
  }

  function answer(i, btn) {
    if (!D || D.answered) return;
    D.answered = true;
    stopTimer();
    var q = D.questions[D.qIdx];
    var ok = (i === q.answer);
    D.totalAnswered++;
    var buttons = $('q-choices').children;
    for (var k = 0; k < buttons.length; k++) {
      buttons[k].disabled = true;
      if (k === q.answer) buttons[k].classList.add('correct');
    }
    if (btn && !ok) btn.classList.add('wrong');

    var msg = $('duel-msg');
    if (ok) {
      D.correctCount++;
      D.botHP = Math.max(0, D.botHP - DMG);
      Sfx.correct();
      hitAnim('bot');
      msg.textContent = pickA(TAUNTS_HIT) + '  (' + q.explain.replace(/<[^>]*>/g, '') + ')';
      msg.className = 'duel-msg good';
    } else {
      D.playerHP = Math.max(0, D.playerHP - DMG);
      Sfx.wrong();
      hitAnim('player');
      msg.textContent = (i === -1 ? pickA(TAUNTS_TIMEOUT) + ' ' : pickA(TAUNTS_MISS) + ' ') +
        'Jawaban benar: ' + q.choices[q.answer] + '.';
      msg.className = 'duel-msg bad';
    }
    setHP();
    setTimeout(next, 1400);
  }

  function next() {
    if (D.playerHP <= 0 || D.botHP <= 0 || D.qIdx + 1 >= D.questions.length) {
      endRound();
      return;
    }
    D.qIdx++;
    D.answered = false;
    renderQuestion();
  }

  function endRound() {
    stopTimer();
    var playerWonRound = D.botHP < D.playerHP || D.botHP <= 0;
    /* seri HP -> ronde untuk pemain bila tidak KO */
    if (D.playerHP <= 0 && D.botHP <= 0) playerWonRound = false;
    else if (D.playerHP <= 0) playerWonRound = false;
    else if (D.botHP <= 0) playerWonRound = true;

    if (playerWonRound) D.roundWins++; else D.roundLosses++;

    var matchOver = D.roundWins >= 2 || D.roundLosses >= 2;
    if (matchOver) { endMatch(D.roundWins >= 2); return; }

    $('round-emoji').textContent = playerWonRound ? '🎉' : '😅';
    $('round-title').textContent = playerWonRound ? 'Ronde ' + ROUNDS[D.roundIdx].n + ' Menang!' : 'Ronde ' + ROUNDS[D.roundIdx].n + ' Kalah';
    $('round-sub').textContent = 'Skor ronde: 🏅 ' + D.roundWins + ' – ' + D.roundLosses;
    var R = ROUNDS[D.roundIdx + 1];
    $('round-stats').innerHTML =
      statRow('Ronde berikutnya', '<b>' + R.n + ': ' + R.name + '</b>') +
      statRow('Materi', R.desc) +
      statRow('Waktu/soal', R.time + ' detik') +
      '<p class="stat-note">HP pulih penuh. Siapkan strategimu! 💪</p>';
    $('btn-next-round').textContent = 'Masuk Ronde ' + R.n + ' →';
    show('screen-round');
    if (playerWonRound) Sfx.win(); else Sfx.wrong();
  }

  function endMatch(won) {
    if (won) {
      wins = Math.min(3, wins + 1);
      try { localStorage.setItem('arena-bilangan:duel', String(wins)); } catch (e) {}
      Sfx.win();
    } else {
      Sfx.wrong();
    }
    $('end-emoji').textContent = won ? '🏆' : '🤖';
    $('end-title').textContent = won ? 'Kemenangan!' : 'Bot Menang…';
    $('end-sub').textContent = won
      ? 'Kamu mengalahkan Bot Hitung ' + D.roundWins + '–' + D.roundLosses + '!'
      : 'Bot Hitung menang ' + D.roundLosses + '–' + D.roundWins + '. Coba lagi!';
    $('end-stats').innerHTML =
      statRow('Jawaban benar', D.correctCount + ' / ' + D.totalAnswered) +
      statRow('Total kemenangan', '🏅 ' + wins + ' duel') +
      statRow('Bintang Arena', '⭐'.repeat(wins) + '☆'.repeat(3 - wins)) +
      (won ? '<p class="stat-note">Luar biasa! Pertahankan! 🎓</p>'
           : '<p class="stat-note">Pelajari lagi operasi bilangan negatif, lalu tantang lagi! 💪</p>');
    show('screen-end');
  }

  function statRow(label, value) {
    return '<div class="stat-row"><span>' + label + '</span><b>' + value + '</b></div>';
  }

  $('btn-start').addEventListener('click', function () { Sfx.click(); startDuel(); });
  $('btn-next-round').addEventListener('click', function () {
    Sfx.click();
    D.roundIdx++;
    D.qIdx = 0;
    D.playerHP = 100; D.botHP = 100;
    D.questions = genRound(D.roundIdx + 1);
    D.answered = false;
    show('screen-duel');
    renderQuestion();
  });
  $('btn-rematch').addEventListener('click', function () { Sfx.click(); startDuel(); });
  $('btn-end-arena').addEventListener('click', function () { window.location.href = '../'; });

  function refreshMuteBtn() {
    $('btn-mute').textContent = Sfx.isMuted() ? '🔇 Suara: Mati' : '🔊 Suara: Nyala';
  }
  $('btn-mute').addEventListener('click', function () {
    var m = !Sfx.isMuted();
    Sfx.setMuted(m);
    try { localStorage.setItem('duelOperasi', JSON.stringify({ muted: m })); } catch (e) {}
    refreshMuteBtn();
    if (!m) Sfx.click();
  });
  refreshMuteBtn();
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
})();
