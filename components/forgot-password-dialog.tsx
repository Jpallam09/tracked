"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/client-auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

type View = "request" | "sent" | "reset"

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  trigger,
  initialToken,
  initialError,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactElement
  initialToken?: string
  initialError?: string
}) {
  const router = useRouter()

  const [view, setView] = useState<View>(() =>
    initialToken ? "reset" : "request"
  )
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(() =>
    initialError === "INVALID_TOKEN" || initialError === "invalid_token"
      ? "This password reset link is invalid or has expired. Please request a new one."
      : null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setIsLoading(false)

    if (error) {
      setError(error.message ?? "Something went wrong")
      return
    }

    setView("sent")
  }

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setResetting(true)
    const { error } = await authClient.resetPassword({
      newPassword,
      token: initialToken ?? "",
    })
    setResetting(false)

    if (error) {
      setError(error.message ?? "Could not reset password")
      return
    }

    onOpenChange?.(false)
    router.push("/login")
  }

  let content: React.ReactNode
  if (view === "reset") {
    content = (
      <form onSubmit={handleReset}>
        <FieldGroup>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter a new password for your account.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="new-password">New Password</FieldLabel>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <FieldDescription>
              Must be at least 8 characters long.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-new-password">
              Confirm New Password
            </FieldLabel>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={resetting}>
              {resetting ? "Resetting..." : "Reset password"}
            </Button>
          </DialogFooter>
        </FieldGroup>
      </form>
    )
  } else if (view === "sent") {
    content = (
      <DialogHeader>
        <DialogTitle>Check your email</DialogTitle>
        <DialogDescription>
          We&apos;ve sent a password reset link to {email || "your email"}.
          Check your inbox (and spam) to continue.
        </DialogDescription>
        <Button
          type="button"
          variant="outline"
          onClick={() => setView("request")}
          className="mt-2"
        >
          Back
        </Button>
      </DialogHeader>
    )
  } else {
    content = (
      <form onSubmit={handleRequest}>
        <FieldGroup>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="reset-email">Email</FieldLabel>
            <Input
              id="reset-email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send reset link"}
            </Button>
          </DialogFooter>
        </FieldGroup>
      </form>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent>{content}</DialogContent>
    </Dialog>
  )
}
