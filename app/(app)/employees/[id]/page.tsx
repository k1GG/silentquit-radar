"use client"

import Link from "next/link"
import { use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RiskBadge } from "@/components/risk-badge"
import { ArrowLeft, Mail, Calendar, TrendingDown, AlertCircle, MessageSquare, Clock } from "lucide-react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"

const employeeData = {
  "1": {
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    department: "Engineering",
    role: "Senior Developer",
    score: 42,
    risk: "high" as const,
    joinDate: "Jan 2021",
  },
  "2": {
    name: "Marcus Johnson",
    email: "marcus.j@company.com",
    department: "Product",
    role: "Product Manager",
    score: 38,
    risk: "high" as const,
    joinDate: "Mar 2020",
  },
}

const weeklyTrend = [
  { week: "Week 1", score: 65 },
  { week: "Week 2", score: 58 },
  { week: "Week 3", score: 52 },
  { week: "Week 4", score: 48 },
  { week: "Week 5", score: 45 },
  { week: "Week 6", score: 42 },
]

const signals = [
  {
    category: "Communication",
    score: 35,
    issues: ["Reduced slack activity", "Missed 3 team meetings", "Low response rate"],
  },
  {
    category: "Productivity",
    score: 48,
    issues: ["Fewer commits than usual", "Delayed project deliveries"],
  },
  {
    category: "Collaboration",
    score: 42,
    issues: ["Less code review participation", "Declined team events"],
  },
  {
    category: "Work Hours",
    score: 52,
    issues: ["Inconsistent login times", "Shorter work sessions"],
  },
]

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const employee = employeeData[id as keyof typeof employeeData] || employeeData["1"]

  return (
    <>
      <Button variant="ghost" asChild className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/employees">
          <ArrowLeft className="mr-2 size-4" />
          Back to Employees
        </Link>
      </Button>

      {/* Employee Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-semibold">
            {employee.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <h1 className="text-3xl font-semibold mb-1 text-balance">{employee.name}</h1>
            <p className="text-muted-foreground mb-2">
              {employee.role} · {employee.department}
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="size-4" />
                {employee.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-4" />
                Joined {employee.joinDate}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Schedule Check-in</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Engagement Score Card */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Current Engagement Score</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Based on multiple data points</p>
              </div>
              <RiskBadge level={employee.risk} />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-semibold">{employee.score}</span>
                <span className="text-2xl text-muted-foreground">/100</span>
                <span className="flex items-center gap-1 text-destructive ml-4">
                  <TrendingDown className="size-4" />
                  <span className="text-sm font-medium">-23 pts from last month</span>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Trend Chart */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>6-Week Engagement Trend</CardTitle>
              <p className="text-sm text-muted-foreground">Tracking engagement score over time</p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  score: {
                    label: "Engagement Score",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[250px]"
              >
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-chart-2)", r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Signals Breakdown */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Signal Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">Detailed analysis of engagement indicators</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {signals.map((signal, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{signal.category}</span>
                    <span className="text-sm text-muted-foreground">
                      {signal.score}
                      <span className="text-xs">/100</span>
                    </span>
                  </div>
                  <Progress value={signal.score} className="h-2" />
                  <ul className="space-y-1">
                    {signal.issues.map((issue, issueIndex) => (
                      <li key={issueIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="size-4 mt-0.5 shrink-0 text-destructive" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start border-border bg-transparent" size="lg">
                <MessageSquare className="mr-2 size-4" />
                Send Message
              </Button>
              <Button variant="outline" className="w-full justify-start border-border bg-transparent" size="lg">
                <Calendar className="mr-2 size-4" />
                Schedule 1-on-1
              </Button>
              <Button variant="outline" className="w-full justify-start border-border bg-transparent" size="lg">
                <Clock className="mr-2 size-4" />
                View History
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-destructive/5 border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="size-5" />
                Risk Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This employee shows multiple indicators of disengagement. We recommend scheduling an immediate
                check-in to discuss workload, career goals, and overall satisfaction.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="size-2 rounded-full bg-muted-foreground mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Missed team standup</p>
                  <p className="text-xs text-muted-foreground">2 days ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="size-2 rounded-full bg-muted-foreground mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Late project submission</p>
                  <p className="text-xs text-muted-foreground">5 days ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="size-2 rounded-full bg-muted-foreground mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Declined team lunch invite</p>
                  <p className="text-xs text-muted-foreground">1 week ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}


