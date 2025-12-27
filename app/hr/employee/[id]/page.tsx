"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

type Employee = {
  id: string
  name: string
  email: string
  position: string
  department: string
  join_date: string
}

type EngagementScore = {
  score: number
  risk_level: string
  created_at: string
}

type SurveyData = {
  q1: number
  q2: number
  q3: number
  q4: number
  q5: number
  created_at: string
}

type TrendPoint = {
  date: string
  score: number
}

export default function HrEmployeeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [latestScore, setLatestScore] = useState<EngagementScore | null>(null)
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [surveyBreakdown, setSurveyBreakdown] = useState<{ q1: number; q2: number; q3: number; q4: number; q5: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      // Fetch employee
      const { data: employeeData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("id", employeeId)
        .single()

      if (empError || !employeeData) {
        router.replace("/dashboard")
        return
      }

      setEmployee(employeeData)

      // Fetch latest score
      const { data: scoreData } = await supabase
        .from("engagement_scores")
        .select("score, risk_level, created_at")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      setLatestScore(scoreData || null)

      // Fetch surveys for trend
      const { data: surveys } = await supabase
        .from("engagement_surveys")
        .select("q1, q2, q3, q4, q5, created_at")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: true })

      if (surveys && surveys.length > 0) {
        const trend: TrendPoint[] = surveys.map((survey) => {
          const average = (survey.q1 + survey.q2 + survey.q3 + survey.q4 + survey.q5) / 5
          const score = Math.round(average * 20)
          return {
            date: new Date(survey.created_at).toLocaleDateString(),
            score,
          }
        })
        setTrendData(trend)

        // Survey breakdown: average per question
        const totals = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 }
        surveys.forEach((survey) => {
          totals.q1 += survey.q1
          totals.q2 += survey.q2
          totals.q3 += survey.q3
          totals.q4 += survey.q4
          totals.q5 += survey.q5
        })
        const averages = {
          q1: Math.round((totals.q1 / surveys.length) * 10) / 10,
          q2: Math.round((totals.q2 / surveys.length) * 10) / 10,
          q3: Math.round((totals.q3 / surveys.length) * 10) / 10,
          q4: Math.round((totals.q4 / surveys.length) * 10) / 10,
          q5: Math.round((totals.q5 / surveys.length) * 10) / 10,
        }
        setSurveyBreakdown(averages)
      }

      setLoading(false)
    }

    if (employeeId) {
      loadData()
    }
  }, [router, employeeId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!employee) {
    return <div>Employee not found</div>
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-semibold">Employee Details</h1>

      {/* Employee Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Name:</strong> {employee.name}</p>
          <p><strong>Email:</strong> {employee.email}</p>
          <p><strong>Position:</strong> {employee.position}</p>
          <p><strong>Department:</strong> {employee.department}</p>
          <p><strong>Join Date:</strong> {new Date(employee.join_date).toLocaleDateString()}</p>
        </CardContent>
      </Card>

      {/* Engagement Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {latestScore ? (
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold">{latestScore.score}%</span>
              <Badge variant={
                latestScore.risk_level === "Low" ? "default" :
                latestScore.risk_level === "Medium" ? "secondary" : "destructive"
              }>
                {latestScore.risk_level} Risk
              </Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">No engagement data available</p>
          )}
        </CardContent>
      </Card>

      {/* Engagement Trend */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Survey Breakdown */}
      {surveyBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Survey Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <p className="font-semibold">Q1</p>
                <p>{surveyBreakdown.q1}</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">Q2</p>
                <p>{surveyBreakdown.q2}</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">Q3</p>
                <p>{surveyBreakdown.q3}</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">Q4</p>
                <p>{surveyBreakdown.q4}</p>
              </div>
              <div className="text-center">
                <p className="font-semibold">Q5</p>
                <p>{surveyBreakdown.q5}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}