# Layer 2 — Classification: is this actually job-related?

Discovery over-includes on purpose. Classification narrows the candidate set
down to emails that are genuinely job-application-related, using only
domain and keyword matching (no AI).

## Trust known ATS domains outright

If the sender domain matches an entry in the ATS whitelist (see
`01-email-discovery.md`), treat the email as job-related without further
checks. These platforms don't send unrelated mail from their transactional
domains.

## Keyword matching for everything else

For emails from unknown senders, check subject/body against a **positive
keyword list**:

- "application", "applied", "position", "role", "interview", "resume",
  "next steps", "hiring", "recruiter"

## The false-positive problem

Generic keyword matching produces noise. Examples that will slip through a
naive match:

- "Your application to become a Chase cardholder..."
- "Complete your loan application"
- "Your rental application has been received"

## Negative / exclusion keyword list

Build a list of phrases that, if present, disqualify an otherwise-matching
email:

- "credit card", "loan", "mortgage", "rental application", "account
  application", "insurance application", "visa application"

Run exclusion checks **before** accepting a positive keyword match — an
email that matches both a positive and negative keyword should be dropped.

## Priority order

1. Known ATS domain → accept immediately, skip keyword checks.
2. Gmail label `#JobHunt` present → accept immediately (manual override).
3. Positive keyword match AND no negative keyword match → accept.
4. Otherwise → discard.

## Practical notes

- The negative list matters more than people expect — it's often the
  difference between a usable tracker and one full of junk entries.
- Keep both keyword lists as editable data, not hardcoded strings, since
  you'll be tuning them as false positives/negatives show up.
- Classification only answers yes/no. It does **not** extract company, role,
  or status — that's the next layer.
