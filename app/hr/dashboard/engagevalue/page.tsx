'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import CostAssumptionsPanel from '@/components/CostAssumptionsPanel'
import ConfidenceIndicator from '@/components/ConfidenceIndicator'
import ScenarioSimulator from '@/components/ScenarioSimulator'
import InterventionOutcomesCard from '@/components/InterventionOutcomesCard'
import AttendanceUploadCard from '@/components/AttendanceUploadCard'
import { useToast } from '@/hooks/use-toast'

type SnapshotWithEmployee = {
  estimated_attrition_cost: number
  expected_savings: number
  employee_id: string
  employees: any
}

type CostModel = {
  id: string
  role: string
  country: string
  avg_salary: number
  replacement_cost_pct: number
  ramp_up_months: number
  created_at: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function EngageValuePage() {
   const [allSnapshots, setAllSnapshots] = useState<any[]>([])
   const [topSnapshots, setTopSnapshots] = useState<SnapshotWithEmployee[]>([])
   const [costModels, setCostModels] = useState<CostModel[]>([])
   const [loading, setLoading] = useState(true)
   const [scenarioOpen, setScenarioOpen] = useState(false)
   const router = useRouter()
   const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().slice(0, 10)

      // Fetch today's snapshots
      const { data: allData, error: allError } = await supabase
        .from('engagement_roi_snapshots')
        .select('estimated_attrition_cost, expected_savings')
        .eq('created_date', today)

      const { data: topData, error: topError } = await supabase
        .from('engagement_roi_snapshots')
        .select('estimated_attrition_cost, expected_savings, employee_id, employees (name, position)')
        .eq('created_date', today)
        .order('estimated_attrition_cost', { ascending: false })
        .limit(5)

      // Fetch cost models
      const { data: costData, error: costError } = await supabase
        .from('engagement_cost_models')
        .select('*')
        .order('role', { ascending: true })
        .order('country', { ascending: true })

      if (allError || topError || costError) {
        console.error('Error fetching data:', allError || topError || costError)
        setLoading(false)
        return
      }

      setAllSnapshots(allData || [])
      setTopSnapshots(topData || [])
      setCostModels(costData || [])
      setLoading(false)
    }

    fetchData()
  }, [])


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white">EngageValue™ Impact</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const totalExpectedLoss = allSnapshots.reduce((sum, s) => sum + (s.estimated_attrition_cost || 0), 0)
  const totalExpectedSavings = allSnapshots.reduce((sum, s) => sum + (s.expected_savings || 0), 0)
  const hasData = allSnapshots.length > 0

  const defaultModel = costModels.length > 0 ? costModels[0] : null
  let attritionProb = 0
  let expectedLoss = totalExpectedLoss
  if (defaultModel && allSnapshots.length > 0) {
    const attritionCostBase = defaultModel.avg_salary * defaultModel.replacement_cost_pct / 100
    const avgAttritionCost = totalExpectedLoss / allSnapshots.length
    attritionProb = attritionCostBase > 0 ? avgAttritionCost / attritionCostBase : 0
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white">EngageValue™ Impact</h1>

      {!hasData ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4 sm:p-6">
            <p className="text-gray-400">EngageValue™ data will appear after first engagement analysis</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Total Attrition Exposure</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-red-500">{formatCurrency(totalExpectedLoss)}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Preventable Loss</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-green-500">{formatCurrency(totalExpectedSavings)}</p>
              </CardContent>
            </Card>
          </div>

          <ConfidenceIndicator survey_count={allSnapshots.length} />

          <AttendanceUploadCard />

          <InterventionOutcomesCard />

          <Collapsible open={scenarioOpen} onOpenChange={setScenarioOpen}>
            <CollapsibleTrigger asChild>
              <Card className="bg-gray-800 border-gray-700 cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white">Scenario Simulator</CardTitle>
                  <p className="text-gray-400 text-sm">What if we intervene? (Click to expand)</p>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScenarioSimulator expectedLoss={totalExpectedLoss} />
            </CollapsibleContent>
          </Collapsible>

          {defaultModel && (
            <CostAssumptionsPanel
              costModel={defaultModel}
              isRoleOverride={false}
              attritionProb={attritionProb}
              expectedLoss={expectedLoss}
            />
          )}

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Top Employees by Expected Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 sm:space-y-6">
                {topSnapshots.map((snapshot) => (
                  <Card key={snapshot.employee_id} className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {((snapshot.employees as any)?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{(snapshot.employees as any)?.name || 'Unknown'}</h3>
                            <p className="text-sm text-gray-400">{(snapshot.employees as any)?.position || 'Unknown'}</p>
                          </div>
                        </div>
                        <Badge className="bg-red-600 text-white mt-2 sm:mt-0">
                          {formatCurrency(snapshot.estimated_attrition_cost)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

        </>
      )}

    </div>
  )
}