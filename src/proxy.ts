import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./auth"

export async function proxy(request: NextRequest) {
  // Check legacy paths
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  if (request.nextUrl.pathname === "/register") {
    return NextResponse.redirect(new URL("/sign-up", request.url))
  }

  // Get NextAuth session
  const session = await auth()

  const isLoggedIn = !!session?.user
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/sign-in") ||
    request.nextUrl.pathname.startsWith("/sign-up") ||
    request.nextUrl.pathname.startsWith("/forgot-password")
  const isLandingPage = request.nextUrl.pathname.startsWith("/landing")

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (isLandingPage) {
    return NextResponse.next()
  }

  // For all other pages (including / and dashboard pages), require login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
    "/",
  ],
}
