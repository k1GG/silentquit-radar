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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function HrDashboardClient() {
  const [employees, setEmployees] = useState<EmployeeWithScore[]>([])
  const [engageValueData, setEngageValueData] = useState<{
    totalExpectedLoss: number
    totalExpectedSavings: number
  } | null>(null)
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

      // Fetch EngageValue snapshots
      const { data: snapshotsData, error: snapError } = await supabase
        .from("engagement_roi_snapshots")
        .select("estimated_attrition_cost, expected_savings")

      if (!snapError && snapshotsData) {
        console.log("EngageValue snapshots fetched:", snapshotsData)
        const totalExpectedLoss = snapshotsData.reduce((sum, s) => sum + (s.estimated_attrition_cost || 0), 0)
        const totalExpectedSavings = snapshotsData.reduce((sum, s) => sum + (s.expected_savings || 0), 0)
        setEngageValueData({ totalExpectedLoss, totalExpectedSavings })
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white">HR Dashboard</h1>
        <LogoutButton />
      </div>

      {/* EngageValue Impact Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">💰 EngageValue™ Impact</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4 sm:space-y-6">
          {engageValueData ? (
            <>
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-red-500">{formatCurrency(engageValueData.totalExpectedLoss)}</h2>
                <p className="text-red-300">Attrition Exposure</p>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-green-500">{formatCurrency(engageValueData.totalExpectedSavings)}</h2>
                <p className="text-green-300">Preventable Loss</p>
              </div>
              <Button asChild className="w-full sm:w-auto mt-4 bg-teal-600 hover:bg-teal-700 text-white">
                <Link href="/hr/dashboard/engagevalue">
                  View EngageValue™ Details →
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-gray-400">
              EngageValue™ data will appear after employee engagement analysis
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Employees</CardTitle>
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
              <Link href="/hr/employees/new">Add Employee Detail</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 sm:space-y-6">
            {employees.map((employee) => (
              <Card key={employee.id} className="bg-gray-700 border-gray-600">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{employee.name}</h3>
                      <p className="text-sm text-gray-400">{employee.position}</p>
                      {employee.latest_score !== undefined ? (
                        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                          <Badge className="bg-blue-600 text-white">{employee.latest_score}%</Badge>
                          <Badge className={
                            employee.risk_level === "Low" ? "bg-green-600" :
                            employee.risk_level === "Medium" ? "bg-yellow-600" : "bg-red-600"
                          }>
                            {employee.risk_level} Risk
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-gray-400 mt-2 sm:mt-0 block">No data</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <Link href={`/hr/employee/${employee.id}`} className="text-teal-400 hover:text-teal-300 py-3 px-4 text-base">
                        View Details →
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Engagement Scores</CardTitle>
          <p className="text-gray-400 text-sm">Latest engagement scores for all employees</p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employees.map(emp => ({ name: emp.name, score: emp.latest_score || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="score" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}