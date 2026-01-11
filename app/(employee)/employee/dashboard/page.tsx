import { redirect } from "next/navigation"
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EngagementSurvey } from "@/components/EngagementSurvey"
import { LogoutButton } from "@/components/LogoutButton"
import { getRiskFromScore, getRiskLabel, getRiskColor } from "@/lib/engagementRisk"

type Employee = {
  id: string
  email: string
  name: string
  position: string
  join_date: string
}


export default async function EmployeeDashboardPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  console.log("DASHBOARD AUTH USER:", user)
  console.log("DASHBOARD AUTH ERROR:", authError)

  if (!user) {
    console.log("NO AUTH USER, REDIRECTING TO /employee-login")
    redirect("/employee-login")
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, employee_id")
    .eq("id", user.id)
    .single()

  console.log("DASHBOARD PROFILE:", profile, "ERROR:", profileError)

  if (!profile || profile.role !== "employee" || !profile.employee_id) {
    console.log("INVALID PROFILE OR ROLE, REDIRECTING TO /employee-login")
    redirect("/employee-login")
  }

  console.log("EMPLOYEE ROLE VALIDATED:", profile.role)
  console.log("EMPLOYEE ID:", profile.employee_id)

  const employeeId = profile.employee_id

  // Load employee data
  const { data: employeeData, error: empError } = await supabase
    .from("employees")
    .select("id, email, name, position, join_date")
    .eq("id", employeeId)
    .single()

  if (empError || !employeeData) {
    console.error("Error fetching employee:", empError)
    redirect("/employee-login")
  }

  console.log("EMPLOYEE DATA LOADED:", employeeData.name)

  // Load latest score
  const { data: scoreData } = await supabase
    .from("engagement_scores")
    .select("score, risk_level, created_at")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  console.log("LATEST SCORE:", scoreData)

  const employee = employeeData
  const latestScore = scoreData

  const engagementScore = latestScore?.score
  const riskLevel = engagementScore ? getRiskFromScore(engagementScore) : null

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-white">{employee.name}'s Dashboard</h1>
        <LogoutButton />
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300"><strong className="text-white">Name:</strong> {employee.name}</p>
          <p className="text-gray-300"><strong className="text-white">Position:</strong> {employee.position}</p>
          <p className="text-gray-300"><strong className="text-white">Join Date:</strong> {new Date(employee.join_date).toLocaleDateString()}</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-center">Your Engagement Score</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {engagementScore !== null ? (
            <>
              <div className="text-7xl font-bold text-white mb-4">{engagementScore}%</div>
              <p className="text-gray-300 mb-4">
                {riskLevel === "low" ? "You're doing great! Keep it up!" :
                 riskLevel === "medium" ? "You're on the right track!" :
                 "Let's work on improving your engagement."}
              </p>
              <Badge className={
                riskLevel === "low" ? "bg-green-600" :
                riskLevel === "medium" ? "bg-yellow-600" : "bg-red-600"
              }>
                {getRiskLabel(riskLevel!)} Risk
              </Badge>
            </>
          ) : (
            <p className="text-gray-400">No engagement data available yet</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Engagement Survey</CardTitle>
        </CardHeader>
        <CardContent>
          <EngagementSurvey />
        </CardContent>
      </Card>
    </div>
  )
}