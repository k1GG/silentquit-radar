'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { activateEngageValue } from '@/app/actions/activateEngageValue'

type Employee = {
  id: string
  name: string
  position: string
}

type Props = {
  employee: Employee
  isOpen: boolean
  onClose: () => void
}

export default function ActivateEngageValueModal({ employee, isOpen, onClose }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [country, setCountry] = useState<string>("")
  const [score, setScore] = useState<string>("50")
  const [riskLevel, setRiskLevel] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validation
    if (!country.trim()) {
      setError('Country is required')
      setIsSubmitting(false)
      return
    }
    const scoreNum = parseInt(score) || 0
    if (scoreNum < 0 || scoreNum > 100) {
      setError('Engagement Score must be between 0 and 100')
      setIsSubmitting(false)
      return
    }
    if (!['low', 'medium', 'high'].includes(riskLevel)) {
      setError('Risk Level is required')
      setIsSubmitting(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('employee_id', employee.id)
      formData.append('score', scoreNum.toString())
      formData.append('risk_level', riskLevel)
      formData.append('country', country)

      await activateEngageValue(formData)
      onClose()
      // Page will revalidate and refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Activate EngageValue™</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Employee Name</Label>
            <Input id="name" value={employee?.name ?? ""} readOnly />
          </div>
          <div>
            <Label htmlFor="position">Role</Label>
            <Input id="position" value={employee?.position ?? ""} readOnly />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Enter country"
              required
            />
          </div>
          <div>
            <Label htmlFor="score">Engagement Score</Label>
            <Input
              id="score"
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="risk_level">Risk Level</Label>
            <Select value={riskLevel} onValueChange={setRiskLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Activating...' : 'Activate EngageValue™'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}