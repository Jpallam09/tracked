import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { GmailApiError } from "@/lib/jobhunt/gmail/client"
import { GoogleAuthError, getValidAccessToken } from "@/lib/jobhunt/gmail/oauth"
import { readEmail } from "@/lib/jobhunt/read"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) {
    return NextResponse.json({ error: "not_signed_in" }, { status: 401 })
  }

  const { id } = await params

  let accessToken: string
  try {
    accessToken = await getValidAccessToken(session.user.id)
  } catch (err) {
    if (err instanceof GoogleAuthError && err.code === "not_connected") {
      return NextResponse.json(
        { error: "gmail_not_connected", connectUrl: "/api/gmail/connect" },
        { status: 409 }
      )
    }
    throw err
  }

  try {
    const email = await readEmail(accessToken, id)
    return NextResponse.json(email)
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 502 }
      )
    }
    if (err instanceof GmailApiError) {
      const status = err.status === 429 || err.status >= 500 ? 502 : 400
      return NextResponse.json(
        { error: err.message, status: err.status },
        { status }
      )
    }
    throw err
  }
}
