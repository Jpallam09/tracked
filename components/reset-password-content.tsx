"use client"

import { useSearchParams } from "next/navigation"
import { ForgotPasswordDialog } from "@/components/forgot-password-dialog"

export function ResetPasswordContent() {
  const searchParams = useSearchParams()
  return (
    <ForgotPasswordDialog
      open
      initialToken={searchParams.get("token") ?? undefined}
      initialError={searchParams.get("error") ?? undefined}
    />
  )
}
