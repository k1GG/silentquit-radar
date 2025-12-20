"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

/* -----------------------------
   Types
------------------------------ */
type EmployeeRow = {
  id: string
  email: string
  score: number
  risk_level: "Low" | "Medium" | "High"
}

/* -----------------------------
   Risk Calculation
------------------------------ */
function calculateRisk(score: number): "Low" | "Medium" | "High" {
  if (score >= 70) return "Low"
  if (score >= 40) return "Medium"
  return "High"
}

/* -----------------------------
   Time-based Score Decay
------------------------------ */
function applyScoreDecay(score: number, createdAt: string): number {
  const createdDate = new Date(createdAt)
  const now = new Date()

  const monthsPassed =
    (now.getFullYear() - createdDate.getFullYear()) * 12 +
    (now.getMonth() - createdDate.getMonth())

  const decay = monthsPassed * 2 // 2 points per month
  return Math.max(0, score - decay)
}

export function EmployeesClient() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)

  // Modal + form state
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  /* -----------------------------
     Fetch Employees (with decay)
  ------------------------------ */
  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(`
        id,
        email,
        engagement_scores (
          score,
          risk_level,
          created_at
        )
      `)

    if (error) {
      console.error("Error fetching employees:", error)
      return
    }

    const formatted: EmployeeRow[] = data.map((emp: any) => {
      const scoreRecord = emp.engagement_scores?.[0]

      if (!scoreRecord) {
        return {
          id: emp.id,
          email: emp.email,
          score: 0,
          risk_level: "High",
        }
      }

      const decayedScore = applyScoreDecay(
        scoreRecord.score,
        scoreRecord.created_at
      )

      return {
        id: emp.id,
        email: emp.email,
        score: decayedScore,
        risk_level: calculateRisk(decayedScore),
      }
    })

    setEmployees(formatted)
  }

  useEffect(() => {
    fetchEmployees().finally(() => setLoading(false))
  }, [])

  /* -----------------------------
     Add Employee + Initial Score
  ------------------------------ */
  const handleAddEmployee = async () => {
    setSubmitting(true)
    setError("")

    if (!email) {
      setError("Email is required")
      setSubmitting(false)
      return
    }

    // 1️⃣ Create employee
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .insert({ email })
      .select()
      .single()

    if (empError || !employee) {
      setError(empError?.message || "Failed to create employee")
      setSubmitting(false)
      return
    }

    // 2️⃣ Create initial engagement score
    const initialScore = 75

    await supabase.from("engagement_scores").insert({
      employee_id: employee.id,
      score: initialScore,
      risk_level: calculateRisk(initialScore),
    })

    setEmail("")
    setOpen(false)
    await fetchEmployees()
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading employees...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Employees</h1>

        <Button onClick={() => setOpen(true)}>
          Add Employee
        </Button>
      </div>

      {/* Employees Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Engagement Score</th>
              <th className="px-4 py-3 text-left">Risk Level</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-t">
                {/* ✅ CLICKABLE EMAIL */}
                <td className="px-4 py-3">
                  <Link
                    href={`/employees/${emp.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {emp.email}
                  </Link>
                </td>

                <td className="px-4 py-3">{emp.score}</td>

                <td className="px-4 py-3">
                  <Badge
                    variant={
                      emp.risk_level === "High"
                        ? "destructive"
                        : emp.risk_level === "Medium"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {emp.risk_level}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Employee email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={handleAddEmployee}
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
