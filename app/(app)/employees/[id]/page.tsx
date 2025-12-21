"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EngagementSurvey } from "@/components/EngagementSurvey"

type Employee = {
  id: string
  email: string
}

export default function EmployeeDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // 🔐 Not logged in
      if (!session?.user) {
        router.replace("/login")
        return
      }

      // 1️⃣ Get profile (AUTHORITATIVE SOURCE)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, employee_id")
        .eq("id", session.user.id)
        .single()

      if (!profile) {
        router.replace("/login")
        return
      }

      // 🚫 HRs are NOT allowed here
      if (profile.role === "hr") {
        router.replace("/dashboard")
        return
      }

      // 🚫 Employee trying to access someone else
      if (profile.employee_id !== id) {
        router.replace(`/employees/${profile.employee_id}`)
        return
      }

      // 2️⃣ Load employee record
      const { data: employeeData, error } = await supabase
        .from("employees")
        .select("id, email")
        .eq("id", id)
        .single()

      if (error || !employeeData) {
        router.replace("/login")
        return
      }

      setEmployee(employeeData)
      setLoading(false)
    }

    loadData()
  }, [id, router])

  if (loading || !employee) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading…
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Engagement Survey</CardTitle>
        </CardHeader>
        <CardContent>
          <EngagementSurvey employeeId={employee.id} />
        </CardContent>
      </Card>
    </div>
  )
}
