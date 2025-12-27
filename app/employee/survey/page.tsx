"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { EngagementSurvey } from "@/components/EngagementSurvey"

export default function EmployeeSurveyPage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, employee_id")
        .eq("id", session.user.id)
        .single()

      if (!profile) return

      setEmployeeId(profile.employee_id)
      setLoading(false)
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading…
      </div>
    )
  }

  if (!employeeId) {
    return <div>Access denied</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold text-center mb-6">Engagement Survey</h1>
      <EngagementSurvey employeeId={employeeId} />
    </div>
  )
}