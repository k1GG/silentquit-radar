'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

export type Intervention = {
  id: string
  employee_id: string
  intervention_type: string
  intervention_date: string
  owner: string
  notes: string | null
  created_at: string
}

export type InterventionWithComparison = Intervention & {
  before_snapshot: {
    engagement_score: number
    risk_level: string
    estimated_attrition_cost: number
  } | null
  after_snapshot: {
    engagement_score: number
    risk_level: string
    estimated_attrition_cost: number
  } | null
}

/**
 * Fetch all interventions for an employee
 */
export async function getInterventions(employeeId: string): Promise<Intervention[]> {
  const supabase = await createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('engagement_interventions')
    .select('*')
    .eq('employee_id', employeeId)
    .order('intervention_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching interventions:', error)
    return []
  }
  
  return data || []
}

/**
 * Get snapshot closest to a specific date
 */
async function getSnapshotNearDate(employeeId: string, targetDate: string, isBefore: boolean) {
  const supabase = await createSupabaseServerClient()
  
  const query = supabase
    .from('engagement_roi_snapshots')
    .select('engagement_score, risk_level, estimated_attrition_cost, created_date')
    .eq('employee_id', employeeId)
  
  if (isBefore) {
    query.lte('created_date', targetDate)
      .order('created_date', { ascending: false })
  } else {
    query.gte('created_date', targetDate)
      .order('created_date', { ascending: true })
  }
  
  const { data } = await query.limit(1).single()
  
  return data || null
}

/**
 * Fetch interventions with before/after comparison
 */
export async function getInterventionsWithComparison(employeeId: string): Promise<InterventionWithComparison[]> {
  const interventions = await getInterventions(employeeId)
  
  const interventionsWithComparison: InterventionWithComparison[] = await Promise.all(
    interventions.map(async (intervention) => {
      const beforeSnapshot = await getSnapshotNearDate(employeeId, intervention.intervention_date, true)
      const afterSnapshot = await getSnapshotNearDate(employeeId, intervention.intervention_date, false)
      
      return {
        ...intervention,
        before_snapshot: beforeSnapshot,
        after_snapshot: afterSnapshot,
      }
    })
  )
  
  return interventionsWithComparison
}

/**
 * Create a new intervention
 */
export async function createIntervention(data: {
  employee_id: string
  intervention_type: string
  intervention_date: string
  owner: string
  notes?: string
}) {
  const supabase = await createSupabaseServerClient()
  
  const { data: intervention, error } = await supabase
    .from('engagement_interventions')
    .insert({
      employee_id: data.employee_id,
      intervention_type: data.intervention_type,
      intervention_date: data.intervention_date,
      owner: data.owner,
      notes: data.notes || null,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating intervention:', error)
    throw new Error('Failed to create intervention')
  }
  
  revalidatePath(`/hr/employee/${data.employee_id}`)
  
  return intervention
}

/**
 * Calculate intervention outcomes for dashboard
 */
export async function getInterventionOutcomes() {
  const supabase = await createSupabaseServerClient()
  
  // Get all interventions
  const { data: interventions } = await supabase
    .from('engagement_interventions')
    .select('*')
    .order('intervention_date', { ascending: false })
  
  if (!interventions || interventions.length === 0) {
    return {
      employeesIntervened: 0,
      riskReducedPercentage: 0,
      estimatedLossAvoided: 0,
    }
  }
  
  // Get unique employee IDs
  const employeeIds = [...new Set(interventions.map(i => i.employee_id))]
  
  let riskReducedCount = 0
  let totalLossAvoided = 0
  
  // For each intervention, calculate before/after
  for (const intervention of interventions) {
    const beforeSnapshot = await getSnapshotNearDate(intervention.employee_id, intervention.intervention_date, true)
    const afterSnapshot = await getSnapshotNearDate(intervention.employee_id, intervention.intervention_date, false)
    
    if (beforeSnapshot && afterSnapshot) {
      // Check if risk reduced
      const riskLevels = ['low', 'medium', 'high']
      const beforeRiskIndex = riskLevels.indexOf(beforeSnapshot.risk_level.toLowerCase())
      const afterRiskIndex = riskLevels.indexOf(afterSnapshot.risk_level.toLowerCase())
      
      if (afterRiskIndex < beforeRiskIndex) {
        riskReducedCount++
      }
      
      // Calculate loss avoided
      const lossAvoided = beforeSnapshot.estimated_attrition_cost - afterSnapshot.estimated_attrition_cost
      if (lossAvoided > 0) {
        totalLossAvoided += lossAvoided
      }
    }
  }
  
  return {
    employeesIntervened: employeeIds.length,
    riskReducedPercentage: interventions.length > 0 ? Math.round((riskReducedCount / interventions.length) * 100) : 0,
    estimatedLossAvoided: totalLossAvoided,
  }
}
