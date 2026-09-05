# Gmail job-application parsing — system overview

Rule-based (no AI) approach to scraping and organizing job-application-related
emails from Gmail across multiple platforms (ATS systems, job boards, direct
recruiter emails).

## Why rule-based instead of AI

Everything is matched against a maintained **pattern table** — a lookup of
known senders, subject formats, and keyword phrases. Accuracy depends
entirely on how well that table covers the platforms you actually use. This
is more predictable and debuggable than an AI classifier, at the cost of
weaker coverage for one-off/unknown senders.

## Document index

1. `01-email-discovery.md` — casting a wide net: how to find candidate emails
2. `02-classification.md` — deciding whether a candidate email is actually job-related
3. `03-extraction-pattern-table.md` — the core pattern table schema for pulling out company/role
4. `04-status-inference.md` — mapping phrases to application status
5. `05-ghosted-threading-sync.md` — ghosted detection, threading/dedup, sync mechanics
6. `06-best-practices.md` — summary of practices and tradeoffs to keep in mind

## The pipeline at a glance

```
Gmail search (domain whitelist + keywords)
        ↓
Candidate emails
        ↓
Classification (job-related? using domain + keyword/exclusion lists)
        ↓
Extraction (pattern table: per-platform regex, fallback heuristics)
        ↓
Status inference (trigger-phrase table, priority ordered)
        ↓
Thread grouping (Gmail threadId = one job application)
        ↓
Confidence tagging (high/low) → stored + flagged for manual review if low
```

## Key design decision

Every parsed field carries a **confidence level**. High-confidence data
(from a known ATS pattern) is trusted; low-confidence data (generic keyword
match, guessed from sender name/domain) is visually flagged for manual
correction rather than silently accepted.
