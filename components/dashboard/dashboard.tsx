"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Users, TrendingDown } from "lucide-react"

import { StatCard } from "./stat-card"
import { EngagementTrendChart } from "./engagement-trend-chart"
import { QuickActions } from "./quick-actions"
import { LogoutButton } from "@/components/LogoutButton"
import { supabase } from "@/lib/supabaseClient"

type TrendPoint = {
  month: string
  score: number
}

export function Dashboard() {
  // 🔹 Stats state
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [highRiskCount, setHighRiskCount] = useState(0)
  const [avgEngagement, setAvgEngagement] = useState(0)

  // 🔹 Engagement trend
  const [engagementTrend, setEngagementTrend] = useState<TrendPoint[]>([])

  useEffect(() => {
    const loadDashboardData = async () => {
      /* 1️⃣ Total Employees */
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id")

      if (empError) {
        console.error("Employees error:", empError)
        return
      }

      setTotalEmployees(employees.length)

      /* 2️⃣ High Risk Employees */
      const { data: highRisk, error: riskError } = await supabase
        .from("engagement_scores")
        .select("id")
        .eq("risk_level", "High")

      if (riskError) {
        console.error("High risk error:", riskError)
        return
      }

      setHighRiskCount(highRisk.length)

      /* 3️⃣ Avg Engagement */
      const { data: scores, error: scoreError } = await supabase
        .from("engagement_scores")
        .select("score, created_at")

      if (scoreError) {
        console.error("Score error:", scoreError)
        return
      }

      const avg =
        scores.reduce((sum, item) => sum + item.score, 0) / scores.length

      setAvgEngagement(Math.round(avg))

      /* 4️⃣ Engagement Trend */
      const monthlyMap: Record<string, { total: number; count: number }> = {}

      scores.forEach((item) => {
        const date = new Date(item.created_at)
        const month = date.toLocaleString("default", { month: "short" })

        if (!monthlyMap[month]) {
          monthlyMap[month] = { total: 0, count: 0 }
        }

        monthlyMap[month].total += item.score
        monthlyMap[month].count += 1
      })

      const trendData: TrendPoint[] = Object.entries(monthlyMap).map(
        ([month, value]) => ({
          month,
          score: Math.round(value.total / value.count),
        })
      )

      setEngagementTrend(trendData)
    }

    loadDashboardData()
  }, [])

  return (
    <>
      {/* Header with Logout */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2 text-balance">
            Company Overview
          </h1>
          <p className="text-muted-foreground">
            Monitor engagement trends and identify at-risk employees
          </p>
        </div>

        <LogoutButton />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <StatCard
          title="Total Employees"
          value={totalEmployees.toString()}
          description="Across all departments"
          icon={<Users className="size-4 text-muted-foreground" />}
        />

        <StatCard
          title="High Risk"
          value={highRiskCount.toString()}
          description="Requires immediate attention"
          icon={<AlertTriangle className="size-4 text-destructive" />}
          valueClassName="text-destructive"
        />

        <StatCard
          title="Avg. Engagement"
          value={
            <>
              {avgEngagement}
              <span className="text-lg text-muted-foreground">%</span>
            </>
          }
          description="Based on current employee data"
          icon={<TrendingDown className="size-4 text-chart-2" />}
        />
      </div>

      {/* Engagement Trend Chart */}
      {engagementTrend.length > 0 && (
        <EngagementTrendChart data={engagementTrend} />
      )}

      {/* Quick Actions */}
      <QuickActions
        title="Review High Risk Employees"
        description={`${highRiskCount} employees need your attention`}
        ctaLabel="View All Employees"
        ctaHref="/employees"
      />
    </>
  )
}
