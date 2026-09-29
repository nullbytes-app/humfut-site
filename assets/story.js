// HumFut home page story: pauses scenes that are off screen, runs the Feature
// Board (every feature is a Pad), and lets board links open a tutorial tab.
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- Scenes run only while on screen ----------
  var scenes = document.querySelectorAll('[data-inview]');
  if ('IntersectionObserver' in window) {
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('in-view', entry.isIntersecting);
        entry.target.dispatchEvent(new CustomEvent('inview', { detail: entry.isIntersecting }));
      });
    }, { threshold: 0.2 });
    scenes.forEach(function (el) { watch.observe(el); });
  } else {
    scenes.forEach(function (el) { el.classList.add('in-view'); });
  }

  // ---------- Links that open a tutorial tab ----------
  document.querySelectorAll('[data-open-tab]').forEach(function (link) {
    link.addEventListener('click', function () {
      var tab = document.getElementById(link.getAttribute('data-open-tab'));
      if (tab) tab.click();
    });
  });

  // ---------- Feature Board ----------
  var board = document.querySelector('[data-board]');
  if (!board) return;
  var pads = Array.prototype.slice.call(board.querySelectorAll('.hf-bpad'));
  var details = Array.prototype.slice.call(board.querySelectorAll('.hf-detail'));
  var panel = board.querySelector('.hf-board-panel');
  var lane = board.querySelector('.hf-lane');
  var strip = board.querySelector('.hf-callstrip');
  var clock = strip && strip.querySelector('time');
  var toggle = board.parentNode.querySelector('.js-board-toggle');
  var status = board.parentNode.querySelector('.js-board-status');
  var current = -1, timer = 0, soundTimer = 0, userTook = false, paused = reduce.matches, visible = false;
  var seconds = 4 * 60 + 12;

  function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r; }

  function addChip(pad) {
    if (!lane) return;
    var li = document.createElement('li');
    li.className = 'hf-chip is-new';
    li.style.setProperty('--pad', 'var(--' + pad.getAttribute('data-pad') + ')');
    li.innerHTML = '<span class="hf-chip-swatch"></span><b></b><span class="hf-chip-meta">into the call</span>';
    li.querySelector('b').textContent = pad.getAttribute('data-sound');
    lane.insertBefore(li, lane.firstChild);
    lane.querySelectorAll('.hf-chip').forEach(function (chip, n) {
      if (n > 0) chip.classList.remove('is-new');
      if (n > 2) chip.remove();
    });
  }

  function select(i, fromUser) {
    var pad = pads[i];
    if (!pad) return;
    current = i;
    pads.forEach(function (p, n) {
      var on = n === i;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
      var ai = p.querySelector('.hf-ai');
      if (ai) {
        ai.classList.toggle('is-looping', on && !reduce.matches);
        ai.classList.remove('is-playing');
      }
    });
    if (!reduce.matches) {
      pad.classList.remove('is-firing');
      void pad.offsetWidth;
      pad.classList.add('is-firing');
      if (strip) {
        strip.classList.add('is-sounding');
        clearTimeout(soundTimer);
        soundTimer = setTimeout(function () { strip.classList.remove('is-sounding'); }, 1600);
      }
    }
    var id = pad.getAttribute('data-feature');
    details.forEach(function (d) {
      var on = d.getAttribute('data-for') === id;
      d.hidden = !on;
      d.classList.toggle('is-new', on && !reduce.matches);
      if (on && window.HumFutIcons) d.querySelectorAll('.hf-ai').forEach(window.HumFutIcons.play);
    });
    addChip(pad);
    if (fromUser) {
      // On narrow screens the panel sits below the Pads: bring it into view.
      var r = panel.getBoundingClientRect();
      if (r.top > window.innerHeight - 120 || r.bottom < 80) {
        panel.scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
      }
      userTook = true;
      panel.setAttribute('aria-live', 'polite');
      stopDemo();
      if (status) status.textContent = 'Press any Pad';
      if (toggle) toggle.hidden = true;
    }
  }

  function tick() {
    if (!visible) return;
    seconds += 1;
    if (clock) clock.textContent = fmt(seconds);
  }
  setInterval(tick, 1000);

  function startDemo() {
    if (timer || paused || userTook || !visible) return;
    timer = setInterval(function () { select((current + 1) % pads.length, false); }, 4200);
  }
  function stopDemo() { clearInterval(timer); timer = 0; }

  board.addEventListener('inview', function (e) {
    visible = e.detail;
    visible ? startDemo() : stopDemo();
  });

  pads.forEach(function (pad, i) {
    pad.addEventListener('click', function () { select(i, true); });
  });

  // Number keys 1-9 press a Pad; arrow keys move between Pads.
  board.addEventListener('keydown', function (e) {
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= pads.length) { select(n - 1, true); pads[n - 1].focus(); e.preventDefault(); return; }
    var at = pads.indexOf(document.activeElement);
    if (at < 0) return;
    var cols = getComputedStyle(pads[0].parentNode).gridTemplateColumns.split(' ').length;
    var to = { ArrowRight: at + 1, ArrowLeft: at - 1, ArrowDown: at + cols, ArrowUp: at - cols }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    pads[Math.max(0, Math.min(pads.length - 1, to))].focus();
  });

  if (toggle) {
    toggle.addEventListener('click', function () {
      paused = !paused;
      toggle.textContent = paused ? 'Play demo' : 'Pause demo';
      if (status) status.textContent = paused ? 'Demo paused' : 'Playing a demo';
      paused ? stopDemo() : startDemo();
    });
    if (reduce.matches) {
      toggle.hidden = true;
      if (status) status.textContent = 'Press any Pad';
    }
  }

  board.classList.add('is-ready');
  select(0, false);
  if (!('IntersectionObserver' in window)) { visible = true; startDemo(); }
})();
