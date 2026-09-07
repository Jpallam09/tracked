# Layer 1 — Discovery: finding candidate emails

> **Status: implemented.** Shipped in `lib/jobhunt/` — see
> `doc/ats-track/01-email-discovery.md` for the build record. The text below
> is the design intent; the two must not drift.

Before anything can be parsed or classified, you need a narrowed-down set of
candidate emails out of the full inbox. This layer is about **casting a wide
net cheaply**, using Gmail's server-side search rather than pulling every
message and filtering client-side.

## Strategy A — known sender domains (ATS/platform whitelist)

Most job platforms funnel through a small number of applicant tracking
systems (ATS). A domain whitelist catches the bulk of automated
confirmation/status emails. The live list lives in
`lib/jobhunt/config/ats-domains.ts`:

- `linkedin.com`
- `indeed.com`
- `jobstreet.com`
- `jobstreet.com.ph`
- `onlinejobs.ph`

It's a TS module today — an editable-data list, not logic — so it can grow as
you notice new platforms. The tradeoff is that a change is a deploy, not a DB
edit.

## Strategy B — keyword search (subject/body)

For emails that don't come from a known ATS domain (e.g. a recruiter emailing
you directly from `@company.com`), search subject/body for phrases. The live
list lives in `lib/jobhunt/config/keywords.ts` (`subjectKeywords`):

- "your application"
- "thank you for applying"
- "interview"
- "next steps"
- "we regret to inform"
- "position"
- "role"

## Strategy C — emails you sent

`from:me` combined with:

- Keywords (`sentKeywords`: "resume", "application", "cover letter")
- Attachment presence: `has:attachment filename:pdf`

This catches direct applications you sent yourself (not through a job board).

## Strategy D — user-assisted labeling (fallback/safety net)

Apply a Gmail label named `JobHunt` (`lib/jobhunt/config/labels.ts`) to
threads manually when automated detection misses something. This isn't a
workaround — it's a deliberate fallback that most email-parsing tools rely on
quietly. Emails with this label always match, regardless of the other
strategies.

## The combined query

All four strategies fold into **one** Gmail search in `buildDiscoveryQuery`
(`lib/jobhunt/gmail/search.ts`) using OR logic — no per-strategy round trips:

```
((from:linkedin.com OR from:indeed.com OR from:jobstreet.com OR
  from:jobstreet.com.ph OR from:onlinejobs.ph) OR
 ("your application" OR "thank you for applying" OR interview OR
  "next steps" OR "we regret to inform" OR position OR role) OR
 (from:me (resume OR application OR "cover letter") has:attachment filename:pdf) OR
 label:JobHunt)
```

Multi-word phrases are quoted; everything else is joined into a single OR
query (`lib/jobhunt/__tests__/search.test.ts` covers the builder).

## How the fetch stays cheap

- `discoverCandidates(token, { page, pageSize })` walks Gmail page tokens and
  batch-fetches **metadata only** (headers + snippet, ~1 quota unit each) —
  full bodies are deliberately never fetched here.
- Fixed page size 20: page N costs N list calls plus ≤20 metadata reads,
  never a full-inbox scan.
- `resultSizeEstimate` from `messages.list` drives the "N candidate emails
  found" count — an estimate (often thread-heavy), never treated as exact.
- Discovery is stateless: no DB writes; the Gmail token lives in the
  auth/oauth layer.

## Practical notes

- The knobs you tune most (domains, keywords, label) live in
  `lib/jobhunt/config/` as typed TS modules — edit + deploy to change.
- This layer intentionally over-includes (casts wide). Precision is handled
  downstream (Layer 2 — classification, see `02-classification.md`).
- Build record / request flow / error contracts:
  `doc/ats-track/01-email-discovery.md`.