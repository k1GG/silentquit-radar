"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const protect = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, employee_id")
        .eq("id", session.user.id)
        .single()

      if (!profile) {
        router.replace("/login")
        return
      }

      // 🚫 Employee trying to access HR pages
      if (
        profile.role === "employee" &&
        pathname.startsWith("/dashboard")
      ) {
        router.replace(`/employees/${profile.employee_id}`)
        return
      }

      setLoading(false)
    }

    protect()
  }, [router, pathname])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Checking authentication...
      </div>
    )
  }

  return <>{children}</>
}
