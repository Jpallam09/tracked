import type { GmailFullMessage, GmailPart } from "@/lib/jobhunt/gmail/client"

const MAX_BODY_LENGTH = 500_000

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(base64, "base64").toString("utf-8")
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function partBodyText(
  part: GmailPart
): { text: string; mimeType: string } | null {
  if (part.mimeType === "text/plain" && part.body?.data) {
    return { text: decodeBase64Url(part.body.data), mimeType: part.mimeType }
  }
  return null
}

function findTextPart(
  parts: GmailPart[] | undefined
): { text: string; mimeType: string } | null {
  if (!parts) return null

  let htmlFallback: { text: string; mimeType: string } | null = null

  for (const part of parts) {
    const direct = partBodyText(part)
    if (direct) return direct

    if (part.parts?.length) {
      const nested = findTextPart(part.parts)
      if (nested) return nested
    }

    if (part.mimeType === "text/html" && part.body?.data && !htmlFallback) {
      htmlFallback = {
        text: decodeBase64Url(part.body.data),
        mimeType: part.mimeType,
      }
    }
  }

  return htmlFallback
}

export function extractTextBody(message: GmailFullMessage): string {
  const payload = message.payload

  let text = ""
  let isHtml = false

  if (payload?.mimeType === "text/plain" && payload.body?.data) {
    text = decodeBase64Url(payload.body.data)
  } else if (payload?.mimeType === "text/html" && payload.body?.data) {
    text = decodeBase64Url(payload.body.data)
    isHtml = true
  } else {
    const found = findTextPart(payload?.parts)
    if (found) {
      text = found.text
      isHtml = found.mimeType === "text/html"
    }
  }

  text = isHtml ? stripHtml(text) : text
  text = text.replace(/^\uFEFF/, "").replace(/\u0000/g, "")

  if (text.length > MAX_BODY_LENGTH) {
    text = `${text.slice(0, MAX_BODY_LENGTH).trimEnd()}\n\n…[truncated]`
  }

  return text.trim() || (message.snippet ?? "").trim()
}
