import { describe, expect, it } from "vitest"

import { parseOpenGraph, splitTextAndLinks } from "@/lib/jobhunt/links"

describe("splitTextAndLinks", () => {
  it("keeps text runs and link segments in order", () => {
    expect(
      splitTextAndLinks("Hello https://a.com world https://b.com\nbye")
    ).toEqual([
      { type: "text", value: "Hello " },
      { type: "link", value: "https://a.com" },
      { type: "text", value: " world " },
      { type: "link", value: "https://b.com" },
      { type: "text", value: "\nbye" },
    ])
  })

  it("absorbs trailing punctuation with the link", () => {
    expect(splitTextAndLinks("see https://a.com.")).toEqual([
      { type: "text", value: "see " },
      { type: "link", value: "https://a.com" },
    ])
  })

  it("returns a single text segment when there are no links", () => {
    expect(splitTextAndLinks("plain text only")).toEqual([
      { type: "text", value: "plain text only" },
    ])
  })

  it("keeps lookalikes that are not real urls as plain text", () => {
    expect(
      splitTextAndLinks("visit www.example.com or mailto:x@y.com")
    ).toEqual([
      { type: "text", value: "visit www.example.com or mailto:x@y.com" },
    ])
  })

  it("normalizes a link but preserves its spot in the flow", () => {
    expect(splitTextAndLinks("Apply: https://a.com ../")).toEqual([
      { type: "text", value: "Apply: " },
      { type: "link", value: "https://a.com" },
      { type: "text", value: " ../" },
    ])
  })
})

describe("parseOpenGraph", () => {
  const html = `
    <html>
      <head>
        <meta name="description" content="Site-wide description">
        <meta property="og:title" content="Acme Careers">
        <meta property="og:description" content="Join us &amp; grow">
        <meta property="og:image" content="/static/careers.png">
        <meta property="og:image:alt" content="">
        <link rel="icon" href="/favicon.ico">
        <title>Acme Careers - Jobs</title>
      </head>
      <body></body>
    </html>
  `

  it("extracts og fields and resolves relative urls", () => {
    const result = parseOpenGraph(html, "https://acme.com/careers")
    expect(result).toEqual({
      title: "Acme Careers",
      description: "Join us & grow",
      image: "https://acme.com/static/careers.png",
      favicon: "https://acme.com/favicon.ico",
    })
  })

  it("falls back to <title> when og:title is missing", () => {
    const result = parseOpenGraph(
      '<meta property="og:description" content="d"><title>  Fallback   Title  </title>',
      "https://acme.com"
    )
    expect(result.title).toBe("Fallback Title")
    expect(result.description).toBe("d")
  })

  it("handles attributes in any order with name instead of property", () => {
    const result = parseOpenGraph(
      '<meta content="fallback description" name="description"><meta content="pic.png" property="og:image">',
      "https://acme.com/x"
    )
    expect(result.description).toBe("fallback description")
    expect(result.image).toBe("https://acme.com/pic.png")
  })

  it("returns no fields for a page without metadata", () => {
    expect(
      parseOpenGraph("<html><body>hi</body></html>", "https://acme.com")
    ).toEqual({})
  })
})
