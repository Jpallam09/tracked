# Best practices summary

A condensed checklist pulled from all layers.

## Data over code

- Pattern table, keyword lists (positive + negative), and status
  trigger-phrase table should all live as editable data (JSON/DB rows), not
  hardcoded logic. You'll be tuning all three continuously.

## Order matters

- Check specific/high-confidence patterns (known ATS domain) before generic
  ones (keyword match).
- Check rejection triggers before generic "next steps" triggers, since
  rejection phrasing often contains soft follow-up language.

## Confidence, always

- Every parsed field (company, role, status) carries a confidence level:
  high (matched known ATS pattern) or low (guessed/generic match).
- Low-confidence entries are flagged in the UI for manual review — never
  silently trusted.

## Build the negative list early

- An exclusion/negative keyword list (credit card, loan, rental
  applications, etc.) prevents more junk than a good positive list alone —
  prioritize this early rather than as an afterthought.

## Preserve raw data

- Keep raw email content stored even after parsing, so you can re-parse
  later when the pattern table improves, without re-fetching from Gmail.
- Store which pattern-table row matched, for debuggability.

## Manual override is a feature, not a fallback

- A Gmail label (`#JobHunt`) as a forced-include signal, and a manually-set
  status/field that future parsing passes never silently overwrite, are
  both deliberate safety nets — not workarounds. No rule-based system will
  reach 100% coverage.

## Threading and time-based logic stay separate from content parsing

- "Ghosted" and thread-to-job grouping are computed from metadata (time
  elapsed, `threadId`, date proximity) — never inferred from email text.

## Sync efficiently

- Use `historyId` incremental sync, not full-inbox rescans.
- Batch API calls (list then batch-get) instead of one call per email.
- On-demand or daily sync is sufficient for a personal tracker; real-time
  push notifications are likely unnecessary overhead.

## Expect and design for the long tail

- The ~6 major ATS platforms will cover most of your email volume with high
  confidence.
- One-off recruiter and direct-company emails will always need occasional
  manual correction — this is the accepted tradeoff of a rule-based (no AI)
  system.
