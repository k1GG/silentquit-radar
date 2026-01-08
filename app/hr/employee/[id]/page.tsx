import { createSupabaseServerClient } from "@/lib/supabaseServer"
import EmployeeDetailClient from "@/components/EmployeeDetailClient"
import { forecastEngagement } from "@/lib/forecast/engagementForecast"
import { computeAttritionProbability, computeAttritionCost, computeInterventionROI } from "@/lib/engagement/attritionCalculator"

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

  if (surveys && surveys.length > 0) {
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
  }

  // Fetch risk alerts for forecast (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
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
    const riskLevel = latestScore.risk_level.toLowerCase() as "low" | "medium" | "high"

    const attritionProb = computeAttritionProbability({
      engagementScore: latestScoreValue,
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
    />
  )
}