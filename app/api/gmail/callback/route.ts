import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { gmailAccount } from "@/lib/db/schema"
import { db } from "@/lib/db"
import {
  GoogleAuthError,
  exchangeCode,
  fetchGmailAddress,
} from "@/lib/jobhunt/gmail/oauth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")
  const state = url.searchParams.get("state")
  const cookieStore = await cookies()
  const expectedState = cookieStore.get("gmail_oauth_state")?.value

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`/?gmail=error&reason=${encodeURIComponent(message)}`, request.url)
    )

  if (error) {
    return fail(`Google denied access${error === "access_denied" ? "" : `: ${error}`}`)
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("State mismatch — retry connecting Gmail")
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) {
    return fail("Not signed in")
  }

  try {
    const tokens = await exchangeCode(code)
    const gmailAddress = await fetchGmailAddress(tokens.accessToken)

    await db
      .insert(gmailAccount)
      .values({
        userId: session.user.id,
        email: gmailAddress,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? "",
        accessTokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope,
      })
      .onConflictDoUpdate({
        target: gmailAccount.userId,
        set: {
          email: gmailAddress,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? "",
          accessTokenExpiresAt: tokens.expiresAt,
          scope: tokens.scope,
          updatedAt: new Date(),
        },
      })

    const byEmailMatch =
      session.user.email?.toLowerCase() === gmailAddress.toLowerCase()
    const response = NextResponse.redirect(
      new URL(`/?gmail=connected&matched=${byEmailMatch}`, request.url)
    )
    response.cookies.delete("gmail_oauth_state")
    return response
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      return fail(err.message)
    }
    console.error("gmail callback failed", err)
    return fail("Unexpected error while connecting Gmail")
  }
}