import { betterAuth } from "better-auth"

export const baseAuthOptions = {
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
} satisfies Omit<Parameters<typeof betterAuth>[0], "database" | "plugins">

export type BaseAuthOptions = typeof baseAuthOptions
