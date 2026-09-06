import { GMAIL_API_URL, GoogleAuthError } from "@/lib/jobhunt/gmail/oauth"

const METADATA_HEADERS = ["Date", "From", "To", "Subject"]

export class GmailApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "GmailApiError"
  }
}

export interface GmailMessageSummary {
  id?: string
  threadId?: string
  snippet?: string
}

export interface GmailMetadataMessage extends GmailMessageSummary {
  internalDate?: string
  payload?: {
    headers?: Array<{ name?: string; value?: string }>
  }
}

interface GmailErrorBody {
  error?: {
    message?: string
  }
}

const QUOTA_MESSAGE = /rate.?limit|quota/i
const MAX_ATTEMPTS = 3

async function requestJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
  attempt = 1
): Promise<T> {
  const response = await fetch(`${GMAIL_API_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  })
  const data = (await response.json()) as T & GmailErrorBody
  const rateLimited =
    response.status === 429 ||
    (response.status === 403 && QUOTA_MESSAGE.test(data.error?.message ?? ""))
  if (rateLimited && attempt < MAX_ATTEMPTS) {
    const delay = 300 * 3 ** (attempt - 1) + Math.random() * 200
    await new Promise((resolve) => setTimeout(resolve, delay))
    return requestJson<T>(path, accessToken, init, attempt + 1)
  }
  if (!response.ok) {
    if (response.status === 401) {
      throw new GoogleAuthError(
        data.error?.message ?? "Gmail access token rejected",
        "token_rejected"
      )
    }
    throw new GmailApiError(
      data.error?.message ?? `Gmail API error ${response.status}`,
      response.status
    )
  }
  return data
}

export interface GmailListResult {
  messages: GmailMessageSummary[]
  nextPageToken?: string
  resultSizeEstimate?: number
}

export async function listMessages(
  accessToken: string,
  query: string,
  options: { maxResults?: number; pageToken?: string } = {}
): Promise<GmailListResult> {
  const params = new URLSearchParams({ q: query })
  if (options.maxResults !== undefined) {
    params.set("maxResults", String(options.maxResults))
  }
  if (options.pageToken) {
    params.set("pageToken", options.pageToken)
  }
  const data = await requestJson<{
    messages?: GmailMessageSummary[]
    nextPageToken?: string
    resultSizeEstimate?: number
  }>(`/users/me/messages?${params.toString()}`, accessToken)
  return {
    messages: data.messages ?? [],
    nextPageToken: data.nextPageToken,
    resultSizeEstimate: data.resultSizeEstimate,
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await run(items[index])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  )
  return results
}

export async function batchGetMessages(
  accessToken: string,
  ids: string[]
): Promise<GmailMetadataMessage[]> {
  if (ids.length === 0) return []
  const params = METADATA_HEADERS.map(
    (header) => `metadataHeaders=${encodeURIComponent(header)}`
  ).join("&")
  return mapWithConcurrency(ids, 10, (id) =>
    requestJson<GmailMetadataMessage>(
      `/users/me/messages/${encodeURIComponent(id)}?format=metadata&${params}`,
      accessToken
    )
  )
}
