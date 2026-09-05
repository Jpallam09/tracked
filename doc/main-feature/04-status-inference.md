# Layer 4 — Status inference

Maps email content to a job-application status using a **trigger-phrase
table**, checked in priority order.

## Status trigger table

| status | trigger phrases |
|---|---|
| rejected | "unfortunately", "not moving forward", "other candidates", "decided to move forward with other applicants", "will not be proceeding" |
| interview | "schedule a call", "next steps", "interview", "available to speak", "book a time" |
| offer | "pleased to offer", "excited to extend an offer", "offer letter", "welcome to the team" |
| screening | "reviewing your application", "in the process of reviewing", "will be in touch" |
| applied | (default — no other match; confirmation-only email) |

## Priority ordering matters

Check rejection phrases **before** generic "next steps" phrases. A
rejection email might still contain language like "if a role opens up in
the future, we'll keep your resume on file" — checking rejection triggers
first avoids misclassifying it as an active next-step.

Suggested check order:
1. Offer triggers
2. Rejection triggers
3. Interview triggers
4. Screening triggers
5. Default to "applied" (confirmation received, no further signal)

## Ghosted is not a content signal

"Ghosted" cannot be detected from any single email's content — it's an
absence of new emails from a given company/thread after N days. This is
computed by your own logic (see `05-ghosted-threading-sync.md`), not
extracted from message text.

## Practical notes

- Keep the trigger-phrase table as editable data — company phrasing for
  rejections especially is varied and euphemistic, so this list grows over
  time as you see new emails.
- A status inferred from generic keyword match (not a known ATS template)
  should carry the same "low confidence" flag as extraction fields, so it's
  surfaced for manual confirmation rather than trusted outright.
- Consider letting a manually-set status always override an inferred one —
  once you've corrected a status by hand, future parsing passes shouldn't
  silently reset it.
