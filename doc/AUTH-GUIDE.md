# AUTH-GUIDE: What Every File Does and How Auth Flows

A plain-English walkthrough of the email/password login & signup system in this
app (better-auth + Drizzle + Neon + Next.js App Router). Read top to bottom
once, then use it as a reference.

The single mental model to hold onto: **there are two halves — a server that
owns the logic and the database, and a client that talks to it. better-auth
acts as a bridge between the two.**

---

## 1. The big picture: client vs server

```
Browser (client)                          Server (Node/Next)
─────────────                            ─────────────────
login/signup form    ──POST──▶  /api/auth/[...]  ──▶  better-auth instance
  authClient.*()                                  (lib/auth.ts)
                                                      │   validates, stores
                                                      ▼
                                              Drizzle adapter
                                                      │
                                                      ▼
                                              Neon (Postgres)
```

- Anything in `lib/` that imports server-only things (database, better-auth
  "server" instance) must never be imported into a component that runs in the
  browser — that's why there are **two** auth files (`auth.ts` and
  `client-auth.ts`).
- Your forms are **client** components (`"use client"`). They can't touch the
  database. They only send requests.
- The **API route** is the handshake point: the client hits it, and it hands
  the request to better-auth, which does the real work.

---

## 2. File-by-file breakdown

### a) `lib/db/schema.ts` — the database tables (source of truth)
Defines all Drizzle tables. The auth-relevant ones are:

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `user` | One row per account | `id`, `firstName`, `lastName`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt` |
| `session` | One row per logged-in browser | `token`, `expiresAt`, `userId` |
| `account` | Credentials / providers for a user | `userId`, `providerId`, `issuer`, `accountId`, `password` (hashed), OAuth token fields |
| `verification` | One-time tokens (email verify, reset) | `identifier`, `value`, `expiresAt` |

- Drizzle properties (`firstName`) are mapped to physical DB columns
  (`first_name`) via `text("first_name")`.
- `db:generate`/`db:migrate` produce/apply SQL from this file — it's the single
  source of truth; never hand-edit the database.

### b) `lib/db/index.ts` — the database connection
```ts
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle({ client: sql })
export { schema }
```
- Creates the Drizzle client backed by the Neon Postgres driver.
- Re-exports `schema` so other files can import types and pass the schema to
  the adapter.
- This **must not** be imported by client components (it contains the DB URL).

### c) `lib/auth.ts` — the server-side auth instance ("the brain")
This is the core config. `authOptions` is built and passed to `betterAuth(...)`:

```ts
export const authOptions = {
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  user: {
    fields: { name: "firstName" },        // <-- the gotcha, see §4
    additionalFields: { lastName: { type: "string", required: true } },
  },
  plugins: [nextCookies()],
}
export const auth = betterAuth(authOptions)
```

What each part does:
- `drizzleAdapter(...)` — tells better-auth "your data lives in PostgreSQL via
  this Drizzle `db`." The `schema` argument is required so the adapter knows the
  real table objects. (Without it you get *"Schema not found"*.)
- `emailAndPassword.enabled` — turns on the email+password endpoints.
- `user.fields / additionalFields` — extend/remap the built-in user model
  (explained in §4).
- `plugins: [nextCookies()]` — lets better-auth read/write cookies in Next.js
  (needed for sessions and edge/proxy environments).
- Exporting `authOptions` separately lets the **client** (d) infer the same
  field types without importing server code.

### d) `lib/client-auth.ts` — the browser-side auth client
```ts
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof authOptions>()],
})
```
- A thin wrapper that sends requests to `/api/auth/*` on your behalf.
- This is what your forms/UI import — it is **safe** to use in client
  components.
- `inferAdditionalFields<typeof authOptions>()` is a **type-only** import that
  copies your custom field types (`lastName`) into the client so
  `authClient.signUp.email({ ... })` type-checks.

### e) `app/api/auth/[...all]/route.ts` — the catch-all API route
```ts
export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth)
```
- The `[...all]` folder matches `/api/auth/<anything>`.
- `toNextJsHandler(auth)` converts better-auth's internal handler into Next.js
  route handlers.
- This one file exposes every auth endpoint:
  - `/api/auth/sign-up/email`
  - `/api/auth/sign-in/email`
  - `/api/auth/sign-out`
  - `/api/auth/get-session`
- **Dependency:** it imports the *server* `auth` (§c). The client (§d) sends
  requests here.

### f) `proxy.ts` — the route guard (Next.js 16 "middleware")
```ts
export async function proxy(request: NextRequest) {
  // read session via auth.api.getSession({ headers })
  // redirect /dashboard → /login if no session
  // redirect /login, /signup → /dashboard if there IS a session
}
```
- Runs before a page is served. It's an edge-level gate.
- Reads the session cookie and decides whether to let the request through.
- The `matcher` config limits which paths it runs on (excludes static assets
  and `/api`).

### g) `components/signup-form.tsx` & `components/login-form.tsx` — the client forms
- `"use client"` so they can use hooks and `authClient`.
- On submit they call:
  - Signup: `authClient.signUp.email({ email, password, name: firstName, lastName })`
  - Login: `authClient.signIn.email({ email, password })`
- On success they `router.push("/dashboard")`; on error they show the message.
- **Dependency:** import `authClient` from `lib/client-auth.ts` (§d).

### h) `components/nav-user.tsx` — shows the logged-in user + logout
- Calls `authClient.useSession()` to read the current user.
- "Log out" calls `authClient.signOut()` then redirects to `/login`.
- **Dependency:** imports `authClient` (§d).

---

## 3. The sequence of events

### Sign-up
1. User submits `signup-form.tsx`.
2. `authClient.signUp.email(...)` → `POST /api/auth/sign-up/email`.
3. The catch-all route (§e) hands it to the better-auth server instance (§c).
4. better-auth hashes the password and inserts a `user` row (with
   `first_name`, `last_name`) **and an `account` row** (provider `credential`,
   `issuer`, `accountId`) via the Drizzle adapter.
5. better-auth creates a `session` row and sets a session **cookie** in the
   response.
6. The form redirects to `/dashboard`.

### Login
1. User submits `login-form.tsx`.
2. `authClient.signIn.email(...)` → `POST /api/auth/sign-in/email`.
3. better-auth looks up the user by email, verifies the hashed password against
   the `account.password`, creates a `session` row, sets the cookie.
4. Form redirects to `/dashboard`.

### Visiting a protected page
1. Browser requests `/dashboard`.
2. `proxy.ts` (§f) reads the session cookie and checks it server-side.
3. No valid session → redirect to `/login`. Valid → allow through.

### Logout
1. "Log out" → `authClient.signOut()` → `POST /api/auth/sign-out`.
2. better-auth deletes the session row and clears the cookie.

---

## 4. The gotcha: `name` → `firstName`

better-auth ships with a **built-in field literally named `name`** (e.g.
`signUp.email()` requires a `name` argument). Your database uses `first_name`
and `last_name` instead. So we bridge it:

```ts
user: {
  fields: { name: "firstName" },        // "name" (built-in) → drizzle "firstName" → column "first_name"
  additionalFields: { lastName: { ... } }, // "lastName" → column "last_name"
}
```

- `fields.name = "firstName"` tells better-auth *"wherever I say `name`, read
  and write the user's `firstName` drizzle property / `first_name` column."*
- `lastName` is an **additional** custom field on top of the built-in ones.
- Result: your schema, DB, and forms all use readable `firstName`/`lastName`;
  only better-auth's internal API keeps the word `name`.

Why you had to pass `schema` to the adapter: without the real table objects,
the adapter throws *"Schema not found"* / *"field X does not exist."* The adapter
matches better-auth's logical field names against **drizzle property names**,
hence the remap.

---

## 5. Key resources

- Better Auth — official docs: core concepts, email/password, session/cookies.
  https://www.better-auth.com/
- Better Auth Drizzle adapter docs — why `schema` must be passed,
  field-name mapping. https://www.better-auth.com/docs/adapters/drizzle
- Next.js App Router docs — route handlers, middleware/proxy, server & client
  components. https://nextjs.org/docs
- Drizzle ORM docs — schemas and migrations. https://orm.drizzle.team
- Better Auth GitHub issues/discussions — real-world debugging.
  https://github.com/better-auth/better-auth/discussions

---

## 6. One-sentence summary of the dependencies

`forms` → `client-auth` → `/api/auth/[...]` route → `auth` (server) →
`drizzle adapter` → `db`(+`schema`) → Neon; while `proxy` gates pages using the
same `auth` instance, and `nav-user` reads the live session via `authClient`.
