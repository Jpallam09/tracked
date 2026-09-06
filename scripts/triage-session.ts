import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { session, user } from "@/lib/db/schema"

const id = randomUUID()

const existing = await db
  .select()
  .from(user)
  .where(eq(user.email, "triage@local.dev"))
  .limit(1)

const u =
  existing[0] ??
  (await db
    .insert(user)
    .values({
      id,
      firstName: "Triage",
      lastName: "User",
      email: "triage@local.dev",
      emailVerified: true,
    })
    .returning())[0]

await db.delete(session).where(eq(session.userId, u.id))
const [s] = await db
  .insert(session)
  .values({
    id: randomUUID(),
    token: `triage_${randomUUID()}`,
    userId: u.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
  })
  .returning()

console.log(`better-auth.session_token=${s.token}`)