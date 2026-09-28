// HumFut site: tutorial player, hero Pad loop, scroll reveals.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- Scroll reveals ----------
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ---------- Hero: fire Pads in turn ----------
  var heroPads = document.querySelectorAll('#hero-pads .pad');
  var heroToast = document.getElementById('hero-toast');
  if (heroPads.length) {
    var order = [0, 1, 4, 2, 5, 3];
    var h = 0;
    var fire = function () {
      heroPads.forEach(function (p) { p.classList.remove('is-firing'); });
      var pad = heroPads[order[h % order.length]];
      pad.classList.add('is-firing');
      if (heroToast) heroToast.textContent = pad.getAttribute('data-name');
      h += 1;
    };
    fire();
    if (!reduceMotion.matches) setInterval(fire, 2200);
  }

  // ---------- Tutorials ----------
  function Tutorial(root) {
    this.root = root;
    this.steps = Array.prototype.slice.call(root.querySelectorAll('.step'));
    this.scenes = Array.prototype.slice.call(root.querySelectorAll('.scene'));
    this.toggle = root.querySelector('.js-toggle');
    this.status = root.querySelector('.js-status');
    this.index = 0;
    this.timer = null;
    this.visible = false;
    this.userPaused = reduceMotion.matches;
    var self = this;

    this.steps.forEach(function (step, i) {
      step.setAttribute('tabindex', '0');
      step.setAttribute('role', 'button');
      step.addEventListener('click', function () { self.go(i, true); });
      step.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.go(i, true); }
      });
    });
    if (this.toggle) {
      this.toggle.addEventListener('click', function () {
        self.userPaused = !self.userPaused;
        self.schedule();
        self.renderControls();
      });
    }
    this.go(0, false);
    this.renderControls();
  }

  Tutorial.prototype.go = function (i, fromUser) {
    var self = this;
    this.index = i;
    this.steps.forEach(function (step, n) {
      step.classList.toggle('is-active', n === i);
      step.classList.toggle('is-done', n < i);
      step.setAttribute('aria-current', n === i ? 'step' : 'false');
      step.style.setProperty('--dur', (step.getAttribute('data-dur') || 3000) + 'ms');
      // Restart the progress bar animation.
      var bar = step.querySelector('.bar');
      if (bar && n === i) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
    });
    var cap = this.root.querySelector('.tut-caption');
    if (cap) {
      cap.querySelector('.js-cap-n').textContent = 'Step ' + (i + 1) + ' of ' + this.steps.length;
      cap.querySelector('.js-cap-t').textContent = this.steps[i].querySelector('strong').textContent;
    }
    this.scenes.forEach(function (scene, n) {
      scene.classList.toggle('is-on', n === i);
      scene.classList.toggle('is-past', n < i);
    });
    self.schedule();
  };

  Tutorial.prototype.schedule = function () {
    var self = this;
    clearTimeout(this.timer);
    var running = this.visible && !this.userPaused && !this.root.hidden;
    this.root.classList.toggle('is-paused', !running);
    if (!running) return;
    var dur = parseInt(this.steps[this.index].getAttribute('data-dur'), 10) || 3000;
    this.timer = setTimeout(function () {
      var next = self.index + 1;
      if (next >= self.steps.length) {
        // Hold the last scene a moment longer, then start over.
        self.timer = setTimeout(function () { self.go(0, false); }, 1400);
        return;
      }
      self.go(next, false);
    }, dur);
  };

  Tutorial.prototype.renderControls = function () {
    if (!this.toggle) return;
    var paused = this.userPaused;
    this.toggle.querySelector('span').textContent = paused ? 'Play' : 'Pause';
    this.toggle.querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
    this.toggle.setAttribute('aria-label', paused ? 'Play the walkthrough' : 'Pause the walkthrough');
    if (this.status) this.status.textContent = paused ? 'Tap a step to see it' : 'Playing step by step';
  };

  var tutorials = Array.prototype.slice.call(document.querySelectorAll('[data-tutorial]')).map(function (el) {
    return new Tutorial(el);
  });

  if ('IntersectionObserver' in window) {
    var tutObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        tutorials.forEach(function (t) {
          if (t.root === entry.target) { t.visible = entry.isIntersecting; t.schedule(); }
        });
      });
    }, { threshold: 0.35 });
    tutorials.forEach(function (t) { tutObserver.observe(t.root); });
  } else {
    tutorials.forEach(function (t) { t.visible = true; t.schedule(); });
  }

  // Tabs (roving tabindex, arrow keys).
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tut-tab'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.setAttribute('tabindex', on ? '0' : '-1');
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
    });
    tutorials.forEach(function (t) {
      if (!t.root.hidden) { t.go(0, false); } else { t.schedule(); }
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); selectTab(tabs[n], true); }
    });
  });

  // ---------- Music levels: gentle drift ----------
  var them = document.getElementById('lvl-them');
  var you = document.getElementById('lvl-you');
  if (them && you && !reduceMotion.matches) {
    var levels = [[42, 24], [58, 30], [35, 18], [48, 26]];
    var l = 0;
    setInterval(function () {
      l = (l + 1) % levels.length;
      them.style.setProperty('--v', levels[l][0] + '%');
      you.style.setProperty('--v', levels[l][1] + '%');
    }, 2600);
  }
})();
