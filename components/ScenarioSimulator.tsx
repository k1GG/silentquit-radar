"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"

interface ScenarioSimulatorProps {
  expectedLoss: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ScenarioSimulator({ expectedLoss }: ScenarioSimulatorProps) {
  const [riskReduction, setRiskReduction] = useState(20)

  const simulatedSavings = expectedLoss * (riskReduction / 100)
  const remainingExposure = expectedLoss - simulatedSavings

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Scenario Simulator</CardTitle>
        <p className="text-gray-400 text-sm">What if we intervene?</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Simulated reduction in attrition risk</label>
            <Slider
              value={[riskReduction]}
              onValueChange={(value) => setRiskReduction(value[0])}
              min={0}
              max={30}
              step={1}
              className="mt-2"
            />
            <p className="text-center text-gray-400 text-sm mt-1">{riskReduction}%</p>
          </div>
          <div className="space-y-2">
            <p className="text-red-500">Current Expected Loss: {formatCurrency(expectedLoss)}</p>
            <p className="text-green-500">Simulated Savings: {formatCurrency(simulatedSavings)}</p>
            <p className="text-red-500">Remaining Exposure: {formatCurrency(remainingExposure)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}