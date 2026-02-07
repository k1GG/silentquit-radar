
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getRiskFromScore, getRiskLabel, getRiskColor } from "@/lib/engagementRisk"
import ActivateEngageValueModal from "@/components/ActivateEngageValueModal"
import InterventionOutcomesCard from "@/components/InterventionOutcomesCard"

type EmployeeWithScore = {
    id: string
    name: string
    email: string
    position: string
    latest_score?: number
    scoreDrop?: number
    hasActiveAlert?: boolean
    hasEngageValue?: boolean
  }

export default function HrDashboardPage() {
   const [employees, setEmployees] = useState<EmployeeWithScore[]>([])
   const [loading, setLoading] = useState(true)
   const [modalEmployee, setModalEmployee] = useState<EmployeeWithScore | null>(null)
   const [deptChartData, setDeptChartData] = useState<{ department: string; cost: number }[]>([])
   const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'hr') {
        router.push("/login")
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

      const today = new Date().toISOString().slice(0, 10)

      // Fetch latest scores for each employee
      const employeesWithScores: EmployeeWithScore[] = await Promise.all(
        (employeesData || []).map(async (emp) => {
          // Get last two scores to calculate drop
          const { data: scoresData } = await supabase
            .from("engagement_scores")
            .select("score")
            .eq("employee_id", emp.id)
            .order("created_at", { ascending: false })
            .limit(2)

          const latestScore = scoresData?.[0]?.score
          const previousScore = scoresData?.[1]?.score
          const scoreDrop = previousScore && latestScore ? Math.max(0, previousScore - latestScore) : 0

          // Check for active alerts
          const { data: activeAlert } = await supabase
            .from("risk_alerts")
            .select("id")
            .eq("employee_id", emp.id)
            .eq("resolved", false)
            .limit(1)
            .single()

          const hasActiveAlert = !!activeAlert

          // Check for EngageValue snapshot
          const { data: snapshot } = await supabase
            .from("engagement_roi_snapshots")
            .select("id")
            .eq("employee_id", emp.id)
            .eq("created_date", today)
            .single()

          const hasEngageValue = !!snapshot

          return {
            ...emp,
            latest_score: latestScore,
            scoreDrop,
            hasActiveAlert,
            hasEngageValue,
          }
        })
      )

      setEmployees(employeesWithScores)

      // Fetch Department Loss Data
      const { data: deptSnapshots } = await supabase
        .from("engagement_roi_snapshots")
        .select("department, estimated_attrition_cost")

      // Aggregate Department Risk
      const deptMap: Record<string, number> = {}

      deptSnapshots?.forEach(d => {
        const dept = d.department || "Unknown"
        deptMap[dept] = (deptMap[dept] || 0) + (d.estimated_attrition_cost || 0)
      })

      const chartData = Object.entries(deptMap).map(([department, cost]) => ({
        department,
        cost
      }))

      setDeptChartData(chartData)
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
      <h1 className="text-3xl font-semibold">HR Dashboard</h1>

      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">💰 EngageValue™ – Attrition Cost & ROI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Quantify attrition risk in real monetary terms and justify intervention ROI.
          </p>
          <Button asChild>
            <Link href="/hr/dashboard/engagevalue">View Cost Impact</Link>
          </Button>
        </CardContent>
      </Card>

      <InterventionOutcomesCard />

      <Card>
        <CardHeader>
          <CardTitle>Attrition Risk by Department</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptChartData}>
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cost" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
                      <Badge variant={
                        getRiskColor(getRiskFromScore(employee.latest_score)) === "green" ? "default" :
                        getRiskColor(getRiskFromScore(employee.latest_score)) === "yellow" ? "secondary" : "destructive"
                      }>
                        {employee.latest_score}% {getRiskLabel(getRiskFromScore(employee.latest_score))}
                      </Badge>
                      {(() => {
                        const risk = getRiskFromScore(employee.latest_score)
                        return risk === "high" ? (
                          <Badge variant="destructive">
                            High Risk Alert
                          </Badge>
                        ) : null
                      })()}
                    </>
                  ) : (
                    <span className="text-muted-foreground">No data</span>
                  )}
                  {!employee.hasEngageValue && (
                    <Button size="sm" onClick={() => setModalEmployee(employee)}>
                      ➕ Activate EngageValue™
                    </Button>
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

      {modalEmployee && (
        <ActivateEngageValueModal
          employee={modalEmployee}
          isOpen={!!modalEmployee}
          onClose={() => setModalEmployee(null)}
        />
      )}
    </div>
  )
}
