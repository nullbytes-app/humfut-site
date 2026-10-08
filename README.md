# HumFut website

Marketing, Support, Privacy Policy and beta sign-up pages for **HumFut: Sounds for Calls** (iOS), served by Cloudflare Pages at https://humfut.nullbytes.app.

- `index.html`, `support.html`, `privacy.html`, `beta.html`: the pages (static HTML, no build step).
- `assets/`: styles, scripts, icons and demo sounds. Asset links carry `?v=<hash>` for cache busting.
- `functions/api/beta.js`: the one server-side piece, a Cloudflare Pages Function behind the beta form.

## Beta sign-ups (TestFlight invites)

HumFut is live on the [App Store](https://apps.apple.com/app/humfut-sounds-for-calls/id6815140274), and every App Store button goes there (the link has no country code, so Apple opens each visitor's own store). The TestFlight beta page, `beta.html`, is linked as "Join the beta" in every footer and from a Support FAQ. There, people leave their Apple Account email. The form posts to `/api/beta`, which can do three things. Turn each on in Cloudflare → Workers & Pages → the HumFut project → **Settings**.

| What | Set up | Result |
|---|---|---|
| **Email each request to the support inbox** | Create a free [Resend](https://resend.com) account, verify `nullbytes.app` as a sending domain, create an API key. Add the secret `RESEND_API_KEY` and the variable `BETA_FROM` (for example `HumFut beta <beta@nullbytes.app>`). Optional: `BETA_NOTIFY_TO` and `SUPPORT_EMAIL` (see below). | Each request arrives at `BETA_NOTIFY_TO`, with Reply-To set to the tester. |
| **Keep a copy of every request** | Workers & Pages → KV → create a namespace, then Settings → Bindings → add a **KV namespace** binding named `BETA_SIGNUPS`. | Requests are stored as `signup:<email>` (and short-lived rate-limit counters). |
| **Send the TestFlight invite automatically** | App Store Connect → Users and Access → Integrations → create an API key with the **Developer** role (or higher). Add secrets `ASC_ISSUER_ID`, `ASC_KEY_ID`, `ASC_PRIVATE_KEY` (the whole `.p8` text) and `ASC_BETA_GROUP_ID` (the ID in the URL of your external TestFlight group). The group needs a build approved by Beta App Review. | The email is added to the group and Apple emails the TestFlight invite. |
| **Spam check (optional)** | Cloudflare → Turnstile → add a widget for `humfut.nullbytes.app`. Add the variable `TURNSTILE_SITE_KEY` and secret `TURNSTILE_SECRET`. | The form shows Turnstile and the function checks it. |

With none of them set, the form tells people to email humfut-support@nullbytes.app instead. Redeploy after changing settings.

### Environment variables

| Name | Kind | Required | Default | What it does |
|---|---|---|---|---|
| `RESEND_API_KEY` | Secret | For email | — | Resend API key. Never commit or log it. |
| `BETA_FROM` | Variable | For email | — | Sender, e.g. `HumFut beta <beta@nullbytes.app>`. |
| `SUPPORT_EMAIL` | Variable | No | `humfut-support@nullbytes.app` | The support inbox. Every email to a requester sets Reply-To to this, so replies reach support, not `BETA_FROM`. |
| `BETA_NOTIFY_TO` | Variable | No | `SUPPORT_EMAIL` | Where new-request notices go. Their Reply-To is the requester, so replying answers them directly. |
| `BETA_SIGNUPS` | KV binding | No | — | Keeps a copy of every request. |
| `ASC_ISSUER_ID`, `ASC_KEY_ID`, `ASC_PRIVATE_KEY`, `ASC_BETA_GROUP_ID` | Secrets | No | — | Add testers to the TestFlight group through the App Store Connect API. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | Variable, secret | No | — | Turnstile spam check on the form. |
| `RATE_SALT` | Secret | No | built-in | Salt for the short-lived rate-limit hash of the IP. |

To test locally: `npx wrangler pages dev . --kv BETA_SIGNUPS`.
