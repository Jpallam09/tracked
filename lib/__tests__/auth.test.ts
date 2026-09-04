import { describe, expect, it } from "vitest"
import { getTestInstance } from "better-auth/test"
import { baseAuthOptions } from "@/lib/base-auth"

type SignUpInput = {
  email: string
  password: string
  name: string
  lastName: string
}

async function createInstance() {
  return getTestInstance(baseAuthOptions, {
    testUser: {
      name: "Ada",
      email: "ada@example.com",
      password: "test123456",
      lastName: "Lovelace",
    } as never,
  })
}

const graceBody: SignUpInput = {
  email: "grace@example.com",
  password: "password123",
  name: "Grace",
  lastName: "Hopper",
}

describe("auth integration (in-memory better-auth via getTestInstance)", () => {
  it("signs up a new user persisting firstName and lastName", async () => {
    const { client } = await createInstance()

    const { data, error } = await client.signUp.email(graceBody)

    expect(error).toBeNull()
    expect(data?.user).toBeDefined()
    expect(data?.user.email).toBe("grace@example.com")
    expect(data?.user.name).toBe("Grace")
    expect((data?.user as { lastName?: string }).lastName).toBe("Hopper")
  })

  it("rejects a duplicate email on signup", async () => {
    const { client } = await createInstance()

    const first = await client.signUp.email(graceBody)
    expect(first.error).toBeNull()

    const duplicate = await client.signUp.email(graceBody)
    expect(duplicate.error).not.toBeNull()
    expect(duplicate.error?.status).toBe(422)
  })

  it("signs in with correct credentials and returns a session token", async () => {
    const { client } = await createInstance()

    const { data, error } = await client.signIn.email({
      email: "ada@example.com",
      password: "test123456",
    })

    expect(error).toBeNull()
    expect(data?.token).toBeDefined()
    expect(data?.user.email).toBe("ada@example.com")
  })

  it("rejects sign-in with an incorrect password", async () => {
    const { client } = await createInstance()

    const { data, error } = await client.signIn.email({
      email: "ada@example.com",
      password: "wrong-password",
    })

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("gets the session for an authenticated request", async () => {
    const { auth, signInWithTestUser } = await createInstance()

    const { headers } = await signInWithTestUser()

    const resolved = await auth.api.getSession({ headers })
    expect(resolved).toBeDefined()
    expect(resolved?.user.email).toBe("ada@example.com")
  })

  it("returns null session without auth headers", async () => {
    const { auth } = await createInstance()

    const session = await auth.api.getSession({ headers: new Headers() })

    expect(session).toBeNull()
  })

  it("signs out and invalidates the session", async () => {
    const { auth, signInWithTestUser } = await createInstance()

    const { headers } = await signInWithTestUser()

    const before = await auth.api.getSession({ headers })
    expect(before).toBeDefined()

    const { success } = await auth.api.signOut({ headers })
    expect(success).toBe(true)

    const after = await auth.api.getSession({ headers })
    expect(after).toBeNull()
  })
})
