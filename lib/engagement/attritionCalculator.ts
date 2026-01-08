/**
 * EngageValue™ – Attrition Cost & ROI Engine
 * Utility functions for calculating attrition probability, cost, and intervention ROI.
 */

/**
 * Computes the attrition probability based on engagement metrics.
 * @param engagementScore - Current engagement score (0-100)
 * @param scoreDrop30Days - Drop in score over last 30 days
 * @param riskLevel - Risk level category
 * @param tenureMonths - Employee tenure in months
 * @returns Probability between 0 and 1
 */
export function computeAttritionProbability({
  engagementScore,
  scoreDrop30Days,
  riskLevel,
  tenureMonths,
}: {
  engagementScore: number;
  scoreDrop30Days: number;
  riskLevel: "low" | "medium" | "high";
  tenureMonths: number;
}): number {
  let prob = 0.1;

  if (engagementScore < 60) prob += 0.15;
  if (engagementScore < 50) prob += 0.25;
  if (scoreDrop30Days > 10) prob += 0.2;
  if (riskLevel === "high") prob += 0.2;
  if (riskLevel === "medium") prob += 0.1;
  if (tenureMonths < 12) prob += 0.1;

  return Math.min(prob, 0.75);
}

/**
 * Computes the total attrition cost for an employee.
 * @param avgSalary - Average salary
 * @param replacementCostPct - Replacement cost as percentage of salary
 * @param rampUpMonths - Months to ramp up new hire
 * @returns Total attrition cost
 */
export function computeAttritionCost({
  avgSalary,
  replacementCostPct,
  rampUpMonths,
}: {
  avgSalary: number;
  replacementCostPct: number;
  rampUpMonths: number;
}): number {
  const replacementCost = avgSalary * replacementCostPct;
  const rampUpCost = (avgSalary / 12) * rampUpMonths;
  return replacementCost + rampUpCost;
}

/**
 * Computes the ROI for intervention based on risk level.
 * @param totalAttritionCost - Total cost of attrition
 * @param riskLevel - Risk level (medium or high)
 * @returns Object with intervention cost, expected savings, and ROI multiple
 */
export function computeInterventionROI({
  totalAttritionCost,
  riskLevel,
}: {
  totalAttritionCost: number;
  riskLevel: "low" | "medium" | "high";
}): {
  interventionCost: number;
  expectedSavings: number;
  roiMultiple: number;
} {
  let interventionCost: number;
  let recoveryProbability: number;

  if (riskLevel === "medium") {
    interventionCost = 5000;
    recoveryProbability = 0.45;
  } else if (riskLevel === "high") {
    interventionCost = 8000;
    recoveryProbability = 0.30;
  } else {
    // For low risk, no intervention assumed
    interventionCost = 0;
    recoveryProbability = 0;
  }

  const expectedSavings = totalAttritionCost * recoveryProbability;
  const roiMultiple = interventionCost > 0 ? expectedSavings / interventionCost : 0;

  return {
    interventionCost,
    expectedSavings,
    roiMultiple,
  };
}