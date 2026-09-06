const URL_PATTERN = /https?:\/\/[^\s<>"'`|\\{}]+/g

const TRAILING_PUNCTUATION = /[.,;:!?'")\]}>]+$/

export interface LinkPreview {
  url: string
  hostname: string
  title?: string
  description?: string
  image?: string
  favicon?: string
}

function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    let href = url.href
    if (!raw.endsWith("/") && href.endsWith("/")) {
      href = href.slice(0, -1)
    }
    return href
  } catch {
    return null
  }
}

export type BodySegment =
  { type: "text"; value: string } | { type: "link"; value: string }

export function splitTextAndLinks(text: string): BodySegment[] {
  const segments: BodySegment[] = []
  let cursor = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    if (match.index === undefined) continue
    const url = normalizeUrl(match[0].replace(TRAILING_PUNCTUATION, ""))
    if (!url) continue
    if (match.index > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, match.index) })
    }
    segments.push({ type: "link", value: url })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) })
  }
  return segments
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
}

function decodeEntities(text: string): string {
  return text.replace(
    /&(?:(#x[\da-fA-F]+)|(#\d+)|([a-z]+));/g,
    (
      full,
      hex: string | undefined,
      dec: string | undefined,
      name: string | undefined
    ) => {
      if (hex) return String.fromCodePoint(parseInt(hex.slice(2), 16))
      if (dec) return String.fromCodePoint(parseInt(dec.slice(1), 10))
      if (name) return ENTITIES[`&${name};`] ?? full
      return full
    }
  )
}

const ATTR_RE = /([a-zA-Z0-9:._-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g

function parseAttributes(tag: string): Map<string, string> {
  const attrs = new Map<string, string>()
  for (const match of tag.matchAll(ATTR_RE)) {
    attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "")
  }
  return attrs
}

function resolveUrl(
  value: string | undefined,
  base: string
): string | undefined {
  if (!value) return undefined
  try {
    return new URL(decodeEntities(value.trim()), base).href
  } catch {
    return undefined
  }
}

const META_RE = /<meta[^>]*>/gi
const LINK_RE = /<link[^>]*>/gi

interface OpenGraphResult {
  title?: string
  description?: string
  image?: string
  favicon?: string
}

export function parseOpenGraph(html: string, baseUrl: string): OpenGraphResult {
  const meta = new Map<string, string>()
  for (const tag of html.matchAll(META_RE)) {
    const attrs = parseAttributes(tag[0])
    const key = (
      attrs.get("property") ??
      attrs.get("name") ??
      attrs.get("itemprop") ??
      ""
    ).toLowerCase()
    const content = attrs.get("content")
    if (key && content !== undefined) {
      meta.set(key, decodeEntities(content).replace(/\s+/g, " ").trim())
    }
  }

  const pick = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = meta.get(key)
      if (value) return value
    }
    return undefined
  }

  let title = pick("og:title", "twitter:title")
  if (!title) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (match) {
      title = decodeEntities(match[1]).replace(/\s+/g, " ").trim()
    }
  }

  let favicon: string | undefined
  for (const tag of html.matchAll(LINK_RE)) {
    const attrs = parseAttributes(tag[0])
    const rel = attrs.get("rel") ?? ""
    if (rel.includes("icon")) {
      favicon = resolveUrl(attrs.get("href"), baseUrl)
      break
    }
  }

  return {
    title: title || undefined,
    description: pick("og:description", "twitter:description", "description"),
    image: resolveUrl(pick("og:image", "twitter:image"), baseUrl),
    favicon,
  }
}
