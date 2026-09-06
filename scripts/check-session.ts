import { auth } from "@/lib/auth"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { session, user } from "@/lib/db/schema"

const [u] = await db
  .select()
  .from(user)
  .where(eq(user.email, "triage@local.dev"))
  .limit(1)

if (!u) throw new Error("no triage user")

const [s] = await db
  .select()
  .from(session)
  .where(eq(session.userId, u.id))
  .limit(1)

if (!s) throw new Error("no triage session")

const headers = new Headers({
  cookie: `better-auth.session_token=${s.token}`,
})
const result = await auth.api.getSession({ headers })
console.log("getSession:", result ? "FOUND" : "null")
if (result) console.log("user:", result.user.email)