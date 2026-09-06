# Plan — Layer 1 Email Discovery (`lib/jobhunt/`)

**Status:** implemented. Mirrors `doc/main-feature/01-email-discovery.md`.

## Structure

```
lib/jobhunt/
├── types.ts                 # CandidateEmail (+ future JobStatus, Confidence)
├── config/
│   ├── ats-domains.ts       # Strategy A: linkedin.com, indeed.com, jobstreet.com,
│   │                        #   jobstreet.com.ph, onlinejobs.ph (editable)
│   ├── keywords.ts          # Strategy B subject + Strategy C sent keywords
│   └── labels.ts            # jobHuntLabel = "JobHunt"
├── gmail/
│   ├── oauth.ts             # moved from lib/gmail/oauth.ts (OAuth + token refresh)
│   ├── search.ts            # buildDiscoveryQuery(config) — pure query builder
│   └── client.ts            # listMessages → batchGetMessages(metadata)
├── discovery/
│   └── index.ts             # discoverCandidates(token, { maxResults=100 })
│                            #   search→list→batch→map; [discovery] debug logs
└── README.md                # folder ⇄ doc layer map + subdomain tuning note
```

## Single Gmail query (A ∪ B ∪ C ∪ D)

```
((from:linkedin.com OR from:indeed.com OR from:jobstreet.com OR
  from:jobstreet.com.ph OR from:onlinejobs.ph) OR
 ("your application" OR "thank you for applying" OR interview OR
  "next steps" OR "we regret to inform" OR position OR role) OR
 (from:me (resume OR application OR "cover letter") has:attachment filename:pdf) OR
 label:JobHunt)
```

## API

`GET /api/jobhunt/discover` — session-guarded; token via `getValidAccessToken`.

- `200` → `{ query, count, candidates }`
- `401` → `{ error: "not_signed_in" }`
- `409` → `{ error: "gmail_not_connected", connectUrl: "/api/gmail/connect" }`
- `502` → `GoogleAuthError` / upstream errors; `400` → `GmailApiError` (client-side)

`CandidateEmail` = `{ id, threadId, date, from, to, subject, snippet }` — flat and
table-shaped for the future dashboard renderer (`components/ui/table.tsx`).

## Decisions

- **Stateless** — no DB writes in this layer.
- **Config as TS modules** in `config/` (editable, no fetch logic).
- **Keep** `app/api/gmail/connect|callback` paths (registered Google redirect URIs).

## Verification

- Vitest: `lib/jobhunt/__tests__/search.test.ts` (query builder + config).
- `lint` / `typecheck` / `test` / `build`.

## Future

- Dashboard renders `candidates` with the installed animated table
  (`components/ui/table.tsx` + framer-motion).
- Next layers: `classification/` (02), then `extraction/` (03).