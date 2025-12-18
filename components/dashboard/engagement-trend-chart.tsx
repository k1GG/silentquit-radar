"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type EngagementTrendChartProps = {
  data: {
    month: string
    score: number
  }[]
}

export function EngagementTrendChart({
  data,
}: EngagementTrendChartProps) {
  return (
    <div className="mt-8 rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">
        Engagement Trend
      </h2>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#2563eb"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
