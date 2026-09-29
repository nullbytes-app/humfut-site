// How to add sounds: pick where the sound is (a soundboard site, a video or any app, or Files), then tap along on a
// working iPhone through the app's real flow. Screens and labels follow the HumFut app and its Copy catalogue.
(function () {
  var root = document.querySelector('[data-addsounds]');
  if (!root) return;
  var hp = window.HumFutPhone, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phoneEl = root.querySelector('.mp'), screenEl = phoneEl.querySelector('.screen'), box = phoneEl.querySelector('.screens'), ring = phoneEl.querySelector('.ring');
  var list = root.querySelector('.steps'), status = root.querySelector('.status'), showBtn = root.querySelector('.js-show');
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  var ICON = '<img src="assets/icons/icon-128.png" alt="">';
  var SB = function (t) { return '<div class="statusbar"><span>' + (t || '9:41') + '</span><span class="sb-icons"><i></i><i class="batt"></i></span></div>'; };
  var ISL = '<div class="island"></div>';
  function TABS(on, dot) {
    var t = [['Speak', 't-speak'], ['Reactions', 't-react'], ['Library', 't-lib'], ['Settings', 't-set']];
    return '<div class="tabbar">' + t.map(function (x) { return '<span class="' + (x[0] === on ? 'on ' : '') + (x[0] === 'Library' && dot === 1 ? 'dot ' : '') + (x[0] === 'Reactions' && on !== 'Reactions' && dot === 'go' ? 'go' : '') + '"><svg><use href="#' + x[1] + '"/></svg>' + x[0] + '</span>'; }).join('') + '</div>';
  }
  function ROW(title, cap, opts) {
    opts = opts || {};
    return '<div class="row' + (opts.fresh ? ' fresh' : '') + '"><span class="pv"></span><div class="tt"><span>' + (opts.isNew ? '<i></i>' : '') + title + '</span><small>' + cap + '</small></div><span class="add' + (opts.dim ? ' dim' : '') + (opts.go ? ' go' : '') + '" aria-label="' + (opts.dim ? 'On Reactions' : 'Add to Reactions') + '">+</span></div>';
  }
  function LIB(rows, o) {
    o = o || {};
    return '<div class="scr app">' + ISL + SB(o.time) + '<div class="body"><div class="toolbar"><span class="gbtn' + (o.dis ? ' dis' : '') + (o.goAdd ? ' go' : '') + '">Add a sound</span><span class="gbtn' + (o.dis ? ' dis' : '') + (o.goCap ? ' go' : '') + '">Capture</span></div><div class="search2">Search</div><div class="seg"><span class="on">Clips</span><span>Tracks</span></div>' + rows + '</div>' + TABS('Library', o.dot) + '</div>';
  }
  var BASE_ROWS = ROW('Applause', '0:02 · Starter sound', { dim: true }) + ROW('Laugh', '0:01 · Starter sound', { dim: true });
  function BOARD(name, sound, pad, emo) {
    return '<div class="scr app reactions-bg">' + ISL + SB() + '<div class="body"><div class="coll-h2">Collection A</div><div class="pads2">' +
      '<button class="pad pad-btn" style="--pad:var(--pad-teal)" data-sound="applause"><span class="nm">Applause</span><span class="emo">👏</span></button>' +
      '<button class="pad pad-btn" style="--pad:var(--pad-ochre)" data-sound="laugh"><span class="nm">Laugh</span><span class="emo">😂</span></button></div>' +
      '<div class="coll-h2">Collection B</div><div class="pads2"><button class="pad pad-btn newpad go" style="--pad:var(--' + pad + ')" data-sound="' + sound + '"><span class="nm">' + name + '</span><span class="emo">' + emo + '</span></button></div>' +
      '<div class="hold-tip">Hold a Pad to rename it, pick an emoji or set its Play range.</div></div>' + TABS('Reactions') + '</div>';
  }

  var FLOWS = {
    share: {
      steps: [
        ['Open the sound’s own page', 'On a soundboard site in Safari or Chrome, tap the sound to open its page.'],
        ['Tap Share on the sound', 'Share the sound itself, so the audio file goes with it.'],
        ['Choose HumFut', 'It’s in the row of apps. A card says “Got it” and closes by itself, back to the site.'],
        ['Open HumFut', 'The sound finishes adding when you open the app. It’s in Library, marked New.'],
        ['Tap + to add it to Reactions', 'The sound becomes a Pad on your Reactions board.'],
        ['Tap your new Pad', 'Try it on your own speaker. Hold it to rename it, pick an emoji or trim it.']
      ],
      screens: [
        { s: 0, light: 1, html: '<div class="scr web">' + ISL + SB() + '<div class="page"><div class="site-h">Soundboard <span>Popular</span></div><div class="sb-row go"><span class="pl">▶</span>FAAAH</div><div class="sb-row"><span class="pl">▶</span>Bruh</div><div class="sb-row"><span class="pl">▶</span>Vine boom</div><div class="sb-row"><span class="pl">▶</span>Wait a minute…</div><div class="sb-row"><span class="pl">▶</span>Sad trombone</div></div><div class="safari-bar">🔒 soundboard</div></div>' },
        { s: 1, light: 1, html: '<div class="scr web">' + ISL + SB() + '<div class="page snd-page"><div class="big">▶</div><h5>FAAAH</h5><div class="meta">0:02 · MP3</div><div class="snd-btns"><span>⬇ Download</span><span class="go"><svg viewBox="0 0 24 24"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>Share</span></div></div><div class="safari-bar">🔒 soundboard</div></div>' },
        { s: 2, light: 1, html: '<div class="scr web">' + ISL + SB() + '<div class="page snd-page"><div class="big">▶</div><h5>FAAAH</h5></div><div class="dimmer"></div><div class="ios-sheet"><div class="grab"></div><div class="share-head"><i>♪</i><div><b>faaah.mp3</b><small>Audio · 38 KB</small></div></div><div class="share-apps2"><span><i style="background:#1d8cf8"></i>AirDrop</span><span><i style="background:#34c759"></i>Messages</span><span class="go">' + ICON + 'HumFut</span><span><i style="background:#ffcc00"></i>Notes</span></div><div class="ios-list"><div>Copy</div><div>Save to Files</div></div></div></div>' },
        { s: 2, light: 1, auto: 2400, html: '<div class="scr web">' + ISL + SB() + '<div class="page snd-page"><div class="big">▶</div><h5>FAAAH</h5></div><div class="dimmer"></div><div class="ext-card"><div class="grab"></div>Got it. HumFut will finish adding this the next time you open the app.<div class="closing">Closes by itself</div></div></div>' },
        { s: 3, html: '<div class="scr home">' + ISL + SB() + '<div class="grid"><span><i></i>Photos</span><span><i></i>Camera</span><span><i></i>Maps</span><span><i></i>Weather</span><span><i></i>Clock</span><span><i></i>Notes</span><span class="go">' + ICON + 'HumFut</span><span><i></i>Music</span></div><div class="dock2"><i></i><i></i><i></i><i></i></div></div>' },
        { s: 4, html: LIB(ROW('FAAAH', '0:02 · Not on Reactions', { isNew: 1, fresh: 1, go: 1 }) + BASE_ROWS, { dot: 1 }) },
        { s: 5, html: LIB(ROW('FAAAH', '0:02', { dim: 1 }) + BASE_ROWS, { dot: 'go' }) },
        { s: 5, html: BOARD('FAAAH', 'faaah', 'pad-orange', '😱'), last: 1 }
      ]
    },
    capture: {
      steps: [
        ['Tap Capture in your Library', 'It’s at the top, next to Add a sound.'],
        ['Tap the red record button', 'The Capture sheet explains what happens next.'],
        ['Tap Start Sharing', 'This is your iPhone’s own Screen Sharing card, with HumFut Capture ticked. A 3-second countdown follows.'],
        ['Play the sound in any app', 'Switch to YouTube or any app and play it. The red dot means HumFut is capturing. It stops on its own after 60 seconds.'],
        ['Tap the red dot, then Stop', 'Tap the recording indicator at the top of the screen, then Stop. Then go back to HumFut.'],
        ['Tap Done', '“Captured. It’s in your Library marked New.” Silence is trimmed off both ends.'],
        ['Tap + to add it to Reactions', 'It’s the new capture at the top of Clips. Or tap Put it on a Pad on the card.'],
        ['Tap your new Pad', 'Hold it to set where it starts and ends, rename it or pick an emoji.']
      ],
      screens: [
        { s: 0, html: LIB(BASE_ROWS + ROW('FAAAH', '0:02', { dim: 1 }), { goCap: 1 }) },
        { s: 1, html: '<div class="scr app">' + ISL + SB() + '<div class="dimmer"></div><div class="sheet2"><div class="grab"></div><span class="x">✕</span><h5>Capture what’s playing</h5><div class="cardx">Play a sound from your other apps and HumFut keeps it. Tap the capture button, choose Start Sharing, then play the sound. Come back here when it’s done.</div><div class="rec-disc go"><i></i></div><div class="foot2">After Start Sharing, wait for the countdown, then switch to the app you want to capture. It keeps capturing in the background. Tap outside the card to cancel.</div><span class="link">How capture works</span></div></div>' },
        { s: 2, html: '<div class="scr bc">' + ISL + SB() + '<div class="warn">Everything on your screen, including notifications, will be recorded. Enable Do Not Disturb to prevent unexpected notifications.</div><div class="card3"><div class="glyph"><i></i></div><h6>Screen Sharing</h6><div class="opt2">' + ICON + '<span>HumFut Capture</span>✓</div><span class="startbtn go">Start Sharing</span></div></div>' },
        { s: 2, count: 1, html: '<div class="scr bc">' + ISL + SB() + '<div class="warn">Everything on your screen, including notifications, will be recorded. Enable Do Not Disturb to prevent unexpected notifications.</div><div class="card3"><div class="glyph"><i></i></div><h6>Screen Sharing</h6><div class="opt2">' + ICON + '<span>HumFut Capture</span>✓</div><span class="startbtn" data-count>3</span></div></div>' },
        { s: 3, html: '<div class="scr vid"><div class="island rec"></div>' + SB() + '<div class="frame"><span class="pbtn go">▶</span><div class="eq"><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="scrub2"><i></i></div><div class="vmeta">The funniest 2-second sounds<small>A video app like YouTube</small></div><div class="skel" style="top:300px"></div><div class="skel" style="top:370px"></div></div>' },
        { s: 4, playSound: 'badumtss', html: '<div class="scr vid playing"><div class="island rec go"></div>' + SB() + '<div class="frame"><span class="pbtn">▶</span><div class="eq"><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="cap">“Ba dum tss!”</div><div class="scrub2"><i></i></div><div class="vmeta">The funniest 2-second sounds<small>A video app like YouTube</small></div><div class="skel" style="top:300px"></div><div class="skel" style="top:370px"></div></div>' },
        { s: 4, html: '<div class="scr vid playing"><div class="island rec"></div>' + SB() + '<div class="frame"><span class="pbtn">▶</span><div class="eq"><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="scrub2"><i></i></div><div class="vmeta">The funniest 2-second sounds</div><div class="dimmer"></div><div class="ios-alert"><b>Stop screen sharing?</b><p>HumFut Capture is sharing your screen.</p><div class="ab2"><span>Cancel</span><span class="go">Stop</span></div></div></div>' },
        { s: 5, html: '<div class="scr app">' + ISL + SB('9:42') + '<div class="dimmer"></div><div class="sheet2"><div class="grab"></div><span class="x">✕</span><h5>Capture what’s playing</h5><div class="cardx" style="text-align:center"><div class="res-tick">✓</div>Captured. It’s in your Library marked New. Put it on a Pad to adjust where it starts and ends.</div><div class="btn-col"><span class="primary">Put it on a Pad</span><span>Capture another</span><span class="go">Done</span></div></div></div>' },
        { s: 6, html: LIB(ROW('Capture 29 Sep 9.42.10 PM', '0:02 · Not on Reactions', { isNew: 1, fresh: 1, go: 1 }) + BASE_ROWS, { dot: 1, time: '9:42' }) },
        { s: 7, html: LIB(ROW('Capture 29 Sep 9.42.10 PM', '0:02', { dim: 1 }) + BASE_ROWS, { dot: 'go', time: '9:42' }) },
        { s: 7, html: BOARD('Capture 29 Sep 9.42.10 PM', 'badumtss', 'pad-olive', '🥁'), last: 1 }
      ]
    },
    files: {
      steps: [
        ['Tap Add a sound in your Library', 'It’s at the top of the Library tab.'],
        ['Pick the audio file', 'Files opens. Find the MP3 or M4A in Downloads, iCloud Drive or anywhere in Files, and tap it.'],
        ['HumFut checks it', 'Up to 30 seconds becomes a Clip, marked New. Longer files become Tracks for background music.'],
        ['Tap + to add it to Reactions', 'The Clip becomes a Pad. Tracks play from Library and don’t go on a Pad.'],
        ['Tap your new Pad', 'Hold it to rename it, pick an emoji or set its Play range.']
      ],
      screens: [
        { s: 0, html: LIB(BASE_ROWS + ROW('FAAAH', '0:02', { dim: 1 }), { goAdd: 1 }) },
        { s: 1, light: 1, html: '<div class="scr files">' + ISL + SB() + '<div class="fh"><div class="fnav"><span>Cancel</span><span>Open</span></div><h5>Downloads</h5><div class="fsearch">Search</div><div class="frow go"><i>♪</i><div><b>Sad trombone.mp3</b><small>Today · 51 KB</small></div></div><div class="frow"><i>♪</i><div><b>Lobby jazz.m4a</b><small>Yesterday · 3.1 MB</small></div></div><div class="frow off"><i style="color:#aaa">▤</i><div><b>Notes.pdf</b><small>Monday</small></div></div></div><div class="ftabs"><span>Recents</span><span>Shared</span><span class="on">Browse</span></div></div>' },
        { s: 2, auto: 1600, html: LIB(BASE_ROWS + ROW('FAAAH', '0:02', { dim: 1 }), { dis: 1 }) },
        { s: 3, html: LIB(ROW('Sad trombone', '0:04 · Not on Reactions', { isNew: 1, fresh: 1, go: 1 }) + BASE_ROWS, { dot: 1 }) },
        { s: 4, html: LIB(ROW('Sad trombone', '0:04', { dim: 1 }) + BASE_ROWS, { dot: 'go' }) },
        { s: 4, html: BOARD('Sad trombone', 'sadtrombone', 'pad-rose', '🎺'), last: 1 }
      ]
    }
  };

  var flow = 'share', i = 0, done = false, auto = null, timer = null;
  function render() {
    clearTimeout(timer);
    var f = FLOWS[flow]; box.innerHTML = ''; list.innerHTML = '';
    f.screens.forEach(function (s) { box.appendChild(el(s.html)); });
    f.steps.forEach(function (t, k) { list.appendChild(el('<li><button type="button" data-step="' + k + '"><b class="n">' + (k + 1) + '</b><span><strong>' + t[0] + '</strong><span class="body">' + t[1] + '</span></span></button></li>')); });
    i = 0; done = false; show();
  }
  function show() {
    clearTimeout(timer);
    var f = FLOWS[flow], sc = f.screens[i], scrs = box.children;
    Array.prototype.forEach.call(scrs, function (s, k) { s.classList.toggle('on', k === i); });
    screenEl.classList.toggle('is-light', !!sc.light);
    Array.prototype.forEach.call(list.children, function (li, k) { li.className = done || k < sc.s ? 'done' : k === sc.s ? 'now' : ''; });
    ring.classList.remove('show');
    if (sc.playSound) hp.play(sc.playSound);
    if (sc.count) { var c = scrs[i].querySelector('[data-count]'), n = 3; c.textContent = n; status.textContent = 'Counting down…'; var t = setInterval(function () { n--; if (n > 0) c.textContent = n; else { clearInterval(t); next(); } }, reduce ? 150 : 700); return; }
    if (sc.auto) { status.textContent = flow === 'share' ? 'This card closes by itself.' : 'HumFut is checking the sound…'; timer = setTimeout(next, reduce ? 300 : sc.auto); return; }
    var go = scrs[i].querySelector('.go');
    if (go && !done) setTimeout(function () {
      if (!scrs[i] || !scrs[i].contains(go)) return;
      var pr = screenEl.getBoundingClientRect(), r = go.getBoundingClientRect(), s = pr.width / 280;
      ring.style.left = ((r.left + r.width / 2 - pr.left) / s) + 'px'; ring.style.top = ((r.top + r.height / 2 - pr.top) / s) + 'px';
      ring.classList.add('show');
    }, 380);
    status.textContent = done ? '' : sc.last ? 'Now tap your new Pad.' : 'Tap the ringed spot on the iPhone.';
  }
  function next() {
    var f = FLOWS[flow];
    if (i < f.screens.length - 1) { i++; show(); }
    else if (!done) { done = true; show(); status.innerHTML = '<span class="win">Done. It’s on a Pad, ready for your next call.</span>'; stopAuto(); }
  }
  box.addEventListener('click', function (e) {
    var p = e.target.closest('.pad-btn'); if (p) hp.fire(p, hp.play(p.dataset.sound));
    var go = e.target.closest('.go'); if (go && go.closest('.scr.on') && !done) next();
  });
  list.addEventListener('click', function (e) {
    var b = e.target.closest('[data-step]'); if (!b) return;
    stopAuto(); var k = +b.dataset.step, f = FLOWS[flow];
    for (var j = 0; j < f.screens.length; j++) if (f.screens[j].s === k && !f.screens[j].count && !f.screens[j].auto) { i = j; break; }
    done = false; show();
  });
  function stopAuto() { clearInterval(auto); auto = null; showBtn.textContent = 'Show me'; }
  showBtn.addEventListener('click', function () {
    if (auto) return stopAuto();
    if (done) render();
    showBtn.textContent = 'Pause';
    auto = setInterval(function () { var go = box.querySelector('.scr.on .go'); if (go && !done) go.click(); }, 1900);
  });
  root.querySelector('.js-reset').addEventListener('click', function () { stopAuto(); render(); });
  root.querySelectorAll('.way').forEach(function (b) {
    b.addEventListener('click', function () {
      root.querySelectorAll('.way').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      flow = b.dataset.way; stopAuto(); render();
    });
  });
  // Show me pauses when the band scrolls away.
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { if (!e[0].isIntersecting) stopAuto(); }).observe(root);
  render();
})();
