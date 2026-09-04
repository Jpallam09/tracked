import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SignupForm } from "@/components/signup-form"

const push = vi.fn()
const signUpEmail = vi.fn()

vi.mock("@/lib/client-auth", () => ({
  authClient: {
    signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("First Name"), "Grace")
  await user.type(screen.getByLabelText("Last Name"), "Hopper")
  await user.type(screen.getByLabelText("Email"), "grace@example.com")
  await user.type(screen.getByLabelText("Password"), "password123")
  await user.type(screen.getByLabelText("Confirm Password"), "password123")
  await user.click(screen.getByRole("button", { name: /create account/i }))
}

describe("SignupForm", () => {
  beforeEach(() => {
    push.mockReset()
    signUpEmail.mockReset()
  })

  it("renders all form fields", () => {
    render(<SignupForm />)

    expect(screen.getByLabelText("First Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument()
  })

  it("shows an error when passwords do not match", async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await user.type(screen.getByLabelText("First Name"), "Grace")
    await user.type(screen.getByLabelText("Last Name"), "Hopper")
    await user.type(screen.getByLabelText("Email"), "grace@example.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.type(screen.getByLabelText("Confirm Password"), "different")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Passwords do not match"
    )
    expect(signUpEmail).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it("submits signUp.email with the right payload and navigates to dashboard", async () => {
    signUpEmail.mockResolvedValue({ data: { user: {} }, error: null })
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillForm(user)

    expect(signUpEmail).toHaveBeenCalledWith({
      email: "grace@example.com",
      password: "password123",
      name: "Grace",
      lastName: "Hopper",
    })
    expect(push).toHaveBeenCalledWith("/dashboard")
  })

  it("displays the error message when signup fails and does not navigate", async () => {
    signUpEmail.mockResolvedValue({
      data: null,
      error: { message: "Email already in use" },
    })
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillForm(user)

    expect(screen.getByRole("alert")).toHaveTextContent("Email already in use")
    expect(push).not.toHaveBeenCalled()
  })
})
