'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { supabase } from '@/lib/supabaseClient'
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

type Props = {
  costModel: CostModel
  isRoleOverride: boolean
  attritionProb?: number
  expectedLoss?: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function CostAssumptionsPanel({ costModel, isRoleOverride, attritionProb, expectedLoss }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    avg_salary: costModel.avg_salary.toString(),
    replacement_cost_pct: costModel.replacement_cost_pct.toString(),
    ramp_up_months: costModel.ramp_up_months.toString()
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
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
      const { error } = await supabase
        .from('engagement_cost_models')
        .update({
          avg_salary,
          replacement_cost_pct,
          ramp_up_months
        })
        .eq('id', costModel.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Cost assumptions updated successfully'
      })
      setIsEditing(false)
      // Update local state
      costModel.avg_salary = avg_salary
      costModel.replacement_cost_pct = replacement_cost_pct
      costModel.ramp_up_months = ramp_up_months
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

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          Cost Assumptions (HR Controlled)
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-2 text-gray-400 cursor-help">ⓘ</span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p>How this is calculated</p>
                  <p>Attrition Cost = Avg Salary × Replacement Cost %</p>
                  <p>Expected Loss = Attrition Cost × Attrition Probability</p>
                  <p>All values are configurable by your organization.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-gray-400 text-sm">All financial outputs are derived from values defined by your organization.</p>
        <Badge className={isRoleOverride ? "bg-blue-600" : "bg-gray-600"}>
          {isRoleOverride ? "Role Override" : "Company Default Applied"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-300">Role</Label>
            <Input value={costModel.role} disabled className="bg-gray-700" />
          </div>
          <div>
            <Label className="text-gray-300">Country</Label>
            <Input value={costModel.country} disabled className="bg-gray-700" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label className="text-gray-300">Avg Salary</Label>
            {isEditing ? (
              <Input
                type="number"
                step="0.01"
                value={formData.avg_salary}
                onChange={(e) => setFormData({ ...formData, avg_salary: e.target.value })}
                className="bg-gray-700"
              />
            ) : (
              <p className="text-white font-semibold">{formatCurrency(costModel.avg_salary)}</p>
            )}
          </div>
          <div>
            <Label className="text-gray-300">Replacement Cost %</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                max="150"
                step="0.01"
                value={formData.replacement_cost_pct}
                onChange={(e) => setFormData({ ...formData, replacement_cost_pct: e.target.value })}
                className="bg-gray-700"
              />
            ) : (
              <p className="text-white font-semibold">{costModel.replacement_cost_pct}%</p>
            )}
          </div>
          <div>
            <Label className="text-gray-300">Ramp-up Months</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                max="12"
                value={formData.ramp_up_months}
                onChange={(e) => setFormData({ ...formData, ramp_up_months: e.target.value })}
                className="bg-gray-700"
              />
            ) : (
              <p className="text-white font-semibold">{costModel.ramp_up_months}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
          {isEditing ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleSave} disabled={!isFormValid() || saving} className="w-full sm:w-auto">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">Edit</Button>
          )}
        </div>
        {attritionProb && expectedLoss && (
          <div className="text-sm text-gray-400 bg-gray-700 p-3 rounded">
            <p>Attrition Cost = {formatCurrency(costModel.avg_salary)} × {costModel.replacement_cost_pct}% × {attritionProb.toFixed(2)}</p>
            <p>Expected Loss = {formatCurrency(expectedLoss)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}