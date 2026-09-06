import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { parseOpenGraph } from "@/lib/jobhunt/links"

export const dynamic = "force-dynamic"

const MAX_BYTES = 256 * 1024
const TIMEOUT_MS = 6000
const RICH_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const BARE_CACHE_TTL_MS = 30 * 60 * 1000
const CACHE_MAX_ENTRIES = 500
const USER_AGENT = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "AppleWebKit/537.36 (KHTML, like Gecko)",
  "Chrome/126.0.0.0 Safari/537.36",
].join(" ")
const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
])

interface PreviewData {
  url: string
  hostname: string
  title?: string
  description?: string
  image?: string
  favicon?: string
}

interface CacheEntry extends PreviewData {
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

function toResponse(entry: CacheEntry): PreviewData {
  return {
    url: entry.url,
    hostname: entry.hostname,
    title: entry.title,
    description: entry.description,
    image: entry.image,
    favicon: entry.favicon,
  }
}

function isBare(entry: CacheEntry): boolean {
  return !entry.title && !entry.description && !entry.image
}

function cacheTtlFor(entry: CacheEntry): number {
  return isBare(entry) ? BARE_CACHE_TTL_MS : RICH_CACHE_TTL_MS
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < cacheTtlFor(entry)
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) {
    return NextResponse.json({ error: "not_signed_in" }, { status: 401 })
  }

  const rawUrl = new URL(request.url).searchParams.get("url")
  if (!rawUrl) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 })
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 })
  }
  if (
    LOOPBACK_HOSTS.has(target.hostname) ||
    target.hostname.endsWith(".local") ||
    target.hostname.endsWith(".localhost")
  ) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 })
  }

  const cached = cache.get(target.href)
  if (cached && isFresh(cached)) {
    return NextResponse.json(toResponse(cached))
  }

  let entry: CacheEntry
  try {
    const { text, finalUrl } = await fetchHtml(target)
    const meta = parseOpenGraph(text, finalUrl)
    entry = {
      url: finalUrl,
      hostname: hostnameOf(new URL(finalUrl)),
      ...meta,
      fetchedAt: Date.now(),
    }
  } catch {
    entry = {
      url: target.href,
      hostname: hostnameOf(target),
      fetchedAt: Date.now(),
    }
  }

  cache.set(target.href, entry)
  if (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value as string
    cache.delete(oldest)
  }

  return NextResponse.json(toResponse(entry))
}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/^www\./, "")
}

async function fetchHtml(
  target: URL
): Promise<{ text: string; finalUrl: string }> {
  const response = await fetch(target, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,text/plain",
      "accept-language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`fetch failed: ${response.status}`)
  }
  const contentType = response.headers.get("content-type") ?? ""
  if (!/html|text\/plain/i.test(contentType)) {
    throw new Error("not html")
  }
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("response too large")
  }
  return {
    text: new TextDecoder().decode(buffer),
    finalUrl: response.url || target.href,
  }
}
