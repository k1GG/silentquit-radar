import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(
          name: string,
          value: string,
          options: {
            path?: string
            httpOnly?: boolean
            secure?: boolean
            sameSite?: "lax" | "strict" | "none"
            maxAge?: number
          }
        ) {
          res.cookies.set({ name, value, ...options })
        },
        remove(
          name: string,
          options: {
            path?: string
          }
        ) {
          res.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = req.nextUrl.pathname

  // 🔒 Not logged in
  if (!user) {
    if (!pathname.startsWith("/login") && !pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return res
  }

  // 🔑 Load role from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, employee_id")
    .eq("id", user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // 👷 Employee → force their own page
  if (profile.role === "employee") {
    const target = `/employees/${profile.employee_id}`
    if (!pathname.startsWith(target)) {
      return NextResponse.redirect(new URL(target, req.url))
    }
  }

  // 🧑‍💼 HR → block employee survey pages
  if (profile.role === "hr" && pathname.startsWith("/employees/")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return res
}

export const config = {
  matcher: ["/dashboard/:path*", "/employees/:path*"],
}
