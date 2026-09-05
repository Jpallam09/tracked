"use client"

import { useState } from "react"
import { authClient } from "@/lib/client-auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import hero from "../public/heo.jpg"
import Link from "next/link"
import { GoogleButton } from "@/components/google-button"
import { Marker, MarkerContent } from "@/components/ui/marker"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: firstName,
      lastName,
      callbackURL: "/dashboard",
    })
    setIsLoading(false)

    if (error) {
      setError(error.message ?? "Something went wrong")
      return
    }

    setSubmitted(true)
  }

  async function handleResend() {
    setError(null)
    setResending(true)
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/dashboard",
    })
    setResending(false)

    if (error) {
      setError(error.message ?? "Could not resend verification email")
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            {submitted ? (
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Check your email</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    We&apos;ve sent a verification link to{" "}
                    <span className="font-medium text-foreground">{email}</span>
                    . Click the link in the email to activate your account.
                  </p>
                </div>
                {error ? (
                  <div
                    role="alert"
                    className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </div>
                ) : null}
                <Field>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? "Sending..." : "Resend verification email"}
                  </Button>
                </Field>
                <FieldDescription className="text-center">
                  Didn&apos;t get it? Check your spam folder, or{" "}
                  <Link href="/login" className="underline underline-offset-2">
                    sign in
                  </Link>
                  .
                </FieldDescription>
              </FieldGroup>
            ) : (
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Create your account</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Enter your details below to create your account
                  </p>
                </div>
                <GoogleButton className="w-full" />
                <Marker variant="separator">
                  <MarkerContent>or continue with</MarkerContent>
                </Marker>
                {error ? (
                  <div
                    role="alert"
                    className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </div>
                ) : null}
                <Field>
                  <Field className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="first-name">First Name</FieldLabel>
                      <Input
                        id="first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
                      <Input
                        id="last-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </Field>
                  </Field>
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <FieldDescription>
                    We&apos;ll use this to contact you. We will not share your
                    email with anyone else.
                  </FieldDescription>
                </Field>
                <Field>
                  <Field className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="confirm-password">
                        Confirm Password
                      </FieldLabel>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </Field>
                  </Field>
                  <FieldDescription>
                    Must be at least 8 characters long.
                  </FieldDescription>
                </Field>
                <Field>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </Field>
                <FieldDescription className="text-center">
                  Already have an account? <Link href="/login">Sign in</Link>
                </FieldDescription>
              </FieldGroup>
            )}
          </form>
          <div className="relative hidden bg-muted md:block">
            <Image
              src={hero}
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <Link href="#">Terms of Service</Link> and{" "}
        <Link href="#">Privacy Policy</Link>.
      </FieldDescription>
    </div>
  )
}
