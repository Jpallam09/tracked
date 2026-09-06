import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { ApplicationsTable } from "@/components/jobhunt/applications-table"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import {
  DISCOVERY_PAGE_SIZE,
  discoverCandidates,
} from "@/lib/jobhunt/discovery"
import { GoogleAuthError, getValidAccessToken } from "@/lib/jobhunt/gmail/oauth"
import { GmailApiError } from "@/lib/jobhunt/gmail/client"

export const dynamic = "force-dynamic"

function ConnectGmail() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-medium">Connect your Gmail</p>
        <p className="text-xs text-muted-foreground">
          Tracked reads job-application emails from your inbox and lists them
          here.
        </p>
      </div>
      <Button nativeButton={false} render={<a href="/api/gmail/connect" />}>
        Continue with Google
      </Button>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 p-4 text-center">
      <p className="text-sm font-medium">Could not load applications</p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) {
    redirect("/login")
  }

  const resolved = await searchParams
  const requestedPage = Number.parseInt(resolved.page ?? "", 10)
  const page =
    Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage

  let accessToken: string
  try {
    accessToken = await getValidAccessToken(session.user.id)
  } catch (err) {
    if (err instanceof GoogleAuthError && err.code === "not_connected") {
      return <ConnectGmail />
    }
    if (err instanceof GoogleAuthError) {
      return <ErrorState message={err.message} />
    }
    throw err
  }

  let result: Awaited<ReturnType<typeof discoverCandidates>>
  try {
    result = await discoverCandidates(accessToken, {
      page,
      pageSize: DISCOVERY_PAGE_SIZE,
    })
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      return <ErrorState message={err.message} />
    }
    if (err instanceof GmailApiError) {
      if (err.status === 403 || err.status === 429) {
        return (
          <ErrorState message="Gmail is rate-limiting — try again shortly." />
        )
      }
      return <ErrorState message={`${err.message} (${err.status})`} />
    }
    throw err
  }

  return (
    <ApplicationsTable
      candidates={result.candidates}
      page={result.page}
      pageSize={result.pageSize}
      hasNext={result.hasNext}
      totalEstimate={result.totalEstimate}
    />
  )
}
