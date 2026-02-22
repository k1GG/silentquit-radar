'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'
import { computeAttritionProbability, computeAttritionCost, computeInterventionROI } from '@/lib/engagement/attritionCalculator'

export async function activateEngageValue(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  // Verify HR role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Unauthorized")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'hr') {
    throw new Error('Unauthorized')
  }

  // Extract form data
  const employeeId = formData.get('employee_id') as string
  const score = parseInt(formData.get('score') as string)
  const riskLevel = formData.get('risk_level') as string
  const country = formData.get('country') as string

  // Validate
  if (!employeeId || isNaN(score) || score < 0 || score > 100 || !['low', 'medium', 'high'].includes(riskLevel) || !country.trim()) {
    throw new Error('Invalid input data')
  }

  // Fetch employee
  const { data: employee } = await supabase
    .from('employees')
    .select('position, join_date')
    .eq('id', employeeId)
    .single()

  if (!employee) {
    throw new Error('Employee not found')
  }

  // Insert into engagement_scores
  const normalizedRisk =
    riskLevel.charAt(0).toUpperCase() +
    riskLevel.slice(1).toLowerCase()
  const { data, error } = await supabase
    .from("engagement_scores")
    .insert({
      employee_id: employeeId,
      score,
      risk_level: normalizedRisk,
    })
    .select()

console.log("DEBUG engagement_scores insert data:", data)
console.log("DEBUG engagement_scores insert error:", error)

if (error) {
  throw new Error(JSON.stringify(error))
}

  // Fetch cost model
  const { data: costModel, error: costError } = await supabase
    .from('engagement_cost_models')
    .select('*')
    .ilike('role', employee.position)
    .ilike('country', country)
    .single()

  if (costError || !costModel) {
    throw new Error('No cost assumptions found for this role & country')
  }

  // Compute
  const tenureMonths = Math.floor((new Date().getTime() - new Date(employee.join_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
  const scoreDrop30Days = 0 // Manual activation, no drop data
  const riskLevelTyped = riskLevel as 'low' | 'medium' | 'high'

  const attritionProb = computeAttritionProbability({
    engagementScore: score,
    scoreDrop30Days,
    riskLevel: riskLevelTyped,
    tenureMonths,
  })

  const totalAttritionCost = computeAttritionCost({
    avgSalary: costModel.avg_salary,
    replacementCostPct: costModel.replacement_cost_pct,
    rampUpMonths: costModel.ramp_up_months,
  })

  const roi = computeInterventionROI({
    totalAttritionCost,
    riskLevel: riskLevelTyped,
  })

  const created_date = new Date().toISOString().slice(0, 10)

  // Upsert into engagement_roi_snapshots
  const { error: upsertError } = await supabase
    .from('engagement_roi_snapshots')
    .upsert({
      employee_id: employeeId,
      engagement_score: score,
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

  if (upsertError) {
    throw new Error('Failed to upsert EngageValue snapshot')
  }

  // Revalidate
  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath('/hr/dashboard')
}