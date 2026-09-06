import { getMessage, type GmailFullMessage } from "@/lib/jobhunt/gmail/client"
import { extractTextBody } from "@/lib/jobhunt/gmail/body"
import type { ReadEmail } from "@/lib/jobhunt/types"

function headerValue(message: GmailFullMessage, name: string): string {
  return (
    message.payload?.headers?.find(
      (header) => header.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  )
}

export async function readEmail(
  accessToken: string,
  id: string
): Promise<ReadEmail> {
  const message = await getMessage(accessToken, id)
  return {
    id: message.id ?? id,
    threadId: message.threadId ?? message.id ?? id,
    date: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : "",
    from: headerValue(message, "From"),
    to: headerValue(message, "To"),
    subject: headerValue(message, "Subject"),
    snippet: message.snippet ?? "",
    body: extractTextBody(message),
  }
}
