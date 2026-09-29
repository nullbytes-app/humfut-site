// HumFut hero: a giant sound word; scrolling raises an iPhone on a call that fires Applause,
// then "Mom heard that." Each new word and each beat after the Pad fires sends a Sonar Grid ring.
(function () {
  var hero = document.querySelector('[data-hx]');
  var word = hero.querySelector('.hx-word span');
  var target = hero.querySelector('.hx-target');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var words = ['FAAAH.', 'Bruh.', 'Wait a minute…', 'Ba dum tss.'];
  var w = 0, fired = false, manualUntil = 0;
  var screen = hero.querySelector('.hx-phone .screen'), hp = window.HumFutPhone;

  function setWord(text) {
    word.classList.add('is-out');
    setTimeout(function () {
      word.textContent = text;
      fit();
      word.classList.remove('is-out', 'is-in'); void word.offsetWidth; word.classList.add('is-in');
    }, 320);
  }
  // Shrink a long word so it never runs off a narrow screen.
  function fit() {
    word.style.fontSize = '';
    var room = document.documentElement.clientWidth * 0.94, wide = word.getBoundingClientRect().width;
    if (wide > room) word.style.fontSize = (parseFloat(getComputedStyle(word).fontSize) * room / wide).toFixed(1) + 'px';
  }
  // Start the phone far enough down that its top clears the copy, however short the window.
  var stage = hero.querySelector('.hx-stage'), copy = hero.querySelector('.hx-copy'), phone = hero.querySelector('.hx-phone');
  function place() {
    hero.style.removeProperty('--hx-drop');
    var cs = getComputedStyle(hero), s0 = parseFloat(cs.getPropertyValue('--hx-s0')) || 1;
    var base = window.innerHeight * (parseFloat(cs.getPropertyValue('--hx-drop')) || 60) / 100;
    var need = copy.offsetTop + copy.offsetHeight + 24 - (stage.clientHeight - phone.offsetHeight * s0) / 2;
    if (need > base) hero.style.setProperty('--hx-drop', Math.ceil(need) + 'px');
  }
  fit(); place();
  window.addEventListener('resize', function () { fit(); place(); });
  window.addEventListener('load', place);
  // Every Pad on the hero iPhone works: hover shows the playback fill, a tap plays it.
  hero.querySelectorAll('.hx-pad').forEach(function (pad) {
    pad.addEventListener('pointerenter', function () { hp.preload(pad.dataset.sound); }, { once: true });
    pad.addEventListener('click', function () {
      var name = pad.dataset.name, ms = hp.play(pad.dataset.sound);
      hp.fire(pad, ms); hp.status(screen, true, name);
      manualUntil = Date.now() + ms;
      setWord(name + '.');
      document.dispatchEvent(new CustomEvent('humfut:pad-fired'));
      clearTimeout(pad._statusT);
      pad._statusT = setTimeout(function () { if (Date.now() >= manualUntil - 20) hp.status(screen, true, null); }, ms);
    });
  });
  if (reduce) {
    hero.classList.add('is-heard', 'is-reply'); target.classList.add('is-firing');
    return;
  }
  setInterval(function () {
    if (fired || Date.now() < manualUntil || parseFloat(hero.style.getPropertyValue('--r') || 0) > .3) return;
    w = (w + 1) % words.length; setWord(words[w]);
    document.dispatchEvent(new CustomEvent('humfut:pad-fired'));
  }, 2200);
  setInterval(function () {
    if (fired) document.dispatchEvent(new CustomEvent('humfut:pad-fired'));
  }, 1600);

  function update() {
    var total = hero.offsetHeight - window.innerHeight;
    var p = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / total));
    hero.style.setProperty('--r', Math.min(1, p / .42).toFixed(3));
    hero.classList.toggle('is-tapping', p > .44 && p < .52);
    var nowFired = p >= .52;
    if (nowFired !== fired) {
      fired = nowFired;
      target.classList.toggle('is-firing', fired);
      if (Date.now() >= manualUntil) hp.status(screen, true, fired ? 'Applause' : null);
      if (fired) { setWord('Applause.'); document.dispatchEvent(new CustomEvent('humfut:pad-fired')); }
    }
    hero.classList.toggle('is-heard', p >= .6);
    hero.classList.toggle('is-reply', p >= .72);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
