import "dotenv/config"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"

export const authOptions = {
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    fields: {
      name: "firstName",
    },
    additionalFields: {
      lastName: {
        type: "string",
        required: true,
      },
    },
  },
  plugins: [nextCookies()],
} satisfies Parameters<typeof betterAuth>[0]

export const auth = betterAuth(authOptions)
