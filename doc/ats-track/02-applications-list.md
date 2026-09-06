# Applications list (`/applications`)

## Purpose

The `/applications` page is the primary dashboard entry point for the tracker:
a server-rendered, paginated table of candidate emails where each row can be
opened into the read drawer. It is built to feel like part of the app rather
than a bolt-on — viewport-locked (the page never scrolls the document), dense,
keyboard-accessible, and able to fail gracefully.

## How it works

The page is a server component (`app/(dashboard)/applications/page.tsx`). It
does three blocking things before any markup is produced:

```
1. auth.api.getSession            → no session → redirect("/login")
2. getValidAccessToken(user.id)   → GoogleAuthError
                                      not_connected → ConnectGmail CTA
                                      otherwise    → ErrorState
3. discoverCandidates(token, {page, pageSize}) (see 01 docs)
   GmailApiError → 403/429 → friendly "rate-limiting" message
                else      → ErrorState with status
```

`?page=` is read from search params, clamped to `>= 1`, and the result renders
`ApplicationsTable`. Everything else is client-side table behavior.

### Layout discipline (viewport lock)

The dashboard shell (`app/(dashboard)/layout.tsx`) is built to never scroll the
document: the sidebar inset is a flex column whose content area is
`min-h-0 flex-1 overflow-y-auto`, and the app header is `sticky top-0`. The
applications page inherits this, so **only the content column scrolls** and the
sidebar/header never move off-screen. This was a deliberate fix — before it,
the document scrolled behind the sticky header and pagination, which felt
broken. Keep any new page inside the shell from introducing its own document
scroll (`h-screen`/`overflow-hidden` on the page itself is an anti-pattern
here).

### Table

`components/jobhunt/applications-table.tsx` renders a compact `table-fixed`
table with four fixed-width columns (Date / From / Subject / Snippet). Cells
`truncate` with `title` tooltips, so long senders and subjects degrade to
ellipses instead of wrapping and wrecking row height.

Rows are interactive directly:

- `role="link"` + `tabIndex={0}` so keyboard users can tab to a row
- Enter / Space acts the same as click
- `aria-label="Open email from …"`
- the open row is highlighted with `bg-accent/60`

Clicking a row toggles `selectedId`, which drives the `EmailReader` drawer
(see `03-email-read-previews.md`).

### Pagination

Pagination lives at the bottom of the table with `mt-auto` so it hugs the
footer of the scrollable area:

- Page count derived from `totalEstimate`, clamped to `>= 1`.
- `pageNumbers()` shows first + last with an ellipsis window (±1 around the
  current page) rather than a long numbered strip.
- Prev is disabled (`pointer-events-none` + `aria-disabled`) at page 1; Next is
  disabled when `hasNext` is false.
- Links carry `?page=N` and are server-rendered — pagination is a real
  navigation, not client state, so refreshes and deep links stay consistent.

### Refresh

The `RefreshButton` re-runs the server component (`router.refresh`) so the page
reflects new mail without a manual reload.

## States the page can be in

| State | Trigger | Renders |
| --- | --- | --- |
| Login wall | no session | `redirect("/login")` |
| Connect CTA | Gmail not connected | Explain "Continue with Google" button → `/api/gmail/connect` |
| Error | token failure / provider 4xx-5xx | title + message (+ friendly rate-limit text) |
| Empty | query found 0 candidates | dashed empty state pointing at `config/` + `#JobHunt` label |
| Table | everything healthy | rows + count + pagination |

Every non-happy state is an intentional component (`ConnectGmail`,
`ErrorState`, empty block) — there is no unsafe fallback that renders a broken
table.

## Decisions & rationale

- **Server-render the data, keep the page dumb.** All auth, token
  refresh, and Gmail negotiation happens in the server component; the client
  table has no idea any of it exists. Errors become pre-rendered states, not
  client fetch waterfalls.
- **`table-fixed` + column widths.** The alternative (auto layout) reflows as
  content loads and makes row hover/scanning flicker. Fixed layout guarantees
  stable geometry.
- **Navigation-driven pagination over client state.** Cheaper to reason about,
  correct on refresh, and the server component already rebuilds results for
  each page anyway.

## Edge cases & gotchas

- **`data-slot` hydration clash.** A shadcn pagination control broke SSR
  hydration because an overriding `data-slot` collided with what the primitive
  expects. When tuning shadcn primitives, never hand it a conflicting slot
  attribute; rely on the existing props/variants.
- **`totalEstimate` is an estimate.** `pageCount` can drift slightly from the
  *real* number of pages; `hasNext` (from the actual page token) is the source
  of truth for the Next button.
- **Page numbers outside range.** `?page=999` is clamped down; negative/non
  numeric values resolve to page 1.
- **Rate-limit errors** are surfaced verbatim-softened ("Gmail is
  rate-limiting — try again shortly") rather than showing a raw `429`.

## Verification

- Manual: paginate through a multi-page inbox, deep-link `?page=3`, hit Enter
  and Space on a row, tab through, refresh with the button.
- `pnpm lint` / `pnpm typecheck` / `pnpm build`.