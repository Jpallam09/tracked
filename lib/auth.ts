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
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      mapProfileToUser: (profile) => {
        const [first = "", ...rest] = profile.name.trim().split(" ")
        return {
          name: first || profile.given_name,
          lastName: rest.join(" ") || profile.family_name,
        }
      },
    },
  },
} satisfies Parameters<typeof betterAuth>[0]

export const auth = betterAuth(authOptions)
