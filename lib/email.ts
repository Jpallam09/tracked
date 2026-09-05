import { Resend } from "resend"

type SendEmailParams = {
  to: string
  subject: string
  html: string
}

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Tracked <onboarding@resend.dev>",
    to,
    subject,
    html,
  })
}
