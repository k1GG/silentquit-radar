"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/LogoutButton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type EmployeeWithScore = {
  id: string
  name: string
  email: string
  position: string
  latest_score?: number
  risk_level?: string
}

export default function HrDashboardPage() {
  const [employees, setEmployees] = useState<EmployeeWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/")
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'hr') {
        router.push("/")
        return
      }

      // Fetch employees
      const { data: employeesData, error: empError } = await supabase
        .from("employees")
        .select("id, name, email, position")

      if (empError) {
        console.error("Error fetching employees:", empError)
        setLoading(false)
        return
      }

      // Fetch latest surveys for each employee
      const employeesWithScores: EmployeeWithScore[] = await Promise.all(
        (employeesData || []).map(async (emp) => {
          const { data: surveyData } = await supabase
            .from("engagement_surveys")
            .select("q1, q2, q3, q4, q5")
            .eq("employee_id", emp.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          let latest_score: number | undefined
          let risk_level: string | undefined
          if (surveyData) {
            const average = (surveyData.q1 + surveyData.q2 + surveyData.q3 + surveyData.q4 + surveyData.q5) / 5
            latest_score = Math.round(average * 20)
            if (latest_score >= 80) risk_level = "Low"
            else if (latest_score >= 60) risk_level = "Medium"
            else risk_level = "High"
          }

          return {
            ...emp,
            latest_score,
            risk_level,
          }
        })
      )

      setEmployees(employeesWithScores)
      setLoading(false)
    }

    checkAuthAndLoad()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">HR Dashboard</h1>
        <LogoutButton />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employees</CardTitle>
            <Button asChild>
              <Link href="/hr/employees/new">Add Employee Detail</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold">{employee.name}</h3>
                  <p className="text-sm text-muted-foreground">{employee.email}</p>
                  <p className="text-sm">{employee.position}</p>
                </div>
                <div className="flex items-center space-x-4">
                  {employee.latest_score !== undefined ? (
                    <>
                      <span className="font-semibold">{employee.latest_score}%</span>
                      <Badge variant={
                        employee.risk_level === "Low" ? "default" :
                        employee.risk_level === "Medium" ? "secondary" : "destructive"
                      }>
                        {employee.risk_level} Risk
                      </Badge>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No data</span>
                  )}
                  <Link href={`/hr/employee/${employee.id}`} className="text-blue-600 hover:underline">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={employees.map(emp => ({ name: emp.name, score: emp.latest_score || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}