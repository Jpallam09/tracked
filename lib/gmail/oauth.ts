import "dotenv/config"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { gmailAccount } from "@/lib/db/schema"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1"

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"

export class GoogleAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string = "google_auth_error"
  ) {
    super(message)
    this.name = "GoogleAuthError"
  }
}

export interface GoogleConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface TokenSet {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scope?: string
}

export function getGoogleConfig(): GoogleConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const baseUrl = process.env.BETTER_AUTH_URL
  if (!clientId || !clientSecret || !baseUrl) {
    throw new GoogleAuthError(
      "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and BETTER_AUTH_URL must be set in .env",
      "missing_config"
    )
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/gmail/callback`,
  }
}

export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

async function postTokenForm(body: Record<string, string>): Promise<
  Record<string, unknown>
> {
  const { clientId, clientSecret } = getGoogleConfig()
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }),
  })
  const data = (await response.json()) as Record<string, unknown>
  if (!response.ok || typeof data.access_token !== "string") {
    throw new GoogleAuthError(
      `Token request failed: ${JSON.stringify(data)}`,
      "token_request_failed"
    )
  }
  return data
}

export async function exchangeCode(code: string): Promise<TokenSet> {
  const { redirectUri } = getGoogleConfig()
  const data = await postTokenForm({
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })
  return parseTokenResponse(data)
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenSet> {
  const data = await postTokenForm({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  })
  return parseTokenResponse(data)
}

function parseTokenResponse(data: Record<string, unknown>): TokenSet {
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? undefined,
    expiresAt: new Date(
      Date.now() + ((data.expires_in as number | undefined) ?? 3600) * 1000
    ),
    scope: (data.scope as string | undefined) ?? GMAIL_SCOPE,
  }
}

export async function fetchGmailAddress(
  accessToken: string
): Promise<string> {
  const response = await fetch(`${GMAIL_API_URL}/users/me/profile`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const data = (await response.json()) as { emailAddress?: string }
  if (!response.ok || typeof data.emailAddress !== "string") {
    throw new GoogleAuthError(
      `Failed to fetch Gmail profile: ${JSON.stringify(data)}`,
      "profile_fetch_failed"
    )
  }
  return data.emailAddress
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const [account] = await db
    .select()
    .from(gmailAccount)
    .where(eq(gmailAccount.userId, userId))
    .limit(1)
  if (!account) {
    throw new GoogleAuthError("Gmail is not connected", "not_connected")
  }
  if (account.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
    return account.accessToken
  }
  const refreshed = await refreshAccessToken(account.refreshToken)
  await db
    .update(gmailAccount)
    .set({
      accessToken: refreshed.accessToken,
      accessTokenExpiresAt: refreshed.expiresAt,
      scope: refreshed.scope ?? account.scope,
    })
    .where(eq(gmailAccount.id, account.id))
  return refreshed.accessToken
}