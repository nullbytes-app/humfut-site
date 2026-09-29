// Join the beta: sends the Apple Account email to /api/beta (functions/api/beta.js), which emails the support inbox,
// keeps a copy and, once set up, adds the tester in App Store Connect so Apple sends the TestFlight invite.
(function () {
  var form = document.getElementById('beta-form');
  if (!form) return;
  var msg = form.querySelector('.form-msg'), btn = form.querySelector('.beta-submit'), btnLabel = btn.querySelector('.hf-store-big');
  var email = form.elements.email, consent = form.elements.consent;
  var emailErr = document.getElementById('email-err'), consentErr = document.getElementById('consent-err');
  var slot = form.querySelector('.turnstile-slot');
  var SUPPORT = '<a href="mailto:humfut-support@nullbytes.app?subject=HumFut%20beta">humfut-support@nullbytes.app</a>';
  var EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]{1,190}\.[A-Za-z]{2,}$/;

  // Show Cloudflare Turnstile only when the site has it set up.
  fetch('/api/beta', { headers: { accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
    if (!cfg || !cfg.turnstileSiteKey) return;
    slot.hidden = false;
    slot.innerHTML = '<div class="cf-turnstile" data-sitekey="' + cfg.turnstileSiteKey + '" data-theme="auto"></div>';
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; document.head.appendChild(s);
  }).catch(function () {});

  function fieldError(input, box, text) {
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    box.textContent = text || ''; box.hidden = !text;
  }
  function say(html, kind) { msg.innerHTML = html; msg.className = 'form-msg' + (kind ? ' ' + kind : ''); }
  function done(title, body) {
    form.innerHTML = '<div class="beta-done" tabindex="-1"><span class="tick" aria-hidden="true">✓</span><h2>' + title + '</h2><p>' + body + '</p></div>';
    form.querySelector('.beta-done').focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = email.value.trim(), ok = true;
    fieldError(email, emailErr, EMAIL.test(v) ? '' : 'Enter the email you use with your Apple Account.');
    fieldError(consent, consentErr, consent.checked ? '' : 'Please tick the box so we can send your invite.');
    if (!EMAIL.test(v)) { ok = false; email.focus(); } else if (!consent.checked) { ok = false; consent.focus(); }
    if (!ok) return;

    var data = { email: v, firstName: form.elements.firstName.value.trim(), consent: true, website: form.elements.website.value };
    var t = form.querySelector('[name="cf-turnstile-response"]'); if (t) data['cf-turnstile-response'] = t.value;
    btn.disabled = true; btnLabel.textContent = 'Sending…'; say('');

    fetch('/api/beta', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return { status: r.ok ? 'listed' : 'unavailable' }; }); })
      .then(function (res) {
        if (res.status === 'invited') return done('Invite on its way.', 'Apple is emailing a TestFlight invite to <strong>' + v + '</strong>. Open it on your iPhone and tap View in TestFlight.');
        if (res.status === 'listed') return done('You’re on the list.', 'We’ll send a TestFlight invite to <strong>' + v + '</strong> soon. It comes from Apple’s TestFlight, so keep an eye on your junk folder too.');
        if (res.status === 'error' && res.field === 'email') fieldError(email, emailErr, res.message);
        else if (res.status === 'error' && res.field === 'consent') fieldError(consent, consentErr, res.message);
        else if (res.status === 'error') say(res.message, 'bad');
        else say('We couldn’t take requests just now. Email ' + SUPPORT + ' and we’ll add you.', 'bad');
        btn.disabled = false; btnLabel.textContent = 'Request an invite';
        if (window.turnstile) try { window.turnstile.reset(); } catch (x) {}
      })
      .catch(function () {
        say('That didn’t go through. Check your connection, or email ' + SUPPORT + ' and we’ll add you.', 'bad');
        btn.disabled = false; btnLabel.textContent = 'Request an invite';
      });
  });
})();
