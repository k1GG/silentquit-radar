'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateCostModel } from '@/app/hr/settings/cost-models/actions'
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
  const [selectedCostModel, setSelectedCostModel] = useState<CostModel | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [formData, setFormData] = useState({
    avg_salary: '',
    replacement_cost_pct: '',
    ramp_up_months: ''
  })
  const [saving, setSaving] = useState(false)
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

  const handleEdit = (model: CostModel) => {
    setSelectedCostModel(model)
    setFormData({
      avg_salary: model.avg_salary.toString(),
      replacement_cost_pct: model.replacement_cost_pct.toString(),
      ramp_up_months: model.ramp_up_months.toString()
    })
    setIsEditOpen(true)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const avg_salary = parseFloat(formData.avg_salary)
    const replacement_cost_pct = parseFloat(formData.replacement_cost_pct)
    const ramp_up_months = parseInt(formData.ramp_up_months)

    if (
      isNaN(avg_salary) || avg_salary <= 0 ||
      isNaN(replacement_cost_pct) || replacement_cost_pct < 0 || replacement_cost_pct > 150 ||
      isNaN(ramp_up_months) || ramp_up_months < 0 || ramp_up_months > 12
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please check the input values.',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      await updateCostModel(new FormData(e.target as HTMLFormElement))
      toast({
        title: 'Success',
        description: 'Cost assumptions updated successfully'
      })
      // Update local state to reflect changes immediately
      const updatedModels = costModels.map(m =>
        m.role === selectedCostModel!.role && m.country === selectedCostModel!.country
          ? { ...m, avg_salary, replacement_cost_pct, ramp_up_months }
          : m
      )
      setCostModels(updatedModels)
      setIsEditOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update cost assumptions',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = () => {
    const avg_salary = parseFloat(formData.avg_salary)
    const replacement_cost_pct = parseFloat(formData.replacement_cost_pct)
    const ramp_up_months = parseInt(formData.ramp_up_months)
    return (
      !isNaN(avg_salary) && avg_salary > 0 &&
      !isNaN(replacement_cost_pct) && replacement_cost_pct >= 0 && replacement_cost_pct <= 150 &&
      !isNaN(ramp_up_months) && ramp_up_months >= 0 && ramp_up_months <= 12
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-semibold">EngageValue™ Impact</h1>
        <p>Loading...</p>
      </div>
    )
  }

  const totalExpectedLoss = allSnapshots.reduce((sum, s) => sum + (s.estimated_attrition_cost || 0), 0)
  const totalExpectedSavings = allSnapshots.reduce((sum, s) => sum + (s.expected_savings || 0), 0)
  const hasData = allSnapshots.length > 0

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold">EngageValue™ Impact</h1>

      {!hasData ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">EngageValue™ data will appear after first engagement analysis</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Attrition Exposure</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpectedLoss)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preventable Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalExpectedSavings)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Employees by Expected Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topSnapshots.map((snapshot) => (
                  <div key={snapshot.employee_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold">{(snapshot.employees as any)?.name || 'Unknown'}</h3>
                      <p className="text-sm text-muted-foreground">{(snapshot.employees as any)?.position || 'Unknown'}</p>
                    </div>
                    <Badge variant="destructive">
                      {formatCurrency(snapshot.estimated_attrition_cost)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Assumptions</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Role</th>
                    <th className="text-left p-2">Country</th>
                    <th className="text-left p-2">Avg Salary</th>
                    <th className="text-left p-2">Replacement Cost %</th>
                    <th className="text-left p-2">Ramp-up Months</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {costModels.map((model) => (
                    <tr key={model.id} className="border-b">
                      <td className="p-2">{model.role}</td>
                      <td className="p-2">{model.country}</td>
                      <td className="p-2">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(model.avg_salary)}
                      </td>
                      <td className="p-2">{model.replacement_cost_pct}%</td>
                      <td className="p-2">{model.ramp_up_months}</td>
                      <td className="p-2">
                        <Button variant="secondary" onClick={() => handleEdit(model)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cost Assumptions</DialogTitle>
          </DialogHeader>
          {selectedCostModel && (
            <form onSubmit={handleSave} className="space-y-4">
              <input type="hidden" name="role" value={selectedCostModel.role} />
              <input type="hidden" name="country" value={selectedCostModel.country} />
              <div>
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={selectedCostModel.role} disabled />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={selectedCostModel.country} disabled />
              </div>
              <div>
                <Label htmlFor="avg_salary">Avg Salary</Label>
                <Input
                  id="avg_salary"
                  name="avg_salary"
                  type="number"
                  step="0.01"
                  value={formData.avg_salary}
                  onChange={(e) => setFormData({ ...formData, avg_salary: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="replacement_cost_pct">Replacement Cost %</Label>
                <Input
                  id="replacement_cost_pct"
                  name="replacement_cost_pct"
                  type="number"
                  min="0"
                  max="150"
                  step="0.01"
                  value={formData.replacement_cost_pct}
                  onChange={(e) => setFormData({ ...formData, replacement_cost_pct: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ramp_up_months">Ramp-up Months</Label>
                <Input
                  id="ramp_up_months"
                  name="ramp_up_months"
                  type="number"
                  min="0"
                  max="12"
                  value={formData.ramp_up_months}
                  onChange={(e) => setFormData({ ...formData, ramp_up_months: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" disabled={!isFormValid() || saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}