// Shared by the phone mockups: plays a Pad's clip (one at a time, only on a tap) and keeps the
// status card worded exactly as the app words it (Copy rows 6, 7 and 7a; verdicts "On." and "Ready").
(function () {
  var ver = ((document.querySelector('script[src*="phone.js"]') || {}).src || '').split('?')[1] || '';
  var clips = {}, playing = null;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

  function clip(name) {
    if (!clips[name]) { clips[name] = new Audio('assets/sounds/' + name + '.mp3' + (ver ? '?' + ver : '')); clips[name].preload = 'auto'; }
    return clips[name];
  }

  window.HumFutPhone = {
    muted: false,
    preload: function (name) { if (name) clip(name); },
    // Plays a clip and returns roughly how long the Pad should show as playing, in ms.
    play: function (name) {
      if (!name) return 1800;
      var a = clip(name);
      if (playing && playing !== a) playing.pause();
      if (this.muted) return a.duration ? a.duration * 1000 : 1800;
      playing = a; a.currentTime = 0;
      var p = a.play(); if (p && p.catch) p.catch(function () {});
      return a.duration ? Math.max(1600, a.duration * 1000) : 1800;
    },
    stop: function () { if (playing) { playing.pause(); playing.currentTime = 0; } playing = null; },
    // on: Call Sounds is on. playing: the name of the Pad playing, or null.
    status: function (screen, on, playing) {
      var word = screen.querySelector('.st-word'), reason = screen.querySelector('.st-reason');
      screen.classList.toggle('is-off', !on);
      if (word) word.textContent = on ? 'On.' : 'Ready';
      if (reason) reason.textContent = !on ? 'Supported Call detected.'
        : playing ? playing + ' is playing into the call.' : 'Ready — tap a Reaction to play it on the call';
    },
    // The app's playback fill across a Pad.
    fire: function (pad, ms) {
      pad.style.setProperty('--fill-ms', (ms || 1800) + 'ms');
      pad.classList.remove('is-firing'); void pad.offsetWidth; pad.classList.add('is-firing');
      clearTimeout(pad._fireT);
      pad._fireT = setTimeout(function () { pad.classList.remove('is-firing'); }, ms || 1800);
    }
  };
})();
