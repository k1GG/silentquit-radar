"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { RiskBadge } from "@/components/risk-badge"
import { ForecastResult } from "@/lib/forecast/engagementForecast"
import { deriveEngagementDiagnosis, DiagnosisResult } from "@/lib/engagementHealth"
import { getRiskFromScore, getRiskLabel, getRiskColor } from "@/lib/engagementRisk"
import ActivateEngageValueModal from "@/components/ActivateEngageValueModal"
import ConfidenceIndicator from "@/components/ConfidenceIndicator"
import ScenarioSimulator from "@/components/ScenarioSimulator"
import TimeToImpactIndicator from "@/components/TimeToImpactIndicator"
import InterventionTracker from "@/components/InterventionTracker"
import { InterventionWithComparison, createIntervention } from "@/app/actions/interventions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const formatDate = (d: string) => new Date(d).toISOString().split("T")[0]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

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

type RiskAlert = {
  id: string
  employee_id: string
  risk_level: string
  reason: string
  score_at_alert: number
  created_at: string
  resolved: boolean
}

type RiskHistoryItem = {
  id: string
  risk_level: string
  reason: string
  created_at: string
  score_at_alert: number
}


type Props = {
   employee: Employee | null
   latestScore: EngagementScore | null
   trendData: TrendPoint[]
   surveyBreakdown: { q1: number; q2: number; q3: number; q4: number; q5: number } | null
   latestAlert: RiskAlert | null
   riskHistory: RiskHistoryItem[]
   engagementForecast: ForecastResult
   scoreTrend: number
   attritionData: {
     expectedLoss: number;
     roiMetrics: {
       interventionCost: number;
       expectedSavings: number;
       roiMultiple: number;
     };
     totalAttritionCost: number;
   } | null
   hasEngageValue: boolean
   survey_count: number
   score_variance: number
   interventions: InterventionWithComparison[]
   basicInterventions: Intervention[]
   forecastConfidence?: "Low" | "Medium" | "High"
   tasksByIntervention: Record<string, any[]>
 }

 type Intervention = {
   id: string
   intervention_type: string
   intervention_date: string
   owner: string
   notes: string | null
 }

export default function EmployeeDetailClient({
   employee,
   latestScore,
   trendData,
   surveyBreakdown,
   latestAlert,
   riskHistory,
   engagementForecast,
   scoreTrend,
   attritionData,
   hasEngageValue,
   survey_count,
   score_variance,
   interventions,
   basicInterventions,
   forecastConfidence,
   tasksByIntervention
}: Props) {
   const router = useRouter()
   const [isModalOpen, setIsModalOpen] = useState(false)
   const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false)
   const [isSubmitting, setIsSubmitting] = useState(false)
   const [interventionForm, setInterventionForm] = useState({
     intervention_type: "",
     intervention_date: new Date().toISOString().split("T")[0],
     owner: "",
     notes: "",
   })

  useEffect(() => {
    if (!employee) {
      router.replace("/dashboard")
    }
  }, [employee, router])

  const diagnosis: DiagnosisResult = latestScore ? deriveEngagementDiagnosis(getRiskFromScore(latestScore.score)) : {
    label: "No engagement data available",
    severity: "low",
    recommendedActions: ["Complete initial engagement survey"]
  }

  // Dev safety check
  if (process.env.NODE_ENV === "development" && latestScore) {
    const calculatedRisk = getRiskFromScore(latestScore.score)
    if (latestScore.risk_level !== calculatedRisk) {
      console.warn("Risk mismatch detected", latestScore.score, latestScore.risk_level, calculatedRisk);
    }
  }

  if (!employee) return null

  const handleInterventionSubmit = async () => {
    if (!interventionForm.intervention_type || !interventionForm.intervention_date || !interventionForm.owner) {
      console.error("Missing required fields")
      return
    }

    setIsSubmitting(true)
    try {
      await createIntervention({
        employee_id: employee.id,
        intervention_type: interventionForm.intervention_type,
        intervention_date: interventionForm.intervention_date,
        owner: interventionForm.owner,
        notes: interventionForm.notes || undefined,
      })
      
      setIsInterventionModalOpen(false)
      setInterventionForm({
        intervention_type: "",
        intervention_date: new Date().toISOString().split("T")[0],
        owner: "",
        notes: "",
      })
      
      // Refresh the page to show the new intervention
      router.refresh()
    } catch (error) {
      console.error("Error creating intervention:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setInterventionForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white">Employee Details</h1>

      {/* Profile Header */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{employee.name}</h2>
              <p className="text-gray-400">{employee.position} • {employee.department}</p>
            </div>
            {latestScore ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">{latestScore.score}%</span>
                <Badge className={
                  getRiskFromScore(latestScore.score) === "low" ? "bg-green-600" :
                  getRiskFromScore(latestScore.score) === "medium" ? "bg-yellow-600" : "bg-red-600"
                }>
                  {getRiskLabel(getRiskFromScore(latestScore.score))} Risk
                </Badge>
                {forecastConfidence && (
                  <Badge variant="secondary" className="ml-2">
                    Forecast Confidence: {forecastConfidence}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-gray-400">No engagement data</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* EngageValue™ */}
      {attritionData ? (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="bg-gray-800 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-white">Attrition Cost</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <p className="text-red-500 font-semibold text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  Estimated Attrition Cost: {formatCurrency(attritionData.totalAttritionCost)}
                </p>
                <p className="text-red-500 font-semibold text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  Expected Loss: {(latestScore?.risk_level.toLowerCase() === "low" || (attritionData.expectedLoss / attritionData.totalAttritionCost) <= 0.1) ? "Negligible" : formatCurrency(attritionData.expectedLoss)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-white">ROI & Savings</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <p className="text-green-500 font-semibold text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  Intervention Cost: {formatCurrency(attritionData.roiMetrics.interventionCost)}
                </p>
                <p className="text-green-500 font-semibold text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  Expected Savings: {formatCurrency(attritionData.roiMetrics.expectedSavings)}
                </p>
                <Badge className="bg-teal-600 text-white text-lg">
                  {attritionData.roiMetrics.roiMultiple.toFixed(1)}x ROI
                </Badge>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <ConfidenceIndicator survey_count={survey_count} score_variance={score_variance} />
            <ScenarioSimulator expectedLoss={attritionData.expectedLoss} />
            <TimeToImpactIndicator riskLevel={latestScore?.risk_level || 'low'} />
          </div>
        </div>
      ) : !hasEngageValue ? (
        <div className="text-center">
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto py-3 px-4 text-base bg-teal-600 hover:bg-teal-700 text-white">
            Activate EngageValue™
          </Button>
        </div>
      ) : null}

      {/* Engagement Health Diagnosis */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Health Diagnosis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span className="text-lg font-semibold">{diagnosis.label}</span>
              <Badge variant={
                diagnosis.severity === "low" ? "default" :
                diagnosis.severity === "medium" ? "secondary" : "destructive"
              }>
                {diagnosis.severity === "high" ? "High" : diagnosis.severity === "medium" ? "Medium" : "Low"} Severity
              </Badge>
            </div>
            <div>
              <ul className="list-disc list-inside space-y-1">
                {diagnosis.recommendedActions.map((action, index) => (
                  <li key={index} className="text-sm">{action}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Alert */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Alert</CardTitle>
        </CardHeader>
        <CardContent>
          {/* IMPORTANT:
          Engagement Level ≠ Risk Alert
          Do NOT merge these concepts */}
          {latestAlert ? (
            <div className="space-y-2">
              <RiskBadge level={getRiskFromScore(latestAlert.score_at_alert)} />
              <p>{latestAlert.reason}</p>
              <p className="text-sm text-muted-foreground">{formatDate(latestAlert.created_at)}</p>
              {process.env.NODE_ENV === "development" && (
                (() => {
                  const calculatedRisk = getRiskFromScore(latestAlert.score_at_alert)
                  if (latestAlert.risk_level.toLowerCase() !== calculatedRisk) {
                    console.warn("Alert risk mismatch detected", latestAlert.score_at_alert, latestAlert.risk_level, calculatedRisk);
                  }
                  return null
                })()
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent risk alerts detected</p>
          )}
        </CardContent>
      </Card>

      {/* 30-Day Engagement Forecast™ */}
      <Card>
        <CardHeader>
          <CardTitle>📈 30-Day Engagement Forecast™</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{engagementForecast.forecastScore}%</span>
              <Badge variant={
                getRiskColor(getRiskFromScore(engagementForecast.forecastScore)) === "green" ? "default" :
                getRiskColor(getRiskFromScore(engagementForecast.forecastScore)) === "yellow" ? "secondary" : "destructive"
              }>
                {engagementForecast.forecastLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Confidence: {engagementForecast.confidenceScore}%</p>
            <div>
              <ul className="list-disc list-inside space-y-1">
                {engagementForecast.explanationPoints.map((point, index) => (
                  <li key={index} className="text-sm">{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk History */}
      <Card>
        <CardHeader>
          <CardTitle>Risk History</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {riskHistory.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {riskHistory.map((alert) => (
                <div key={alert.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <p className="text-sm">{formatDate(alert.created_at)}</p>
                  <RiskBadge level={getRiskFromScore(alert.score_at_alert)} />
                  <p className="flex-1">{alert.reason}</p>
                </div>
              ))}
              {riskHistory.length === 1 && (
                <p className="text-sm text-muted-foreground">
                  This is the first recorded risk alert for this employee in the last 90 days.
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No risk history available</p>
          )}
        </CardContent>
      </Card>

      {/* Engagement Trend */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Survey Breakdown */}
      {surveyBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Survey Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

     {/* Intervention Tracker */}
     {employee && (
       <InterventionTracker
         employeeId={employee.id}
         interventions={interventions}
         tasksByIntervention={tasksByIntervention}
       />
     )}

     <ActivateEngageValueModal
       employee={employee!}
       isOpen={isModalOpen}
       onClose={() => setIsModalOpen(false)}
     />
   </div>
 )
}