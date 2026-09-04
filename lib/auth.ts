import "dotenv/config"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { baseAuthOptions } from "@/lib/base-auth"

export { baseAuthOptions }

export const authOptions = {
  ...baseAuthOptions,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [nextCookies()],
} satisfies Parameters<typeof betterAuth>[0]

export const auth = betterAuth(authOptions)
