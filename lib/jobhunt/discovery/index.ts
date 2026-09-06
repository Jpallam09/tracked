import {
  batchGetMessages,
  listMessages,
  type GmailMetadataMessage,
} from "@/lib/jobhunt/gmail/client"
import {
  buildDiscoveryQuery,
  type DiscoveryQueryInput,
} from "@/lib/jobhunt/gmail/search"
import type { CandidateEmail } from "@/lib/jobhunt/types"

export const DISCOVERY_PAGE_SIZE = 20

export interface DiscoveryOptions {
  page?: number
  pageSize?: number
  queryInput?: DiscoveryQueryInput
}

export interface DiscoveryResult {
  candidates: CandidateEmail[]
  page: number
  pageSize: number
  hasNext: boolean
  totalEstimate: number
}

function headerValue(message: GmailMetadataMessage, name: string): string {
  return (
    message.payload?.headers?.find(
      (header) => header.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  )
}

function toCandidateEmail(
  message: GmailMetadataMessage
): CandidateEmail | null {
  if (!message.id) return null
  return {
    id: message.id,
    threadId: message.threadId ?? message.id,
    date: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : "",
    from: headerValue(message, "From"),
    to: headerValue(message, "To"),
    subject: headerValue(message, "Subject"),
    snippet: message.snippet ?? "",
  }
}

export async function discoverCandidates(
  accessToken: string,
  options: DiscoveryOptions = {}
): Promise<DiscoveryResult> {
  const { page = 1, pageSize = DISCOVERY_PAGE_SIZE, queryInput } = options
  const query = buildDiscoveryQuery(queryInput)

  let pageToken: string | undefined
  let estimate: number | undefined
  let reachedEnd = false

  for (let i = 1; i < page; i++) {
    const list = await listMessages(accessToken, query, {
      maxResults: pageSize,
      pageToken,
    })
    pageToken = list.nextPageToken
    estimate = list.resultSizeEstimate
    if (!pageToken) {
      reachedEnd = true
      break
    }
  }

  let candidates: CandidateEmail[] = []
  let totalEstimate = estimate ?? 0
  let hasNext = false

  if (!reachedEnd) {
    const list = await listMessages(accessToken, query, {
      maxResults: pageSize,
      pageToken,
    })
    totalEstimate = list.resultSizeEstimate ?? estimate ?? 0
    hasNext = Boolean(list.nextPageToken)

    const ids = list.messages
      .map((message) => message.id)
      .filter((id): id is string => typeof id === "string")
    const messages = await batchGetMessages(accessToken, ids)
    candidates = messages
      .map(toCandidateEmail)
      .filter((email): email is CandidateEmail => email !== null)
  }

  console.info(
    `[discovery] page=${page} pageSize=${pageSize} query="${query}" ` +
      `found=${candidates.length} totalEstimate=${totalEstimate} ` +
      `hasNext=${hasNext}`
  )

  return { candidates, page, pageSize, hasNext, totalEstimate }
}
