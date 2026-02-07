"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, Users, DollarSign } from "lucide-react"
import { getInterventionOutcomes } from "@/app/actions/interventions"
import { useEffect, useState } from "react"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function InterventionOutcomesCard() {
  const [outcomes, setOutcomes] = useState<{
    employeesIntervened: number
    riskReducedPercentage: number
    estimatedLossAvoided: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOutcomes = async () => {
      try {
        const data = await getInterventionOutcomes()
        setOutcomes(data)
      } catch (error) {
        console.error("Error fetching intervention outcomes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOutcomes()
  }, [])

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">📊 Intervention Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!outcomes) {
    return null
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">📊 Intervention Outcomes</CardTitle>
        <p className="text-sm text-gray-400 mt-2">
          We measure intervention effectiveness — not just risk.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {outcomes.employeesIntervened}
            </div>
            <div className="text-sm text-gray-400">
              Employees Intervened
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {outcomes.riskReducedPercentage > 50 ? (
                <TrendingDown className="h-8 w-8 text-green-500" />
              ) : outcomes.riskReducedPercentage > 30 ? (
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              ) : (
                <TrendingUp className="h-8 w-8 text-red-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-white">
              {outcomes.riskReducedPercentage}%
            </div>
            <div className="text-sm text-gray-400">
              Risk Reduced
            </div>
            {outcomes.riskReducedPercentage > 0 && (
              <Badge 
                variant={outcomes.riskReducedPercentage > 50 ? "default" : "secondary"}
                className="mt-2"
              >
                {outcomes.riskReducedPercentage > 50 ? "Effective" : "Moderate"}
              </Badge>
            )}
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(outcomes.estimatedLossAvoided)}
            </div>
            <div className="text-sm text-gray-400">
              Estimated Loss Avoided
            </div>
            {outcomes.estimatedLossAvoided > 0 && (
              <Badge className="bg-green-600 text-white mt-2">
                Savings Achieved
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-300 text-center">
            These metrics show the measurable impact of HR interventions on employee engagement and retention risk.
          </p>
          <p className="text-xs text-gray-500 text-center mt-2">
            No predictive guarantees — purely evidence-based analysis.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}