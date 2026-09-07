# Tracked

Tracked is a job application tracker built with Next.js that imports your Gmail and keeps tabs on every application you send out.

![Tracked landing page](/public/landing-page.png)

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) — React 19, TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (base-lyra)
- [better-auth](https://better-auth.com) — email/password auth, email verification, password reset
- [Drizzle ORM](https://orm.drizzle.team) + [Neon](https://neon.tech) (Postgres)
- [Resend](https://resend.com) — transactional email
- [Framer Motion](https://motion.dev) — animations
- [Vitest](https://vitest.dev) + Testing Library — component tests

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io/installation) — this project uses pnpm, not npm

## Getting started

```bash
# 1. Clone the repository
#    (add your clone URL here)

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
```

Then open `.env` and fill in the values:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string from Neon |
| `BETTER_AUTH_SECRET` | Secret for signing auth sessions (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | `http://localhost:3000` in development |
| `RESEND_API_KEY` | API key from Resend for sending emails |
| `EMAIL_FROM` | Verified "From" address, e.g. `Tracked <onboarding@resend.dev>` |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID (Gmail access) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### Optional: Gmail integration

For Gmail importing, create an OAuth client at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with redirect URI `http://localhost:3000/api/gmail/callback`, enable the Gmail API, and add the `gmail.readonly` scope.

## Database setup

```bash
pnpm db:generate   # generate SQL migrations from lib/db/schema.ts
pnpm db:migrate    # apply migrations to your Neon database
```

Running locally without migrations? `pnpm db:push` pushes the schema directly to Neon.

## Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check (`tsc --noEmit`) |
| `pnpm format` | Prettier write |
| `pnpm test` / `pnpm test:watch` | Run Vitest |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema directly to Neon |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |