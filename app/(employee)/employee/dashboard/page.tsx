import { redirect } from "next/navigation"
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EngagementSurvey } from "@/components/EngagementSurvey"
import { LogoutButton } from "@/components/LogoutButton"

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
  const riskLevel = latestScore?.risk_level

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{employee.name}'s Dashboard</h1>
        <LogoutButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Name:</strong> {employee.name}</p>
          <p><strong>Position:</strong> {employee.position}</p>
          <p><strong>Join Date:</strong> {new Date(employee.join_date).toLocaleDateString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Current Engagement Score</CardTitle>
        </CardHeader>
        <CardContent>
          {engagementScore !== null ? (
            <div className="flex items-center justify-center space-x-4">
              <div className="text-5xl font-bold">{engagementScore}%</div>
              <Badge variant={
                riskLevel === "Low" ? "default" :
                riskLevel === "Medium" ? "secondary" : "destructive"
              }>
                {riskLevel} Risk
              </Badge>
            </div>
          ) : (
            <p className="text-muted-foreground text-center">No engagement data available yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Survey</CardTitle>
        </CardHeader>
        <CardContent>
          <EngagementSurvey />
        </CardContent>
      </Card>
    </div>
  )
}