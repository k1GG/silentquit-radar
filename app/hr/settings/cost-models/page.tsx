import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import CostModelsTable from '@/components/CostModelsTable'

type CostModel = {
  id: string
  role: string
  country: string
  avg_salary: number
  replacement_cost_pct: number
  ramp_up_months: number
  created_at: string
}

export default async function CostModelsPage() {
  const supabase = await createSupabaseServerClient()

  // Check authentication and role
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'hr') {
    redirect('/login')
  }

  // Fetch cost models
  const { data: costModels } = await supabase
    .from('engagement_cost_models')
    .select('*')
    .order('role', { ascending: true })
    .order('country', { ascending: true })

  return (
    <div className="p-6 space-y-6 bg-gray-900 text-white min-h-screen">
      <div>
        <h1 className="text-3xl font-semibold">💰 Cost Assumptions (EngageValue™)</h1>
        <p className="text-sm text-gray-400 mt-2">
          "These assumptions are used to calculate attrition exposure and ROI across roles and locations."
        </p>
      </div>
      <CostModelsTable costModels={costModels as CostModel[] || []} />
    </div>
  )
}