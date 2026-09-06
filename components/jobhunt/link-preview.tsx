"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link03Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface LinkPreviewData {
  url: string
  hostname: string
  title?: string
  description?: string
  image?: string
  favicon?: string
}

type CacheEntry =
  { status: "loading" } | { status: "done"; data: LinkPreviewData }

const store = new Map<string, CacheEntry>()
const subscribers = new Map<string, Set<() => void>>()
const inFlight = new Map<string, Promise<LinkPreviewData>>()

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

async function fetchPreview(url: string): Promise<LinkPreviewData> {
  try {
    const response = await fetch(
      `/api/jobhunt/unfurl?url=${encodeURIComponent(url)}`,
      { cache: "no-store" }
    )
    if (!response.ok) {
      return { url, hostname: hostnameFromUrl(url) }
    }
    return (await response.json()) as LinkPreviewData
  } catch {
    return { url, hostname: hostnameFromUrl(url) }
  }
}

function publish(url: string, entry: CacheEntry): void {
  store.set(url, entry)
  const listeners = subscribers.get(url)
  if (listeners) {
    for (const notify of listeners) notify()
  }
}

function ensureFetch(url: string): void {
  const existing = store.get(url)
  if (existing?.status === "done") return
  if (inFlight.has(url)) return
  publish(url, { status: "loading" })
  const promise = fetchPreview(url).then((data) => {
    publish(url, { status: "done", data })
    return data
  })
  inFlight.set(url, promise)
  void promise.finally(() => {
    inFlight.delete(url)
  })
}

export function LinkPreview({ url }: { url: string }) {
  const [entry, setEntry] = React.useState<CacheEntry>(
    () => store.get(url) ?? { status: "loading" }
  )

  React.useEffect(() => {
    const notify = () => setEntry(store.get(url) ?? { status: "loading" })
    const listeners = subscribers.get(url) ?? new Set<() => void>()
    listeners.add(notify)
    subscribers.set(url, listeners)
    ensureFetch(url)
    return () => {
      listeners.delete(notify)
      if (listeners.size === 0) subscribers.delete(url)
    }
  }, [url])

  if (entry.status === "loading") {
    return (
      <div
        className="flex flex-col gap-2 rounded-md p-3 ring-1 ring-foreground/10"
        aria-hidden="true"
      >
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HugeiconsIcon
            icon={Link03Icon}
            strokeWidth={2}
            className="size-3.5"
          />
          <span className="truncate font-medium">{hostnameFromUrl(url)}</span>
        </span>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
    )
  }

  const { data } = entry
  const href = data.url

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block overflow-hidden rounded-md ring-1 ring-foreground/10",
        "transition-shadow duration-200 hover:ring-foreground/30"
      )}
    >
      {data.image ? (
        <img
          src={data.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-32 w-full bg-muted object-cover duration-200 group-hover:brightness-105"
        />
      ) : null}
      <div className="flex flex-col gap-1 p-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {data.favicon ? (
            <img
              src={data.favicon}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="size-3.5 object-contain"
            />
          ) : (
            <HugeiconsIcon
              icon={Link03Icon}
              strokeWidth={2}
              className="size-3.5"
            />
          )}
          <span className="truncate font-medium text-muted-foreground">
            {data.hostname}
          </span>
        </span>
        {data.title ? (
          <span className="line-clamp-2 text-sm leading-snug font-medium text-foreground">
            {data.title}
          </span>
        ) : null}
        {data.description ? (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {data.description}
          </span>
        ) : null}
      </div>
    </a>
  )
}
