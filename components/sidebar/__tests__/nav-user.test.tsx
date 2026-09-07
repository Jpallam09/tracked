import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactElement } from "react"
import { NavUser } from "@/components/sidebar/nav-user"
import { SidebarProvider } from "@/components/ui/sidebar"

const push = vi.fn()
const signOut = vi.fn()
const useSession = vi.fn()

vi.mock("@/lib/client-auth", () => ({
  authClient: {
    useSession: () => useSession(),
    signOut: (...args: unknown[]) => signOut(...args),
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

function renderWithSidebar(ui: ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>)
}

function mockLoggedOut() {
  useSession.mockReturnValue({ data: null })
}

function mockLoggedIn() {
  useSession.mockReturnValue({
    data: {
      user: {
        name: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        image: "",
      },
    },
  })
}

describe("NavUser", () => {
  beforeEach(() => {
    push.mockReset()
    signOut.mockReset()
    useSession.mockReset()
  })

  it("falls back to placeholder when there is no session", () => {
    mockLoggedOut()
    renderWithSidebar(<NavUser />)

    expect(screen.getByText("User")).toBeInTheDocument()
  })

  it("renders the user name, email and initials from the session", () => {
    mockLoggedIn()
    renderWithSidebar(<NavUser />)

    expect(screen.getByText("Ada")).toBeInTheDocument()
    expect(screen.getByText("ada@example.com")).toBeInTheDocument()
    expect(screen.getByText("AL")).toBeInTheDocument()
  })

  it("logs out and redirects to /login", async () => {
    mockLoggedIn()
    signOut.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    renderWithSidebar(<NavUser />)

    await user.click(screen.getByRole("button"))
    await user.click(await screen.findByRole("menuitem", { name: /log out/i }))

    expect(signOut).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith("/login")
  })
})
