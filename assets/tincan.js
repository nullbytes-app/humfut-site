// How it works: your iPhone and Mom's, joined by a cord that is the call. Your voice keeps the cord
// humming; tapping a Pad plays the real sound and sends a live pulse down the cord to Mom's phone.
(function () {
  var tc = document.querySelector('[data-tincan]');
  if (!tc) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = tc.querySelector('.tc-cord'), g = cv.getContext('2d');
  var you = tc.querySelector('.tc-you .tc-phone'), them = tc.querySelector('.tc-them .tc-phone');
  var word = tc.querySelector('.tc-word'), hearsT = tc.querySelector('.tc-hears-t'), time = tc.querySelector('.tc-time');
  var mute = tc.querySelector('.tc-mute');
  var phone = window.HumFutPhone, screen = tc.querySelector('.tc-you .screen');
  var power = tc.querySelector('.tc-power'), stopBtn = tc.querySelector('.tc-stop'), hint = tc.querySelector('.tc-hint-t');
  var HINT = hint.textContent, on = true, touched = false, inView = false, hintT = null;
  var N = 56, off = new Float32Array(N), vel = new Float32Array(N), pulses = [], ptr = null, W = 0, H = 0, dpr = 1, A, B;

  var ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  function setMute(m) { phone.muted = m; mute.setAttribute('aria-pressed', m ? 'true' : 'false'); mute.innerHTML = (m ? ICON_OFF : ICON_ON) + (m ? 'Sound off' : 'Sound on'); if (m) phone.stop(); }
  setMute(false);
  mute.addEventListener('click', function () { setMute(!phone.muted); });

  // Turn Off / Turn On, as in the app's dock. Off, a Pad still plays on your own speaker but nothing goes into the call.
  function note(text) {
    clearTimeout(hintT);
    hint.textContent = text || HINT; hint.classList.toggle('is-note', !!text);
    if (text) hintT = setTimeout(function () { note(null); }, 3800);
  }
  function setOn(v) {
    on = v; tc.classList.toggle('is-off', !on);
    power.textContent = on ? 'Turn Off' : 'Turn On'; power.setAttribute('aria-pressed', on ? 'true' : 'false');
    phone.status(screen, on, null);
    if (!on) { tc.classList.remove('is-heard'); word.classList.remove('is-on'); note('Call Sounds is off. Tap a Pad: only you will hear it.'); } else note('Call Sounds is on. Mom hears your Pads again.');
  }
  power.addEventListener('click', function () { touched = true; setOn(!on); });
  stopBtn.addEventListener('click', function () {
    phone.stop(); pulses = []; tc.classList.remove('is-heard', 'is-sending');
    tc.querySelectorAll('.tc-pad.is-firing').forEach(function (p) { p.classList.remove('is-firing'); });
    phone.status(screen, on, null);
  });


  // ---- geometry ----
  function size() {
    var r = tc.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.width = Math.round(r.width * dpr); H = cv.height = Math.round(r.height * dpr);
    var a = you.getBoundingClientRect(), b = them.getBoundingClientRect();
    A = { x: (a.right - r.left - 6) * dpr, y: (a.top - r.top + a.height * .58) * dpr };
    B = { x: (b.left - r.left + 6) * dpr, y: (b.top - r.top + b.height * .58) * dpr };
    if (reduce) draw(performance.now());
  }
  function base(t) { // a gently sagging cord
    var sag = Math.min(46, (B.x - A.x) * .12) * dpr;
    return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t + sag * 4 * t * (1 - t) };
  }

  // ---- the call ----
  var talking = false, talkUntil = 0, nextTalk = 0;
  function voice(now) {
    if (now > (talking ? talkUntil : nextTalk)) {
      talking = !talking;
      if (talking) talkUntil = now + 1800 + Math.random() * 1800; else nextTalk = now + 900 + Math.random() * 1200;
      tc.classList.toggle('is-talking', talking);
    }
    // a syllable-ish wobble; smaller on a short cord
    var amp = Math.min(1, (B.x - A.x) / (300 * dpr)) * dpr;
    if (talking) off[1] = (Math.sin(now / 70) * 3 + Math.sin(now / 43) * 1.8) * amp * (.75 + .25 * Math.sin(now / 260));
    else off[1] *= .9;
  }
  function step(now) {
    if (!reduce) voice(now);
    for (var k = 2; k < N - 1; k++) vel[k] = (vel[k] + ((off[k - 1] + off[k + 1]) / 2 - off[k]) * .55) * .985;
    for (k = 2; k < N - 1; k++) off[k] += vel[k];
    for (k = 2; k < N - 1; k++) off[k] = off[k] * .8 + (off[k - 1] + off[k + 1]) * .1;
    if (ptr) {
      var t = (ptr.x - A.x) / (B.x - A.x), i = Math.round(t * (N - 1));
      if (i > 1 && i < N - 2) { var by = base(t).y; if (Math.abs(ptr.y - by - off[i]) < 36 * dpr) { off[i] = Math.max(-60 * dpr, Math.min(60 * dpr, ptr.y - by)); vel[i] = 0; } }
    }
  }
  function draw(now) {
    g.clearRect(0, 0, W, H);
    if (!A || B.x - A.x < 20) return;
    var ink = getComputedStyle(tc).getPropertyValue('--muted') || '#888';
    g.lineWidth = 3 * dpr; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = ink;
    g.beginPath();
    for (var k = 0; k < N; k++) { var p = base(k / (N - 1)); k ? g.lineTo(p.x, p.y + off[k]) : g.moveTo(p.x, p.y); }
    g.stroke();
    var live = getComputedStyle(tc).getPropertyValue('--live');
    pulses.forEach(function (q) {
      var f = Math.min(q.stopAt || 1, q.p), i = Math.round(f * (N - 1)), p = base(f);
      g.save(); g.shadowColor = live; g.shadowBlur = 18 * dpr; g.fillStyle = live;
      if (q.stopAt) { g.globalAlpha = Math.max(0, 1 - (q.p - q.stopAt) / .35); g.shadowBlur = 0; g.fillStyle = ink; }
      g.beginPath(); g.ellipse(p.x, p.y + off[i], 15 * dpr, 9 * dpr, 0, 0, 7); g.fill(); g.restore();
    });
  }
  function loop(now) {
    if (inView && !document.hidden) {
      step(now);
      pulses = pulses.filter(function (q) {
        q.p = (now - q.t0) / 420;
        var i = Math.max(1, Math.min(N - 2, Math.round(q.p * (N - 1))));
        if (q.stopAt) return q.p < q.stopAt + .35; // Call Sounds is off: it never leaves your phone
        vel[i] -= 3.2 * dpr;
        if (q.p >= 1) { arrive(q); return false; }
        return true;
      });
      draw(now);
    }
    requestAnimationFrame(loop);
  }

  var heardTimer = null;
  function arrive(q) {
    hearsT.textContent = 'Hearing ' + q.name;
    tc.classList.add('is-heard');
    word.textContent = q.name; word.classList.remove('is-on'); void word.offsetWidth; word.classList.add('is-on');
    clearTimeout(heardTimer);
    heardTimer = setTimeout(function () { tc.classList.remove('is-heard', 'is-sending'); }, q.dur);
  }
  var statusT = null;
  function send(pad, withSound) {
    var name = pad.dataset.name, dur = withSound ? phone.play(pad.dataset.sound) : 1900;
    tc.querySelectorAll('.tc-pad.is-firing').forEach(function (p) { if (p !== pad) p.classList.remove('is-firing'); });
    phone.fire(pad, dur);
    phone.status(screen, on, on ? name : null);
    clearTimeout(statusT); statusT = setTimeout(function () { phone.status(screen, on, null); }, dur);
    var q = { name: name, dur: dur, t0: performance.now(), p: 0 };
    if (!on) {
      note('Only you heard ' + name + '. Call Sounds is off, so Mom hears nothing.');
      if (!reduce) { q.stopAt = .12; pulses.push(q); }
      return;
    }
    tc.classList.add('is-sending');
    if (reduce) arrive(q); else pulses.push(q);
  }
  tc.querySelectorAll('.tc-pad').forEach(function (pad) {
    pad.addEventListener('click', function () { touched = true; send(pad, true); });
    pad.addEventListener('pointerenter', function () { phone.preload(pad.dataset.sound); }, { once: true });
  });

  // Pluck the cord.
  function pos(ev) { var r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * dpr, y: (ev.clientY - r.top) * dpr }; }
  tc.addEventListener('pointermove', function (ev) { if (ev.target === cv || ev.target === tc) ptr = pos(ev); else ptr = null; });
  tc.addEventListener('pointerleave', function () { ptr = null; });

  // Until the visitor taps, the call demos itself, silently.
  var n = 0, pads = tc.querySelectorAll('.tc-pad');
  if (!reduce) setInterval(function () { if (inView && !touched && on && !document.hidden) send(pads[n++ % pads.length], false); }, 4200);
  var secs = 192;
  setInterval(function () { if (inView) { secs++; time.textContent = Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2); } }, 1000);

  new IntersectionObserver(function (e) { inView = e[0].isIntersecting; if (inView) { size(); setTimeout(size, 900); } }, { threshold: .15 }).observe(tc);
  addEventListener('resize', size);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  size();
  if (!reduce) requestAnimationFrame(loop);
})();
