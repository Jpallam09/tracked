"use client"

import * as React from "react"
import { format } from "date-fns"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import type { CandidateEmail, ReadEmail } from "@/lib/jobhunt/types"

type FetchState =
  | { status: "idle" }
  | { status: "loading"; id: string }
  | { status: "success"; id: string; email: ReadEmail }
  | {
      status: "error"
      id: string
      message: string
      notConnected?: boolean
      connectUrl?: string
    }

type FetchResult =
  | { ok: true; email: ReadEmail }
  | {
      ok: false
      message: string
      notConnected?: boolean
      connectUrl?: string
    }

async function fetchReadEmail(targetId: string): Promise<FetchResult> {
  try {
    const response = await fetch(
      `/api/jobhunt/message/${encodeURIComponent(targetId)}`,
      { cache: "no-store" }
    )
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    if (!response.ok) {
      const rateLimited =
        response.status === 429 || data.status === 429 || data.status === 403
      return {
        ok: false,
        message: rateLimited
          ? "Gmail is rate-limiting — try again shortly."
          : (data.error as string) || "Failed to load email.",
        notConnected: data.code === "gmail_not_connected",
        connectUrl: data.connectUrl as string | undefined,
      }
    }
    return { ok: true, email: data as unknown as ReadEmail }
  } catch {
    return { ok: false, message: "Could not load this email." }
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return format(date, "MMM d, yyyy h:mm a")
}

export function EmailReader({
  email,
  onClose,
}: {
  email: CandidateEmail | null
  onClose: () => void
}) {
  const open = email !== null
  const id = email?.id ?? null

  const [state, setState] = React.useState<FetchState>({ status: "idle" })
  const [retryKey, setRetryKey] = React.useState(0)

  React.useEffect(() => {
    if (!id) return
    let cancelled = false
    void fetchReadEmail(id).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setState({ status: "success", id, email: result.email })
      } else {
        setState({
          status: "error",
          id,
          message: result.message,
          notConnected: result.notConnected,
          connectUrl: result.connectUrl,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [id, retryKey])

  const handleRetry = React.useCallback(() => {
    if (!id) return
    setState({ status: "loading", id })
    setRetryKey((key) => key + 1)
  }, [id])

  const isCurrent = state.status !== "idle" && state.id === id

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      swipeDirection="right"
      modal
    >
      <DrawerContent
        style={
          {
            "--drawer-content-width": "100%",
            maxWidth: "40rem",
          } as React.CSSProperties
        }
      >
        <DrawerHeader className="gap-1.5 border-b px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <DrawerTitle className="text-base leading-snug">
              {email?.subject?.trim() || "(no subject)"}
            </DrawerTitle>
            <DrawerClose
              render={<Button variant="ghost" size="icon" aria-label="Close" />}
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                strokeWidth={2}
                className="size-4"
              />
            </DrawerClose>
          </div>
          {email?.from ? (
            <DrawerDescription>
              From {email.from}
              {email.date ? ` · ${formatDate(email.date)}` : ""}
            </DrawerDescription>
          ) : null}
          {email?.to ? (
            <p className="truncate text-xs text-muted-foreground">
              To {email.to}
            </p>
          ) : null}
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {state.status === "success" && isCurrent ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {state.email.body}
            </p>
          ) : state.status === "error" && isCurrent ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                Could not load this email
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {state.message}
              </p>
              {state.notConnected && state.connectUrl ? (
                <Button
                  nativeButton={false}
                  size="sm"
                  render={<a href={state.connectUrl} />}
                >
                  Reconnect Google
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Retry
                </Button>
              )}
            </div>
          ) : open ? (
            <div className="animate-pulse space-y-3" aria-live="polite">
              <div className="h-3 w-3/4 rounded bg-muted/70" />
              <div className="h-3 w-full rounded bg-muted/70" />
              <div className="h-3 w-5/6 rounded bg-muted/70" />
              <div className="h-3 w-2/3 rounded bg-muted/70" />
              <div className="h-3 w-full rounded bg-muted/70" />
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
