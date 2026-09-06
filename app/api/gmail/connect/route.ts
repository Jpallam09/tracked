import { randomBytes } from "crypto"

import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { buildAuthUrl } from "@/lib/jobhunt/gmail/oauth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) {
    return new Response("Not signed in", { status: 401 })
  }

  const isSecure = new URL(request.url).protocol === "https:"
  const state = randomBytes(32).toString("hex")

  const response = NextResponse.redirect(buildAuthUrl(state))
  response.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: 600,
    path: "/",
  })
  return response
}