export type RiskLevel = "low" | "medium" | "high";

export function getRiskFromScore(score: number): RiskLevel {
  if (score >= 70) return "low";
  if (score >= 55) return "medium";
  return "high";
}

export function getRiskLabel(risk: RiskLevel) {
  return {
    low: "Low Risk",
    medium: "Medium Risk",
    high: "High Risk",
  }[risk];
}

export function getRiskColor(risk: RiskLevel) {
  return {
    low: "green",
    medium: "yellow",
    high: "red",
  }[risk];
}