# Email read & inline link previews

## Purpose

Open a candidate email from the applications table in a right-side slide-over
drawer and read the **full message body**, not just the snippet. URLs inside
the body are replaced **in place** with rich preview cards — the link's own
website name, title, description, and image get "unwrapped" at the exact spot
the URL appears. No raw URL text is shown, and no separate link list.

The feature landed in three implementation batches (mirroring the commits):
**read layer → unfurl API → reader + cards**. The doc is structured the same
way.

---

## 1. Read layer — full-message retrieval (`lib/jobhunt/`)

### What it does

`readEmail(accessToken, id)` fetches one message at `format=full` and reduces
the raw Gmail payload to a clean `ReadEmail`:

```ts
{ id, threadId, date, from, to, subject, snippet, body }
```

`GET /api/jobhunt/message/[id]` wraps it with the standard session + token
checks (401 unsigned, 409 not-connected, 502 upstream — same shape as
discovery) and maps `GmailApiError` → `502` for provider-side failures, `400`
otherwise.

### Body extraction (`lib/jobhunt/gmail/body.ts`)

`extractTextBody` walks the MIME tree to produce plain text:

1. Prefer a `text/plain` part anywhere in the tree (direct or nested).
2. Else fall back to a `text/html` part and strip markup.
3. `stripHtml` is a **replace-list, not a parser**: kills `<style>`/`<script>`,
   converts block breaks (`</p>` → blank line, `<br>/<div>/<li>` → newline),
   drops remaining tags, decodes the common HTML entities, normalizes
   whitespace, then trims.
4. Sanitizes stray BOM / NUL bytes.
5. **Caps at 500 KB** with an `…[truncated]` marker — a pathological newsletter
   can't OOM the worker or balloon the response.
6. Empty result falls back to the snippet rather than an empty drawer.

`ReadEmail.date` is derived from Gmail's `internalDate` (epoch ms) → ISO.

### Decisions & rationale

- **`format=full` costs 5 quota units** vs 1 for metadata. That's why the
  discovery layer uses metadata-only and this is the *only* place full bodies
  are fetched — **on open, on demand**, never in a list. Opening a single email
  is rare enough that 5 units is a non-issue.
- **Text preferred over HTML.** The reader renders paragraphs; working from
  `text/plain` avoids ambiguous markup and is what link extraction (section 3)
  can trust.
- **API fetch, not server-import.** The page passes only the message id to the
  client; the drawer fetches the route on open. Keeps the huge `format=full`
  payload out of the server-rendered HTML.

### Edge cases & gotchas

- Multipart emails whose `text/plain` is a bare "view this email in your
  browser" link: the HTML fallback fixes the common case, but a sender that
  provides *only* a broken text part can still surface as HTML. Acceptable.
- Base64url vs base64: Gmail data is unpadded base64url (`-`/`_`); decoding
  maps it back to standard base64 before `Buffer` decodes it.
- Google kills an app's quota fast with 500KB pages × several opens — the
  truncation cap is the backstop.

---

## 2. Unfurl API — server-side link metadata (`app/api/jobhunt/unfurl`)

### What it does

`GET /api/jobhunt/unfurl?url=…` fetches the target page server-side, parses its
Open Graph / Twitter / `<title>` metadata, and returns a small preview payload:

```ts
{ url, hostname, title?, description?, image?, favicon? }
```

The browser **never talks to the target site directly** — it reads only this
route. That's the security boundary.

### Hardening

- **Auth:** session-guarded (`401` unsigned).
- **SSRF guard:** scheme must be `http`/`https`; loopback hosts,
  `*.localhost` / `*.local` return `400`. The route won't reach internal
  services.
- **Environment:** realistic Chrome `user-agent`, `accept` for
  html/xhtml/plain, `redirect: follow`.
- **Timeout:** `AbortSignal.timeout(6000)` — a slow site can't hang the
  harness.
- **Size cap:** response body bounded to **256 KB** before parsing.
- **Content-type gate:** only `text/html` / `text/plain` responses are parsed.
- **Error containment:** any failure produces a *bare* entry (hostname only)
  instead of a 500 — the card still renders as a clickable site name.

### Parsing (`lib/jobhunt/links.ts`, `parseOpenGraph`)

A tiny tag/regex walker over fetched HTML:

- Reads `<meta>` via `property | name | itemprop`, prefers `og:title` →
  `twitter:title` → `<title>`, same for `description`, and `og:image` /
  `twitter:image`.
- `favicon` from the first `<link rel*="icon">`.
- Decodes HTML entities and resolves relative URLs against the **final**
  (post-redirect) URL.

### Caching

Per-process in-memory `Map`, keyed by the *pre-redirect* URL string:

- **Rich entry** (has title/description/image): TTL **24h** — such pages rarely
  change, re-fetching is pure waste.
- **Bare entry** (nothing parsed — soft-fail): TTL **30 min** — the page might
  have failed transiently, and we want a retry within a reasonable window
  instead of a permanent skeleton.
- Cap **500 entries**, LMS-evict oldest (insertion order). Cache resets on
  process restart — acceptable, since it's a transient optimization, not a
  store.

### Decisions & rationale

- **Server-side unfurling is mandatory.** Embedding URLs and letting the
  *client* fetch them would leak the user's IP; let any visited site see the
  internal session. The route also lets us dedupe identical links (see §3) and
  enforce caps centrally.
- **OG data, not screenshots.** Real screenshot services need an external
  renderer/secret. OG/Twitter metadata is free, fast, and universally
  published by ATS landing pages.
- **`url` in the response is the *final* redirect URL.** The `href` a card
  links to is therefore the page whose title/picture are displayed — preview
  and destination can't drift apart via a tracking redirect (and email
  trackers get skipped on open).

### Edge cases & gotchas

- **Favicons are optional.** Pages that serve a favicon only at `/favicon.ico`
  without a `<link rel="icon">` return none → the card falls back to a generic
  link icon. A known, deliberate limitation (fixable by probing `/favicon.ico`)
  rather than an error.
- Empty `title`/`desc` → `undefined` → fields simply don't render.
- `parseOpenGraph` is regex-based by design: robust enough for `<head>` tags on
  real pages, and bounded by the 256 KB cap. Malformed HTML degrades to a bare
  card, never a crash.

---

## 3. Reader + inline cards (`components/jobhunt/`, `lib/jobhunt/links.ts`)

### Reader drawer (`email-reader.tsx`)

A shadcn `Drawer`, `swipeDirection="right"`, `modal`, max-width `40rem`,
opened by selecting a table row:

- Header: subject, From / date, To — with a close button.
- Body scrolls **internally** (`min-h-0 flex-1 overflow-y-auto
  overscroll-contain`) — consistent with the viewport-lock discipline from
  `02`.
- States: skeleton pulse while fetching → body, or an error view with **Retry**
  and, for `gmail_not_connected`, a **Reconnect Google** button.
- Fetch happens on open with a `cancelled` guard so switching rows mid-flight
  can't cross-talk; rate-limit (`429`/`403`) gets the friendly message.

### Inline card splicing (`lib/jobhunt/links.ts` + `email-reader.tsx`)

`splitTextAndLinks(body)` splits the plain text into alternating `text` /
`link` segments:

- `URL_PATTERN` catches `http(s)://…` only — lookalikes (`www.site.com`,
  `mailto:`…) pass through **as text**, keeping the body honest.
- **Trailing punctuation is absorbed** and stripped from the URL
  (`https://a.com.` → `https://a.com`), so prose around links doesn't leak into
  the card address.
- `normalizeUrl` validates via `URL` and drops an artificial trailing slash the
  parser adds (only when the raw string didn't end in `/`).
- `EmailBody` maps segments: text → `<p>` runs (original spacing/newlines
  preserved, in flow), links → `<LinkPreview>` cards **at that exact position**.
  Keyed by `${value}-${index}` so a repeated URL renders as several cards, one
  per occurrence.

### Card behavior and the shared store (`link-preview.tsx`)

`LinkPreview` is mount-once, subscribe-afterward:

- Module-level `store` (URL → entry), `subscribers` (per-URL notify sets), and
  `inFlight` (URL → fetch promise).
- First card for a URL calls `ensureFetch`; every card for the same URL shares
  **one fetch** and one cache entry.
- `publish` notifies subscribers; each mounted card mirrors the entry via
  `setState`, so stats are derived, updates flow in one direction, and
  duplicate links stay in sync.
- `fetchPreview` **never rejects**: on any failure it returns a bare
  `{ url, hostname }`, which renders as a clickable site-name card.
- Loading state shows the **hostname + link icon immediately**, then the card
  fills in as data lands.
- `href` is the response's final URL, `target="_blank"`, `rel="noopener
  noreferrer"`; the image is lazy-loaded with `referrerPolicy="no-referrer"`.

### Decisions & rationale

- **Cards inline, not a link list.** Earlier iterations stripped URLs and
  stacked cards *below* the body. Inline placement keeps the email readable —
  the card *is* the link, exactly where the URL sat. This is the UX shape
  explicitly chosen over alternatives.
- **Per-occurrence rendering.** No deduplication into one card: the body's
  spatial layout is the source of truth, so a URL repeated in two paragraphs
  shows two cards.
- **External store, not per-instance state.** The card's fetch history must
  survive remounts and shared URLs. A per-instance `cancelled` flag caused
  **stuck skeletons**: React StrictMode mounts each component twice in dev; the
  first (cleaned-up) instance set `cancelled = true`, and the surviving
  instance never received the result — so the skeleton persisted forever.
  Badge: the store + subscription pattern is unaffected by double-mount and is
  the sanctioned way to hold shared mutable state derived from effects.

### Edge cases & gotchas

- **`fetch` responses are cached nowhere**: client calls use `cache:
  "no-store"` (the *route's* own in-memory TTL is the only cache, by design).
- **Very long bodies** hit the 500 KB extract cap; links in the truncated tail
  simply won't appear.
- Links at the very end with no trailing prose produce a trailing text segment
  of `""` — handled by the `cursor < text.length` guard.
- Skeleton cards during fetch are `aria-hidden` and show the hostname — screen
  readers get the hostname, not silent placeholders.

## Verification

- Vitest: `lib/jobhunt/links.test.ts` — `splitTextAndLinks` (trailing
  punctuation, lookalikes, multiple/repeated links) and `parseOpenGraph`
  (meta priority, entity decoding, relative resolution). Suite: 44 tests pass.
- `pnpm lint` / `pnpm typecheck` / `pnpm build` green.
- Manual: open an email with 2–3 links → cards appear inline at the URL spots,
  hostname resolves instantly, rich metadata fills in, repeated links update
  together, slow/failing sites degrade to site-name cards, and navigation lands
  on the *unredirected* page matching the card's title.