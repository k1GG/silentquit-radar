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
   hasEngageValue
 }: Props) {
   const router = useRouter()
   const [isModalOpen, setIsModalOpen] = useState(false)

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

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-semibold text-white">Employee Details</h1>

      {/* Profile Header */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{employee.name}</h2>
              <p className="text-gray-400">{employee.position} • {employee.department}</p>
            </div>
            {latestScore ? (
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-bold text-white">{latestScore.score}%</span>
                <Badge className={
                  getRiskFromScore(latestScore.score) === "low" ? "bg-green-600" :
                  getRiskFromScore(latestScore.score) === "medium" ? "bg-yellow-600" : "bg-red-600"
                }>
                  {getRiskLabel(getRiskFromScore(latestScore.score))} Risk
                </Badge>
              </div>
            ) : (
              <p className="text-gray-400">No engagement data</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* EngageValue™ */}
      {attritionData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-800 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-white">Attrition Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-500 font-semibold text-2xl">
                Estimated Attrition Cost: {formatCurrency(attritionData.totalAttritionCost)}
              </p>
              <p className="text-red-500 font-semibold text-2xl">
                Expected Loss: {(latestScore?.risk_level.toLowerCase() === "low" || (attritionData.expectedLoss / attritionData.totalAttritionCost) <= 0.1) ? "Negligible" : formatCurrency(attritionData.expectedLoss)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-white">ROI & Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-500 font-semibold text-2xl">
                Intervention Cost: {formatCurrency(attritionData.roiMetrics.interventionCost)}
              </p>
              <p className="text-green-500 font-semibold text-2xl">
                Expected Savings: {formatCurrency(attritionData.roiMetrics.expectedSavings)}
              </p>
              <Badge className="bg-teal-600 text-white text-lg">
                {attritionData.roiMetrics.roiMultiple.toFixed(1)}x ROI
              </Badge>
            </CardContent>
          </Card>
        </div>
      ) : !hasEngageValue ? (
        <div className="text-center">
          <Button onClick={() => setIsModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white text-lg px-8 py-4">
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
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span className="text-3xl font-bold">{engagementForecast.forecastScore}%</span>
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
        <CardContent>
          {riskHistory.length > 0 ? (
            <div className="space-y-4">
              {riskHistory.map((alert) => (
                <div key={alert.id} className="flex items-center space-x-4">
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

      <ActivateEngageValueModal
        employee={employee!}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}