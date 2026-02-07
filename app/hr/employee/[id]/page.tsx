import { createSupabaseServerClient } from "@/lib/supabaseServer"
import EmployeeDetailClient from "@/components/EmployeeDetailClient"
import { forecastEngagement } from "@/lib/forecast/engagementForecast"
import { computeAttritionProbability, computeAttritionCost, computeInterventionROI } from "@/lib/engagement/attritionCalculator"
import { getInterventionsWithComparison } from "@/app/actions/interventions"

export const dynamic = "force-dynamic"

type Employee = {
  id: string
  name: string
  email: string
  position: string
  department: string
  join_date: string
  country: string
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

type RiskAlert = {
  id: string
  employee_id: string
  risk_level: string
  reason: string
  score_at_alert: number
  created_at: string
  resolved: boolean
}

type Intervention = {
  id: string
  intervention_type: string
  intervention_date: string
  owner: string
  notes: string | null
}

// Multi-Signal Risk Model Weights
const surveyWeight = 0.5
const attendanceWeight = 0.3
const trendWeight = 0.2

const formatDate = (d: string) => new Date(d).toISOString().split("T")[0]

export default async function HrEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: employeeId } = await params
  const supabase = await createSupabaseServerClient()

  console.log("🔥 SERVER PAGE EXECUTED: HrEmployeeDetailPage")

  // Fetch employee
  const { data: employeeData } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single()

  const employee = employeeData || null

  // Check if EngageValue snapshot exists for today
  const today = new Date().toISOString().slice(0, 10)
  const { data: snapshotData } = await supabase
    .from("engagement_roi_snapshots")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("created_date", today)
    .single()

  const hasEngageValue = !!snapshotData

  // Fetch last 5 engagement scores
  const { data: scoresData } = await supabase
    .from("engagement_scores")
    .select("score, risk_level, created_at")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(5)

  const scores = scoresData || []
  const latestScore = scores.length > 0 ? scores[0] : null

  // Fetch surveys for trend
  const { data: surveys } = await supabase
    .from("engagement_surveys")
    .select("q1, q2, q3, q4, q5, created_at")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: true })

  let trendData: TrendPoint[] = []
  let surveyBreakdown: { q1: number; q2: number; q3: number; q4: number; q5: number } | null = null
  let scoreTrend = 0
  let survey_count = 0
  let score_variance = 0

  if (surveys && surveys.length > 0) {
    survey_count = surveys.length
    trendData = surveys.map((survey) => {
      const average = (survey.q1 + survey.q2 + survey.q3 + survey.q4 + survey.q5) / 5
      const score = Math.round(average * 20)
      return {
        date: formatDate(survey.created_at),
        score,
      }
    })

    // Survey breakdown: average per question
    const totals = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 }
    surveys.forEach((survey) => {
      totals.q1 += survey.q1
      totals.q2 += survey.q2
      totals.q3 += survey.q3
      totals.q4 += survey.q4
      totals.q5 += survey.q5
    })
    surveyBreakdown = {
      q1: Math.round((totals.q1 / surveys.length) * 10) / 10,
      q2: Math.round((totals.q2 / surveys.length) * 10) / 10,
      q3: Math.round((totals.q3 / surveys.length) * 10) / 10,
      q4: Math.round((totals.q4 / surveys.length) * 10) / 10,
      q5: Math.round((totals.q5 / surveys.length) * 10) / 10,
    }

    // Calculate score trend
    if (trendData.length >= 2) {
      const latestScore = trendData[trendData.length - 1].score
      const prevScore = trendData[trendData.length - 2].score
      scoreTrend = latestScore - prevScore
    }

    // Calculate score variance
    if (trendData.length > 1) {
      const scores = trendData.map(d => d.score)
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length
      score_variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
    }
  }

  // --- Forecast Confidence Logic ---
  let confidence: "Low" | "Medium" | "High" = "Low"

  if (survey_count >= 6 && score_variance < 50) {
    confidence = "High"
  } else if (survey_count >= 3) {
    confidence = "Medium"
  }

  try {
    await supabase.from("engagement_forecast_confidence").upsert({
      employee_id: employeeId,
      survey_count,
      score_variance,
      confidence_level: confidence
    })
    console.log("Forecast confidence saved:", confidence)
  } catch (err) {
    console.error("Forecast confidence save failed:", err)
  }

  // Fetch risk alerts for forecast (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // --- Attendance Score (last 30 days) ---
  let attendanceScore = 70 // fallback neutral

  const { data: attendanceData } = await supabase
    .from("employee_attendance")
    .select("attendance_pct")
    .eq("employee_id", employeeId)
    .gte("date", thirtyDaysAgo.toISOString())

  if (attendanceData && attendanceData.length > 0) {
    attendanceScore =
      attendanceData.reduce((sum, d) => sum + d.attendance_pct, 0) /
      attendanceData.length
  }

  // --- Trend Score ---
  let trendScore = 70

  if (trendData.length >= 2) {
    const diff = trendData[trendData.length - 1].score - trendData[0].score
    trendScore = Math.max(30, Math.min(100, 70 + diff))
  }

  const { data: riskAlertsData } = await supabase
    .from("risk_alerts")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })

  const riskAlerts = riskAlertsData || []

  // Fetch latest risk alert
  const latestAlert = riskAlerts.length > 0 ? riskAlerts[0] : null

  // Fetch risk history: last 5 alerts
  const { data: riskHistoryData } = await supabase
    .from("risk_alerts")
    .select("id, risk_level, reason, created_at, score_at_alert")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(5)

  const riskHistory = riskHistoryData || []

  // Fetch interventions with comparison
  const interventions = await getInterventionsWithComparison(employeeId)

  // Fetch basic intervention data for read-only table
  const { data: interventionsData } = await supabase
    .from("engagement_interventions")
    .select("id, intervention_type, intervention_date, owner, notes")
    .eq("employee_id", employeeId)
    .order("intervention_date", { ascending: false })

  const basicInterventions: Intervention[] = interventionsData || []

  // Fetch tasks for interventions
  const { data: taskData } = await supabase
    .from("intervention_tasks")
    .select("*")
    .in("intervention_id", basicInterventions.map(i => i.id))

  const tasksByIntervention: Record<string, any[]> = {}

  taskData?.forEach(task => {
    if (!tasksByIntervention[task.intervention_id]) {
      tasksByIntervention[task.intervention_id] = []
    }
    tasksByIntervention[task.intervention_id].push(task)
  })

  // Calculate engagement forecast
  const engagementForecast = forecastEngagement(scores, riskAlerts)

  // Fetch last 30 days engagement scores for attrition calculation
  const { data: last30Scores } = await supabase
    .from("engagement_scores")
    .select("score, created_at")
    .eq("employee_id", employeeId)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })

  // Fetch matching cost model by role
  const employeeCountry = employee.country ?? "India"
  const { data: costModel, error: costModelError } = await supabase
    .from("engagement_cost_models")
    .select("*")
    .ilike("role", employee.position)
    .eq("country", employeeCountry)
    .single()

  console.log("DEBUG costModel query:", {
    role: employee.position,
    country: employeeCountry,
  })
  console.log("DEBUG EngageValue costModel resolved:", costModel, costModelError)

  // Compute attrition data for display
  let attritionData: {
    expectedLoss: number;
    roiMetrics: {
      interventionCost: number;
      expectedSavings: number;
      roiMultiple: number;
    };
    totalAttritionCost: number;
  } | null = null

  console.log("DEBUG EngageValue inputs:", {
    employeeId,
    hasEmployee: !!employee,
    hasLatestScore: !!latestScore,
    last30ScoresCount: last30Scores?.length,
    costModel
  })

  if (latestScore && costModel && last30Scores && last30Scores.length > 0) {
    const latestScoreValue = latestScore.score
    const oldestScore = last30Scores[last30Scores.length - 1]?.score || latestScoreValue
    const scoreDrop30Days = oldestScore - latestScoreValue
    const tenureMonths = Math.floor((new Date().getTime() - new Date(employee.join_date).getTime()) / (1000 * 60 * 60 * 24 * 30))

    // --- Final Multi-Signal Engagement Score ---
    const multiSignalScore =
      latestScoreValue * surveyWeight +
      attendanceScore * attendanceWeight +
      trendScore * trendWeight

    // Use multi-signal score for risk calculations
    const scoreForRisk = Math.round(multiSignalScore)
    const riskLevel = latestScore.risk_level.toLowerCase() as "low" | "medium" | "high"

    const attritionProb = computeAttritionProbability({
      engagementScore: scoreForRisk,
      scoreDrop30Days,
      riskLevel,
      tenureMonths,
    })

    const totalAttritionCost = computeAttritionCost({
      avgSalary: costModel.avg_salary,
      replacementCostPct: costModel.replacement_cost_pct,
      rampUpMonths: costModel.ramp_up_months,
    })

    const expectedLoss = totalAttritionCost * attritionProb

    const roi = computeInterventionROI({
      totalAttritionCost,
      riskLevel,
    })

    attritionData = {
      expectedLoss,
      roiMetrics: roi,
      totalAttritionCost,
    }

    const created_date = new Date().toISOString().slice(0, 10)
    try {
      const upsertResult = await supabase
        .from('engagement_roi_snapshots')
        .upsert({
          employee_id: employeeId,
          engagement_score: latestScoreValue,
          risk_level: riskLevel,
          attrition_probability: attritionProb,
          estimated_attrition_cost: totalAttritionCost,
          intervention_cost: roi.interventionCost,
          expected_savings: roi.expectedSavings,
          roi_multiple: roi.roiMultiple,
          created_date,
        }, {
          onConflict: 'employee_id,created_date'
        })

      console.log("✅ EngageValue snapshot upsert successful", {
        employeeId,
        created_date,
        engagement_score: latestScoreValue,
        risk_level: riskLevel,
        attrition_probability: attritionProb,
        estimated_attrition_cost: totalAttritionCost,
        intervention_cost: roi.interventionCost,
        expected_savings: roi.expectedSavings,
        roi_multiple: roi.roiMultiple,
        upsertResult: upsertResult.data,
        upsertError: upsertResult.error
      })
    } catch (error) {
      console.error("❌ EngageValue snapshot upsert failed:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <EmployeeDetailClient
        employee={employee}
        latestScore={latestScore}
        trendData={trendData}
        surveyBreakdown={surveyBreakdown}
        latestAlert={latestAlert}
        riskHistory={riskHistory}
        engagementForecast={engagementForecast}
        scoreTrend={scoreTrend}
        attritionData={attritionData}
        hasEngageValue={hasEngageValue}
        survey_count={survey_count}
        score_variance={score_variance}
        interventions={interventions}
        basicInterventions={basicInterventions}
        forecastConfidence={confidence}
        tasksByIntervention={tasksByIntervention}
      />
    </div>
  )
}
