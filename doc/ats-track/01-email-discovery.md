# Email discovery (`lib/jobhunt/`, `app/api/jobhunt/discover`)

## Purpose

Find every Gmail message that is plausibly related to a job application and
surface it as a flat, table-shaped record for the applications page. Discovery
casts a deliberately **wide net** — the classifier layer is a separate concern
that would later narrow results down. This layer only has to be good at not
missing ATS, job-board, and direct-recruiter emails.

The whole thing is server-side and stateless: one authenticated Gmail call
chain, no DB writes, no background jobs.

## How it works

Discovery is a single Gmail search query built from three stacked strategies
plus an opt-in manual label:

```
((from:linkedin.com OR from:indeed.com OR from:jobstreet.com OR
  from:jobstreet.com.ph OR from:onlinejobs.ph) OR
 ("your application" OR "thank you for applying" OR interview OR
  "next steps" OR "we regret to inform" OR position OR role) OR
 (from:me (resume OR application OR "cover letter") has:attachment filename:pdf) OR
 label:JobHunt)
```

- **Strategy A — known senders.** Domains in `lib/jobhunt/config/ats-domains.ts`
  (editable TS module, no code changes needed to tune).
- **Strategy B — subject/body keywords.** `lib/jobhunt/config/keywords.ts`.
- **Strategy C — sent applications.** `from:me` messages with a PDF/application
  attachment (covers emails the *user* sent that a keyword-only query would
  miss, e.g. "sent my resume to X").
- **Strategy D — manual label.** A `JobHunt` label applied to any stray thread
  so it lands in the list without needing a pattern.

### Request flow

```
Server component (applications page)
  auth.api.getSession ── no session → redirect /login
  getValidAccessToken  ── not connected → Connect CTA page
       │
       ▼
discoverCandidates(token, { page, pageSize: 20 })
  listMessages(query)                 1 message-list call (<< page token)
  ── walk pageTokens to requested page
  batchGetMessages(ids)               per-message *metadata* only, concurrency 10
  toCandidateEmail(...)               flat shape: date, from, to, subject, snippet
       │
       ▼
ApplicationsTable (server-rendered, empty/error/table)
```

Two cost levers make this cheap:

- **metadata** format for the batch (headers + snippet only, ~1 quota unit per
  message) — full bodies are deliberately *not* fetched here.
- Fixed **page size 20** and token walking, so page N does N list calls plus at
  most 20 metadata reads, never a full inbox scan.

## Contracts

`GET /api/jobhunt/discover` — session-guarded:

| Status | Case |
| --- | --- |
| `200` | `{ query, page, pageSize, candidates, totalEstimate, hasNext }` |
| `401` | `{ error: "not_signed_in" }` |
| `409` | `{ error: "gmail_not_connected", connectUrl: "/api/gmail/connect" }` |
| `400` / `502` | `GmailApiError` / upstream failures (mapped from error type) |

`CandidateEmail` is deliberately flat and table-shaped:

```ts
{ id, threadId, date, from, to, subject, snippet }
```

## Decisions & rationale

- **Config as TS modules, not DB and not JSON.** The knobs you tune most
  (which senders, which keywords) live in one importable place with types and
  comments; no migration, no fetch layer. Tradeoff: changing a list is a deploy.
- **Stateless.** No write path here. The Gmail connection state lives in the
  auth/oauth layer (`getValidAccessToken` refreshes tokens transparently);
  discovery only ever reads.
- **`count` uses `resultSizeEstimate`**, which Gmail gives for free on
  `messages.list`. It is an estimate (often the *total* thread count, not
  flattened), so the UI renders it as "found" and never treats it as exact.
- **`discoverCandidates` returns pages, not one blob.** Pagination became part
  of this layer (not the page) because the walk must track `nextPageToken`
  across calls; keeping it here keeps the page component dumb.
- **Quota humility.** `format=full` for a whole page would cost 5 units per
  message; metadata-only keeps worst case low and leaves headroom for the
  read-on-open path (`use` a full read only when the user actually opens a
  message — see `03-email-read-previews.md`).

## Edge cases & gotchas

- **`resultSizeEstimate`** tends to over-count (threads vs messages). The list
  shows it as-is; don't build exact-count logic on top of it.
- **Empty result set.** The UI shows a "No candidates found" empty state that
  points at `lib/jobhunt/config/` and the `JobHunt` label rather than dying.
- **Rate limiting.** `403`/`429` from Gmail are mapped to a friendly
  "try again shortly" message in the UI instead of a raw stack.
- **Token expiry mid-session.** Any 401 from Gmail goes through the
  refresh path in `getValidAccessToken`; on hard failure the page renders an
  error state rather than blank.
- **`from:me` sent-attachment matching** can surface application *sent*
  copies — intended, but the `has:attachment filename:pdf` guard stops it from
  matching every "sent" email.
- Page tokens are short-lived Gmail internals. The walk re-requests a fresh
  `nextPageToken` on every call, so a stale token only ever hurts the current
  page, never the next.

## Verification

- Vitest: `lib/jobhunt/__tests__/search.test.ts` (query builder + config
  composition).
- `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` green end-to-end.
- Manual: connect Gmail → `/applications` lists messages → empty/error states
  exercised by temporarily breaking the query config.