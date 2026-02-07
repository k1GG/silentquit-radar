"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { format } from "date-fns"
import { createIntervention, InterventionWithComparison } from "@/app/actions/interventions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"
import AddTaskForm from "@/components/AddTaskForm"
import { formatDate } from "@/lib/formatDate"

type Props = {
  employeeId: string
  interventions: InterventionWithComparison[]
  tasksByIntervention: Record<string, any[]>
}

const INTERVENTION_TYPES = [
  "1:1",
  "Compensation Review",
  "Workload Adjustment",
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getRiskBadgeVariant(riskLevel: string) {
  const risk = riskLevel.toLowerCase()
  if (risk === "low") return "default"
  if (risk === "medium") return "secondary"
  return "destructive"
}

function getRiskChangeIndicator(beforeRisk: string, afterRisk: string) {
  const riskLevels = ["low", "medium", "high"]
  const beforeIndex = riskLevels.indexOf(beforeRisk.toLowerCase())
  const afterIndex = riskLevels.indexOf(afterRisk.toLowerCase())
  
  if (afterIndex < beforeIndex) {
    return { icon: TrendingDown, color: "text-green-500", label: "Risk Reduced", badgeColor: "bg-green-600" }
  } else if (afterIndex > beforeIndex) {
    return { icon: TrendingUp, color: "text-red-500", label: "Risk Increased", badgeColor: "bg-red-600" }
  } else {
    return { icon: Minus, color: "text-gray-500", label: "No Change", badgeColor: "bg-gray-600" }
  }
}

export default function InterventionTracker({ employeeId, interventions, tasksByIntervention }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [interventionType, setInterventionType] = useState("")
  const [interventionDate, setInterventionDate] = useState<Date>()
  const [owner, setOwner] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const toggleTaskComplete = async (taskId: string, completed: boolean) => {
    await supabase
      .from("intervention_tasks")
      .update({ completed })
      .eq("id", taskId)

    location.reload()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!interventionType || !interventionDate || !owner) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await createIntervention({
        employee_id: employeeId,
        intervention_type: interventionType,
        intervention_date: format(interventionDate, "yyyy-MM-dd"),
        owner,
        notes: notes || undefined,
      })

      toast({
        title: "Intervention logged",
        description: "The intervention has been successfully recorded",
      })

      // Reset form
      setInterventionType("")
      setInterventionDate(undefined)
      setOwner("")
      setNotes("")
      setIsDialogOpen(false)
      
      // Refresh the page
      router.refresh()
    } catch (error) {
      console.error("Error creating intervention:", error)
      toast({
        title: "Error",
        description: "Failed to log intervention. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-white">Intervention Tracker</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto py-3 px-4 text-base bg-teal-600 hover:bg-teal-700">
                Log Intervention
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Log Intervention</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="intervention-type">Intervention Type *</Label>
                  <Select value={interventionType} onValueChange={setInterventionType}>
                    <SelectTrigger id="intervention-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVENTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intervention-date">Intervention Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="intervention-date"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !interventionDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {interventionDate ? format(interventionDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={interventionDate}
                        onSelect={setInterventionDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner">Owner *</Label>
                  <Input
                    id="owner"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g., Jane Doe (HR Manager)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional context or details..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {interventions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No interventions logged yet</p>
            <p className="text-sm text-gray-500">
              We measure intervention effectiveness, not just risk.
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <p className="text-sm text-gray-400 mb-4">
              We measure intervention effectiveness, not just risk.
            </p>
            {interventions.map((intervention) => {
              const hasComparison = intervention.before_snapshot && intervention.after_snapshot
              const riskChange = hasComparison
                ? getRiskChangeIndicator(
                    intervention.before_snapshot!.risk_level,
                    intervention.after_snapshot!.risk_level
                  )
                : null

              return (
                <Card key={intervention.id} className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-white">
                            {intervention.intervention_type}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {formatDate(intervention.intervention_date)} • {intervention.owner}
                          </p>
                          {intervention.notes && (
                            <p className="text-sm text-gray-300 mt-2">{intervention.notes}</p>
                          )}
                        </div>
                        {riskChange && (
                          <Badge className={riskChange.badgeColor}>
                            {riskChange.label}
                          </Badge>
                        )}
                      </div>

                      {hasComparison && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-600">
                          <div>
                            <p className="text-xs text-gray-400 mb-2">Before</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Score:</span>
                                <span className="font-semibold text-white">
                                  {intervention.before_snapshot!.engagement_score}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Risk:</span>
                                <Badge
                                  variant={getRiskBadgeVariant(
                                    intervention.before_snapshot!.risk_level
                                  )}
                                  className="text-xs"
                                >
                                  {intervention.before_snapshot!.risk_level}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-400 mb-2">After</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Score:</span>
                                <span className="font-semibold text-white">
                                  {intervention.after_snapshot!.engagement_score}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Risk:</span>
                                <Badge
                                  variant={getRiskBadgeVariant(
                                    intervention.after_snapshot!.risk_level
                                  )}
                                  className="text-xs"
                                >
                                  {intervention.after_snapshot!.risk_level}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!hasComparison && (
                        <p className="text-xs text-gray-500 italic">
                          Awaiting before/after data for comparison
                        </p>
                      )}

                      {/* Action Tasks */}
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Action Tasks</h4>

                        {tasksByIntervention[intervention.id]?.map(task => (
                          <div key={task.id} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                            <div>
                              <p className={`text-sm ${task.completed ? 'line-through opacity-60' : ''}`}>
                                {task.task}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Due: {formatDate(task.due_date)}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTaskComplete(task.id, !task.completed)}
                            />
                          </div>
                        ))}

                        <AddTaskForm interventionId={intervention.id} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
