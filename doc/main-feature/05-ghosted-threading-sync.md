# Layer 5 — Ghosted detection, threading/dedup, sync mechanics

## Ghosted detection

Computed purely from elapsed time, not parsed from any email:

- Track the date of the last interaction (sent or received) per job/thread.
- If no new email has arrived after N days (a configurable threshold — e.g.
  30 days) since the last interaction, and the job isn't already in a
  terminal state (offer/rejected), mark it as "ghosted."
- This should run as a periodic check over existing job entries, not as
  part of the email-parsing pipeline itself.

## Threading and deduplication

Gmail groups related messages into threads (`threadId`). One job
application typically spans a full thread: confirmation → interview invite
→ rejection/offer.

- Treat the **thread as the unit of a job application** — one job entry
  with multiple interaction events — not one job entry per email.
- Watch for the same company/role appearing across **different** threads
  (e.g., you apply via LinkedIn and a recruiter also emails you directly
  about the same role). This is a fuzzy-matching problem:
  - Match on normalized company name (strip suffixes like "Inc", "LLC",
    lowercase, trim whitespace)
  - Combined with rough date proximity (e.g., within a few days)
  - There's no universal ID linking these across platforms, so this
    matching will occasionally be wrong — surface it as a suggested merge
    for manual confirmation rather than auto-merging silently.

## Sync mechanics

**Incremental sync via `historyId`**
Gmail API supports fetching only changes since your last sync point rather
than re-scanning the whole inbox each time. Store the last-seen `historyId`
and request only deltas on each sync.

**On-demand vs. background**
- On-demand ("sync now" button) or a daily scheduled job is simpler and
  avoids the complexity of Gmail push notifications (which require a
  Pub/Sub subscription).
- Push notifications give real-time updates but are likely overkill for a
  personal tracker — on-demand/daily is the practical default.

**Batching**
Fetch message ID lists first, then batch-get full message content, rather
than issuing one API call per email. This respects Gmail API quotas and is
significantly faster.

## Practical notes

- Store `threadId` on every job entry so future syncs can append new
  interactions to the correct existing job rather than creating duplicates.
- Log every sync run (timestamp, historyId used, number of new
  emails/threads found) for debugging when parsing behaves unexpectedly.
