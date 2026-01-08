import { RiskLevel } from "./engagementRisk";

export interface DiagnosisResult {
  label: string
  severity: "high" | "medium" | "low"
  recommendedActions: string[]
}

export function deriveEngagementDiagnosis(risk: RiskLevel): DiagnosisResult {
  if (risk === "high") {
    return {
      label: "Engagement Critical",
      severity: "high",
      recommendedActions: [
        "Immediate HR + Manager intervention",
        "Workload redistribution",
        "Weekly engagement check-ins"
      ]
    }
  }

  if (risk === "medium") {
    return {
      label: "Engagement Declining",
      severity: "medium",
      recommendedActions: [
        "Manager check-in recommended",
        "Review recent workload changes",
        "Monitor engagement weekly"
      ]
    }
  }

  return {
    label: "Engagement Stable",
    severity: "low",
    recommendedActions: [
      "No action required",
      "Maintain current engagement strategy"
    ]
  }
}