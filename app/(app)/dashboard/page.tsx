"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Dashboard } from "@/components/dashboard/dashboard"

export default function DashboardPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, employee_id")
        .eq("id", session.user.id)
        .single()

      // 🚫 EMPLOYEE BLOCKED
      if (profile?.role !== "hr") {
        router.replace(`/employees/${profile?.employee_id}`)
        return
      }

      // ✅ HR ALLOWED
      setAllowed(true)
    }

    checkRole()
  }, [router])

  if (!allowed) {
    return (
      <div className="flex h-screen items-center justify-center">
        Checking permissions…
      </div>
    )
  }

  return <Dashboard />
}
