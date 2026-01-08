'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

export async function updateCostModel(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  // Verify HR role
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'hr') {
    throw new Error('Unauthorized')
  }

  // Extract form data
  const role = formData.get('role') as string
  const country = formData.get('country') as string
  const avg_salary = parseFloat(formData.get('avg_salary') as string)
  const replacement_cost_pct = parseFloat(formData.get('replacement_cost_pct') as string)
  const ramp_up_months = parseInt(formData.get('ramp_up_months') as string)

  // Validate
  if (
    isNaN(avg_salary) || avg_salary <= 0 ||
    isNaN(replacement_cost_pct) || replacement_cost_pct < 0 || replacement_cost_pct > 150 ||
    isNaN(ramp_up_months) || ramp_up_months < 0 || ramp_up_months > 12
  ) {
    throw new Error('Invalid input data')
  }

  // Update the record by role and country
  const { data, error } = await supabase
    .from('engagement_cost_models')
    .update({
      avg_salary: Number(avg_salary),
      replacement_cost_pct: Number(replacement_cost_pct),
      ramp_up_months: Number(ramp_up_months),
    })
    .ilike('role', role)
    .eq('country', country)
    .select()

  console.log('Update result:', { data, error })

  if (error) {
    throw new Error('Failed to update cost model')
  }

  // Revalidate the page
  revalidatePath('/hr/settings/cost-models')
}