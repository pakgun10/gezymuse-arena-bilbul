/* =====================================================================
 * Rasio Rush — efek suara sederhana via Web Audio API (tanpa file audio)
 * ===================================================================== */
'use strict';

var Sfx = (function () {
  var ctx = null;
  var muted = false;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, delay) {
    if (muted) return;
    try {
      var c = ac();
      if (!c) return;
      var t0 = c.currentTime + (delay || 0);
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch (e) { /* abaikan: audio tidak tersedia */ }
  }

  return {
    click: function () { beep(440, 0.07); },
    correct: function () {
      beep(523, 0.12); beep(659, 0.12, 'sine', 0.1); beep(784, 0.22, 'sine', 0.2);
    },
    wrong: function () { beep(196, 0.28, 'sawtooth'); },
    tick: function () { beep(880, 0.05, 'square'); },
    win: function () {
      var notes = [523, 659, 784, 1047, 784, 1047];
      for (var i = 0; i < notes.length; i++) beep(notes[i], 0.18, 'sine', i * 0.13);
    },
    setMuted: function (m) { muted = !!m; },
    isMuted: function () { return muted; }
  };
})();
