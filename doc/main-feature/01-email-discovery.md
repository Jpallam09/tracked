# Layer 1 — Discovery: finding candidate emails

Before anything can be parsed or classified, you need a narrowed-down set of
candidate emails out of the full inbox. This layer is about **casting a wide
net cheaply**, using Gmail's server-side search rather than pulling every
message and filtering client-side.

## Strategy A — known sender domains (ATS/platform whitelist)

Most job platforms funnel through a small number of applicant tracking
systems (ATS). A domain whitelist catches the bulk of automated
confirmation/status emails:

- `greenhouse.io`
- `lever.co`
- `myworkday.com`
- `linkedin.com`
- `indeed.com`
- `glassdoor.com`
- `smartrecruiters.com`
- `icims.com`
- `taleo.net`
- `ashbyhq.com`
- `breezy.hr`
- `jobvite.com`

This list should live as data (not hardcoded), so it can grow as you notice
new platforms.

## Strategy B — keyword search (subject/body)

For emails that don't come from a known ATS domain (e.g., a recruiter
emailing you directly from `@company.com`), search subject/body for phrases
like:

- "your application"
- "thank you for applying"
- "interview"
- "next steps"
- "we regret to inform"
- "position"
- "role"

Gmail's query syntax supports OR logic — combine domain whitelist and
keyword search into a **single query** rather than multiple round trips.

## Strategy C — emails you sent

Filter `from:me` combined with:

- Keywords: "resume", "application", "cover letter"
- Attachment presence: `has:attachment filename:pdf`

This catches direct applications you sent yourself (not through a job
board).

## Strategy D — user-assisted labeling (fallback/safety net)

Apply a Gmail label (e.g., `#JobHunt`) to threads manually when automated
detection misses something. This isn't a workaround — it's a deliberate
fallback that most email-parsing tools rely on quietly. Emails with this
label should always be included regardless of what the other strategies
find.

## Practical notes

- Build one combined Gmail search query using OR logic across domain
  whitelist + keyword list, rather than issuing separate API calls per
  strategy.
- Keep the domain whitelist and keyword list as editable data — you'll be
  extending both as you discover new patterns.
- This layer intentionally over-includes (casts wide). Precision is handled
  in the next layer (classification).
