/*
 * HumFut site effects: Sonar Grid background, blur-in headline, shiny kicker,
 * spotlight cards, magnetic App Store buttons.
 *
 * Sonar Grid is HumFut's own canvas implementation, modelled on the
 * "sonar-grid" background described on 21st.dev (dot grid, rings where you
 * tap, ambient pings). Its pointer tint follows React Bits' DotGrid.
 *
 * BlurText, ShinyText, SpotlightCard, Magnet and DotGrid are ported to plain
 * JavaScript from React Bits (https://github.com/DavidHDev/react-bits),
 * used here as part of this website only:
 *
 *   MIT + Commons Clause License Condition v1.0
 *   Copyright (c) 2026 David Haz
 *
 * Every colour is read from the design-system tokens in tokens.css. With
 * prefers-reduced-motion nothing moves: the grid draws once and stays still.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
  }
  function rgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128];
  }

  // ---------- Sonar Grid ----------
  var GAP = 24;          // dot pitch, px (space-24)
  var DOT = 1.6;         // dot radius, px
  var SPEED = 300;       // ring speed, px per second
  var BAND = 26;         // how wide the lit band of a ring is, px
  var PROXIMITY = 130;   // pointer tint radius, px (DotGrid proximity)

  function SonarGrid(host, source) {
    this.host = host;
    this.source = source;           // element rings come from when pinging
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sonar-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(this.canvas, host.firstChild);
    this.ctx = this.canvas.getContext('2d');
    this.rings = [];
    this.pointer = { x: -9999, y: -9999 };
    this.visible = false;
    this.raf = 0;
    this.last = 0;
    this.readColors();
    this.resize();
    var self = this;

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { self.resize(); self.drawOnceIfStill(); }).observe(host);
    } else {
      window.addEventListener('resize', function () { self.resize(); self.drawOnceIfStill(); });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        self.visible ? self.start() : self.stop();
      }).observe(host);
    } else {
      this.visible = true;
      this.start();
    }
    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      self.pointer.x = e.clientX - r.left;
      self.pointer.y = e.clientY - r.top;
    });
    host.addEventListener('pointerleave', function () { self.pointer.x = self.pointer.y = -9999; });
    host.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a, button')) return;
      var r = host.getBoundingClientRect();
      self.ping(e.clientX - r.left, e.clientY - r.top);
    });
    var scheme = window.matchMedia('(prefers-color-scheme: dark)');
    var recolor = function () { self.readColors(); self.drawOnceIfStill(); };
    if (scheme.addEventListener) scheme.addEventListener('change', recolor);
    new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // One ring already in flight at first paint.
    this.pingFromSource(170);
    this.drawOnceIfStill();
  }

  SonarGrid.prototype.readColors = function () {
    this.base = rgb(token('fog'));
    this.active = rgb(token('accent'));
  };

  SonarGrid.prototype.resize = function () {
    var r = this.host.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.maxR = Math.hypot(r.width, r.height) * 0.75;
  };

  SonarGrid.prototype.sourcePoint = function () {
    if (!this.source) return { x: this.w / 2, y: this.h / 2 };
    var a = this.source.getBoundingClientRect(), b = this.host.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
  };

  SonarGrid.prototype.ping = function (x, y, startR) {
    if (reduce.matches) return;
    this.rings.push({ x: x, y: y, r: startR || 0 });
    if (this.rings.length > 6) this.rings.shift();
    this.start();
  };

  SonarGrid.prototype.pingFromSource = function (startR) {
    var p = this.sourcePoint();
    this.ping(p.x, p.y, startR);
  };

  SonarGrid.prototype.start = function () {
    if (reduce.matches || !this.visible || this.raf || document.hidden) return;
    var self = this;
    this.last = performance.now();
    var tick = function (now) {
      var dt = Math.min(0.05, (now - self.last) / 1000);
      self.last = now;
      self.rings.forEach(function (ring) { ring.r += SPEED * dt; });
      self.rings = self.rings.filter(function (ring) { return ring.r < self.maxR; });
      self.draw();
      self.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };

  SonarGrid.prototype.stop = function () {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  SonarGrid.prototype.drawOnceIfStill = function () {
    if (!this.raf) this.draw();
  };

  SonarGrid.prototype.draw = function () {
    var ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);
    var cols = Math.ceil(w / GAP) + 1, rows = Math.ceil(h / GAP) + 1;
    var ox = (w - (cols - 1) * GAP) / 2, oy = (h - (rows - 1) * GAP) / 2;
    var base = this.base, act = this.active, rings = this.rings, maxR = this.maxR;
    var px = this.pointer.x, py = this.pointer.y, prox2 = PROXIMITY * PROXIMITY;
    var cx = w / 2, cy = h * 0.55, fadeR = Math.max(w, h) * 0.62;

    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var x = ox + i * GAP, y = oy + j * GAP;
        // Fade the grid out toward the edges so it never frames the page.
        var edge = 1 - Math.min(1, Math.hypot(x - cx, (y - cy) * 1.3) / fadeR);
        if (edge <= 0) continue;
        var t = 0;
        for (var k = 0; k < rings.length; k++) {
          var d = Math.hypot(x - rings[k].x, y - rings[k].y) - rings[k].r;
          if (d > -BAND * 2 && d < BAND * 2) {
            var hit = Math.exp(-(d * d) / (BAND * BAND)) * (1 - rings[k].r / maxR);
            if (hit > t) t = hit;
          }
        }
        var dx = x - px, dy = y - py, dsq = dx * dx + dy * dy;
        if (dsq < prox2) t = Math.max(t, (1 - Math.sqrt(dsq) / PROXIMITY) * 0.8);
        var a = edge * (0.34 + 0.6 * t);
        var r = Math.round(base[0] + (act[0] - base[0]) * t);
        var g = Math.round(base[1] + (act[1] - base[1]) * t);
        var b = Math.round(base[2] + (act[2] - base[2]) * t);
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, DOT + t * 1.1, 0, 6.2832);
        ctx.fill();
      }
    }
    // The ring itself: a hairline in accent that thins as it travels.
    for (var q = 0; q < rings.length; q++) {
      var life = 1 - rings[q].r / maxR;
      ctx.strokeStyle = 'rgba(' + act[0] + ',' + act[1] + ',' + act[2] + ',' + (0.22 * life).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rings[q].x, rings[q].y, rings[q].r, 0, 6.2832);
      ctx.stroke();
    }
  };

  var grids = [];
  var hero = document.querySelector('.hero');
  if (hero) {
    var heroGrid = new SonarGrid(hero, hero.querySelector('.hero-stage .phone'));
    grids.push(heroGrid);
    // A ring leaves the phone every time a hero Pad fires (site.js sends this).
    document.addEventListener('humfut:pad-fired', function () { heroGrid.pingFromSource(); });
  }
  var closing = document.querySelector('.closing');
  if (closing) {
    var closingGrid = new SonarGrid(closing, closing.querySelector('.hf-store'));
    grids.push(closingGrid);
    if (!reduce.matches) setInterval(function () { closingGrid.pingFromSource(); }, 3200);
  }
  document.addEventListener('visibilitychange', function () {
    grids.forEach(function (g) { document.hidden ? g.stop() : g.start(); });
  });

  if (reduce.matches) return;

  // ---------- BlurText: hero headline words blur into focus ----------
  var h1 = document.querySelector('.hero h1');
  if (h1 && !h1.querySelector('.blur-word')) {
    var words = h1.textContent.trim().split(/\s+/);
    h1.setAttribute('aria-label', h1.textContent.trim());
    h1.textContent = '';
    words.forEach(function (word, i) {
      var span = document.createElement('span');
      span.className = 'blur-word';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--i', i);
      span.textContent = word;
      h1.appendChild(span);
      if (i < words.length - 1) h1.appendChild(document.createTextNode(' '));
    });
  }

  // ---------- ShinyText: kicker badges ----------
  document.querySelectorAll('.hf-kicker').forEach(function (el) {
    if (el.querySelector('.shine')) return;
    var s = document.createElement('span');
    s.className = 'shine';
    s.textContent = el.textContent;
    el.textContent = '';
    el.appendChild(s);
  });

  if (!finePointer.matches) return;

  // ---------- SpotlightCard: feature cards ----------
  document.querySelectorAll('.hf-feature').forEach(function (card) {
    card.classList.add('spotlight');
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // ---------- Magnet: App Store buttons in hero, price and closing ----------
  var magnets = document.querySelectorAll('.hx-actions .hf-store, .price .hf-store, .closing .hf-store');
  var PAD = 60, STRENGTH = 6;
  window.addEventListener('pointermove', function (e) {
    magnets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var inside = Math.abs(e.clientX - cx) < r.width / 2 + PAD && Math.abs(e.clientY - cy) < r.height / 2 + PAD;
      el.classList.toggle('is-pulled', inside);
      el.style.transform = inside
        ? 'translate3d(' + ((e.clientX - cx) / STRENGTH).toFixed(1) + 'px,' + ((e.clientY - cy) / STRENGTH).toFixed(1) + 'px,0)'
        : '';
    });
  }, { passive: true });
})();
