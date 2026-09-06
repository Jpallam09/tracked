# lib/jobhunt — Job application tracking pipeline

Mirrors `doc/main-feature/` one layer per folder.

| Folder            | Doc layer                                  |
| ----------------- | ------------------------------------------ |
| `gmail/`          | Google/Gmail OAuth + API I/O (search, client) |
| `discovery/`      | 01 — Email discovery                       |
| `classification/` | 02 — (future)                              |
| `extraction/`     | 03 — (future)                              |
| `status/`         | 04 — (future)                              |
| `sync/`           | 05 — (future)                              |
| `config/`         | Editable data (ATS whitelist, keywords, labels) |

## Shape

- `gmail/search.ts` — pure, unit-tested query builder (`buildDiscoveryQuery`).
- `gmail/client.ts` — only place that talks to the Gmail REST API.
- `discovery/index.ts` — orchestration only; logs `[discovery]` lines per run
  (query, counts, ids).

## Tuning notes

- `from:linkedin.com` does not match subdomain senders such as
  `emails.linkedin.com`; add the subdomain to `config/ats-domains.ts` when you
  notice sender addresses it misses.

## Debug

Run discovery for the signed-in session via `GET /api/jobhunt/discover` and
inspect the `[discovery]` server log line.