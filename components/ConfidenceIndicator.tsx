"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ConfidenceIndicatorProps {
  survey_count: number
  score_variance?: number
}

export default function ConfidenceIndicator({ survey_count, score_variance }: ConfidenceIndicatorProps) {
  const confidenceLevel = score_variance !== undefined
    ? (survey_count >= 6 && score_variance < 10 ? 'High' : survey_count >= 3 ? 'Medium' : 'Low')
    : (survey_count >= 6 ? 'High' : survey_count >= 3 ? 'Medium' : 'Low')
  const badgeClass = confidenceLevel === 'High' ? 'bg-green-600' : confidenceLevel === 'Medium' ? 'bg-yellow-600' : 'bg-gray-600'
  const supportingText = score_variance !== undefined
    ? (confidenceLevel === 'High'
      ? `Based on ${survey_count} surveys with stable engagement trend`
      : confidenceLevel === 'Medium'
      ? `Based on ${survey_count} surveys`
      : 'Limited survey data')
    : `Based on ${survey_count} employees with EngageValue data`

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">EngageValue™ Confidence</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge className={badgeClass}>{confidenceLevel}</Badge>
        <p className="text-gray-400 text-sm mt-2">{supportingText}</p>
      </CardContent>
    </Card>
  )
}