import { betterAuth } from "better-auth"
import { sendEmail } from "@/lib/email"

export const baseAuthOptions = {
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h1 style="font-size: 20px; margin: 0 0 16px;">Verify your email</h1>
            <p style="color: #555; line-height: 1.6;">Hi ${user.name}, thanks for creating a Tracked account. Please confirm your email address to finish signing up.</p>
            <a href="${url}" style="display: inline-block; background: #111; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Verify email</a>
            <p style="color: #999; font-size: 13px;">This link is valid for a limited time. If you didn't request this, you can ignore this email.</p>
          </div>
        `,
      })
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your password</h1>
            <p style="color: #555; line-height: 1.6;">Hi ${user.name}, we received a request to reset your Tracked password. Click below to choose a new one.</p>
            <a href="${url}" style="display: inline-block; background: #111; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Reset password</a>
            <p style="color: #999; font-size: 13px;">This link is valid for a limited time. If you didn't request this, you can ignore this email.</p>
          </div>
        `,
      })
    },
    onExistingUserSignUp: async ({ user }) => {
      void sendEmail({
        to: user.email,
        subject: "Sign-up attempt with your email",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h1 style="font-size: 20px; margin: 0 0 16px;">Sign-up attempt</h1>
            <p style="color: #555; line-height: 1.6;">Hi ${user.name}, someone tried to create a Tracked account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.</p>
          </div>
        `,
      })
    },
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
