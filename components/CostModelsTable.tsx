'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateCostModel } from '@/app/hr/settings/cost-models/actions'
import { useToast } from '@/hooks/use-toast'

type CostModel = {
  id: string
  role: string
  country: string
  avg_salary: number
  replacement_cost_pct: number
  ramp_up_months: number
  created_at: string
}

export default function CostModelsTable({ costModels }: { costModels: CostModel[] }) {
  const [editing, setEditing] = useState<CostModel | null>(null)
  const [formData, setFormData] = useState({
    avg_salary: '',
    replacement_cost_pct: '',
    ramp_up_months: ''
  })
  const { toast } = useToast()

  const handleEdit = (model: CostModel) => {
    setEditing(model)
    setFormData({
      avg_salary: model.avg_salary.toString(),
      replacement_cost_pct: model.replacement_cost_pct.toString(),
      ramp_up_months: model.ramp_up_months.toString()
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    try {
      await updateCostModel(new FormData(e.target as HTMLFormElement))
      toast({
        title: 'Success',
        description: 'Cost assumptions updated successfully'
      })
      setEditing(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update cost assumptions',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <table className="w-full table-auto text-white">
        <thead>
          <tr className="border-b border-gray-600">
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
            <tr key={model.id} className="border-b border-gray-700">
              <td className="p-2">{model.role}</td>
              <td className="p-2">{model.country}</td>
              <td className="p-2">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(model.avg_salary)}
              </td>
              <td className="p-2">{model.replacement_cost_pct}%</td>
              <td className="p-2">{model.ramp_up_months}</td>
              <td className="p-2">
                <Button onClick={() => handleEdit(model)} variant="outline" size="sm">
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="bg-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Edit Cost Assumptions</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="role" value={editing.role} />
              <input type="hidden" name="country" value={editing.country} />
              <div>
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={editing.role} disabled className="bg-gray-700" />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={editing.country} disabled className="bg-gray-700" />
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
              <Button type="submit" className="w-full">
                Save Changes
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}