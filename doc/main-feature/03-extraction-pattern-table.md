# Layer 3 — Extraction: the pattern table

This is the core of the rule-based system. Extraction pulls out **company**
and **role** from an email that's already been classified as job-related.

## The pattern table as a rules engine

Think of it as a table with one row per known pattern, tied to a
platform/sender. Each row is a matcher (domain + regex/keyword) plus an
action (which field it fills).

| sender_domain | subject_pattern | extract_company | extract_role |
|---|---|---|---|
| `greenhouse.io` | `Your application to (.+)` | subject capture group | body line match |
| `lever.co` | `Application received` | sender display name field | body match |
| `myworkday.com` | `Thank you for applying to (.+)` | subject regex | subject regex |
| `linkedin.com` | `Your application was sent to (.+)` | subject regex | subject regex |

Run every incoming email against this table top-to-bottom; the first (or
best) match wins.

## Extraction quality varies by source

**Known ATS platforms (high confidence)**
Subject line formats are consistent per-platform, so one regex per platform
reliably extracts company/role. This covers the majority of your email
volume since most companies use one of a handful of ATS platforms.

**Unknown senders / direct recruiter emails (low confidence)**
Without AI, extraction here is weak. Realistic fallbacks, in order of
preference:

1. Sender's display name as a company guess
2. Sender's email domain (strip `@` and TLD) as a company guess
3. Leave role blank for manual fill-in

## Confidence tagging

Every extracted field should carry a confidence level:

- **High** — matched a known ATS pattern, fields extracted directly
- **Low** — matched only generic keywords, fields guessed or blank

Low-confidence entries should be visually flagged in the UI for manual
review, not silently trusted.

## Practical notes

- Store the pattern table as data (JSON or DB rows), not hardcoded logic, so
  new platform patterns can be added without a redeploy.
- Store the raw email content alongside parsed output, so you can re-run
  extraction later after adding new pattern rows — without re-fetching from
  Gmail.
- Store which pattern-table row matched (a pattern ID/name) with each parsed
  result, so you can debug why a given entry was classified/extracted the
  way it was.
- Expect the long tail (one-off recruiter emails) to always need manual
  correction — this is the honest tradeoff of skipping AI extraction.
