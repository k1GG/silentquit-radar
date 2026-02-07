"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TimeToImpactIndicatorProps {
  riskLevel: string
}

export default function TimeToImpactIndicator({ riskLevel }: TimeToImpactIndicatorProps) {
  const timeWindow = riskLevel.toLowerCase() === 'high' ? '30–60 days' : riskLevel.toLowerCase() === 'medium' ? '60–90 days' : '90–120 days'

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Time to Impact</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400">Expected benefit window: {timeWindow}</p>
      </CardContent>
    </Card>
  )
}