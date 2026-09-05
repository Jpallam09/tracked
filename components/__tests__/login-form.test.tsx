import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LoginForm } from "@/components/login-form"

const push = vi.fn()
const signInEmail = vi.fn()
const signInSocial = vi.fn()

vi.mock("@/lib/client-auth", () => ({
  authClient: {
    signIn: {
      email: (...args: unknown[]) => signInEmail(...args),
      social: (...args: unknown[]) => signInSocial(...args),
    },
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "ada@example.com")
  await user.type(screen.getByLabelText("Password"), "password123")
  await user.click(screen.getByRole("button", { name: /login/i }))
}

describe("LoginForm", () => {
  beforeEach(() => {
    push.mockReset()
    signInEmail.mockReset()
    signInSocial.mockReset()
  })

  it("renders the login fields", () => {
    render(<LoginForm />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
  })

  it("submits signIn.email and navigates to dashboard on success", async () => {
    signInEmail.mockResolvedValue({ data: { session: {} }, error: null })
    const user = userEvent.setup()
    render(<LoginForm />)

    await fillForm(user)

    expect(signInEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "password123",
    })
    expect(push).toHaveBeenCalledWith("/dashboard")
  })

  it("signs in with Google via the social button", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.click(
      screen.getByRole("button", { name: /continue with google/i })
    )

    expect(signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/dashboard",
    })
  })

  it("shows an error message and does not navigate on failure", async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { message: "Invalid email or password" },
    })
    const user = userEvent.setup()
    render(<LoginForm />)

    await fillForm(user)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid email or password"
    )
    expect(push).not.toHaveBeenCalled()
  })
})
