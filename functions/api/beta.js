// POST /api/beta: someone asks to join the HumFut TestFlight beta with their Apple Account email.
//
// What it does, depending on what is configured in Cloudflare Pages (Settings → Variables and Secrets / Bindings):
//   1. ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY (the .p8 key text) and ASC_BETA_GROUP_ID are set:
//      adds the email to that external TestFlight group through the App Store Connect API. Apple then emails the
//      TestFlight invite itself. Response: { status: "invited" }.
//   2. A KV namespace is bound as BETA_SIGNUPS: every request is also saved there (email, name, optional answers, time, status),
//      so nothing is lost if Apple's API is down or not set up yet. Response: { status: "listed" } when not invited.
//   3. RESEND_API_KEY is set (and BETA_FROM, a sender on a domain verified in Resend, e.g. "HumFut beta <beta@nullbytes.app>"):
//      every request is emailed to BETA_NOTIFY_TO (default: the support address), with Reply-To set to the
//      tester's address, saying whether Apple already sent the invite or it still needs adding by hand.
//   4. TURNSTILE_SECRET is set: the Cloudflare Turnstile check on the form must pass.
// None of 1-3 configured: { status: "unavailable" } with 503, and the page offers the support email instead.
//
// Where replies go. The support address is SUPPORT_EMAIL (default humfut-support@nullbytes.app).
//   - Email to the owner about a request: to BETA_NOTIFY_TO (default: the support address), Reply-To the requester.
//   - Email to a requester (confirmation or follow-up), if one is ever added: always through mailRequester(), which
//     sets Reply-To to the support address, so replies reach support and never beta@.
// The TestFlight invite itself is sent by Apple, not by this function.
//
// GET /api/beta returns { turnstileSiteKey } (from TURNSTILE_SITE_KEY) so the page can show Turnstile only when set up.

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]{1,190}\.[A-Za-z]{2,}$/;
const DEFAULT_SUPPORT_EMAIL = 'humfut-support@nullbytes.app';
// The optional "Tell us about you" answers. Only these values are accepted.
const HELPS = { 'real-calls': 'Using beta builds on real calls', bugs: 'Reporting bugs and crashes', ideas: 'Suggesting features and sounds', survey: 'Answering a short survey now and then' };
const CALLS = { phone: 'Phone', facetime: 'FaceTime', whatsapp: 'WhatsApp', zoom: 'Zoom', other: 'Other apps' };
const pick = (v, allowed) => [...new Set([].concat(v || []).map(String))].filter((x) => Object.hasOwn(allowed, x));
const clean = (v, max) => String(v || '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
const supportEmail = (env) => env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL;

export async function onRequestGet({ env }) {
  return reply({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || null });
}

export async function onRequestPost({ request, env }) {
  let input;
  try {
    const type = request.headers.get('content-type') || '';
    input = type.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  } catch (e) {
    return reply({ status: 'error', message: 'Something went wrong reading the form. Please try again.' }, 400);
  }

  // A hidden field people never see. Bots fill it in; pretend it worked.
  if (input.website) return reply({ status: 'listed' });

  const email = String(input.email || '').trim().toLowerCase();
  const firstName = clean(input.firstName, 60).replace(/\s+/g, ' ');
  const lastName = clean(input.lastName, 60).replace(/\s+/g, ' ');
  const reason = clean(input.reason, 1000);
  const helps = pick(input.helps, HELPS), calls = pick(input.calls, CALLS);
  if (!firstName || !lastName) {
    return reply({ status: 'error', field: 'name', message: 'Please add your first and last name.' }, 400);
  }
  if (!EMAIL.test(email) || email.length > 254) {
    return reply({ status: 'error', field: 'email', message: 'That doesn’t look like an email address.' }, 400);
  }
  if (input.consent !== true && input.consent !== 'on' && input.consent !== 'true') {
    return reply({ status: 'error', field: 'consent', message: 'Please tick the box so we can send your invite.' }, 400);
  }

  if (env.TURNSTILE_SECRET) {
    const ok = await checkTurnstile(env.TURNSTILE_SECRET, input['cf-turnstile-response'], request.headers.get('cf-connecting-ip'));
    if (!ok) return reply({ status: 'error', message: 'Please complete the check and try again.' }, 400);
  }

  const kv = env.BETA_SIGNUPS;
  const ascReady = env.ASC_ISSUER_ID && env.ASC_KEY_ID && env.ASC_PRIVATE_KEY && env.ASC_BETA_GROUP_ID;
  const mailReady = env.RESEND_API_KEY && env.BETA_FROM;
  if (!kv && !ascReady && !mailReady) return reply({ status: 'unavailable' }, 503);

  // A few requests per address per hour is plenty; the IP is only kept as a short-lived hash.
  if (kv) {
    const ip = request.headers.get('cf-connecting-ip') || '';
    const key = 'rate:' + (await sha256(ip + (env.RATE_SALT || 'humfut'))).slice(0, 32);
    const n = parseInt((await kv.get(key)) || '0', 10);
    if (n >= 5) return reply({ status: 'error', message: 'Too many tries. Please wait a little and try again.' }, 429);
    await kv.put(key, String(n + 1), { expirationTtl: 3600 });
  }

  let status = 'listed', detail = null;
  if (ascReady) {
    try {
      const r = await inviteTester(env, email, firstName, lastName);
      status = r.ok ? 'invited' : 'listed';
      detail = r.detail;
    } catch (e) {
      detail = 'asc-exception: ' + String(e && e.message || e).slice(0, 200);
    }
  }

  const requestedAt = new Date().toISOString();
  const signup = { email, firstName, lastName, reason, helps, calls, requestedAt, status, detail };
  if (kv) await kv.put('signup:' + email, JSON.stringify(signup));
  const mailed = mailReady ? await notifySupport(env, { ...signup, ascReady }) : false;

  // Kept somewhere (Apple, Cloudflare KV or the support inbox)? Then the request is safe.
  if (status !== 'invited' && !kv && !mailed) return reply({ status: 'unavailable' }, 503);
  return reply({ status });
}

// Emails the request to the owner (BETA_NOTIFY_TO, default the support address). Replying answers the requester.
async function notifySupport(env, s) {
  const to = env.BETA_NOTIFY_TO || supportEmail(env);
  const what = s.status === 'invited'
    ? (s.detail === 'already-a-tester' ? 'Already a tester in the TestFlight group. Nothing to do.' : 'Added to the TestFlight group. Apple has emailed the invite. Nothing to do.')
    : 'Not invited yet. Add this email as an external tester in App Store Connect → TestFlight.' + (s.ascReady && s.detail ? '\n\nApple’s API said: ' + s.detail : '');
  const text = [
    'New HumFut TestFlight request', '',
    'Name: ' + s.firstName + ' ' + s.lastName, 'Email: ' + s.email, 'Requested: ' + s.requestedAt, '',
    'Why they want to join, and how they could help:', s.reason || '(not answered)', '',
    'Up for: ' + (s.helps.length ? s.helps.map((k) => HELPS[k]).join('; ') : '(not answered)'),
    'Calls they’d test on: ' + (s.calls.length ? s.calls.map((k) => CALLS[k]).join(', ') : '(not answered)'), '',
    what, '', 'Reply to this email to write to them.'
  ].join('\n');
  return sendMail(env, { to, replyTo: s.email, subject: 'TestFlight request: ' + s.firstName + ' ' + s.lastName + ' <' + s.email + '>' + (s.status === 'invited' ? ' (invited)' : ' (to invite)'), text });
}

// Any email to a requester (a confirmation or a follow-up) must go through here: replies land in the support inbox.
// Not called today: the only email a requester gets is Apple's TestFlight invite.
function mailRequester(env, { to, subject, text }) {
  return sendMail(env, { to, replyTo: supportEmail(env), subject, text });
}

// Sends one email through Resend (https://resend.com/docs/api-reference/emails/send-email) from BETA_FROM.
// replyTo is required so every email says where replies go. The API key is never logged.
async function sendMail(env, { to, replyTo, subject, text }) {
  if (!replyTo) throw new Error('sendMail needs replyTo');
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.BETA_FROM, to: [to], reply_to: replyTo, subject, text })
    });
    return r.ok;
  } catch (e) { return false; }
}

async function checkTurnstile(secret, token, ip) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret); body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = await r.json().catch(() => ({}));
  return !!data.success;
}

// ---------- App Store Connect API ----------
// Creates a beta tester in the external group. Apple sends the TestFlight invite email.
// https://developer.apple.com/documentation/appstoreconnectapi/create_a_beta_tester
async function inviteTester(env, email, firstName, lastName) {
  const token = await ascToken(env);
  const res = await fetch('https://api.appstoreconnect.apple.com/v1/betaTesters', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({
      data: {
        type: 'betaTesters',
        attributes: { email, firstName, lastName },
        relationships: { betaGroups: { data: [{ type: 'betaGroups', id: env.ASC_BETA_GROUP_ID }] } }
      }
    })
  });
  if (res.status === 201) return { ok: true, detail: null };
  const text = await res.text();
  // Already a tester in this group: they already have (or had) an invite.
  if (res.status === 409) return { ok: true, detail: 'already-a-tester' };
  return { ok: false, detail: 'asc-' + res.status + ': ' + text.slice(0, 300) };
}

// ES256 JWT for the App Store Connect API, signed with the .p8 key (valid 15 minutes).
async function ascToken(env) {
  const header = { alg: 'ES256', kid: env.ASC_KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: env.ASC_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' };
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const input = enc(header) + '.' + enc(payload);
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(env.ASC_PRIVATE_KEY), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(input));
  return input + '.' + b64url(new Uint8Array(sig)); // WebCrypto already returns the raw r||s form JWT needs
}

function pemToDer(pem) {
  const b64 = String(pem).replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function b64url(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}
