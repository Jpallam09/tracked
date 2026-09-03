## Project

Next.js 16 App Router app. React 19. Tailwind CSS v4 (no `tailwind.config` — uses `@theme inline` in `app/globals.css`). shadcn v4 (`base-lyra` style) with `hugeicons`. Package manager is **pnpm**.

## Commands

```bash
pnpm lint          # ESLint (flat config, eslint-config-next)
pnpm typecheck     # tsc --noEmit
pnpm build         # next build (full validation)
pnpm dev           # next dev
pnpm format        # prettier --write "**/*.{ts,tsx}"
```

Run `lint` then `typecheck` before committing. There is no test suite.

## Drizzle

```bash
pnpm db:generate    # generate SQL migrations from lib/db/schema.ts -> ./drizzle
pnpm db:push        # push schema directly to Neon (dev, no migration files)
pnpm db:migrate     # apply generated migrations to the database
pnpm db:studio      # open Drizzle Studio to inspect/update data
```

Single source of truth: tables defined in `lib/db/schema.ts`. `schemaFilter: ["public", "neon_auth"]` in `drizzle.config.ts` limits drizzle-kit to those schemas.

## Auth

- `lib/auth.ts` exports the `better-auth` instance (`emailAndPassword` enabled) wired to Neon via `better-auth/adapters/drizzle`.
- Auth tables (`user`, `session`, `account`, `verification`) live in `lib/db/schema.ts` alongside app tables.
- Client: `import { authClient } from "@/lib/client-auth"` (create client in `lib/`).

## Conventions

- **No semicolons, double quotes, trailing commas `es5`, 80-col print width.** Prettier enforces this via `.prettierrc`.
- **Path alias**: `@/*` maps to project root.
- **shadcn components**: add with `npx shadcn@latest add <component>` — they land in `components/ui/`. Shared aliases are in `components.json` (`@/components`, `@/lib/utils`, `@/hooks`).
- **Utility function** `cn` lives at `lib/utils.ts` (used everywhere for class merging).
- **Tailwind v4**: colors are CSS custom properties bridged through `@theme inline` in `app/globals.css`. Dark mode via `.dark` class (`next-themes` + `ThemeProvider` in root layout).
- **No `tailwind.config.js/ts`** — Tailwind v4 is configured purely through CSS and PostCSS (`@tailwindcss/postcss`).

## Structure

```
app/             # App Router pages: page.tsx, layout.tsx, routes in login/, signup/, dashboard/
components/      # App-level components + components/ui/ for shadcn primitives
hooks/           # Custom React hooks
lib/             # Utilities (cn, etc.)
public/          # Static assets
```
