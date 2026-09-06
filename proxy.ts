import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"

const protectedRoutes = ["/dashboard", "/applications"]
const publicRoutes = ["/login", "/signup", "/reset-password"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isPublic = publicRoutes.includes(pathname)

  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (isProtected && !session) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (isPublic && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
