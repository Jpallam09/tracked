import { describe, expect, it } from "vitest"

import { extractTextBody } from "@/lib/jobhunt/gmail/body"
import type { GmailFullMessage } from "@/lib/jobhunt/gmail/client"

function message(overrides: Partial<GmailFullMessage> = {}): GmailFullMessage {
  return {
    id: "1",
    threadId: "1",
    snippet: "fallback snippet",
    ...overrides,
  }
}

function part(mimeType: string, text: string) {
  return {
    mimeType,
    body: { data: Buffer.from(text, "utf-8").toString("base64url") },
  }
}

describe("extractTextBody", () => {
  it("decodes a simple text/plain message", () => {
    const email = message({
      payload: {
        mimeType: "text/plain",
        body: { data: Buffer.from("Hello world").toString("base64url") },
      },
    })
    expect(extractTextBody(email)).toBe("Hello world")
  })

  it("prefers text/plain over text/html in multipart messages", () => {
    const email = message({
      payload: {
        mimeType: "multipart/alternative",
        parts: [
          part("text/plain", "plain body"),
          part("text/html", "<p>html body</p>"),
        ],
      },
    })
    expect(extractTextBody(email)).toBe("plain body")
  })

  it("falls back to html stripped of tags and normalised", () => {
    const email = message({
      payload: {
        mimeType: "multipart/alternative",
        parts: [
          part("text/html", "<div>Hello <b>there</b></div><p>Second line</p>"),
        ],
      },
    })
    expect(extractTextBody(email)).toBe("Hello there\nSecond line")
  })

  it("handles nested parts (multipart/related)", () => {
    const email = message({
      payload: {
        mimeType: "multipart/related",
        parts: [
          {
            mimeType: "multipart/alternative",
            parts: [
              part("text/plain", "nested plain"),
              part("text/html", "<p>nested html</p>"),
            ],
          },
        ],
      },
    })
    expect(extractTextBody(email)).toBe("nested plain")
  })

  it("falls back to the snippet when there is no readable body", () => {
    const email = message({
      payload: {
        mimeType: "multipart/mixed",
        parts: [
          { mimeType: "application/pdf", filename: "resume.pdf" },
          { mimeType: "image/png", filename: "logo.png" },
        ],
      },
    })
    expect(extractTextBody(email)).toBe("fallback snippet")
  })

  it("truncates very large bodies", () => {
    const big = "a".repeat(600_000)
    const email = message({
      payload: {
        mimeType: "text/plain",
        body: { data: Buffer.from(big).toString("base64url") },
      },
    })
    const body = extractTextBody(email)
    expect(body.length).toBeLessThan(500_100)
    expect(body.endsWith("…[truncated]")).toBe(true)
  })
})
