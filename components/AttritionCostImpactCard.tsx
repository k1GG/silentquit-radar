"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AttritionCostImpactCardProps {
  expectedLoss: number;
  roiMetrics: {
    interventionCost: number;
    expectedSavings: number;
    roiMultiple: number;
  };
  totalAttritionCost: number;
}

export default function AttritionCostImpactCard({
  expectedLoss,
  roiMetrics,
}: AttritionCostImpactCardProps) {
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">EngageValue™ Attrition Cost Impact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-red-500">If no action taken</span>
          <span className="text-red-500 font-bold">{formatCurrency(expectedLoss)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-green-500">If intervention applied</span>
          <span className="text-green-500 font-bold">{formatCurrency(roiMetrics.expectedSavings)}</span>
        </div>
        <div className="flex justify-center">
          <Badge variant="secondary" className="bg-blue-600 text-white">
            {roiMetrics.roiMultiple.toFixed(1)}x ROI
          </Badge>
        </div>
        <p className="text-sm text-gray-400 text-center">
          Based on engagement decline, tenure, and role-based cost assumptions
        </p>
      </CardContent>
    </Card>
  )
}