import { getRiskFromScore } from "@/lib/engagementRisk";

export interface ForecastResult {
  forecastScore: number
  confidenceScore: number
  forecastLabel: string
  explanationPoints: string[]
}

export function forecastEngagement(
  scores: { score: number; created_at: string }[],
  riskAlerts: any[]
): ForecastResult {
  if (scores.length === 0) {
    return {
      forecastScore: 0,
      confidenceScore: 40,
      forecastLabel: "Critical Decline",
      explanationPoints: ["No engagement data available for forecasting."]
    }
  }

  // Sort scores by created_at ascending (oldest first)
  const sortedScores = scores.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const currentScore = sortedScores[sortedScores.length - 1].score

  // Calculate weekly trend
  let weeklyTrend = 0
  if (sortedScores.length > 1) {
    const oldestScore = sortedScores[0].score
    const latestDate = new Date(sortedScores[sortedScores.length - 1].created_at)
    const oldestDate = new Date(sortedScores[0].created_at)
    const daysDiff = (latestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)
    const numberOfWeeks = Math.max(daysDiff / 7, 1) // At least 1 week
    weeklyTrend = (currentScore - oldestScore) / numberOfWeeks
  }

  // Calculate volatility (standard deviation of scores)
  const mean = sortedScores.reduce((sum, s) => sum + s.score, 0) / sortedScores.length
  const variance = sortedScores.reduce((sum, s) => sum + Math.pow(s.score - mean, 2), 0) / sortedScores.length
  const volatility = Math.sqrt(variance)

  // Calculate risk pressure
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentAlerts = riskAlerts.filter(alert => new Date(alert.created_at) >= thirtyDaysAgo)
  let riskPressure = 0.8 // No alerts
  if (recentAlerts.some(alert => alert.risk_level === 'high')) {
    riskPressure = 1.2
  } else if (recentAlerts.some(alert => alert.risk_level === 'medium')) {
    riskPressure = 1.0
  }

  // Calculate base forecast
  const baseForecast = currentScore + (weeklyTrend * 4)

  // Calculate adjusted forecast
  let adjustedForecast = baseForecast - (volatility * 0.5) - (riskPressure * 3)

  // Clamp forecast score
  const forecastScore = Math.max(0, Math.min(100, adjustedForecast))

  // Calculate confidence score
  let confidence = 100 - (volatility * 5) - (Math.abs(weeklyTrend) * 3)
  const confidenceScore = Math.max(40, Math.min(95, confidence))

  // Determine forecast label based on risk
  const currentRisk = getRiskFromScore(currentScore)
  const forecastRisk = getRiskFromScore(forecastScore)

  let forecastLabel: string
  if (forecastRisk === "low") {
    forecastLabel = "Recovering Strongly (Low Risk)"
  } else if (forecastRisk === "medium" && currentRisk === "high") {
    forecastLabel = "Early Recovery (Still Medium Risk)"
  } else if (forecastRisk === "high") {
    forecastLabel = "At Risk (High Risk)"
  } else {
    forecastLabel = "Stabilizing (Medium Risk)"
  }

  // Build explanation points
  const explanationPoints: string[] = []
  if (weeklyTrend > 0) {
    explanationPoints.push(`Engagement shows an upward trend of ${weeklyTrend.toFixed(1)} points per week.`)
  } else if (weeklyTrend < 0) {
    explanationPoints.push(`Engagement shows a downward trend of ${Math.abs(weeklyTrend).toFixed(1)} points per week.`)
  } else {
    explanationPoints.push("Engagement trend is stable.")
  }

  explanationPoints.push(`Score volatility is ${volatility.toFixed(1)} points.`)

  if (riskPressure === 1.2) {
    explanationPoints.push("High-risk alerts detected in the past 30 days.")
  } else if (riskPressure === 1.0) {
    explanationPoints.push("Medium-risk alerts detected in the past 30 days.")
  } else {
    explanationPoints.push("No significant risk alerts in the past 30 days.")
  }

  explanationPoints.push("This forecast is based on recent engagement trends, score volatility, and risk signals.")

  return {
    forecastScore: Math.round(forecastScore),
    confidenceScore: Math.round(confidenceScore),
    forecastLabel,
    explanationPoints
  }
}