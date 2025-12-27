import { supabase } from "./supabaseClient"

export type TrendPoint = {
  date: string
  score: number
}

export type EmployeeRow = {
  id: string
  email: string
  score: number
  risk_level: "Low" | "Medium" | "High"
}

export type AnalyticsData = {
  totalEmployees: number
  avgEngagement: number
  highRiskCount: number
  engagementTrend: TrendPoint[]
  employees: EmployeeRow[]
}

export async function getHRAnalytics(): Promise<AnalyticsData> {
  console.log("🔍 HR Analytics: Starting query for employees")
  // 1. Total Employees
  const { data: employeesData, error: empError } = await supabase
    .from("employees")
    .select("id, email")

  if (empError) {
    throw new Error(`Employees error: ${empError.message}`)
  }

  const totalEmployees = employeesData.length
  console.log(`🔍 HR Analytics: Found ${totalEmployees} employees`)

  // 2. Fetch all survey responses
  console.log("🔍 HR Analytics: Querying engagement surveys")
  const { data: surveys, error: surveyError } = await supabase
    .from("engagement_surveys")
    .select("employee_id, q1, q2, q3, q4, q5, created_at")

  if (surveyError) {
    throw new Error(`Survey error: ${surveyError.message}`)
  }
  console.log(`🔍 HR Analytics: Found ${surveys.length} survey responses`)

  // Calculate scores per employee
  const employeeScores = new Map<string, { score: number; risk_level: "Low" | "Medium" | "High"; latestDate: string }>()
  const employeeSurveys = new Map<string, { answers: number[]; dates: string[] }>()

  surveys.forEach((survey) => {
    const answers = [survey.q1, survey.q2, survey.q3, survey.q4, survey.q5].filter(a => a !== null && a !== undefined)
    if (!employeeSurveys.has(survey.employee_id)) {
      employeeSurveys.set(survey.employee_id, { answers: [], dates: [] })
    }
    employeeSurveys.get(survey.employee_id)!.answers.push(...answers)
    employeeSurveys.get(survey.employee_id)!.dates.push(survey.created_at)
  })

  employeeSurveys.forEach((data, empId) => {
    const avgAnswer = data.answers.reduce((sum, a) => sum + a, 0) / data.answers.length
    const score = Math.round(avgAnswer * 20)
    const risk_level = score < 40 ? "High" : score < 70 ? "Medium" : "Low"
    const latestDate = data.dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
    employeeScores.set(empId, { score, risk_level, latestDate })
  })

  // 3. High Risk Count
  const highRiskCount = Array.from(employeeScores.values()).filter(s => s.risk_level === "High").length

  // 4. Avg Engagement
  const scores = Array.from(employeeScores.values()).map(s => s.score)
  const avgEngagement = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0

  // 5. Engagement Trend - weekly averages
  const weeklyData = new Map<string, number[]>()

  employeeSurveys.forEach((data, empId) => {
    data.dates.forEach((dateStr, index) => {
      const date = new Date(dateStr)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, [])
      }
      // For each survey date, add the employee's current score
      const empScore = employeeScores.get(empId)?.score || 0
      weeklyData.get(weekKey)!.push(empScore)
    })
  })

  const engagementTrend: TrendPoint[] = Array.from(weeklyData.entries())
    .map(([week, scores]) => ({
      date: week,
      score: Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 6. Employee Table
  const employees: EmployeeRow[] = employeesData.map(emp => {
    const scoreData = employeeScores.get(emp.id)
    return {
      id: emp.id,
      email: emp.email,
      score: scoreData?.score || 0,
      risk_level: scoreData?.risk_level || "High",
    }
  }).sort((a, b) => {
    const riskOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
    return riskOrder[a.risk_level] - riskOrder[b.risk_level] || a.score - b.score
  }).slice(0, 10)

  return {
    totalEmployees,
    avgEngagement,
    highRiskCount,
    engagementTrend,
    employees,
  }
}