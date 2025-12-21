"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const finishLogin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      const userId = session.user.id

      // 🔑 READ PROFILE (SOURCE OF TRUTH)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, employee_id")
        .eq("id", userId)
        .single()

      if (!profile) {
        router.replace("/login")
        return
      }

      if (profile.role === "employee") {
        router.replace(`/employees/${profile.employee_id}`)
      } else {
        router.replace("/dashboard")
      }
    }

    finishLogin()
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      Completing login…
    </div>
  )
}
