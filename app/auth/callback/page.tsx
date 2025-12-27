"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        console.error("Auth callback failed:", error)
        router.replace("/")
        return
      }

      const userId = data.session.user.id

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, employee_id")
        .eq("id", userId)
        .single()

      if (!profile) {
        router.replace("/")
        return
      }

      if (profile.role === "hr") {
        router.replace("/dashboard")
      } else if (profile.role === "employee" && profile.employee_id) {
        router.replace(`/employee/dashboard/${profile.employee_id}`)
      } else {
        router.replace("/")
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center text-white">
      Logging you in…
    </div>
  )
}